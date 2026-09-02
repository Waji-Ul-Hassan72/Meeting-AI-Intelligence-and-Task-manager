
import os
import re
import uuid
import smtplib

from datetime import datetime
from email.message import EmailMessage

from dotenv import load_dotenv


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()


EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")


# ============================================================
# SMTP CONFIGURATION
# ============================================================

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


# ============================================================
# VALIDATE EMAIL CONFIGURATION
# ============================================================

if not EMAIL_USER:
    print("WARNING: EMAIL_USER is missing from .env")

if not EMAIL_PASS:
    print("WARNING: EMAIL_PASS is missing from .env")


# ============================================================
# EMAIL VALIDATION
# ============================================================

EMAIL_REGEX = re.compile(
    r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
)


def is_valid_email(email):
    """
    Check whether an email address is valid.
    """

    if not email:
        return False

    return bool(
        EMAIL_REGEX.match(
            str(email).strip()
        )
    )


# ============================================================
# CLEAN TEXT
# ============================================================

def clean_text(value):
    """
    Safely convert a value to a clean string.
    """

    if value is None:
        return ""

    return str(value).strip()


# ============================================================
# CREATE EMAIL DRAFT
# ============================================================

def create_email_draft(
    recipient_name,
    recipient_email,
    subject,
    body
):
    """
    Create an email draft.

    IMPORTANT:
    This function DOES NOT send the email.

    It only creates the draft that will be shown
    to the manager for review/editing.
    """

    recipient_name = clean_text(
        recipient_name
    )

    recipient_email = clean_text(
        recipient_email
    )

    subject = clean_text(
        subject
    )

    body = clean_text(
        body
    )

    # --------------------------------------------------------
    # VALIDATE RECIPIENT
    # --------------------------------------------------------

    if not recipient_email:
        raise ValueError(
            "Recipient email is required."
        )

    if not is_valid_email(
        recipient_email
    ):
        raise ValueError(
            "Invalid recipient email address."
        )

    # --------------------------------------------------------
    # VALIDATE SUBJECT
    # --------------------------------------------------------

    if not subject:
        raise ValueError(
            "Email subject is required."
        )

    # --------------------------------------------------------
    # VALIDATE BODY
    # --------------------------------------------------------

    if not body:
        raise ValueError(
            "Email body is required."
        )

    # --------------------------------------------------------
    # CREATE UNIQUE DRAFT ID
    # --------------------------------------------------------

    draft_id = str(
        uuid.uuid4()
    )

    # --------------------------------------------------------
    # CREATE DRAFT
    # --------------------------------------------------------

    draft = {

        "draft_id": draft_id,

        "to": {
            "name": recipient_name,
            "email": recipient_email
        },

        "subject": subject,

        "body": body,

        "status": "draft",

        "created_at": (
            datetime.utcnow()
            .isoformat()
            + "Z"
        ),

        "approved_at": None,

        "sent_at": None
    }

    return draft


# ============================================================
# UPDATE EMAIL DRAFT
# ============================================================

def update_email_draft(
    draft,
    recipient_name=None,
    recipient_email=None,
    subject=None,
    body=None
):
    """
    Update an existing email draft.

    The email is NOT sent.

    The draft remains in "draft" status after editing.
    """

    if not isinstance(
        draft,
        dict
    ):
        raise ValueError(
            "Invalid email draft."
        )

    updated_draft = dict(
        draft
    )

    # --------------------------------------------------------
    # UPDATE RECIPIENT
    # --------------------------------------------------------

    current_to = dict(
        updated_draft.get(
            "to",
            {}
        )
    )

    if recipient_name is not None:

        current_to["name"] = clean_text(
            recipient_name
        )

    if recipient_email is not None:

        recipient_email = clean_text(
            recipient_email
        )

        if not is_valid_email(
            recipient_email
        ):
            raise ValueError(
                "Invalid recipient email address."
            )

        current_to["email"] = (
            recipient_email
        )

    updated_draft["to"] = current_to

    # --------------------------------------------------------
    # UPDATE SUBJECT
    # --------------------------------------------------------

    if subject is not None:

        subject = clean_text(
            subject
        )

        if not subject:
            raise ValueError(
                "Email subject cannot be empty."
            )

        updated_draft[
            "subject"
        ] = subject

    # --------------------------------------------------------
    # UPDATE BODY
    # --------------------------------------------------------

    if body is not None:

        body = clean_text(
            body
        )

        if not body:
            raise ValueError(
                "Email body cannot be empty."
            )

        updated_draft[
            "body"
        ] = body

    # --------------------------------------------------------
    # KEEP AS DRAFT
    # --------------------------------------------------------

    updated_draft[
        "status"
    ] = "draft"

    return updated_draft


# ============================================================
# APPROVE EMAIL DRAFT
# ============================================================

