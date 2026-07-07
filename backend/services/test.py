from google import genai

client = genai.Client(api_key="AIzaSyArA3dSQ7YmX1WTH09UzlEt7PsM522bYTE")

response = client.models.generate_content(
    model="gemini-3-flash-preview", contents="Create a Dog Image"
)
print(response.text)