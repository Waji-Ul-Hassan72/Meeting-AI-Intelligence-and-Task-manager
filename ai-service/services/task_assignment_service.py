
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

    Supports natural variations such as:

        assign a task
        assign task
        assign Build Website to Ali
        give Ali the Build Website task
        create a task for Ali
        Ali should handle Build Website
        assign a task to Ali
    """

    if not text:
        return False

    value = str(text).strip().lower()

    patterns = [

        # assign
        r"\bassign\b",

        # assigning / assigned
        r"\bassigning\b",
        r"\bassigned\b",

        # give someone a task
        r"\bgive\b.*\btask\b",

        # create a task
        r"\bcreate\b.*\btask\b",

        # make a task
        r"\bmake\b.*\btask\b",

        # task to someone
        r"\btask\b.*\bto\b",

        # should handle
        r"\bshould\s+handle\b",

        # handle task
        r"\bhandle\b.*\btask\b",

        # responsible for
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
    Convert natural-language dates into:

        YYYY-MM-DD

    Examples:

        today
        tomorrow
        day after tomorrow
        15
        15th
        15th of this month
        15 of this month
        15th this month
        15th of next month
        next Monday
        Monday
        Friday
        September 15
        15 September
        September 15, 2026
        15th of September
        2026-09-15
        09/15/2026
        09-15-2026
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

    # --------------------------------------------------------
    # REMOVE COMMON PREFIXES
    # --------------------------------------------------------

    text = re.sub(
        r"^(on|by|for|due|due date|deadline)\s+",
        "",
        text,
        flags=re.IGNORECASE
    ).strip()

    # --------------------------------------------------------
    # TODAY
    # --------------------------------------------------------

    if text in {
        "today",
        "todays",
        "today's"
    }:
        return today.strftime("%Y-%m-%d")

    # --------------------------------------------------------
    # TOMORROW
    # --------------------------------------------------------

    if text == "tomorrow":
        return (
            today + timedelta(days=1)
        ).strftime("%Y-%m-%d")

    # --------------------------------------------------------
    # DAY AFTER TOMORROW
    # --------------------------------------------------------

    if text in {
        "day after tomorrow",
        "the day after tomorrow"
    }:
        return (
            today + timedelta(days=2)
        ).strftime("%Y-%m-%d")

    # --------------------------------------------------------
    # YESTERDAY
    # --------------------------------------------------------

    if text == "yesterday":
        return (
            today - timedelta(days=1)
        ).strftime("%Y-%m-%d")

    # --------------------------------------------------------
    # YYYY-MM-DD
    # --------------------------------------------------------

    iso_match = re.fullmatch(
        r"(\d{4})-(\d{1,2})-(\d{1,2})",
        text
    )

    if iso_match:
        try:
            year = int(
                iso_match.group(1)
            )

            month = int(
                iso_match.group(2)
            )

            day = int(
                iso_match.group(3)
            )

            return datetime(
                year,
                month,
                day
            ).strftime("%Y-%m-%d")

        except ValueError:
            return None

    # --------------------------------------------------------
    # NUMERIC DATE
    #
    # 09/15/2026
    # 09-15-2026
    # --------------------------------------------------------

    numeric_match = re.fullmatch(
        r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})",
        text
    )

    if numeric_match:
        try:
            month = int(
                numeric_match.group(1)
            )

            day = int(
                numeric_match.group(2)
            )

            year = int(
                numeric_match.group(3)
            )

            return datetime(
                year,
                month,
                day
            ).strftime("%Y-%m-%d")

        except ValueError:
            return None

    # --------------------------------------------------------
    # ONLY DAY NUMBER
    #
    # 15
    # 15th
    #
    # Interpret as current month's date.
    # --------------------------------------------------------

    only_day_match = re.fullmatch(
        r"(\d{1,2})(?:st|nd|rd|th)?",
        text
    )

    if only_day_match:
        day = int(
            only_day_match.group(1)
        )

        try:
            candidate = datetime(
                today.year,
                today.month,
                day
            ).date()

            return candidate.strftime(
                "%Y-%m-%d"
            )

        except ValueError:
            return None

    # --------------------------------------------------------
    # THIS / CURRENT / NEXT MONTH
    #
    # 15th of this month
    # 15 this month
    # 15th of next month
    # --------------------------------------------------------

    day_month_match = re.fullmatch(
        r"(\d{1,2})"
        r"(?:st|nd|rd|th)?"
        r"\s*"
        r"(?:of\s*)?"
        r"(this\s+month|current\s+month|next\s+month)",
        text,
        re.IGNORECASE
    )

    if day_month_match:

        day = int(
            day_month_match.group(1)
        )

        month_reference = (
            day_month_match.group(2)
            .strip()
            .lower()
        )

        year = today.year
        month = today.month

        if month_reference == "next month":
            year, month = get_next_month(
                year,
                month
            )

        try:

            return datetime(
                year,
                month,
                day
            ).strftime("%Y-%m-%d")

        except ValueError:
            return None

    # --------------------------------------------------------
    # MONTH + DAY
    #
    # September 15
    # September 15, 2026
    # 15 September
    # 15th of September
    # --------------------------------------------------------

    month_names = (
        "january|february|march|april|may|june|"
        "july|august|september|october|november|december"
    )

    # September 15
    month_first_match = re.fullmatch(
        rf"({month_names})"
        r"\s+"
        r"(\d{1,2})(?:st|nd|rd|th)?"
        r"(?:\s*,?\s*(\d{4}))?",
        text,
        re.IGNORECASE
    )

    if month_first_match:

        month_name = (
            month_first_match.group(1)
        )

        day = int(
            month_first_match.group(2)
        )

        year_text = (
            month_first_match.group(3)
        )

        try:

            month_number = datetime.strptime(
                month_name,
                "%B"
            ).month

        except ValueError:
            return None

        if year_text:
            year = int(year_text)

        else:
            year = today.year

            candidate = datetime(
                year,
                month_number,
                day
            ).date()

            if candidate < today:
                year += 1

        try:

            return datetime(
                year,
                month_number,
                day
            ).strftime("%Y-%m-%d")

        except ValueError:
            return None

    # 15 September
    day_first_match = re.fullmatch(
        rf"(\d{{1,2}})"
        r"(?:st|nd|rd|th)?"
        r"\s+"
        r"(?:of\s+)?"
        rf"({month_names})"
        r"(?:\s*,?\s*(\d{4}))?",
        text,
        re.IGNORECASE
    )

    if day_first_match:

        day = int(
            day_first_match.group(1)
        )

        month_name = (
            day_first_match.group(2)
        )

        year_text = (
            day_first_match.group(3)
        )

        try:

            month_number = datetime.strptime(
                month_name,
                "%B"
            ).month

        except ValueError:
            return None

        if year_text:
            year = int(year_text)

        else:
            year = today.year

            candidate = datetime(
                year,
                month_number,
                day
            ).date()

            if candidate < today:
                year += 1

        try:

            return datetime(
                year,
                month_number,
                day
            ).strftime("%Y-%m-%d")

        except ValueError:
            return None

    # --------------------------------------------------------
    # WEEKDAYS
    # --------------------------------------------------------

    weekdays = {
        "monday": 0,
        "tuesday": 1,
        "wednesday": 2,
        "thursday": 3,
        "friday": 4,
        "saturday": 5,
        "sunday": 6
    }

    weekday_match = re.fullmatch(
        r"(?:next\s+|this\s+|by\s+)?"
        r"(monday|tuesday|wednesday|"
        r"thursday|friday|saturday|sunday)",
        text,
        re.IGNORECASE
    )

    if weekday_match:

        weekday_name = (
            weekday_match.group(1)
            .lower()
        )

        target_weekday = weekdays[
            weekday_name
        ]

        current_weekday = today.weekday()

        days_ahead = (
            target_weekday
            - current_weekday
        ) % 7

        if text.startswith("next "):

            if days_ahead == 0:
                days_ahead = 7

        elif days_ahead == 0:

            days_ahead = 7

        result_date = (
            today
            + timedelta(days=days_ahead)
        )

        return result_date.strftime(
            "%Y-%m-%d"
        )

    return None


# ============================================================
# PRIORITY
# ============================================================

def normalize_priority(value):
    """
    Normalize priority.

    Supported:

        High
        Medium
        Low
    """

    if not value:
        return "Medium"

    value = str(value).strip().lower()

    if value in {
        "high",
        "urgent",
        "critical",
        "important",
        "highest"
    }:
        return "High"

    if value in {
        "medium",
        "normal",
        "moderate",
        "middle"
    }:
        return "Medium"

    if value in {
        "low",
        "minor",
        "lowest"
    }:
        return "Low"

    return "Medium"


# ============================================================
# EXPLICIT PRIORITY EXTRACTION
# ============================================================

def extract_explicit_priority(text):
    """
    Extract priority directly from the original sentence.

    Examples:

        priority is high
        priority: high
        priority = high
        priority high
        high priority
        make it high priority
        with high priority
    """

    if not text:
        return None

    # --------------------------------------------------------
    # priority is high
    # priority high
    # priority: high
    # priority = high
    # --------------------------------------------------------

    match = re.search(
        r"\bprio(?:rity|rity|ity)\b"
        r"\s*(?:is|=|:)?\s*"
        r"(high|medium|low|urgent|critical|normal)\b",
        text,
        re.IGNORECASE
    )

    if match:
        return normalize_priority(
            match.group(1)
        )

    # --------------------------------------------------------
    # high priority
    # medium priority
    # low priority
    # --------------------------------------------------------

    match = re.search(
        r"\b"
        r"(high|medium|low|urgent|critical|normal)"
        r"\s+priority\b",
        text,
        re.IGNORECASE
    )

    if match:
        return normalize_priority(
            match.group(1)
        )

    return None


# ============================================================
# STATUS
# ============================================================

def normalize_status(value):
    """
    Normalize status.

    Supported:

        To Do
        Pending
        In Progress
        Completed
    """

    if not value:
        return "To Do"

    value = str(value).strip().lower()

    value = re.sub(
        r"\s+",
        " ",
        value
    )

    if value in {
        "to do",
        "todo",
        "to-do",
        "not started",
        "not started yet"
    }:
        return "To Do"

    if value in {
        "pending",
        "waiting"
    }:
        return "Pending"

    if value in {
        "in progress",
        "in-progress",
        "progress",
        "working",
        "ongoing",
        "started",
        "underway"
    }:
        return "In Progress"

    if value in {
        "completed",
        "complete",
        "done",
        "finished"
    }:
        return "Completed"

    return "To Do"


# ============================================================
# EXPLICIT STATUS EXTRACTION
# ============================================================

def extract_explicit_status(text):
    """
    Extract status directly from the original sentence.

    Examples:

        status is in progress
        status in progress
        status: in progress
        status = completed
        status is to do
        make status completed
    """

    if not text:
        return None

    match = re.search(
        r"\bstatus\b"
        r"\s*(?:is|=|:|should\s+be|set\s+to)?\s*"
        r"(to\s*do|todo|pending|"
        r"in\s*progress|in-progress|"
        r"working|ongoing|started|"
        r"completed|complete|done|finished)\b",
        text,
        re.IGNORECASE
    )

    if match:
        return normalize_status(
            match.group(1)
        )

    return None


# ============================================================
# EXPLICIT DUE DATE EXTRACTION
# ============================================================

def extract_explicit_due_date(text):
    """
    Extract due-date phrase from the user's original message.

    Supports:

        due date is tomorrow
        due date tomorrow
        due tomorrow
        deadline is tomorrow
        deadline tomorrow

        due date is 15th of this month
        due 15th of this month

        due on Friday
        due by Friday

        due date is September 15
        due September 15

        due date is 2026-09-15
    """

    if not text:
        return None

    # --------------------------------------------------------
    # Common date expressions
    # --------------------------------------------------------

    date_expression = (
        r"(?:"
        r"tomorrow|"
        r"today|"
        r"yesterday|"
        r"day\s+after\s+tomorrow|"
        r"next\s+(?:monday|tuesday|wednesday|"
        r"thursday|friday|saturday|sunday)|"
        r"(?:this|current|next)\s+month|"
        r"\d{1,2}(?:st|nd|rd|th)?"
        r"\s*(?:of\s*)?"
        r"(?:this|current|next)\s+month|"
        r"\d{1,2}(?:st|nd|rd|th)?"
        r"\s+(?:of\s+)?"
        r"(?:january|february|march|april|may|june|"
        r"july|august|september|october|november|december)"
        r"(?:\s*,?\s*\d{4})?|"
        r"(?:january|february|march|april|may|june|"
        r"july|august|september|october|november|december)"
        r"\s+\d{1,2}(?:st|nd|rd|th)?"
        r"(?:\s*,?\s*\d{4})?|"
        r"\d{4}-\d{1,2}-\d{1,2}|"
        r"\d{1,2}[/-]\d{1,2}[/-]\d{4}|"
        r"(?:monday|tuesday|wednesday|thursday|"
        r"friday|saturday|sunday)"
        r")"
    )

    # --------------------------------------------------------
    # due date / deadline / due
    # --------------------------------------------------------

    pattern = (
        r"\b(?:due\s*date|due|deadline)\b"
        r"\s*(?:is|=|:|on|by)?\s*"
        rf"({date_expression})"
    )

    match = re.search(
        pattern,
        text,
        re.IGNORECASE
    )

    if match:

        raw_date = (
            match.group(1)
            .strip()
        )

        normalized = normalize_due_date(
            raw_date
        )

        if normalized:
            return normalized

    # --------------------------------------------------------
    # "15th of this month" even when "due date" wording
    # is separated by another word.
    # --------------------------------------------------------

    match = re.search(
        r"\b"
        r"(\d{1,2}"
        r"(?:st|nd|rd|th)?"
        r"\s*(?:of\s*)?"
        r"(?:this|current|next)\s+month)"
        r"\b",
        text,
        re.IGNORECASE
    )

    if match:

        normalized = normalize_due_date(
            match.group(1)
        )

        if normalized:
            return normalized

    return None


# ============================================================
# CLEAN JSON RESPONSE
# ============================================================

def clean_json_response(content):
    """
    Convert Groq's response into a Python dictionary.
    """

    if not content:
        return None

    text = str(content).strip()

    # Remove markdown fences.
    text = re.sub(
        r"^```json\s*",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"^```\s*",
        "",
        text
    )

    text = re.sub(
        r"\s*```$",
        "",
        text
    )

    text = text.strip()

    # Find JSON object.
    start = text.find("{")
    end = text.rfind("}")

    if start != -1 and end != -1:

        text = text[
            start:end + 1
        ]

    try:
        return json.loads(text)

    except json.JSONDecodeError:
        return None


# ============================================================
# FLEXIBLE TITLE EXTRACTION
# ============================================================

def extract_title(text):
    """
    Extract task title from many sentence structures.

    Examples:

        task title is Build Website

        title is Build Website

        task is Build Website

        task called Build Website

        task named Build Website

        titled Build Website

        called Build Website

        whose title is Build Website

        Build Website task
    """

    if not text:
        return None

    value = str(text).strip()

    # --------------------------------------------------------
    # IMPORTANT:
    #
    # We stop the title whenever another known field begins.
    # This allows fields to appear in ANY order.
    # --------------------------------------------------------

    stop_words = (
        r"due\s*date|"
        r"deadline|"
        r"priority|"
        r"prioity|"
        r"status|"
        r"assigned\s+to|"
        r"assign\s+to|"
        r"team\s+member|"
        r"member|"
        r"developer|"
        r"which\s+due|"
        r"with\s+(?:high|medium|low)\s+priority|"
        r"by\s+(?:tomorrow|today|monday|tuesday|"
        r"wednesday|thursday|friday|saturday|sunday)"
    )

    patterns = [

        # task title is X
        rf"\btask\s+title\b"
        rf"\s*(?:is|=|:)?\s*"
        rf"(.+?)"
        rf"(?=\s+(?:{stop_words})\b|$)",

        # title is X
        rf"\btitle\b"
        rf"\s*(?:is|=|:)?\s*"
        rf"(.+?)"
        rf"(?=\s+(?:{stop_words})\b|$)",

        # task called X
        rf"\btask\b"
        rf"\s+(?:called|named)\s+"
        rf"(.+?)"
        rf"(?=\s+(?:{stop_words})\b|$)",

        # titled X
        rf"\btitled\b\s+"
        rf"(.+?)"
        rf"(?=\s+(?:{stop_words})\b|$)",

        # whose title is X
        rf"\bwhose\s+title\b"
        rf"\s*(?:is|=|:)?\s*"
        rf"(.+?)"
        rf"(?=\s+(?:{stop_words})\b|$)",

        # task is X
        rf"\btask\b"
        rf"\s+(?:is|=|:)\s+"
        rf"(.+?)"
        rf"(?=\s+(?:{stop_words})\b|$)",
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            value,
            re.IGNORECASE
        )

        if match:

            title = (
                match.group(1)
                .strip()
            )

            title = clean_task_title(
                title
            )

            if title:
                return title

    return None


# ============================================================
# FLEXIBLE MEMBER EXTRACTION
# ============================================================

def extract_member(text):
    """
    Extract team member from many sentence structures.

    Examples:

        to Waji Ul Hasaan
        for Waji Ul Hasaan
        assigned to Waji Ul Hasaan
        team member Waji Ul Hasaan
        member Waji Ul Hasaan
        developer Waji Ul Hasaan

        assign a task to Waji Ul Hasaan task title is Build Website
    """

    if not text:
        return None

    value = str(text).strip()

    # --------------------------------------------------------
    # Stop when another field begins.
    # --------------------------------------------------------

    stop_words = (
        r"task\s+title|"
        r"title|"
        r"task|"
        r"due\s*date|"
        r"deadline|"
        r"priority|"
        r"prioity|"
        r"status|"
        r"description|"
        r"which\s+due|"
        r"with\s+(?:high|medium|low)\s+priority"
    )

    patterns = [

        # assigned to Waji
        rf"\bassigned\s+to\b"
        rf"\s*[:=]?\s*"
        rf"(.+?)"
        rf"(?=\s+(?:{stop_words})\b|$)",

        # assign to Waji
        rf"\bassign\s+to\b"
        rf"\s*[:=]?\s*"
        rf"(.+?)"
        rf"(?=\s+(?:{stop_words})\b|$)",

        # to Waji
        rf"\bto\b\s+"
        rf"(.+?)"
        rf"(?=\s+(?:{stop_words})\b|$)",

        # for Waji
        rf"\bfor\b\s+"
        rf"(.+?)"
        rf"(?=\s+(?:{stop_words})\b|$)",

        # team member Waji
        rf"\bteam\s+member\b"
        rf"\s*[:=]?\s*"
        rf"(.+?)"
        rf"(?=\s+(?:{stop_words})\b|$)",

        # member Waji
        rf"\bmember\b"
        rf"\s*[:=]?\s*"
        rf"(.+?)"
        rf"(?=\s+(?:{stop_words})\b|$)",

        # developer Waji
        rf"\bdeveloper\b"
        rf"\s*[:=]?\s*"
        rf"(.+?)"
        rf"(?=\s+(?:{stop_words})\b|$)",
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            value,
            re.IGNORECASE
        )

        if match:

            member = clean_member_name(
                match.group(1)
            )

            if member:
                return member

    # --------------------------------------------------------
    # Pattern:
    #
    # "Waji should handle Build Website"
    # --------------------------------------------------------

    match = re.search(
        r"^(.+?)"
        r"\s+(?:should|will|can)\s+"
        r"(?:handle|work\s+on|do)\b",
        value,
        re.IGNORECASE
    )

    if match:

        member = clean_member_name(
            match.group(1)
        )

        if member:
            return member

    return None


# ============================================================
# FALLBACK TITLE + MEMBER EXTRACTION
# ============================================================

def extract_title_and_member_fallback(text):
    """
    Deterministic extraction.

    Handles different field orders.
    """

    title = extract_title(text)
    member = extract_member(text)

    # --------------------------------------------------------
    # Pattern:
    #
    # Assign Build Website to Waji Ul Hasaan
    # --------------------------------------------------------

    if not title:

        match = re.search(
            r"\b(?:assign|give|create)\b"
            r"\s+(?:a\s+)?(?:task\s+)?"
            r"(.+?)"
            r"\s+(?:to|for)\s+"
            r"(.+?)"
            r"(?=\s+(?:due|deadline|priority|"
            r"prioity|status)\b|$)",
            text,
            re.IGNORECASE
        )

        if match:

            possible_title = (
                match.group(1)
                .strip()
            )

            possible_member = (
                match.group(2)
                .strip()
            )

            # Avoid treating "a task" as title.
            possible_title = re.sub(
                r"^(?:a\s+)?task\s+",
                "",
                possible_title,
                flags=re.IGNORECASE
            ).strip()

            if possible_title:
                title = clean_task_title(
                    possible_title
                )

            if not member:
                member = clean_member_name(
                    possible_member
                )

    # --------------------------------------------------------
    # Pattern:
    #
    # Give Waji Ul Hasaan the Build Website task
    # --------------------------------------------------------

    if not title:

        match = re.search(
            r"\b(?:give|assign)\b"
            r"\s+(.+?)"
            r"\s+(?:the\s+)?"
            r"(?:task\s+)?"
            r"(.+?)"
            r"(?=\s+(?:by|due|deadline|priority|"
            r"prioity|status)\b|$)",
            text,
            re.IGNORECASE
        )

        if match:

            possible_member = (
                match.group(1)
                .strip()
            )

            possible_title = (
                match.group(2)
                .strip()
            )

            possible_title = re.sub(
                r"\btask$",
                "",
                possible_title,
                flags=re.IGNORECASE
            ).strip()

            if not member:
                member = clean_member_name(
                    possible_member
                )

            if possible_title:
                title = clean_task_title(
                    possible_title,
                    member
                )

    return title, member


# ============================================================
# GROQ EXTRACTION
# ============================================================

def extract_task_with_ai(text):
    """
    Use Groq to understand natural-language task assignment.

    Groq is used as an intelligent fallback/understanding layer.
    Explicit regex extraction later overrides Groq when the
    user directly specifies a field.
    """

    prompt = f"""
