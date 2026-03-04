import base64
import io
import logging
import os
from typing import Any, Dict, List

import torch
from diffusers import (
    AutoencoderKL,
    ControlNetModel,
    StableDiffusionXLControlNetPipeline,
    DPMSolverMultistepScheduler,
)
from PIL import Image
from google.cloud import storage

# 導入共用輸出邏輯
import output_utils

# Vertex AI 預期此類別名稱為 EndpointHandler
class EndpointHandler:
    def __init__(self, model_dir: str):
        """初始化 SDXL ControlNet 管線。
        model_dir 是模型權重夾路徑 (在 Vertex AI 部署時會自動對應)。
        """
        logging.info(f"正在從 {model_dir} 載入模型...")

        # 1. 檢測本地權重 (Vertex AI 會將 GCS artifact 映射到 model_dir)
        local_weights_dir = os.path.join(model_dir, "weights")

        # 決定載入路徑
        sdxl_path = os.path.join(local_weights_dir, "sdxl_base")
        controlnet_path = os.path.join(local_weights_dir, "controlnet_canny")
        vae_path = os.path.join(local_weights_dir, "vae_fix")

        # 檢查關鍵檔案是否存在（例如 UNet 的 config.json）
        if os.path.isdir(sdxl_path) and os.path.exists(os.path.join(sdxl_path, "unet", "config.json")):
            logging.info(f"檢測到本地權重，從 {sdxl_path} 載入...")
        else:
            logging.warning(f"本地權重不完整或不存在: {sdxl_path}，將從 Hugging Face 載入。")
            sdxl_path = os.environ.get("MODEL_ID", "stabilityai/stable-diffusion-xl-base-1.0")
            controlnet_path = os.environ.get("CONTROLNET_ID", "diffusers/controlnet-canny-sdxl-1.0")
            vae_path = "madebyollin/sdxl-vae-fp16-fix"

        logging.info(f"Loading Base Model from: {sdxl_path}")
        logging.info(f"Loading ControlNet from: {controlnet_path}")

        # 如果是本地路徑，確保不傳遞 subfolder="controlnet" 等參數，如果是從 HF 載入則需要
        controlnet = ControlNetModel.from_pretrained(
            controlnet_path,
            torch_dtype=torch.float16,
            use_safetensors=True
        )

        # 2. 建立 SDXL ControlNet Pipeline
        self.pipeline = StableDiffusionXLControlNetPipeline.from_pretrained(
            sdxl_path,
            controlnet=[controlnet, controlnet, controlnet],
            torch_dtype=torch.float16,
            use_safetensors=True
        )

        # 3. 優化 (VAE 與 Scheduler)
        self.pipeline.vae = AutoencoderKL.from_pretrained(
            vae_path,
            torch_dtype=torch.float16
        )
        self.pipeline.scheduler = DPMSolverMultistepScheduler.from_config(self.pipeline.scheduler.config)
        self.pipeline.enable_model_cpu_offload()

        self.map_location = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = torch.device(self.map_location)
        self.pipeline.to(self.device)
        self.storage_client = storage.Client()
        self.bucket_name = "game-485606-mu-tree-staging"

        logging.info(f"使用裝置: {self.device} (支援多重 ControlNet)")
        logging.info(f"輸出儲存桶: {self.bucket_name}")
        logging.info("初始化完成！")

    def __call__(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """處理推理請求。"""
        if "instances" in data:
            inputs = data["instances"][0]
        else:
            inputs = data.get("inputs", data)

        prompt = inputs.get("prompt", "")
        negative_prompt = inputs.get("negative_prompt", "low quality, blurry, distorted")

        # 處理控制圖 (支援單一字串或列表)
        image_data_list = inputs.get("image")
        if not image_data_list:
             raise ValueError("請求中必須包含 'image' 欄位。")

        if isinstance(image_data_list, str):
            image_data_list = [image_data_list]

        control_images = []
        for b64 in image_data_list:
            img = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")
            control_images.append(img)

        # 處理權重 (支援單一數值或列表)
        conditioning_scale = inputs.get("controlnet_conditioning_scale", 1.0)
        if not isinstance(conditioning_scale, list):
            conditioning_scale = [float(conditioning_scale)] * len(control_images)
        else:
            conditioning_scale = [float(s) for s in conditioning_scale]

        # 補齊 Pipeline 預期的列表長度 (3)
        final_images = control_images + [control_images[-1]] * (3 - len(control_images))
        final_scales = conditioning_scale + [0.0] * (3 - len(conditioning_scale))

        # 推理參數
        num_inference_steps = int(inputs.get("num_inference_steps", 30))
        guidance_scale = float(inputs.get("guidance_scale", 7.5))

        # 執行生成
        device_type = "cuda" if torch.cuda.is_available() else "cpu"
        with torch.autocast(device_type):
            results = self.pipeline(
                prompt=prompt,
                negative_prompt=negative_prompt,
                image=final_images,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                controlnet_conditioning_scale=final_scales,
            ).images

        # 使用共用輸出邏輯將結果轉換為 Base64 JPEG 並回傳
        return output_utils.prepare_response(results)

    def upload_to_gcs(self, img: Image.Image, filename: str):
        """(選用) 備份至 GCS 的輔助函式。"""
        try:
            bucket = self.storage_client.bucket(self.bucket_name)
            blob = bucket.blob(f"backups/{filename}")
            buffered = io.BytesIO()
            img.save(buffered, format="JPEG")
            blob.upload_from_string(buffered.getvalue(), content_type="image/jpeg")
        except Exception as e:
            logging.error(f"GCS 備份失敗: {e}")
