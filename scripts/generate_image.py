"""
RescueLoop Image Generation Utility
Uses OpenRouter API to generate images via Recraft or other supported models.
"""

import os
import json
import base64
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR / "backend" / ".env")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

def generate_image(prompt: str, model: str = "recraft/recraft-v4.1-flash-v2:free", output_filename: str = "output_0.png"):
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY is not set in environment or .env file.")

    url = "https://openrouter.ai/api/v1/images"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "prompt": prompt
    }

    print(f"Generating image with model '{model}'...")
    response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=90)
    
    if response.status_code != 200:
        raise RuntimeError(f"OpenRouter API error ({response.status_code}): {response.text}")

    result = response.json()
    images = result.get("data", [])
    
    if not images:
        print("No image data returned in response.")
        return []

    saved_files = []
    for i, image in enumerate(images):
        if "b64_json" in image:
            image_bytes = base64.b64decode(image["b64_json"])
            fname = output_filename if len(images) == 1 else f"{Path(output_filename).stem}_{i}.png"
            with open(fname, "wb") as f:
                f.write(image_bytes)
            print(f"Saved: {fname} ({len(image_bytes)} bytes)")
            saved_files.append(fname)

    return saved_files

if __name__ == "__main__":
    import sys
    prompt = sys.argv[1] if len(sys.argv) > 1 else "A serene mountain landscape at sunset with dramatic clouds"
    generate_image(prompt)
