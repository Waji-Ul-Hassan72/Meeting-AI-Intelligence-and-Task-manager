import whisper

model = whisper.load_model("tiny")

print("Whisper model loaded successfully!")

result = model.transcribe(
    r"C:\Deventities\CollabFlow-AI\ai-service\test.mp3",
    fp16=False
)

print("\nTRANSCRIPTION:")
print(result["text"])