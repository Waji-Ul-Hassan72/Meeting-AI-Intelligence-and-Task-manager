import os
import json
from datetime import datetime, timedelta

from dotenv import load_dotenv
from groq import Groq


# Environment

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY is missing. Add GROQ_API_KEY to your .env file."
    )


# Groq

client = Groq(api_key=GROQ_API_KEY)

GROQ_MODEL = os.getenv(
    "GROQ_TASK_MODEL",
    "openai/gpt-oss-120b"
)


# Date

def get_today():
    return datetime.now().date()


def normalize_due_date(value):
    """
    Groq understands the date expression.
    Python calculates the actual date.
    """

    if not value:
        return None

    text = str(value).strip().lower()
    text = " ".join(text.split())

    today = get_today()

    # Today
    if text in {"today", "today's", "todays"}:
        return today.strftime("%Y-%m-%d")

    # Tomorrow
    if text == "tomorrow":
        return (
            today + timedelta(days=1)
        ).strftime("%Y-%m-%d")

    # Day after tomorrow
    if text in {
        "day after tomorrow",
        "the day after tomorrow"
    }:
        return (
            today + timedelta(days=2)
        ).strftime("%Y-%m-%d")

    # Yesterday
    if text == "yesterday":
        return (
            today - timedelta(days=1)
        ).strftime("%Y-%m-%d")

    # Weekdays
    weekdays = {
        "monday": 0,
        "tuesday": 1,
        "wednesday": 2,
        "thursday": 3,
        "friday": 4,
        "saturday": 5,
        "sunday": 6
    }

    for prefix in [
        "coming ",
        "next ",
        "this ",
        "on ",
        "by "
    ]:
        if text.startswith(prefix):
            text = text[len(prefix):].strip()
            break

    if text in weekdays:
        target_day = weekdays[text]
        current_day = today.weekday()

        days_ahead = (
            target_day - current_day
        ) % 7

        if days_ahead == 0:
            days_ahead = 7

        target_date = (
            today + timedelta(days=days_ahead)
        )

        return target_date.strftime("%Y-%m-%d")

    # YYYY-MM-DD
    try:
        parsed = datetime.strptime(
            text,
            "%Y-%m-%d"
        )

        return parsed.strftime("%Y-%m-%d")

    except ValueError:
        pass

    # MM/DD/YYYY
    for date_format in [
        "%m/%d/%Y",
        "%m-%d-%Y"
    ]:
        try:
            parsed = datetime.strptime(
                text,
                date_format
            )

            return parsed.strftime("%Y-%m-%d")

        except ValueError:
            pass

    # Month and day
    for date_format in [
        "%B %d",
        "%B %d, %Y",
        "%b %d",
        "%b %d, %Y"
    ]:
        try:
            parsed = datetime.strptime(
                text,
                date_format
            )

            if parsed.year == 1900:
                target_date = parsed.replace(
                    year=today.year
                ).date()

                if target_date < today:
                    target_date = target_date.replace(
                        year=today.year + 1
                    )

                return target_date.strftime(
                    "%Y-%m-%d"
                )

            return parsed.strftime("%Y-%m-%d")

        except ValueError:
            pass

    return None


# Normalization

def clean_string(value):
    if value is None:
        return ""

    return " ".join(
        str(value).strip().split()
    )


def normalize_member_name(value):
    value = clean_string(value)

    if not value:
        return None

    return value.strip("\"'")


def normalize_task_title(value):
    value = clean_string(value)

    if not value:
        return None

    return value.strip("\"'")


def normalize_description(value):
    return clean_string(value)


def normalize_priority(value):
    if not value:
        return "Medium"

    value = clean_string(value).lower()

    priority_map = {
        "high": "High",
        "urgent": "High",
        "critical": "High",
        "very high": "High",
        "highest": "High",
        "important": "High",
        "very important": "High",

        "medium": "Medium",
        "normal": "Medium",
        "moderate": "Medium",

        "low": "Low",
        "minor": "Low",
        "lowest": "Low"
    }

    return priority_map.get(value, "Medium")


def normalize_status(value):
    if not value:
        return "To Do"

    value = clean_string(value).lower()

    status_map = {
        "to do": "To Do",
        "todo": "To Do",
        "to-do": "To Do",
        "not started": "To Do",

        "pending": "Pending",
        "waiting": "Pending",
        "on hold": "Pending",

        "in progress": "In Progress",
        "in-progress": "In Progress",
        "progress": "In Progress",
        "working": "In Progress",
        "working on it": "In Progress",
        "ongoing": "In Progress",
        "started": "In Progress",
        "underway": "In Progress",

        "completed": "Completed",
        "complete": "Completed",
        "done": "Completed",
        "finished": "Completed"
    }

    return status_map.get(value, "To Do")


