import os
import json
import re
from datetime import datetime, timedelta

from dotenv import load_dotenv
from groq import Groq


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY is missing. Add GROQ_API_KEY to your .env file."
    )


# ============================================================
# GROQ CLIENT
# ============================================================

client = Groq(
    api_key=GROQ_API_KEY
)

GROQ_MODEL = os.getenv(
    "GROQ_TASK_MODEL",
    "llama-3.3-70b-versatile"
)


# ============================================================
# BASIC ASSIGNMENT DETECTION
# ============================================================

def is_task_assignment_request(text):
    """
    Detect whether the user is asking the AI to create/assign a task.
    """

    if not text:
        return False

    value = str(text).strip().lower()

    patterns = [
        r"\bassign\b",
        r"\bassigning\b",
        r"\bassigned\b",
        r"\bgive\b.*\btask\b",
        r"\bcreate\b.*\btask\b",
        r"\bmake\b.*\btask\b",
        r"\btask\b.*\bto\b",
        r"\bshould\s+handle\b",
        r"\bhandle\b.*\btask\b",
        r"\bresponsible\s+for\b",
    ]

    for pattern in patterns:
        if re.search(
            pattern,
            value,
            re.IGNORECASE
        ):
            return True

    return False


# ============================================================
# DATE HELPERS
# ============================================================

def get_today():
    """
    Return today's local server date.
    """
    return datetime.now().date()


def get_next_month(year, month):
    if month == 12:
        return year + 1, 1

    return year, month + 1


def get_previous_month(year, month):
    if month == 1:
        return year - 1, 12

    return year, month - 1


# ============================================================
# NORMALIZE DUE DATE
# ============================================================

