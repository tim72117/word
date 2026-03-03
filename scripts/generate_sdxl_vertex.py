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
        print(f"Applying ControlNet Sketch: {control_image_path}")
        encoded_control = encode_image(control_image_path)
        instance["control_image"] = encoded_control
        instance["controlnet_conditioning_scale"] = float(control_scale)

    print(f"Connecting to Endpoint: {endpoint_id} in {location}")
    print(f"Parameters: Steps={num_inference_steps}, Strength={strength}, Guidance={guidance_scale}, ControlScale={control_scale}")
    print(f"Prompt: {prompt}")

    try:
        response = endpoint.predict(instances=[instance])

        if not response.predictions:
            print("Error: No predictions returned from endpoint.")
            print(f"Full response: {response}")
            return

        print(f"Received {len(response.predictions)} prediction(s).")

        for i, prediction in enumerate(response.predictions):
            if isinstance(prediction, dict):
                image_data_str = prediction.get('b64') or prediction.get('image') or prediction.get('bytes') or prediction.get('output')
                if not image_data_str:
                    for k, v in prediction.items():
                        if isinstance(v, str) and len(v) > 100:
                            image_data_str = v
                            break
            else:
                image_data_str = prediction

            if not image_data_str:
                print(f"Error: Could not extract image data from prediction {i}")
                continue

            try:
                image_data = base64.b64decode(image_data_str)
                with open(output_path, "wb") as f:
                    f.write(image_data)
                print(f"Successfully saved to: {output_path}")
                break
            except Exception as b64e:
                print(f"Base64 decode error on prediction {i}: {b64e}")

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
