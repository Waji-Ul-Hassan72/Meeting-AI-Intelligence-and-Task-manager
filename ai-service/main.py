from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Header
)
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

import tempfile
import os

from services.meeting_pipeline import process_meeting
from services.assistant_service import ask_ai_assistant


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="CollabFlow AI Service",
    version="1.0.0"
)


app = FastAPI(
    title="CollabFlow AI Service",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# ASSISTANT REQUEST MODEL
# ============================================================

class AssistantRequest(BaseModel):

    project_id: str
    question: str


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
# AI PROJECT ASSISTANT
# ============================================================

@app.post("/assistant")
async def project_assistant(
    request: AssistantRequest,
    authorization: str | None = Header(default=None)
):

    try:

        print("\n==========================================")
        print("AI ASSISTANT REQUEST")
        print("==========================================")

        print(
            "Project ID:",
            request.project_id
        )

        print(
            "Question:",
            request.question
        )

        # ====================================================
        # VALIDATE PROJECT ID
        # ====================================================

        if not request.project_id.strip():

            raise HTTPException(
                status_code=400,
                detail="Project ID is required."
            )

        # ====================================================
        # VALIDATE QUESTION
        # ====================================================

        if not request.question.strip():

            raise HTTPException(
                status_code=400,
                detail="Question is required."
            )

        # ====================================================
        # CHECK AUTHORIZATION
        # ====================================================

        if not authorization:

            raise HTTPException(
                status_code=401,
                detail="Authorization token is required."
            )

        if not authorization.startswith("Bearer "):

            raise HTTPException(
                status_code=401,
                detail="Invalid authorization header."
            )

        # ====================================================
        # EXTRACT JWT TOKEN
        # ====================================================

        token = authorization.replace(
            "Bearer ",
            "",
            1
        ).strip()

        if not token:

            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token."
            )

        # ====================================================
        # RUN AI ASSISTANT
        # ====================================================

        result = ask_ai_assistant(
            token=token,
            project_id=request.project_id,
            question=request.question
        )

        # ====================================================
        # PRINT RESPONSE
        # ====================================================

        print("\n==========================================")
        print("AI ASSISTANT RESPONSE")
        print("==========================================")

        print(
            result.get(
                "answer",
                ""
            )
        )

        print("==========================================")

        # ====================================================
        # RETURN RESPONSE
        # ====================================================

        return result

    except HTTPException:

        raise

    except ValueError as error:

        print(
            "Assistant validation error:",
            str(error)
        )

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:

        print("\n==========================================")
        print("❌ AI ASSISTANT ERROR")
        print("==========================================")

        print(
            type(error).__name__,
            ":",
            str(error)
        )

        print("==========================================")

        raise HTTPException(
            status_code=500,
            detail="AI assistant failed."
        )


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

        print(
            "Filename:",
            file.filename
        )

        print(
            "Content type:",
            file.content_type
        )

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
        # RUN COMPLETE MEETING PIPELINE
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

                os.remove(
                    temp_path
                )

                print(
                    "🗑️ Temporary meeting audio deleted."
                )

            except Exception as error:

                print(
                    "Could not delete temporary meeting file:",
                    str(error)
                )