def normalize_due_date(value):
    """
    Convert natural-language dates into YYYY-MM-DD.
    """

    if value is None:
        return None

    text = str(value).strip().lower()

    if not text:
        return None

    text = re.sub(
        r"\s+",
        " ",
        text
    ).strip()

    today = get_today()

    # Remove common prefixes
    text = re.sub(
        r"^(on|by|for|due|due date|deadline)\s+",
        "",
        text,
        flags=re.IGNORECASE
    ).strip()

    # Today / Tomorrow
    if text in {"today", "todays", "today's"}:
        return today.strftime("%Y-%m-%d")

    if text == "tomorrow":
        return (today + timedelta(days=1)).strftime("%Y-%m-%d")

    if text in {"day after tomorrow", "the day after tomorrow"}:
        return (today + timedelta(days=2)).strftime("%Y-%m-%d")

    if text == "yesterday":
        return (today - timedelta(days=1)).strftime("%Y-%m-%d")

    # YYYY-MM-DD
    iso_match = re.fullmatch(r"(\d{4})-(\d{1,2})-(\d{1,2})", text)
    if iso_match:
        try:
            return datetime(
                int(iso_match.group(1)),
                int(iso_match.group(2)),
                int(iso_match.group(3))
            ).strftime("%Y-%m-%d")
        except ValueError:
            return None

    # MM/DD/YYYY or MM-DD-YYYY
    numeric_match = re.fullmatch(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", text)
    if numeric_match:
        try:
            return datetime(
                int(numeric_match.group(3)),
                int(numeric_match.group(1)),
                int(numeric_match.group(2))
            ).strftime("%Y-%m-%d")
        except ValueError:
            return None

    # Only Day Number (e.g. 15 or 15th)
    only_day_match = re.fullmatch(r"(\d{1,2})(?:st|nd|rd|th)?", text)
    if only_day_match:
        day = int(only_day_match.group(1))
        try:
            candidate = datetime(today.year, today.month, day).date()
            return candidate.strftime("%Y-%m-%d")
        except ValueError:
            return None

    # Month + Day
    month_names = (
        "january|february|march|april|may|june|"
        "july|august|september|october|november|december"
    )

    month_first_match = re.fullmatch(
        rf"({month_names})\s+(\d{{1,2}})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{{4}}))?",
        text,
        re.IGNORECASE
    )
    if month_first_match:
        month_name = month_first_match.group(1)
        day = int(month_first_match.group(2))
        year_text = month_first_match.group(3)

        try:
            month_number = datetime.strptime(month_name, "%B").month
            year = int(year_text) if year_text else today.year
            candidate = datetime(year, month_number, day).date()
            if not year_text and candidate < today:
                year += 1
            return datetime(year, month_number, day).strftime("%Y-%m-%d")
        except ValueError:
            return None

    day_first_match = re.fullmatch(
        rf"(\d{{1,2}})(?:st|nd|rd|th)?\s+(?:of\s+)?({month_names})(?:\s*,?\s*(\d{{4}}))?",
        text,
        re.IGNORECASE
    )
    if day_first_match:
        day = int(day_first_match.group(1))
        month_name = day_first_match.group(2)
        year_text = day_first_match.group(3)

        try:
            month_number = datetime.strptime(month_name, "%B").month
            year = int(year_text) if year_text else today.year
            candidate = datetime(year, month_number, day).date()
            if not year_text and candidate < today:
                year += 1
            return datetime(year, month_number, day).strftime("%Y-%m-%d")
        except ValueError:
            return None

    # Weekdays
    weekdays = {
        "monday": 0, "tuesday": 1, "wednesday": 2,
        "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6
    }

    weekday_match = re.fullmatch(
        r"(?:next\s+|this\s+|by\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)",
        text,
        re.IGNORECASE
    )
    if weekday_match:
        weekday_name = weekday_match.group(1).lower()
        target_weekday = weekdays[weekday_name]
        current_weekday = today.weekday()
        days_ahead = (target_weekday - current_weekday) % 7
        if days_ahead == 0 or text.startswith("next "):
            days_ahead += 7
        return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

    return None


# ============================================================
# PRIORITY & STATUS NORMALIZATION
# ============================================================

def normalize_priority(value):
    if not value:
        return "Medium"

    val = str(value).strip().lower()
    if val in {"high", "urgent", "critical", "important", "highest"}:
        return "High"
    if val in {"medium", "normal", "moderate", "middle"}:
        return "Medium"
    if val in {"low", "minor", "lowest"}:
        return "Low"

    return "Medium"


def extract_explicit_priority(text):
    if not text:
        return None

    match = re.search(
        r"\bprio(?:rity|rity|ity)\b\s*(?:is|=|:)?\s*(high|medium|low|urgent|critical|normal)\b",
        text,
        re.IGNORECASE
    )
    if match:
        return normalize_priority(match.group(1))

    match = re.search(
        r"\b(high|medium|low|urgent|critical|normal)\s+priority\b",
        text,
        re.IGNORECASE
    )
    if match:
        return normalize_priority(match.group(1))

    return None


def normalize_status(value):
    if not value:
        return "To Do"

    val = str(value).strip().lower()
    val = re.sub(r"\s+", " ", val)

    if val in {"to do", "todo", "to-do", "not started", "not started yet"}:
        return "To Do"
    if val in {"pending", "waiting"}:
        return "Pending"
    if val in {"in progress", "in-progress", "progress", "working", "ongoing", "started", "underway"}:
        return "In Progress"
    if val in {"completed", "complete", "done", "finished"}:
        return "Completed"

    return "To Do"


def extract_explicit_status(text):
    if not text:
        return None

    match = re.search(
        r"\bstatus\b\s*(?:is|=|:|should\s+be|set\s+to)?\s*(to\s*do|todo|pending|in\s*progress|in-progress|working|ongoing|started|completed|complete|done|finished)\b",
        text,
        re.IGNORECASE
    )
    if match:
        return normalize_status(match.group(1))

    return None


def extract_explicit_due_date(text):
    if not text:
        return None

    date_expression = (
        r"(?:"
        r"tomorrow|today|yesterday|day\s+after\s+tomorrow|"
        r"next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|"
        r"(?:this|current|next)\s+month|"
        r"\d{1,2}(?:st|nd|rd|th)?\s*(?:of\s*)?(?:this|current|next)\s+month|"
        r"\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december)(?:\s*,?\s*\d{4})?|"
        r"(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?|"
        r"\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{4}|"
        r"(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)"
        r")"
    )

    match = re.search(
        rf"\b(?:due\s*date|due|deadline)\b\s*(?:is|=|:|on|by)?\s*({date_expression})",
        text,
        re.IGNORECASE
    )
    if match:
        normalized = normalize_due_date(match.group(1).strip())
        if normalized:
            return normalized

    return None


# ============================================================
# CLEANING HELPERS
# ============================================================

def clean_member_name(member_name):
    if not member_name:
        return None

    val = str(member_name).strip().strip(".,:;!?\"'")
    val = re.sub(r"\s+", " ", val)

    # Cut off metadata keywords if captured at the end
    val = re.split(
        r"\s+(?:task\s+title|title|due\s*date|deadline|priority|prioity|status|description)\b",
        val,
        maxsplit=1,
        flags=re.IGNORECASE
    )[0].strip()

    val = val.strip(".,:;!?\"'")
    return val or None


def clean_task_title(title, member_name=None):
    if not title:
        return None

    val = str(title).strip().strip(".,:;!?\"'")
    val = re.sub(r"\s+", " ", val)

    # Cut off metadata keywords
    val = re.split(
        r"\s+(?:due\s*date|deadline|priority|prioity|status|description)\b",
        val,
        maxsplit=1,
        flags=re.IGNORECASE
    )[0].strip()

    if member_name:
        member_pattern = re.escape(member_name.strip())
        val = re.sub(rf"\s+\bto\b\s+{member_pattern}\s*$", "", val, flags=re.IGNORECASE)

    val = re.sub(r"\s+task$", "", val, flags=re.IGNORECASE).strip()
    val = val.strip(".,:;!?\"'")

    return val or None


# ============================================================
# TITLE & MEMBER EXTRACTION
# ============================================================

def extract_title(text):
    if not text:
        return None

    value = str(text).strip()

    stop_words = (
        r"due\s*date|deadline|priority|prioity|status|assigned\s+to|assign\s+to|"
        r"team\s+member|member|developer|which\s+due|with\s+(?:high|medium|low)\s+priority"
    )

    patterns = [
        rf'\btask\s+title\b\s*(?:is|=|:)?\s*["\']?(.+?)["\']?\s*(?=\s+(?:{stop_words})\b|$)',
        rf'\btitle\b\s*(?:is|=|:)?\s*["\']?(.+?)["\']?\s*(?=\s+(?:{stop_words})\b|$)',
        rf'\btask\b\s+(?:called|named)\s+["\']?(.+?)["\']?\s*(?=\s+(?:{stop_words})\b|$)',
        rf'\btitled\b\s+["\']?(.+?)["\']?\s*(?=\s+(?:{stop_words})\b|$)',
        rf'\bwhose\s+title\b\s*(?:is|=|:)?\s*["\']?(.+?)["\']?\s*(?=\s+(?:{stop_words})\b|$)',
        rf'\btask\b\s+(?:is|=|:)\s+["\']?(.+?)["\']?\s*(?=\s+(?:{stop_words})\b|$)',
    ]

    for pattern in patterns:
        match = re.search(pattern, value, re.IGNORECASE)
        if match:
            title = clean_task_title(match.group(1))
            if title:
                return title

    return None


def extract_member(text):
    if not text:
        return None

    value = str(text).strip()

    stop_words = (
        r"task\s+title|title|due\s*date|deadline|priority|prioity|status|"
        r"description|which\s+due|with\s+(?:high|medium|low)\s+priority"
    )

    patterns = [
        # Direct assign patterns with higher priority
        rf"\bassign\s+(?:a\s+)?task\s+to\b\s*[:=]?\s*(.+?)(?=\s+(?:{stop_words})\b|$)",
        rf"\bgive\s+(?:a\s+)?task\s+to\b\s*[:=]?\s*(.+?)(?=\s+(?:{stop_words})\b|$)",
        rf"\bcreate\s+(?:a\s+)?task\s+for\b\s*[:=]?\s*(.+?)(?=\s+(?:{stop_words})\b|$)",
        rf"\bassigned\s+to\b\s*[:=]?\s*(.+?)(?=\s+(?:{stop_words})\b|$)",
        rf"\bassign\s+to\b\s*[:=]?\s*(.+?)(?=\s+(?:{stop_words})\b|$)",
        rf"\bteam\s+member\b\s*[:=]?\s*(.+?)(?=\s+(?:{stop_words})\b|$)",
        rf"\bmember\b\s*[:=]?\s*(.+?)(?=\s+(?:{stop_words})\b|$)",
        rf"\bdeveloper\b\s*[:=]?\s*(.+?)(?=\s+(?:{stop_words})\b|$)",
        rf"\bfor\b\s+(.+?)(?=\s+(?:{stop_words})\b|$)",
        # Negative lookahead to ensure "to" doesn't match action verbs like "to assign" or "to create"
        rf"\bto\b\s+(?!(?:assign|create|make|give|do|be)\b)(.+?)(?=\s+(?:{stop_words})\b|$)",
    ]

    for pattern in patterns:
        match = re.search(pattern, value, re.IGNORECASE)
        if match:
            member = clean_member_name(match.group(1))
            if member:
                return member

    # "Waji should handle Build Website"
    match = re.search(
        r"^(.+?)\s+(?:should|will|can)\s+(?:handle|work\s+on|do)\b",
        value,
        re.IGNORECASE
    )
    if match:
        member = clean_member_name(match.group(1))
        if member:
            return member

    return None


def extract_title_and_member_fallback(text):
    title = extract_title(text)
    member = extract_member(text)

    if not title:
        match = re.search(
            r"\b(?:assign|give|create)\b\s+(?:a\s+)?(?:task\s+)?(.+?)\s+(?:to|for)\s+(.+?)(?=\s+(?:due|deadline|priority|prioity|status)\b|$)",
            text,
            re.IGNORECASE
        )
        if match:
            possible_title = re.sub(r"^(?:a\s+)?task\s+", "", match.group(1).strip(), flags=re.IGNORECASE).strip()
            possible_member = match.group(2).strip()

            if possible_title:
                title = clean_task_title(possible_title)
            if not member:
                member = clean_member_name(possible_member)

    return title, member


# ============================================================
# GROQ AI EXTRACTION
# ============================================================

def clean_json_response(content):
    if not content:
        return None

    text = str(content).strip()
    text = re.sub(r"^```json\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text).strip()

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end + 1]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def extract_task_with_ai(text):
    prompt = f"""
You are a task-assignment extraction system.

Read the user's sentence and extract the task assignment information.

USER MESSAGE:
{text}

Return ONLY valid JSON.

Required JSON format:
{{
    "is_assignment": true,
    "member_name": null,
    "task_title": null,
    "description": "",
    "priority": "Medium",
    "status": "To Do",
    "due_date_text": null
}}

IMPORTANT RULES:
1. Extract member_name accurately.
2. Extract task_title accurately. Remove quotes around task title if present.
3. Priority options: High, Medium, Low.
4. Status options: To Do, Pending, In Progress, Completed.
5. If prompt contains explicit parameters like "status is in progress" or "priority is low", strictly map them to status and priority respectively.
"""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You extract structured task assignment information. Return valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0
        )
        return clean_json_response(response.choices[0].message.content)
    except Exception as error:
        print("Task assignment Groq extraction error:", error)
        return None


