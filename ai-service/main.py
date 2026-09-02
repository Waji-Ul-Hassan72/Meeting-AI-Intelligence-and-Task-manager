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


# ============================================================
# AI SERVICES
# ============================================================

from services.meeting_pipeline import (
    process_meeting
)

from services.assistant_service import (
    ask_ai_assistant
)


# ============================================================
# EMAIL SERVICE
# ============================================================

from services.email_service import (
    create_email_draft,
    update_email_draft,
    approve_email_draft,
    send_email
)


# ============================================================
# FASTAPI APP
# ============================================================

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

    allow_methods=[
        "*"
    ],

    allow_headers=[
        "*"
    ]
)


# ============================================================
# ASSISTANT REQUEST MODEL
# ============================================================

class AssistantRequest(BaseModel):

    project_id: str

    question: str


# ============================================================
# EMAIL DRAFT REQUEST MODEL
# ============================================================

class EmailDraftRequest(BaseModel):

    recipient_name: str

    recipient_email: str

    subject: str

    body: str


# ============================================================
# EMAIL UPDATE REQUEST MODEL
# ============================================================

class EmailUpdateRequest(BaseModel):

    draft: dict

    recipient_name: str | None = None

    recipient_email: str | None = None

    subject: str | None = None

    body: str | None = None


# ============================================================
# EMAIL APPROVE REQUEST MODEL
# ============================================================

class EmailApproveRequest(BaseModel):

    draft: dict


# ============================================================
# EMAIL SEND REQUEST MODEL
# ============================================================

class EmailSendRequest(BaseModel):

    draft: dict


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
        # EXTRACT TOKEN
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
        print("AI ASSISTANT ERROR")
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
# CREATE EMAIL DRAFT
# ============================================================

@app.post("/email/draft")
async def create_email_draft_endpoint(
    request: EmailDraftRequest
):

    try:

        print("\n==========================================")
        print("CREATING EMAIL DRAFT")
        print("==========================================")

        print(
            "Recipient:",
            request.recipient_email
        )

        print(
            "Subject:",
            request.subject
        )

        # ====================================================
        # CREATE DRAFT
        # ====================================================

        draft = create_email_draft(

            recipient_name=request.recipient_name,

            recipient_email=request.recipient_email,

            subject=request.subject,

            body=request.body
        )

        print(
            "Draft ID:",
            draft.get("draft_id")
        )

        print(
            "Draft created successfully."
        )

        # ====================================================
        # RETURN DRAFT
        # ====================================================

        return {
            "success": True,
            "message": "Email draft created successfully.",
            "draft": draft
        }

    except ValueError as error:

        print(
            "Email draft validation error:",
            str(error)
        )

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:

        print(
            "Email draft creation error:",
            str(error)
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to create email draft."
        )


# ============================================================
# UPDATE EMAIL DRAFT
# ============================================================

@app.put("/email/draft")
async def update_email_draft_endpoint(
    request: EmailUpdateRequest
):

    try:

        print("\n==========================================")
        print("UPDATING EMAIL DRAFT")
        print("==========================================")

        # ====================================================
        # UPDATE DRAFT
        # ====================================================

        updated_draft = update_email_draft(

            draft=request.draft,

            recipient_name=request.recipient_name,

            recipient_email=request.recipient_email,

            subject=request.subject,

            body=request.body
        )

        print(
            "Draft updated successfully."
        )

        # ====================================================
        # RETURN UPDATED DRAFT
        # ====================================================

        return {
            "success": True,
            "message": "Email draft updated successfully.",
            "draft": updated_draft
        }

    except ValueError as error:

        print(
            "Email draft update validation error:",
            str(error)
        )

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:

        print(
            "Email draft update error:",
            str(error)
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to update email draft."
        )


# ============================================================
# APPROVE EMAIL DRAFT
# ============================================================

@app.post("/email/draft/approve")
async def approve_email_draft_endpoint(
    request: EmailApproveRequest
):

    try:

        print("\n==========================================")
        print("APPROVING EMAIL DRAFT")
        print("==========================================")

        # ====================================================
        # APPROVE DRAFT
        # ====================================================

        approved_draft = approve_email_draft(
            request.draft
        )

        print(
            "Draft approved successfully."
        )

        # ====================================================
        # RETURN APPROVED DRAFT
        # ====================================================

        return {
            "success": True,
            "message": "Email draft approved successfully.",
            "draft": approved_draft
        }

    except ValueError as error:

        print(
            "Email approval validation error:",
            str(error)
        )

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:

        print(
            "Email approval error:",
            str(error)
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to approve email draft."
        )


# ============================================================
# SEND APPROVED EMAIL
# ============================================================

@app.post("/email/send")
async def send_email_endpoint(
    request: EmailSendRequest
):

    try:

        print("\n==========================================")
        print("SENDING EMAIL")
        print("==========================================")

        draft = request.draft

        # ====================================================
        # CHECK DRAFT
        # ====================================================

        if not isinstance(
            draft,
            dict
        ):

            raise HTTPException(
                status_code=400,
                detail="Invalid email draft."
            )

        # ====================================================
        # IMPORTANT SECURITY CHECK
        # ====================================================
        #
        # Only an APPROVED email can be sent.
        #
        # This prevents:
        #
        # draft -> send
        #
        # without manager approval.
        #
        # Correct flow:
        #
        # draft
        #   ↓
        # edit
        #   ↓
        # approve
        #   ↓
        # send
        #
        # ====================================================

        if draft.get("status") != "approved":

            raise HTTPException(
                status_code=400,
                detail=(
                    "Email must be approved "
                    "before it can be sent."
                )
            )

        # ====================================================
        # SEND EMAIL
        # ====================================================

        result = send_email(
            draft
        )

        print(
            "Email sent successfully."
        )

        # ====================================================
        # RETURN RESULT
        # ====================================================

        return {
            "success": True,
            "message": "Email sent successfully.",
            "result": result
        }

    except HTTPException:

        raise

    except ValueError as error:

        print(
            "Email sending validation error:",
            str(error)
        )

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:

        print(
            "Email sending error:",
            type(error).__name__,
            ":",
            str(error)
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to send email."
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

            temp_file.write(
                content
            )

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
        # RUN MEETING PIPELINE
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
        print("MEETING PIPELINE ERROR")
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
        # DELETE TEMPORARY AUDIO
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
                    "Temporary meeting audio deleted."
                )

            except Exception as error:

                print(
                    "Could not delete temporary "
                    "meeting file:",
                    str(error)
                )