You are a task-assignment extraction system.

Read the user's sentence and extract the task assignment information.

USER MESSAGE:
{text}

Return ONLY valid JSON.

Required JSON:

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

1. Extract the ACTUAL task title only.

2. The task title may appear:
   - after "task title is"
   - after "title is"
   - after "task is"
   - after "task called"
   - after "task named"
   - after "titled"
   - after "whose title is"

3. The task title may appear BEFORE or AFTER the member name.

4. The team member may appear:
   - after "to"
   - after "for"
   - after "assigned to"
   - after "team member"
   - after "member"
   - after "developer"

5. Preserve the COMPLETE team member name.

6. Never put the team member inside task_title.

7. If the user says:
   "Assign a task to Waji Ul Hasaan task title is Build Website"
   then:
   member_name = "Waji Ul Hasaan"
   task_title = "Build Website"

8. If the user says:
   "Assign the task whose title is Build Website to Waji Ul Hasaan"
   then:
   task_title = "Build Website"
   member_name = "Waji Ul Hasaan"

9. If the user says:
   "Assign Build Website to Waji Ul Hasaan"
   then:
   task_title = "Build Website"
   member_name = "Waji Ul Hasaan"

10. If the user says:
    "Give Waji Ul Hasaan the Build Website task"
    then:
    member_name = "Waji Ul Hasaan"
    task_title = "Build Website"