def approve_email_draft(draft):
    """
    Approve an email draft.

    IMPORTANT:
    Approval DOES NOT send the email.

    The manager must explicitly call send_email()
    after approval.
    """

    if not isinstance(
        draft,
        dict
    ):
        raise ValueError(
            "Invalid email draft."
        )

    if draft.get("status") == "sent":

        raise ValueError(
            "This email has already been sent."
        )

    recipient = draft.get(
        "to",
        {}
    )

    recipient_email = clean_text(
        recipient.get("email")
    )

    subject = clean_text(
        draft.get("subject")
    )

    body = clean_text(
        draft.get("body")
    )

    # --------------------------------------------------------
    # VALIDATE
    # --------------------------------------------------------

    if not is_valid_email(
        recipient_email
    ):
        raise ValueError(
            "Invalid recipient email address."
        )

    if not subject:
        raise ValueError(
            "Email subject is required."
        )

    if not body:
        raise ValueError(
            "Email body is required."
        )

    # --------------------------------------------------------
    # APPROVE
    # --------------------------------------------------------

    approved_draft = dict(
        draft
    )

    approved_draft[
        "status"
    ] = "approved"

    approved_draft[
        "approved_at"
    ] = (
        datetime.utcnow()
        .isoformat()
        + "Z"
    )

    return approved_draft


# ============================================================
# SEND EMAIL
# ============================================================

def send_email(draft):
    """
    Send an approved email through Gmail SMTP.

    The email MUST be approved before it can be sent.
    """

    # --------------------------------------------------------
    # VALIDATE DRAFT
    # --------------------------------------------------------

    if not isinstance(
        draft,
        dict
    ):
        raise ValueError(
            "Invalid email draft."
        )

    # --------------------------------------------------------
    # CHECK EMAIL CONFIGURATION
    # --------------------------------------------------------

    if not EMAIL_USER:
        raise RuntimeError(
            "EMAIL_USER is missing from the .env file."
        )

    if not EMAIL_PASS:
        raise RuntimeError(
            "EMAIL_PASS is missing from the .env file."
        )

    # --------------------------------------------------------
    # CHECK APPROVAL
    # --------------------------------------------------------

    status = draft.get(
        "status"
    )

    if status != "approved":

        raise ValueError(
            "Email must be approved before sending."
        )

    # --------------------------------------------------------
    # GET RECIPIENT
    # --------------------------------------------------------

    recipient = draft.get(
        "to",
        {}
    )

    recipient_name = clean_text(
        recipient.get("name")
    )

    recipient_email = clean_text(
        recipient.get("email")
    )

    # --------------------------------------------------------
    # GET SUBJECT AND BODY
    # --------------------------------------------------------

    subject = clean_text(
        draft.get("subject")
    )

    body = clean_text(
        draft.get("body")
    )

    # --------------------------------------------------------
    # VALIDATE
    # --------------------------------------------------------

    if not is_valid_email(
        recipient_email
    ):
        raise ValueError(
            "Invalid recipient email address."
        )

    if not subject:
        raise ValueError(
            "Email subject is required."
        )

    if not body:
        raise ValueError(
            "Email body is required."
        )

    # --------------------------------------------------------
    # CREATE EMAIL
    # --------------------------------------------------------

    message = EmailMessage()

    message["From"] = EMAIL_USER

    message["To"] = recipient_email

    message["Subject"] = subject

    # --------------------------------------------------------
    # EMAIL BODY
    # --------------------------------------------------------

    greeting = ""

    if recipient_name:

        greeting = (
            f"Hi {recipient_name},\n\n"
        )

    message.set_content(
        greeting + body
    )

    # --------------------------------------------------------
    # CONNECT TO GMAIL SMTP
    # --------------------------------------------------------

    try:

        print(
            "\n=========================================="
        )

        print(
            "CONNECTING TO EMAIL SERVER"
        )

        print(
            "=========================================="
        )

        with smtplib.SMTP(
            SMTP_HOST,
            SMTP_PORT
        ) as server:

            # ------------------------------------------------
            # START TLS
            # ------------------------------------------------

            server.starttls()

            # ------------------------------------------------
            # LOGIN
            # ------------------------------------------------

            server.login(
                EMAIL_USER,
                EMAIL_PASS
            )

            # ------------------------------------------------
            # SEND
            # ------------------------------------------------

            server.send_message(
                message
            )

        print(
            "Email sent successfully."
        )

    except smtplib.SMTPAuthenticationError:

        raise RuntimeError(
            "Email authentication failed. "
            "Check EMAIL_USER and EMAIL_PASS. "
            "For Gmail, EMAIL_PASS should normally be "
            "a Google App Password, not your normal "
            "Gmail password."
        )

    except smtplib.SMTPException as error:

        raise RuntimeError(
            f"SMTP email sending failed: {str(error)}"
        )

    except Exception as error:

        raise RuntimeError(
            f"Email sending failed: {str(error)}"
        )

    # --------------------------------------------------------
    # UPDATE STATUS
    # --------------------------------------------------------

    sent_draft = dict(
        draft
    )

    sent_draft[
        "status"
    ] = "sent"

    sent_draft[
        "sent_at"
    ] = (
        datetime.utcnow()
        .isoformat()
        + "Z"
    )

    return sent_draft


# ============================================================
# APPROVE AND SEND
# ============================================================

def approve_and_send_email(draft):
    """
    Convenience function.

    Flow:

    Draft
      ↓
    Approve
      ↓
    Send
      ↓
    Sent
    """

    approved_draft = (
        approve_email_draft(
            draft
        )
    )

    sent_draft = (
        send_email(
            approved_draft
        )
    )

    return sent_draft

