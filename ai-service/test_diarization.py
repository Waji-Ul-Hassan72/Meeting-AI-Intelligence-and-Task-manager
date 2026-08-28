import os
import subprocess
from dotenv import load_dotenv
import torch
import whisper
from pyannote.audio import Pipeline

# ==========================================
# LOAD ENVIRONMENT VARIABLES
# ==========================================

load_dotenv()

# ==========================================
# CONFIGURATION
# ==========================================

AUDIO_FILE = "./test.mp3"
HF_TOKEN = os.getenv("HF_TOKEN")

# For your Ryzen 5 3500U + 16GB RAM + no GPU
WHISPER_MODEL = "tiny"

if not HF_TOKEN:
    raise RuntimeError(
        "HF_TOKEN is missing. Add your Hugging Face token to the .env file."
    )

# ==========================================
# CHECK AUDIO FILE
# ==========================================

if not os.path.exists(AUDIO_FILE):
    raise FileNotFoundError(f"Audio file not found: {AUDIO_FILE}")

# ==========================================
# STEP 1: LOAD WHISPER
# ==========================================

print()
print("==========================================")
print("STEP 1: LOADING WHISPER")
print("==========================================")

print(f"Loading Whisper model: {WHISPER_MODEL}")

whisper_model = whisper.load_model(WHISPER_MODEL, device="cpu")

print("Whisper model loaded successfully.")

# ==========================================
# STEP 2: WHISPER TRANSCRIPTION
# ==========================================

print()
print("==========================================")
print("STEP 2: WHISPER TRANSCRIPTION")
print("==========================================")

print("Converting speech into text...")
print("Please wait...")

whisper_result = whisper_model.transcribe(
    AUDIO_FILE, language="en", fp16=False, verbose=False
)

whisper_segments = whisper_result["segments"]

print("Whisper transcription completed.")
print(f"Whisper found {len(whisper_segments)} segments.")

# ==========================================
# DISPLAY WHISPER SEGMENTS
# ==========================================

print()
print("==========================================")
print("WHISPER SEGMENTS")
print("==========================================")

for segment in whisper_segments:
    start = segment["start"]
    end = segment["end"]
    text = segment["text"].strip()

    print(f"{start:.2f}s --> {end:.2f}s : {text}")

# ==========================================
# STEP 3: LOAD AUDIO USING FFMPEG
# ==========================================

print()
print("==========================================")
print("STEP 3: LOADING AUDIO")
print("==========================================")

print("Loading audio using FFmpeg...")

command = [
    "ffmpeg",
    "-i",
    AUDIO_FILE,
    "-f",
    "s16le",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-",
]

process = subprocess.run(
    command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True
)

audio_bytes = process.stdout

print("Audio loaded successfully.")

# ==========================================
# STEP 4: CONVERT AUDIO TO PYTORCH TENSOR
# ==========================================

print()
print("==========================================")
print("STEP 4: CONVERTING AUDIO")
print("==========================================")

audio_tensor = (
    torch.frombuffer(bytearray(audio_bytes), dtype=torch.int16).float()
    / 32768.0
)

audio_tensor = audio_tensor.unsqueeze(0)

audio_file = {"waveform": audio_tensor, "sample_rate": 16000}

print("Audio converted to PyTorch tensor.")

# ==========================================
# STEP 5: LOAD PYANNOTE
# ==========================================

print()
print("==========================================")
print("STEP 5: LOADING PYANNOTE")
print("==========================================")

print("Loading speaker diarization model...")
print("Please wait...")

pipeline = Pipeline.from_pretrained(
    "pyannote/speaker-diarization-3.1", token=HF_TOKEN
)

if pipeline is None:
    raise RuntimeError("Failed to load the speaker diarization pipeline.")

print("Speaker diarization model loaded successfully.")

# ==========================================
# STEP 6: RUN SPEAKER DIARIZATION
# ==========================================

print()
print("==========================================")
print("STEP 6: SPEAKER DIARIZATION")
print("==========================================")

print("Detecting speakers...")
print("Please wait...")

diarization = pipeline(audio_file)

print("Speaker diarization completed.")

# ==========================================
# GET SPEAKER ANNOTATION
# ==========================================

annotation = diarization.speaker_diarization

# ==========================================
# STORE SPEAKER SEGMENTS
# ==========================================

speaker_segments = []

for turn, _, speaker in annotation.itertracks(yield_label=True):
    speaker_segments.append(
        {"start": turn.start, "end": turn.end, "speaker": speaker}
    )

# ==========================================
# DISPLAY SPEAKER SEGMENTS
# ==========================================

print()
print("==========================================")
print("SPEAKER SEGMENTS")
print("==========================================")

for segment in speaker_segments:
    print(
        f"{segment['start']:.2f}s --> "
        f"{segment['end']:.2f}s : "
        f"{segment['speaker']}"
    )

# ==========================================
# STEP 7: MATCH WHISPER WITH SPEAKER
# ==========================================

print()
print("==========================================")
print("STEP 7: MATCHING SPEAKERS WITH TEXT")
print("==========================================")

print("Matching timestamps...")


def calculate_overlap(whisper_start, whisper_end, speaker_start, speaker_end):
    """Calculate the amount of time that

    Whisper and speaker segments overlap.
    """
    overlap_start = max(whisper_start, speaker_start)
    overlap_end = min(whisper_end, speaker_end)

    overlap = overlap_end - overlap_start

    if overlap < 0:
        return 0

    return overlap


# ==========================================
# CREATE FINAL TRANSCRIPT
# ==========================================

final_transcript = []

for whisper_segment in whisper_segments:
    whisper_start = whisper_segment["start"]
    whisper_end = whisper_segment["end"]
    text = whisper_segment["text"].strip()

    if not text:
        continue

    best_speaker = "UNKNOWN"
    best_overlap = 0

    # Compare Whisper segment
    # with every speaker segment
    for speaker_segment in speaker_segments:
        speaker_start = speaker_segment["start"]
        speaker_end = speaker_segment["end"]
        speaker = speaker_segment["speaker"]

        overlap = calculate_overlap(
            whisper_start, whisper_end, speaker_start, speaker_end
        )

        # Keep the speaker with
        # the largest overlap
        if overlap > best_overlap:
            best_overlap = overlap
            best_speaker = speaker

    # Save final result
    final_transcript.append(
        {
            "start": whisper_start,
            "end": whisper_end,
            "speaker": best_speaker,
            "text": text,
        }
    )

# ==========================================
# STEP 8: DISPLAY FINAL TRANSCRIPT
# ==========================================

print()
print()
print("==========================================")
print("FINAL SPEAKER TRANSCRIPT")
print("==========================================")

for segment in final_transcript:
    start = segment["start"]
    end = segment["end"]
    speaker = segment["speaker"]
    text = segment["text"]

    print()
    print(f"[{start:.2f}s - {end:.2f}s] " f"{speaker}")
    print(text)

# ==========================================
# FINAL RESULT
# ==========================================

print()
print("==========================================")
print("PIPELINE COMPLETED")
print("==========================================")

print(f"Whisper segments: {len(whisper_segments)}")
print(f"Speaker segments: {len(speaker_segments)}")
print(f"Final transcript segments: {len(final_transcript)}")
print("==========================================")