11. Extract priority exactly when provided.

12. Priority values:
    High
    Medium
    Low

13. These words indicate priority:
    high priority
    priority high
    priority is high
    priority = high
    priority: high
    urgent
    critical

14. Extract status exactly when provided.

15. Status values:
    To Do
    Pending
    In Progress
    Completed

16. "In Progress" is a STATUS.
    NEVER treat "In Progress" as priority.

17. Extract due date exactly when provided.

18. Due-date examples:
    tomorrow
    today
    Friday
    next Monday
    15th
    15th of this month
    15 of this month
    15th this month
    15th of next month
    September 15
    15 September
    September 15, 2026
    2026-09-15
    09/15/2026

19. If no due date exists:
    due_date_text = null

20. If no priority exists:
    priority = "Medium"

21. If no status exists:
    status = "To Do"

22. Do not include explanations.

23. Do not include metadata words such as:
    "due date",
    "priority",
    "status",
    "assigned to"
    inside task_title.

24. Return valid JSON only.
"""

    try:

        response = client.chat.completions.create(
            model=GROQ_MODEL,

            messages=[
                {
                    "role": "system",
                    "content": (
                        "You extract structured task "
                        "assignment information. "
                        "Return valid JSON only."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],

            temperature=0
        )

        content = (
            response
            .choices[0]
            .message
            .content
        )

        return clean_json_response(
            content
        )

    except Exception as error:

        print(
            "Task assignment Groq extraction error:",
            error
        )

        return None


# ============================================================
# REGEX FALLBACK
# ============================================================

def extract_task_with_fallback(text):
    """
    Fully deterministic fallback.
    """

    title, member = (
        extract_title_and_member_fallback(
            text
        )
    )

    priority = (
        extract_explicit_priority(text)
        or "Medium"
    )

    status = (
        extract_explicit_status(text)
        or "To Do"
    )

    due_date = (
        extract_explicit_due_date(text)
    )

    return {
        "is_assignment": bool(
            title and member
        ),

        "member_name": member,

        "task_title": title,

        "description": "",

        "priority": priority,

        "status": status,

        "due_date_text": due_date
    }


# ============================================================
# CLEAN MEMBER NAME
# ============================================================

def clean_member_name(member_name):
    """
    Clean team member name.
    """

    if not member_name:
        return None

    value = str(
        member_name
    ).strip()

    value = re.sub(
        r"\s+",
        " ",
        value
    )

    value = value.strip(
        ".,:;!?\"'"
    )

    # Remove common accidental trailing words.
    value = re.split(
        r"\s+(?:task\s+title|title|task|"
        r"due\s*date|deadline|priority|"
        r"prioity|status|description)\b",
        value,
        maxsplit=1,
        flags=re.IGNORECASE
    )[0].strip()

    return value or None


# ============================================================
# CLEAN TASK TITLE
# ============================================================

def clean_task_title(
    title,
    member_name=None
):
    """
    Clean task title and remove accidental
    assignment metadata.
    """

    if not title:
        return None

    value = str(
        title
    ).strip()

    value = re.sub(
        r"\s+",
        " ",
        value
    )

    value = value.strip(
        ".,:;!?\"'"
    )

    # --------------------------------------------------------
    # Remove metadata accidentally captured after title.
    # --------------------------------------------------------

    value = re.split(
        r"\s+(?:due\s*date|deadline|priority|"
        r"prioity|status|description)\b",
        value,
        maxsplit=1,
        flags=re.IGNORECASE
    )[0].strip()

    # --------------------------------------------------------
    # Remove "which due date..."
    # --------------------------------------------------------

    value = re.split(
        r"\s+which\s+(?:is\s+)?"
        r"(?:due\s*date|deadline|priority|status)\b",
        value,
        maxsplit=1,
        flags=re.IGNORECASE
    )[0].strip()

    # --------------------------------------------------------
    # Remove "to MEMBER" from end of title.
    # --------------------------------------------------------

    if member_name:

        member_pattern = re.escape(
            member_name.strip()
        )

        value = re.sub(
            rf"\s+\bto\b\s+"
            rf"{member_pattern}\s*$",
            "",
            value,
            flags=re.IGNORECASE
        )

    # --------------------------------------------------------
    # Remove trailing word "task".
    #
    # Example:
    #
    # Build Website task
    #
    # becomes:
    #
    # Build Website
    # --------------------------------------------------------

    value = re.sub(
        r"\s+task$",
        "",
        value,
        flags=re.IGNORECASE
    ).strip()

    return value or None


# ============================================================
# DESCRIPTION EXTRACTION
# ============================================================

def extract_description(text):
    """
    Optional description extraction.

    Examples:

        description is implement the login page

        with description implement the login page

        description: implement the login page
    """

    if not text:
        return ""

    match = re.search(
        r"\bdescription\b"
        r"\s*(?:is|=|:)?\s*"
        r"(.+?)"
        r"(?=\s+(?:due\s*date|deadline|priority|"
        r"prioity|status)\b|$)",
        text,
        re.IGNORECASE
    )

    if match:

        return match.group(1).strip()

    return ""


# ============================================================
# MAIN PROCESSOR
# ============================================================

def process_task_assignment(
    token=None,
    project_id=None,
    question=None
):
    """
    Main task assignment processor.

    IMPORTANT:
    The signature matches main.py:

        process_task_assignment(
            token=token,
            project_id=request.project_id,
            question=request.question
        )

    Returns None when the message is not an assignment request.

    Otherwise returns:

    {
        "success": True,
        "action": "assign_task",
        "answer": "...",
        "task": {
            "title": "...",
            "description": "...",
            "assigned_to": "...",
            "priority": "...",
            "status": "...",
            "due_date": "YYYY-MM-DD"
        },
        "project_id": "..."
    }
    """

    # --------------------------------------------------------
    # QUESTION VALIDATION
    # --------------------------------------------------------

    if not question:
        return None

    text = str(
        question
    ).strip()

    if not text:
        return None

    # --------------------------------------------------------
    # CHECK WHETHER THIS IS AN ASSIGNMENT REQUEST
    # --------------------------------------------------------

    if not is_task_assignment_request(
        text
    ):
        return None

    print(
        "\n=============================================="
    )

    print(
        "TASK ASSIGNMENT REQUEST DETECTED"
    )

    print(
        "Original:",
        text
    )

    print(
        "=============================================="
    )

    # ========================================================
    # 1. GROQ EXTRACTION
    # ========================================================

    task_data = extract_task_with_ai(
        text
    )

    # ========================================================
    # 2. FALLBACK IF GROQ FAILED
    # ========================================================

    if not isinstance(
        task_data,
        dict
    ):

        print(
            "Groq extraction failed."
        )

        print(
            "Using deterministic regex extraction."
        )

        task_data = (
            extract_task_with_fallback(
                text
            )
        )

    if not isinstance(
        task_data,
        dict
    ):
        task_data = {}

    # ========================================================
    # 3. EXPLICIT VALUES FROM ORIGINAL USER SENTENCE
    #
    # These ALWAYS OVERRIDE GROQ.
    # ========================================================

    explicit_priority = (
        extract_explicit_priority(
            text
        )
    )

    explicit_status = (
        extract_explicit_status(
            text
        )
    )

    explicit_due_date = (
        extract_explicit_due_date(
            text
        )
    )

    # ========================================================
    # 4. EXTRACT TITLE DIRECTLY
    #
    # Direct extraction has priority over Groq.
    # ========================================================

    direct_title = extract_title(
        text
    )

    if direct_title:

        task_data[
            "task_title"
        ] = direct_title

    # ========================================================
    # 5. EXTRACT MEMBER DIRECTLY
    #
    # Direct extraction has priority over Groq.
    # ========================================================

    direct_member = extract_member(
        text
    )

    if direct_member:

        task_data[
            "member_name"
        ] = direct_member

    # ========================================================
    # 6. FALLBACK TITLE + MEMBER
    # ========================================================

    fallback_title = None
    fallback_member = None

    if (
        not task_data.get(
            "task_title"
        )
        or not task_data.get(
            "member_name"
        )
    ):

        (
            fallback_title,
            fallback_member
        ) = extract_title_and_member_fallback(
            text
        )

    if not task_data.get(
        "task_title"
    ):

        task_data[
            "task_title"
        ] = fallback_title

    if not task_data.get(
        "member_name"
    ):

        task_data[
            "member_name"
        ] = fallback_member

    # ========================================================
    # 7. PRIORITY OVERRIDE
    # ========================================================

    if explicit_priority:

        task_data[
            "priority"
        ] = explicit_priority

    # ========================================================
    # 8. STATUS OVERRIDE
    # ========================================================

    if explicit_status:

        task_data[
            "status"
        ] = explicit_status

    # ========================================================
    # 9. DUE DATE OVERRIDE
    # ========================================================

    if explicit_due_date:

        task_data[
            "due_date_text"
        ] = explicit_due_date

    # ========================================================
    # 10. CLEAN MEMBER
    # ========================================================

    member_name = clean_member_name(
        task_data.get(
            "member_name"
        )
    )

    # ========================================================
    # 11. CLEAN TITLE
    # ========================================================

    task_title = clean_task_title(
        task_data.get(
            "task_title"
        ),
        member_name
    )

    # ========================================================
    # 12. NORMALIZE PRIORITY
    # ========================================================

    priority = normalize_priority(
        task_data.get(
            "priority"
        )
    )

    # ========================================================
    # 13. NORMALIZE STATUS
    # ========================================================

    status = normalize_status(
        task_data.get(
            "status"
        )
    )

    # ========================================================
    # 14. NORMALIZE DUE DATE
    # ========================================================

    due_date = normalize_due_date(
        task_data.get(
            "due_date_text"
        )
    )

    # ========================================================
    # 15. DESCRIPTION
    # ========================================================

    description = (
        task_data.get(
            "description"
        )
        or ""
    )

    # If Groq did not provide a useful description,
    # try explicit description extraction.
    if not description.strip():

        description = (
            extract_description(
                text
            )
        )

    description = str(
        description
    ).strip()

    # ========================================================
    # 16. VALIDATION
    # ========================================================

    if not task_title:

        return {
            "success": False,

            "action": "assign_task",

            "answer": (
                "I understood that you want "
                "to assign a task, but I could "
                "not determine the task title."
            ),

            "task": None,

            "project_id": project_id
        }

    if not member_name:

        return {
            "success": False,

            "action": "assign_task",

            "answer": (
                f'I understood that the task is '
                f'"{task_title}", but I could not '
                f"determine which team member to "
                f"assign it to."
            ),

            "task": None,

            "project_id": project_id
        }

    # ========================================================
    # 17. FINAL RESULT
    # ========================================================

    result = {

        "success": True,

        "action": "assign_task",

        "answer": (
            f'I understood that you want to '
            f'assign "{task_title}" '
            f'to {member_name}.'
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

    # ========================================================
    # DEBUG
    # ========================================================

    print(
        "\n=============================================="
    )

    print(
        "TASK ASSIGNMENT EXTRACTION"
    )

    print(
        "=============================================="
    )

    print(
        "Original:",
        text
    )

    print(
        "Title:",
        task_title
    )

    print(
        "Member:",
        member_name
    )

    print(
        "Priority:",
        priority
    )

    print(
        "Status:",
        status
    )

    print(
        "Due Date:",
        due_date
    )

    print(
        "Project ID:",
        project_id
    )

    print(
        "==============================================\n"
    )

    return result