# Groq extraction

def clean_json_response(content):
    if not content:
        return None

    text = str(content).strip()

    if text.startswith("```json"):
        text = text[7:]

    elif text.startswith("```"):
        text = text[3:]

    if text.endswith("```"):
        text = text[:-3]

    text = text.strip()

    try:
        return json.loads(text)

    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")

        if start != -1 and end != -1:
            try:
                return json.loads(
                    text[start:end + 1]
                )
            except json.JSONDecodeError:
                return None

    return None


def extract_task_with_ai(text):

    today = get_today().strftime("%Y-%m-%d")

    system_prompt = f"""
You are a task assignment parser.

Today's date is {today}.

Understand the user's complete natural-language request.

Extract:

- member_name
- task_title
- description
- priority
- status
- due_date_text

Important:

Do NOT use word-position assumptions.

Example:

"Assign a task to Ali to make a login page"

means:

member_name = "Ali"
task_title = "Make a login page"

NOT:

member_name = "Ali to make a login page"

Priority must be:

High, Medium, or Low.

Map:
critical -> High
urgent -> High
important -> High
normal -> Medium
low -> Low

Default priority is Medium.

Status must be:

To Do, Pending, In Progress, or Completed.

Map:
not started -> To Do
waiting -> Pending
working -> In Progress
started -> In Progress
done -> Completed
finished -> Completed

Default status is To Do.

For deadlines:

Understand the natural-language date but DO NOT
calculate the final calendar date.

Return the original date expression in due_date_text.

Examples:

"tomorrow" -> "tomorrow"
"coming Friday" -> "coming Friday"
"next Friday" -> "next Friday"
"this Monday" -> "this Monday"
"September 15" -> "September 15"

Python will calculate the final date.

Return ONLY valid JSON:

{{
    "is_assignment": true,
    "member_name": null,
    "task_title": null,
    "description": "",
    "priority": "Medium",
    "status": "To Do",
    "due_date_text": null
}}
"""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            temperature=0,
            response_format={
                "type": "json_object"
            }
        )

        content = response.choices[0].message.content

        print("Groq response:", content)

        return clean_json_response(content)

    except Exception as error:
        print(
            "Groq extraction error:",
            error
        )
        return None


# Main processor

def process_task_assignment(
    token=None,
    project_id=None,
    question=None
):

    if not question:
        return None

    text = str(question).strip()

    if not text:
        return None

    print("Task assignment request:", text)

    task_data = extract_task_with_ai(text)

    if not isinstance(task_data, dict):
        return {
            "success": False,
            "action": "assign_task",
            "answer": (
                "I couldn't understand the task assignment "
                "request. Please tell me who should receive "
                "the task and what the task is."
            ),
            "task": None,
            "project_id": project_id
        }

    is_assignment = task_data.get(
        "is_assignment",
        False
    )

    if isinstance(is_assignment, str):
        is_assignment = (
            is_assignment.lower() == "true"
        )

    if not is_assignment:
        return None

    member_name = normalize_member_name(
        task_data.get("member_name")
    )

    task_title = normalize_task_title(
        task_data.get("task_title")
    )

    description = normalize_description(
        task_data.get("description")
    )

    priority = normalize_priority(
        task_data.get("priority")
    )

    status = normalize_status(
        task_data.get("status")
    )

    # Groq identifies the natural-language expression.
    # Python calculates the actual date.
    due_date_text = clean_string(
        task_data.get("due_date_text")
    )

    due_date = normalize_due_date(
        due_date_text
    )

    if not member_name:
        return {
            "success": False,
            "action": "assign_task",
            "answer": (
                "I understood that you want to assign "
                "a task, but I could not determine "
                "which team member should receive it."
            ),
            "task": None,
            "project_id": project_id
        }

    if not task_title:
        return {
            "success": False,
            "action": "assign_task",
            "answer": (
                f"I understood that you want to assign "
                f"a task to {member_name}, but I could "
                f"not determine the task title."
            ),
            "task": None,
            "project_id": project_id
        }

    result = {
        "success": True,
        "action": "assign_task",
        "answer": (
            f'I understood that you want to assign '
            f'"{task_title}" to {member_name}.'
        ),
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

    print(
        "Task:",
        task_title,
        "| Member:",
        member_name,
        "| Priority:",
        priority,
        "| Status:",
        status,
        "| Due date:",
        due_date
    )

    return result