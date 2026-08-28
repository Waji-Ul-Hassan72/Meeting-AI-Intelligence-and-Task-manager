import os
import subprocess
import tempfile

import torch
import whisper
from dotenv import load_dotenv
from pyannote.audio import Pipeline


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")

if not HF_TOKEN:
    raise RuntimeError(
        "HF_TOKEN is missing. Add it to the .env file."
    )


# ============================================================
# LOAD WHISPER MODEL
# ============================================================

print("Loading Whisper model...")

whisper_model = whisper.load_model("base")

print("Whisper model loaded successfully.")


# ============================================================
# LOAD PYANNOTE
# ============================================================

print("Loading speaker diarization model...")

diarization_pipeline = Pipeline.from_pretrained(
    "pyannote/speaker-diarization-3.1",
    token=HF_TOKEN
)

if diarization_pipeline is None:
    raise RuntimeError(
        "Failed to load speaker diarization model."
    )

print("Speaker diarization model loaded successfully.")


# ============================================================
# CONVERT AUDIO TO WAV
# ============================================================

def convert_audio_to_wav(audio_path):
    """
    Convert any supported input audio into:

    WAV
    mono
    16 kHz
    PCM 16-bit

    This makes browser-recorded WebM audio much more
    reliable for Whisper and PyAnnote.
    """

    if not os.path.exists(audio_path):
        raise FileNotFoundError(
            f"Audio file not found: {audio_path}"
        )

    wav_fd, wav_path = tempfile.mkstemp(
        suffix=".wav"
    )

    os.close(wav_fd)

    command = [
        "ffmpeg",
        "-y",
        "-i",
        audio_path,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-acodec",
        "pcm_s16le",
        wav_path
    ]

    print("\n==========================================")
    print("CONVERTING AUDIO TO WAV")
    print("==========================================")

    print("Input:", audio_path)
    print("Output:", wav_path)

    try:

        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        if result.returncode != 0:

            print("\nFFMPEG ERROR:")
            print(result.stderr)

            raise RuntimeError(
                "FFmpeg failed to convert the audio."
            )

        if not os.path.exists(wav_path):
            raise RuntimeError(
                "FFmpeg finished but WAV file was not created."
            )

        wav_size = os.path.getsize(wav_path)

        print(
            "WAV created successfully."
        )

        print(
            "WAV size:",
            wav_size,
            "bytes"
        )

        if wav_size == 0:
            raise RuntimeError(
                "Generated WAV file is empty."
            )

        return wav_path

    except Exception:

        if os.path.exists(wav_path):
            os.remove(wav_path)

        raise


# ============================================================
# LOAD AUDIO USING FFMPEG
# ============================================================

def load_audio_with_ffmpeg(audio_path):

    command = [
        "ffmpeg",
        "-i",
        audio_path,
        "-f",
        "s16le",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-"
    ]

    process = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True
    )

    audio_bytes = process.stdout

    if not audio_bytes:
        raise RuntimeError(
            "FFmpeg returned empty audio data."
        )

    audio_tensor = torch.frombuffer(
        bytearray(audio_bytes),
        dtype=torch.int16
    ).float() / 32768.0

    audio_tensor = audio_tensor.unsqueeze(0)

    return {
        "waveform": audio_tensor,
        "sample_rate": 16000
    }


# ============================================================
# FIND SPEAKER
# ============================================================

def find_speaker(
    start_time,
    end_time,
    speaker_segments
):

    best_speaker = "UNKNOWN"
    best_overlap = 0.0

    for speaker_segment in speaker_segments:

        speaker_start = speaker_segment["start"]
        speaker_end = speaker_segment["end"]

        overlap_start = max(
            start_time,
            speaker_start
        )

        overlap_end = min(
            end_time,
            speaker_end
        )

        overlap = max(
            0.0,
            overlap_end - overlap_start
        )

        if overlap > best_overlap:

            best_overlap = overlap
            best_speaker = speaker_segment["speaker"]

    return best_speaker


# ============================================================
# GROUP SPEAKER SEGMENTS
# ============================================================

def group_by_speaker(combined_segments):

    grouped_segments = []

    for segment in combined_segments:

        text = segment["text"].strip()

        if not text:
            continue

        if not grouped_segments:

            grouped_segments.append({
                "start": segment["start"],
                "end": segment["end"],
                "speaker": segment["speaker"],
                "text": text
            })

            continue

        current = grouped_segments[-1]

        if current["speaker"] == segment["speaker"]:

            current["end"] = segment["end"]

            current["text"] = (
                current["text"].rstrip()
                + " "
                + text
            )

        else:

            grouped_segments.append({
                "start": segment["start"],
                "end": segment["end"],
                "speaker": segment["speaker"],
                "text": text
            })

    return grouped_segments


# ============================================================
# MAIN MEETING PIPELINE
# ============================================================

