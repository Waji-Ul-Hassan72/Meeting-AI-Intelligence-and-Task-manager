
from fastapi import FastAPI, UploadFile, File, HTTPException
import tempfile
import os
from services.meeting_pipeline import process_meeting


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="CollabFlow AI Service",
    version="1.0.0"
)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "success": True,
        "message": "AI service is running"
    }


# ============================================================
# COMPLETE MEETING AI PIPELINE
# ============================================================

@app.post("/process-meeting")
async def process_meeting_audio(
    file: UploadFile = File(...)
):

    temp_path = None

    try:

        print("\n==========================================")
        print("MEETING AUDIO RECEIVED")
        print("==========================================")

        print("Filename:", file.filename)
        print("Content type:", file.content_type)

        # ====================================================
        # VALIDATE FILE
        # ====================================================

        if not file.filename:

            raise HTTPException(
                status_code=400,
                detail="Audio file is required."
            )

        # ====================================================
        # GET FILE EXTENSION
        # ====================================================

        extension = os.path.splitext(
            file.filename
        )[1]

        if not extension:
            extension = ".webm"

        # ====================================================
        # SAVE TEMPORARY FILE
        # ====================================================

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension
        ) as temp_file:

            temp_path = temp_file.name

            content = await file.read()

            temp_file.write(content)

        print(
            "Temporary audio:",
            temp_path
        )

        print(
            "Audio size:",
            len(content),
            "bytes"
        )

        # ====================================================
        # RUN COMPLETE PIPELINE
        # ====================================================

        print("\n==========================================")
        print("STARTING MEETING AI PIPELINE")
        print("==========================================")

        result = process_meeting(
            temp_path
        )

        print("\n==========================================")
        print("MEETING AI PIPELINE COMPLETED")
        print("==========================================")

        print(
            "Total speaker turns:",
            len(result)
        )

        # ====================================================
        # RETURN RESULT
        # ====================================================

        return {

            "success": True,

            "message":
                "Meeting processed successfully.",

            "segments": result
        }

    except HTTPException:

        raise

    except Exception as error:

        print("\n==========================================")
        print("❌ MEETING PIPELINE ERROR")
        print("==========================================")

        print(
            type(error).__name__,
            ":",
            str(error)
        )

        print("==========================================")

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    finally:

        # ====================================================
        # DELETE TEMPORARY FILE
        # ====================================================

        if (
            temp_path
            and os.path.exists(temp_path)
        ):

            try:

                os.remove(temp_path)

                print(
                    "🗑️ Temporary meeting audio deleted."
                )

            except Exception as error:

                print(
                    "Could not delete temporary meeting file:",
                    str(error)
                )

