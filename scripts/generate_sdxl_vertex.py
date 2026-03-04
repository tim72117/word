import os
import sys
import base64
import json
from google.cloud import aiplatform

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def generate_sdxl_morph(endpoint_id, input_image_path, prompt, output_path, project_id, location="us-central1", control_image_path=None, strength=0.5, guidance_scale=7.5, control_scale=1.2, negative_prompt="", num_inference_steps=30):
    """
    Calls a Vertex AI Endpoint running Stable Diffusion XL.
    Supports Image-to-Image, ControlNet, and Negative Prompts.
    """
    aiplatform.init(project=project_id, location=location)
    endpoint = aiplatform.Endpoint(endpoint_id)

    # Encode initial image for image-to-image / morphing
    encoded_image = encode_image(input_image_path)

    # Standard Model Garden SDXL request format
    instance = {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "image": encoded_image,
        "num_inference_steps": int(num_inference_steps),
        "guidance_scale": float(guidance_scale),
        "strength": float(strength),
    }

    if control_image_path:
        # 支援多重控制 (逗號分隔的路徑或列表)
        if isinstance(control_image_path, str):
            ctrl_paths = [p.strip() for p in control_image_path.split(",")]
        else:
            ctrl_paths = control_image_path
            
        print(f"Applying Multi-ControlNet: {ctrl_paths}")
        encoded_controls = [encode_image(p) for p in ctrl_paths]
        
        # 處理權重 (逗號分隔或列表)
        if isinstance(control_scale, str):
            ctrl_scales = [float(s.strip()) for s in control_scale.split(",")]
        elif isinstance(control_scale, (float, int)):
            ctrl_scales = [float(control_scale)] * len(ctrl_paths)
        else:
            ctrl_scales = control_scale

        instance["image"] = encoded_controls 
        instance["controlnet_conditioning_scale"] = ctrl_scales

    print(f"Connecting to Endpoint: {endpoint_id} in {location}")
    print(f"Parameters: Steps={num_inference_steps}, Strength={strength}, Guidance={guidance_scale}, ControlScales={instance.get('controlnet_conditioning_scale', control_scale)}")
    print(f"Prompt: {prompt}")

    try:
        response = endpoint.predict(instances=[instance])

        if not response.predictions:
            print("Error: No predictions returned from endpoint.")
            print(f"Full response: {response}")
            return

        print(f"Received {len(response.predictions)} prediction(s).")

        from google.cloud import storage
        storage_client = storage.Client(project=project_id)

        for i, prediction in enumerate(response.predictions):
            gcs_uri = prediction.get("gcs_uri")
            image_data_str = prediction.get("image")
            
            if gcs_uri:
                print(f"Downloading from GCS: {gcs_uri}")
                bucket_name = gcs_uri.split("/")[2]
                blob_path = "/".join(gcs_uri.split("/")[3:])
                bucket = storage_client.bucket(bucket_name)
                blob = bucket.blob(blob_path)
                blob.download_to_filename(output_path)
                print(f"Successfully saved GCS result to: {output_path}")
                break
            elif image_data_str:
                try:
                    image_data = base64.b64decode(image_data_str)
                    with open(output_path, "wb") as f:
                        f.write(image_data)
                    print(f"Successfully saved base64 result to: {output_path}")
                    break
                except Exception as b64e:
                    print(f"Base64 decode error: {b64e}")
            else:
                print("Error: Predicted result contains neither GCS URI nor Base64 image.")

    except Exception as e:
        print(f"Execution Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python generate_sdxl_vertex.py <EID> <IN_IMG> <PROMPT> <OUT_PATH> [PID] [LOC] [CTRL_IMG] [STRENGTH] [GUIDANCE] [CONTROL_SCALE] [NEGATIVE_PROMPT] [STEPS]")
        sys.exit(1)

    eid = sys.argv[1]
    img_path = sys.argv[2]
    pr = sys.argv[3]
    out = sys.argv[4]
    pid = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] != "None" else os.environ.get("GOOGLE_CLOUD_PROJECT")
    loc = sys.argv[6] if len(sys.argv) > 6 and sys.argv[6] != "None" else "us-central1"
    ctrl_path = sys.argv[7] if len(sys.argv) > 7 and sys.argv[7] != "None" else None
    str_val = sys.argv[8] if len(sys.argv) > 8 else 0.5
    gui_val = sys.argv[9] if len(sys.argv) > 9 else 7.5
    con_val = sys.argv[10] if len(sys.argv) > 10 else 1.2
    neg_pr = sys.argv[11] if len(sys.argv) > 11 else ""
    steps_val = sys.argv[12] if len(sys.argv) > 12 else 30

    generate_sdxl_morph(eid, img_path, pr, out, pid, loc, ctrl_path, str_val, gui_val, con_val, neg_pr, steps_val)