def process_meeting(audio_path):

    if not os.path.exists(audio_path):

        raise FileNotFoundError(
            f"Audio file not found: {audio_path}"
        )

    print("\n==========================================")
    print("STARTING MEETING AI PIPELINE")
    print("==========================================")

    print(
        "Original audio:",
        audio_path
    )

    print(
        "Original audio size:",
        os.path.getsize(audio_path),
        "bytes"
    )

    # ========================================================
    # STEP 1 — CONVERT TO WAV
    # ========================================================

    print("\nSTEP 1: Converting audio to WAV...")

    wav_path = convert_audio_to_wav(
        audio_path
    )

    try:

        # ====================================================
        # STEP 2 — WHISPER
        # ====================================================

        print("\nSTEP 2: Running Whisper transcription...")

        whisper_result = whisper_model.transcribe(
            audio_path,
            fp16=False,
            temperature=0,
            condition_on_previous_text=False,
            language="en",
            no_speech_threshold=0.6,
            logprob_threshold=-0.5,
            compression_ratio_threshold=2.4
        )

        print(
            "Whisper detected language:",
            whisper_result.get(
                "language",
                "unknown"
            )
        )

        full_text = whisper_result.get(
            "text",
            ""
        ).strip()

        whisper_segments = whisper_result.get(
            "segments",
            []
        )

        print(
            "Whisper full text:"
        )

        print(
            repr(full_text)
        )

        print(
            "Whisper found",
            len(whisper_segments),
            "segments."
        )

        # ====================================================
        # IMPORTANT DEBUG CHECK
        # ====================================================

        if not whisper_segments:

            print("\n==========================================")
            print("WARNING: WHISPER FOUND NO SPEECH")
            print("==========================================")

            return []

        # ====================================================
        # PRINT WHISPER SEGMENTS
        # ====================================================

        print("\nWHISPER SEGMENTS:")

        for segment in whisper_segments:

            print(
                f"[{segment['start']:.2f}s - "
                f"{segment['end']:.2f}s] "
                f"{segment['text'].strip()}"
            )

        # ====================================================
        # STEP 3 — LOAD AUDIO FOR PYANNOTE
        # ====================================================

        print(
            "\nSTEP 3: Loading WAV for speaker diarization..."
        )

        audio = load_audio_with_ffmpeg(
            wav_path
        )

        print(
            "Audio loaded successfully."
        )

        # ====================================================
        # STEP 4 — SPEAKER DIARIZATION
        # ====================================================

        print(
            "\nSTEP 4: Running speaker diarization..."
        )

        diarization_result = (
            diarization_pipeline(audio)
        )

        print(
            "Speaker diarization completed."
        )

        # ====================================================
        # STEP 5 — GET SPEAKER SEGMENTS
        # ====================================================

        print(
            "\nSTEP 5: Extracting speaker segments..."
        )

        speaker_segments = []

        # Handle pyannote result
        if hasattr(
            diarization_result,
            "speaker_diarization"
        ):

            annotation = (
                diarization_result
                .speaker_diarization
            )

        else:

            annotation = diarization_result

        for turn, _, speaker in annotation.itertracks(
            yield_label=True
        ):

            speaker_segments.append({

                "start": float(
                    turn.start
                ),

                "end": float(
                    turn.end
                ),

                "speaker": speaker
            })

        print(
            "Found",
            len(speaker_segments),
            "speaker segments."
        )

        # ====================================================
        # PRINT SPEAKER SEGMENTS
        # ====================================================

        for speaker_segment in speaker_segments:

            print(
                f"[{speaker_segment['start']:.2f}s - "
                f"{speaker_segment['end']:.2f}s] "
                f"{speaker_segment['speaker']}"
            )

        # ====================================================
        # STEP 6 — MATCH WHISPER WITH SPEAKERS
        # ====================================================

        print(
            "\nSTEP 6: Matching transcription with speakers..."
        )

        combined_segments = []

        for segment in whisper_segments:

            start_time = float(
                segment["start"]
            )

            end_time = float(
                segment["end"]
            )

            text = segment["text"].strip()

            if not text:
                continue

            speaker = find_speaker(
                start_time,
                end_time,
                speaker_segments
            )

            combined_segments.append({

                "start": round(
                    start_time,
                    2
                ),

                "end": round(
                    end_time,
                    2
                ),

                "speaker": speaker,

                "text": text
            })

        print(
            "Matched",
            len(combined_segments),
            "transcription segments."
        )

        # ====================================================
        # STEP 7 — GROUP SPEAKER SEGMENTS
        # ====================================================

        print(
            "\nSTEP 7: Grouping consecutive speaker segments..."
        )

        grouped_segments = group_by_speaker(
            combined_segments
        )

        # ====================================================
        # FINAL RESULT
        # ====================================================

        print("\n==========================================")
        print("FINAL MEETING TRANSCRIPT")
        print("==========================================")

        for segment in grouped_segments:

            print(
                f"[{segment['start']:.2f}s - "
                f"{segment['end']:.2f}s] "
                f"{segment['speaker']}: "
                f"{segment['text']}"
            )

        print("\n==========================================")

        print(
            "Total speaker turns:",
            len(grouped_segments)
        )

        print("==========================================")

        return grouped_segments

    finally:

        # ====================================================
        # DELETE WAV
        # ====================================================

        if os.path.exists(wav_path):

            try:

                os.remove(wav_path)

                print(
                    "Temporary WAV deleted."
                )

            except Exception as error:

                print(
                    "Could not delete WAV:",
                    str(error)
                )