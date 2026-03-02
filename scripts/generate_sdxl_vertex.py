import os
import sys
import base64
import json
from google.cloud import aiplatform

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def generate_sdxl_morph(endpoint_id, input_image_path, prompt, output_path, project_id, location="us-central1"):
    """
    Calls a Vertex AI Endpoint running SDXL Lightning.
    Note: The request/response format depends on the specific Model Garden deployment.
    This template assumes the standard SDXL Model Garden container format.
    """
    aiplatform.init(project=project_id, location=location)
    endpoint = aiplatform.Endpoint(endpoint_id)

    # Encode initial image for image-to-image / morphing
    encoded_image = encode_image(input_image_path)

    # Standard Model Garden SDXL request format
    # This may vary depending on the specific deployment template used.
    instance = {
        "prompt": prompt,
        "image": encoded_image,
        "num_inference_steps": 4, # SDXL Lightning optimization
        "guidance_scale": 0.0,    # SDXL Lightning usually uses 0 or very low guidance
    }

    print(f"Connecting to Endpoint: {endpoint_id}")
    print(f"Prompt: {prompt}")

    try:
        response = endpoint.predict(instances=[instance])

        # Typically returns a list of base64 strings
        for i, prediction in enumerate(response.predictions):
            # The key might be 'b64' or 'image' depending on container
            image_data = base64.b64decode(prediction)

            with open(output_path, "wb") as f:
                f.write(image_data)
            print(f"Saved generated image to: {output_path}")
            break # Only save first result

    except Exception as e:
        print(f"Error calling Vertex AI Endpoint: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python generate_sdxl_vertex.py <ENDPOINT_ID> <INPUT_IMAGE> <PROMPT> <OUTPUT_PATH> [PROJECT_ID]")
        sys.exit(1)

    eid = sys.argv[1]
    img_path = sys.argv[2]
    pr = sys.argv[3]
    out = sys.argv[4]
    pid = sys.argv[5] if len(sys.argv) > 5 else os.environ.get("GOOGLE_CLOUD_PROJECT")

    if not pid:
        print("Error: Project ID required.")
        sys.exit(1)

    generate_sdxl_morph(eid, img_path, pr, out, pid)