def extract_task_with_fallback(text):
    title, member = extract_title_and_member_fallback(text)
    priority = extract_explicit_priority(text) or "Medium"
    status = extract_explicit_status(text) or "To Do"
    due_date = extract_explicit_due_date(text)

    return {
        "is_assignment": bool(title and member),
        "member_name": member,
        "task_title": title,
        "description": "",
        "priority": priority,
        "status": status,
        "due_date_text": due_date
    }


# ============================================================
# MAIN PROCESSOR
# ============================================================

def process_task_assignment(token=None, project_id=None, question=None):
    if not question:
        return None

    text = str(question).strip()
    if not text or not is_task_assignment_request(text):
        return None

    print("\n==============================================")
    print("TASK ASSIGNMENT REQUEST DETECTED")
    print("Original:", text)
    print("==============================================")

    # 1. Groq Extraction
    task_data = extract_task_with_ai(text)

    # 2. Fallback if AI fails
    if not isinstance(task_data, dict):
        task_data = extract_task_with_fallback(text)

    if not isinstance(task_data, dict):
        task_data = {}

    # 3. Explicit Regex Extraction Overrides
    explicit_priority = extract_explicit_priority(text)
    explicit_status = extract_explicit_status(text)
    explicit_due_date = extract_explicit_due_date(text)

    direct_title = extract_title(text)
    if direct_title:
        task_data["task_title"] = direct_title

    direct_member = extract_member(text)
    if direct_member:
        task_data["member_name"] = direct_member

    if not task_data.get("task_title") or not task_data.get("member_name"):
        fallback_title, fallback_member = extract_title_and_member_fallback(text)
        if not task_data.get("task_title"):
            task_data["task_title"] = fallback_title
        if not task_data.get("member_name"):
            task_data["member_name"] = fallback_member

    if explicit_priority:
        task_data["priority"] = explicit_priority

    if explicit_status:
        task_data["status"] = explicit_status

    if explicit_due_date:
        task_data["due_date_text"] = explicit_due_date

    # 4. Clean & Normalize
    member_name = clean_member_name(task_data.get("member_name"))
    task_title = clean_task_title(task_data.get("task_title"), member_name)
    priority = normalize_priority(task_data.get("priority"))
    status = normalize_status(task_data.get("status"))
    due_date = normalize_due_date(task_data.get("due_date_text"))
    description = str(task_data.get("description") or "").strip()

    # 5. Validation
    if not task_title:
        return {
            "success": False,
            "action": "assign_task",
            "answer": "I understood that you want to assign a task, but I could not determine the task title.",
            "task": None,
            "project_id": project_id
        }

    if not member_name:
        return {
            "success": False,
            "action": "assign_task",
            "answer": f'I understood that the task is "{task_title}", but I could not determine which team member to assign it to.',
            "task": None,
            "project_id": project_id
        }

    # 6. Final Result Format
    result = {
        "success": True,
        "action": "assign_task",
        "answer": f'I understood that you want to assign "{task_title}" to {member_name}.',
        "task": {
            "title": task_title,
            "description": description,
            "assigned_to": member_name,
            "priority": priority,
            "status": status,
            "due_date": due_date
        },
        "project_id": project_id
    }

    print("\n==============================================")
    print("TASK ASSIGNMENT EXTRACTION")
    print("==============================================")
    print("Original:", text)
    print("Title:", task_title)
    print("Member:", member_name)
    print("Priority:", priority)
    print("Status:", status)
    print("Due Date:", due_date)
    print("Project ID:", project_id)
    print("==============================================\n")

    return result