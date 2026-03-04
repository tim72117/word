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

# Vertex AI 預期此類別名稱為 EndpointHandler
class EndpointHandler:
    def __init__(self, model_dir: str):
        """初始化 SDXL ControlNet 管線。
        model_dir 是模型權重夾路徑 (在 Vertex AI 部署時會自動對應)。
        """
        logging.info(f"正在從 {model_dir} 載入模型...")
        
        # 1. 載入 ControlNet (使用環境變數或預設 ID)
        controlnet_id = os.environ.get("CONTROLNET_ID", "diffusers/controlnet-canny-sdxl-1.0")
        base_model_id = os.environ.get("MODEL_ID", "stabilityai/stable-diffusion-xl-base-1.0")
        
        logging.info(f"Base Model: {base_model_id}")
        logging.info(f"ControlNet: {controlnet_id}")

        controlnet = ControlNetModel.from_pretrained(
            controlnet_id, 
            torch_dtype=torch.float16,
            use_safetensors=True
        )
        
        # 2. 建立 SDXL ControlNet Pipeline (支援多重控制，共享同一個模型實體以節省 VRAM)
        self.pipeline = StableDiffusionXLControlNetPipeline.from_pretrained(
            base_model_id,
            controlnet=[controlnet, controlnet, controlnet], # 預設支援最多 3 層控制
            torch_dtype=torch.float16,
            use_safetensors=True
        )
        
        # 3. 優化 (使用固定 VAE 修正與記憶體優化)
        self.pipeline.vae = AutoencoderKL.from_pretrained(
            "madebyollin/sdxl-vae-fp16-fix", 
            torch_dtype=torch.float16
        )
        self.pipeline.scheduler = DPMSolverMultistepScheduler.from_config(self.pipeline.scheduler.config)
        self.pipeline.enable_model_cpu_offload() # 節省 VRAM
        
        self.map_location = "cpu"
        if torch.cuda.is_available():
            self.map_location = "cuda"
            
        self.device = torch.device(self.map_location)
        self.pipeline.to(self.device)
        self.storage_client = storage.Client()
        self.bucket_name = "game-485606-vertex-staging"
        
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

        # 將結果存入 GCS (解決 gRPC 1.6MB 限制)
        output_results = []
        bucket = self.storage_client.bucket(self.bucket_name)
        
        for i, img in enumerate(results):
            # 檔名使用隨機或時間戳
            filename = f"output_{os.urandom(4).hex()}.png"
            blob = bucket.blob(f"predictions/{filename}")
            
            buffered = io.BytesIO()
            img.save(buffered, format="PNG")
            img_data = buffered.getvalue()
            
            # 上傳至 GCS
            blob.upload_from_string(img_data, content_type="image/png")
            gcs_uri = f"gs://{self.bucket_name}/predictions/{filename}"
            
            output_results.append({
                "gcs_uri": gcs_uri,
                "message": "影像已儲存至 GCS 以避開傳輸限制。"
            })

        return output_results
