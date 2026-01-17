import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

api_key = os.environ.get('GEMINI_API_KEY')
genai.configure(api_key=api_key)

models_to_try = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-pro'
]

for model_name in models_to_try:
    print(f"Testing {model_name}...")
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Hello")
        print(f"SUCCESS: {model_name}")
        print(response.text)
        break
    except Exception as e:
        print(f"FAILED: {model_name} - {e}")
