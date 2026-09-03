import json
import os
import re

from dotenv import load_dotenv
from google import genai
from groq import Groq

from services.backend_service import (
    get_project_tasks,
    get_projects,
    get_team_members,
)


# Load environment variables
load_dotenv()


# Configure API keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    "llama-3.3-70b-versatile"
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.6-flash"
)


# Validate AI configuration
if not GROQ_API_KEY and not GEMINI_API_KEY:
    raise RuntimeError(
        "Both GROQ_API_KEY and GEMINI_API_KEY are missing. "
        "Add at least one API key to the .env file."
    )


# Initialize Groq client
groq_client = None

if GROQ_API_KEY:
    groq_client = Groq(
        api_key=GROQ_API_KEY
    )


# Initialize Gemini client
gemini_client = None

if GEMINI_API_KEY:
    gemini_client = genai.Client(
        api_key=GEMINI_API_KEY
    )


# Define the main assistant instructions
SYSTEM_PROMPT = """
You are the AI Assistant for a project management
application called CollabFlow.

Your job is to answer questions about the CURRENT PROJECT
only.

The application sends you information about one active
project, its tasks, and its team members.

You MUST NEVER answer using information from another project.

CURRENT PROJECT RULE

The user is currently inside ONE specific project.

All questions must be answered using ONLY the current
project information supplied in the prompt.

NEVER:

- Mention another project
- Compare another project
- List another project
- Give information from another project
- Combine tasks from another project
- Combine team members from another project
- Calculate totals using another project

If information about another project appears in the prompt,
IGNORE it.

The current project is the only project that matters.

PROJECT QUESTIONS

If the user asks:

"Give me the project summary"

Return information ONLY about the current project.

A good response should look like:

Project: RAG

Status: Pending

Tasks: 20

Pending: 12

In Progress: 4

Completed: 4

Team Members:
- Najeeb
- Waji Ul Hasaan

Do NOT mention any other project.

PROJECT STATUS

When showing project information, clearly identify:

Project
Status
Tasks
Progress
Team Members

Only show fields that actually exist.

Never invent information.

TASK QUESTIONS

Tasks supplied to you belong to the current project.

If the user asks:

"Which tasks are pending?"

Show only pending tasks from the current project.

If the user asks:

"Which tasks are completed?"

Show only completed tasks from the current project.

If the user asks:

"Which tasks are in progress?"

Show only in-progress tasks from the current project.

If the user asks:

"How many tasks are there?"

Count only tasks belonging to the current project.

TEAM MEMBER QUESTIONS

When the user asks about a team member, search the supplied
team information.

The user may use:

- Full name
- First name
- Last name
- Partial name
- Email
- Partial email

Names should be matched case-insensitively.

If the person is found, use their identifier internally
to match their tasks.

Never expose their internal ID.

TASK ASSIGNMENT

A task may contain:

assigned_to
assigned_user_id
assigned_to_name
assigned_to_email

The assigned_to field may contain a numeric user ID.

The team information contains the corresponding member ID.

Never treat a numeric ID as a person's name.

MEMBER TASK QUESTIONS

If the user asks:

"Which tasks are assigned to Ahmed?"

Find Ahmed in the current project team.

Then find tasks assigned to Ahmed.

Return the task names and useful information.

TASK COUNT

If the user asks:

"How many tasks does Ahmed have?"

Count only Ahmed's tasks in the CURRENT PROJECT.

NO TASKS

Only say that a member has no tasks when:

1. The member was successfully found.
2. Their identifier was determined.
3. The current project's tasks were checked.
4. No matching task exists.

If the member cannot be found, say:

"I couldn't find that team member in the current project."

WHO HAS MOST TASKS

If the user asks:

"Who has the most tasks?"

Calculate the count using ONLY the current project's tasks.

WHO HAS LEAST TASKS

If the user asks:

"Who has the least tasks?"

Calculate the count using ONLY the current project's tasks.

FRIENDLY CONVERSATION

For simple greetings, respond naturally and briefly.

Examples:

Aoa

Wa Alaikum Assalam! How can I help you with this project?

Good morning

Good morning! How can I help you with this project today?

How are you?

I'm doing well, thank you! How can I help with your project?

Thank you

You're welcome!

EMAIL REQUESTS

When the user asks to prepare, draft, compose, or send an email,
the application will prepare an email draft.

NEVER claim that an email has already been sent.

The application handles the actual email sending process.

The email must be addressed only to a team member that exists
in the CURRENT PROJECT.

Never invent an email address.

If the requested team member cannot be found, tell the user
that you could not find that team member in the current project.

UNRELATED QUESTIONS

If the user asks something unrelated to project management,
do not answer it.

Instead say:

"I'm your project management assistant. I can help with
this project's tasks, team members, assignments, status,
progress, and workload."

SECURITY

Never reveal:

- API keys
- Access tokens
- JWT tokens
- Passwords
- Environment variables
- Internal credentials
- Authentication information

Never expose internal database information.

DO NOT EXPOSE DATABASE INFORMATION

Never show:

- IDs
- UUIDs
- project_id
- user_id
- assigned_to
- assigned_user_id
- created_by
- database columns
- table names
- SQL
- raw JSON
- Python dictionaries
- hashes
- backend objects

Convert backend information into normal human-readable
language.

ANSWER FORMAT

Your answers must be clean, readable, and professional.

Do NOT use:

###
---
***
JSON
Raw database output
Long technical explanations

Use simple headings when useful.

PROJECT SUMMARY FORMAT

When the user asks for a project summary, prefer this format:

Project: [project name]

Status: [status]

Tasks: [total task count]

Pending: [count]

In Progress: [count]

Completed: [count]

Team Members:
- [member]
- [member]

Only include fields that are available.

Do NOT add unnecessary information.

IMPORTANT

The user wants information about the project they are
currently viewing.

Always prioritize the CURRENT PROJECT.

Never provide a list of all projects unless the user
explicitly asks:

"Show me all projects"

or:

"List all my projects"

If the user asks:

"Give me the project summary"

they mean the CURRENT PROJECT.

If the user asks:

"Tell me about this project"

they mean the CURRENT PROJECT.

If the user asks:

"What is the status?"

they mean the CURRENT PROJECT.

If the user asks:

"How many tasks are there?"

they mean tasks in the CURRENT PROJECT.

FINAL RULE

Before answering:

1. Identify the current project.
2. Ignore unrelated projects.
3. Use only current-project tasks.
4. Use only relevant current-project team information.
5. Understand what the user actually asked.
6. Answer only that question.
7. Keep the answer concise.
8. Use readable structure.
9. Never expose database information.
10. Never invent information.
"""


# Retrieve current project information
def get_project_information(token, project_id):
    all_projects = get_projects(token)

    projects = normalize_projects(all_projects)

    current_project = find_current_project(
        projects,
        project_id
    )

    tasks = get_project_tasks(
        project_id,
        token
    )

    team = get_team_members(
        token
    )

    team = normalize_team(team)

    return {
        "project": current_project,
        "tasks": tasks,
        "team": team
    }


# Normalize project response
def normalize_projects(projects):
    if isinstance(projects, list):
        return projects

    if isinstance(projects, dict):
        for key in (
            "projects",
            "data",
            "results"
        ):
            value = projects.get(key)

            if isinstance(value, list):
                return value

    return []


# Find the current project
def find_current_project(
    projects,
    project_id
):
    project_id = str(project_id)

    for project in projects:
        if not isinstance(project, dict):
            continue

        current_id = (
            project.get("id")
            or project.get("project_id")
            or project.get("projectId")
        )

        if current_id is not None:
            if str(current_id) == project_id:
                return project

    return {
        "id": project_id,
        "name": "Current Project"
    }


# Normalize task response
def normalize_tasks(tasks):
    if isinstance(tasks, list):
        return tasks

    if isinstance(tasks, dict):
        for key in (
            "tasks",
            "data",
            "results"
        ):
            value = tasks.get(key)

            if isinstance(value, list):
                return value

    return []


# Normalize team response
def normalize_team(team):
    if isinstance(team, list):
        return team

    if isinstance(team, dict):
        for key in (
            "team",
            "members",
            "team_members",
            "data",
            "results"
        ):
            value = team.get(key)

            if isinstance(value, list):
                return value

    return []


# Enrich tasks with assigned member information
def enrich_task_assignments(
    project_information
):
    tasks = normalize_tasks(
        project_information.get(
            "tasks",
            []
        )
    )

    team = normalize_team(
        project_information.get(
            "team",
            []
        )
    )

    team_by_id = {}

    for member in team:
        if not isinstance(member, dict):
            continue

        member_id = (
            member.get("id")
            or member.get("user_id")
            or member.get("userId")
        )

        if member_id is None:
            continue

        team_by_id[str(member_id)] = member

    enriched_tasks = []

    for task in tasks:
        if not isinstance(task, dict):
            continue

        enriched_task = dict(task)

        assigned_id = (
            task.get("assigned_user_id")
            if task.get("assigned_user_id") is not None
            else task.get("assigned_to")
        )

        if assigned_id is not None:
            member = team_by_id.get(
                str(assigned_id)
            )

            if member:
                member_name = (
                    member.get("name")
                    or member.get("full_name")
                    or member.get("username")
                )

                enriched_task[
                    "resolved_assigned_user_id"
                ] = assigned_id

                enriched_task[
                    "resolved_assigned_to_name"
                ] = member_name

                enriched_task[
                    "resolved_assigned_to_email"
                ] = member.get("email")

            else:
                enriched_task[
                    "resolved_assigned_user_id"
                ] = assigned_id

                enriched_task[
                    "resolved_assigned_to_name"
                ] = None

                enriched_task[
                    "resolved_assigned_to_email"
                ] = None

        else:
            enriched_task[
                "resolved_assigned_user_id"
            ] = None

            enriched_task[
                "resolved_assigned_to_name"
            ] = None

            enriched_task[
                "resolved_assigned_to_email"
            ] = None

        enriched_tasks.append(
            enriched_task
        )

    project_information["tasks"] = (
        enriched_tasks
    )

    return project_information


# Build project context for AI
def build_project_context(
    project_information
):
    project_information = (
        enrich_task_assignments(
            project_information
        )
    )

    return json.dumps(
        project_information,
        indent=2,
        default=str
    )


# Find matching team members
def find_matching_members(
    project_information,
    question
):
    team = normalize_team(
        project_information.get(
            "team",
            []
        )
    )

    if not team:
        return []

    question_lower = (
        question.lower()
        .strip()
    )

    matches = []

    for member in team:
        if not isinstance(member, dict):
            continue

        member_id = (
            member.get("id")
            or member.get("user_id")
            or member.get("userId")
        )

        if member_id is None:
            continue

        name = str(
            member.get("name")
            or member.get("full_name")
            or member.get("username")
            or ""
        ).strip()

        email = str(
            member.get("email")
            or ""
        ).strip()

        name_lower = name.lower()
        email_lower = email.lower()

        if (
            email_lower
            and email_lower in question_lower
        ):
            matches.append(member)
            continue

        if (
            name_lower
            and name_lower in question_lower
        ):
            matches.append(member)
            continue

        name_parts = [
            part
            for part in re.split(
                r"\s+",
                name_lower
            )
            if len(part) >= 3
        ]

        if any(
            part in question_lower
            for part in name_parts
        ):
            matches.append(member)

    unique_members = {}

    for member in matches:
        member_id = (
            member.get("id")
            or member.get("user_id")
            or member.get("userId")
        )

        if member_id is not None:
            unique_members[
                str(member_id)
            ] = member

    return list(
        unique_members.values()
    )


# Build member-specific task context
def build_member_context(
    project_information,
    question
):
    members = find_matching_members(
        project_information,
        question
    )

    if not members:
        return ""

    tasks = normalize_tasks(
        project_information.get(
            "tasks",
            []
        )
    )

    sections = []

    for member in members:
        member_id = (
            member.get("id")
            or member.get("user_id")
            or member.get("userId")
        )

        member_name = (
            member.get("name")
            or member.get("full_name")
            or member.get("username")
            or "Unknown"
        )

        matching_tasks = []

        for task in tasks:
            assigned_id = (
                task.get(
                    "resolved_assigned_user_id"
                )
                if task.get(
                    "resolved_assigned_user_id"
                ) is not None
                else (
                    task.get("assigned_user_id")
                    if task.get(
                        "assigned_user_id"
                    ) is not None
                    else task.get("assigned_to")
                )
            )

            if (
                assigned_id is not None
                and member_id is not None
                and str(assigned_id)
                == str(member_id)
            ):
                matching_tasks.append(
                    task
                )

        sections.append(
            {
                "matched_member_name": member_name,
                "assigned_task_count": len(
                    matching_tasks
                ),
                "assigned_tasks": matching_tasks
            }
        )

    return json.dumps(
        sections,
        indent=2,
        default=str
    )


# Build the normal AI prompt
def build_user_prompt(
    project_information,
    question
):
    project_context = (
        build_project_context(
            project_information
        )
    )

    member_context = (
        build_member_context(
            project_information,
            question
        )
    )

    member_section = ""

    if member_context:
        member_section = f"""

MATCHED TEAM MEMBER INFORMATION:

{member_context}

Use the matched member information when answering
member-specific questions.

If assigned_task_count is greater than zero,
do not say the member has no tasks.
"""

    return f"""
CURRENT PROJECT INFORMATION:

{project_context}

{member_section}

USER QUESTION:

{question}

IMPORTANT:

The user is currently viewing this project.

Answer using ONLY the CURRENT PROJECT information.

Do NOT mention other projects.

Do NOT list all projects.

Do NOT combine data from different projects.

If the user asks for the project summary,
summarize ONLY this project.

If the user asks for the project status,
give ONLY this project's status.

If the user asks about tasks,
use ONLY this project's tasks.

If the user asks about team members,
use ONLY the relevant team information.

If the user asks about a team member's tasks,
use the member matching information and current project's
task assignments.

Keep the response concise and easy to understand.

Do not show:

- IDs
- UUIDs
- project_id
- user_id
- assigned_to
- assigned_user_id
- database columns
- SQL
- JSON
- hashes
- raw backend objects

Do not use markdown hashes such as ###.

Do not use horizontal separators such as ---.

Use simple readable labels.

Answer only what the user asked.

Never invent information.
"""


# Detect whether the user requested an email
def is_email_request(question):
    email_patterns = [
        r"\bemail\b",
        r"\be-mail\b",
        r"\bsend\s+an?\s+email\b",
        r"\bsend\s+email\b",
        r"\bdraft\s+an?\s+email\b",
        r"\bwrite\s+an?\s+email\b",
        r"\bcompose\s+an?\s+email\b",
        r"\bprepare\s+an?\s+email\b",
        r"\bnotify\b.*\bemail\b",
    ]

    question_lower = question.lower()

    return any(
        re.search(
            pattern,
            question_lower
        )
        for pattern in email_patterns
    )


# Create the email generation prompt
def build_email_prompt(
    project_information,
    question,
    member
):
    member_name = (
        member.get("name")
        or member.get("full_name")
        or member.get("username")
        or "Team Member"
    )

    member_email = (
        member.get("email")
        or ""
    )

    project = project_information.get(
        "project",
        {}
    )

    project_name = (
        project.get("name")
        or project.get("title")
        or "Current Project"
    )

    return f"""
You are preparing an email for the CollabFlow project
management application.

The user wants to prepare an email for a team member.

CURRENT PROJECT:
{project_name}

RECIPIENT NAME:
{member_name}

RECIPIENT EMAIL:
{member_email}

USER REQUEST:
{question}

Create a professional email based on the user's request.

Rules:

1. The recipient must be the provided team member.
2. Never change the recipient email.
3. Never invent an email address.
4. Create a clear and professional subject.
5. Create a concise email body.
6. Do not claim that the email was sent.
7. Do not mention internal IDs.
8. Do not mention database information.
9. Do not add information that was not requested.
10. Return ONLY valid JSON.

The JSON must have exactly this structure:

{{
  "recipientName": "{member_name}",
  "recipientEmail": "{member_email}",
  "subject": "Email subject",
  "body": "Email body"
}}
"""


# Extract JSON from an AI response
def parse_email_response(response_text):
    if not response_text:
        raise ValueError(
            "AI returned an empty email response."
        )

    text = response_text.strip()

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

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(
            r"\{.*\}",
            text,
            flags=re.DOTALL
        )

        if not match:
            raise ValueError(
                "AI did not return valid email JSON."
            )

        try:
            data = json.loads(
                match.group(0)
            )
        except json.JSONDecodeError as error:
            raise ValueError(
                "AI returned invalid email JSON."
            ) from error

    if not isinstance(data, dict):
        raise ValueError(
            "Email response must be a JSON object."
        )

    recipient_name = str(
        data.get("recipientName")
        or ""
    ).strip()

    recipient_email = str(
        data.get("recipientEmail")
        or ""
    ).strip()

    subject = str(
        data.get("subject")
        or ""
    ).strip()

    body = str(
        data.get("body")
        or ""
    ).strip()

    if not recipient_name:
        raise ValueError(
            "Email recipient name is missing."
        )

    if not recipient_email:
        raise ValueError(
            "Email recipient email is missing."
        )

    if not subject:
        raise ValueError(
            "Email subject is missing."
        )

    if not body:
        raise ValueError(
            "Email body is missing."
        )

    return {
        "recipientName": recipient_name,
        "recipientEmail": recipient_email,
        "subject": subject,
        "body": body
    }


# Generate an email draft using Groq
def generate_email_with_groq(
    email_prompt
):
    if not groq_client:
        raise RuntimeError(
            "Groq client is not configured."
        )

    print(
        f"Attempting Groq email generation: {GROQ_MODEL}"
    )

    response = (
        groq_client
        .chat
        .completions
        .create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You generate professional email drafts. "
                        "Return only valid JSON."
                    )
                },
                {
                    "role": "user",
                    "content": email_prompt
                }
            ],
            temperature=0.1,
            max_tokens=1000
        )
    )

    answer = (
        response
        .choices[0]
        .message
        .content
    )

    if not answer:
        raise RuntimeError(
            "Groq returned an empty email response."
        )

    return parse_email_response(
        answer
    )


# Generate an email draft using Gemini
def generate_email_with_gemini(
    email_prompt
):
    if not gemini_client:
        raise RuntimeError(
            "Gemini client is not configured."
        )

    print(
        f"Attempting Gemini email generation: {GEMINI_MODEL}"
    )

    combined_prompt = f"""
You generate professional email drafts.

Return ONLY valid JSON.

{email_prompt}
"""

    response = (
        gemini_client
        .models
        .generate_content(
            model=GEMINI_MODEL,
            contents=combined_prompt
        )
    )

    answer = getattr(
        response,
        "text",
        None
    )

    if not answer:
        raise RuntimeError(
            "Gemini returned an empty email response."
        )

    return parse_email_response(
        answer
    )


# Generate an email draft
def generate_email_draft(
    project_information,
    question
):
    members = find_matching_members(
        project_information,
        question
    )

    if not members:
        return {
            "success": False,
            "email": None,
            "answer": (
                "I couldn't find that team member "
                "in the current project."
            )
        }

    if len(members) > 1:
        member_names = []

        for member in members:
            name = (
                member.get("name")
                or member.get("full_name")
                or member.get("username")
            )

            if name:
                member_names.append(
                    str(name)
                )

        return {
            "success": False,
            "email": None,
            "answer": (
                "I found multiple team members matching "
                f"your request: {', '.join(member_names)}. "
                "Please specify the member's full name."
            )
        }

    member = members[0]

    recipient_email = str(
        member.get("email")
        or ""
    ).strip()

    if not recipient_email:
        return {
            "success": False,
            "email": None,
            "answer": (
                "The team member was found, but "
                "their email address is not available."
            )
        }

    email_prompt = build_email_prompt(
        project_information,
        question,
        member
    )

    groq_error = None

    if groq_client:
        try:
            email = generate_email_with_groq(
                email_prompt
            )

            email["recipientEmail"] = (
                recipient_email
            )

            email["recipientName"] = (
                member.get("name")
                or member.get("full_name")
                or member.get("username")
                or email["recipientName"]
            )

            return {
                "success": True,
                "email": email,
                "answer": (
                    f"I prepared an email draft for "
                    f"{email['recipientName']}."
                ),
                "provider": "groq",
                "model": GROQ_MODEL
            }

        except Exception as error:
            groq_error = error

            print(
                "Groq email generation failed:",
                type(error).__name__,
                str(error)
            )

    if gemini_client:
        try:
            email = generate_email_with_gemini(
                email_prompt
            )

            email["recipientEmail"] = (
                recipient_email
            )

            email["recipientName"] = (
                member.get("name")
                or member.get("full_name")
                or member.get("username")
                or email["recipientName"]
            )

            return {
                "success": True,
                "email": email,
                "answer": (
                    f"I prepared an email draft for "
                    f"{email['recipientName']}."
                ),
                "provider": "gemini",
                "model": GEMINI_MODEL
            }

        except Exception as error:
            print(
                "Gemini email generation failed:",
                type(error).__name__,
                str(error)
            )

    error_messages = []

    if groq_error:
        error_messages.append(
            f"Groq: {type(groq_error).__name__}: "
            f"{str(groq_error)}"
        )

    if not error_messages:
        error_messages.append(
            "No AI provider is configured."
        )

    return {
        "success": False,
        "email": None,
        "answer": (
            "I could not prepare the email draft."
        ),
        "error": " | ".join(
            error_messages
        )
    }


# Clean normal AI response
def clean_ai_response(
    answer
):
    if not answer:
        return ""

    answer = answer.strip()

    answer = re.sub(
        r"^\s*#{1,6}\s*",
        "",
        answer,
        flags=re.MULTILINE
    )

    answer = re.sub(
        r"^\s*[-*_]{3,}\s*$",
        "",
        answer,
        flags=re.MULTILINE
    )

    answer = re.sub(
        r"\n{3,}",
        "\n\n",
        answer
    )

    answer = answer.replace(
        "```json",
        ""
    )

    answer = answer.replace(
        "```",
        ""
    )

    return answer.strip()


# Call Groq
def call_groq(
    user_prompt
):
    if not groq_client:
        raise RuntimeError(
            "Groq client is not configured."
        )

    print(
        f"Attempting Groq model: {GROQ_MODEL}"
    )

    response = (
        groq_client
        .chat
        .completions
        .create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            temperature=0.1,
            max_tokens=2000
        )
    )

    answer = (
        response
        .choices[0]
        .message
        .content
    )

    if not answer:
        raise RuntimeError(
            "Groq returned an empty response."
        )

    return clean_ai_response(
        answer
    )


# Call Gemini
def call_gemini(
    user_prompt
):
    if not gemini_client:
        raise RuntimeError(
            "Gemini client is not configured."
        )

    print(
        f"Attempting Gemini backup model: {GEMINI_MODEL}"
    )

    combined_prompt = f"""
{SYSTEM_PROMPT}

CURRENT REQUEST:

{user_prompt}
"""

    response = (
        gemini_client
        .models
        .generate_content(
            model=GEMINI_MODEL,
            contents=combined_prompt
        )
    )

    answer = getattr(
        response,
        "text",
        None
    )

    if not answer:
        raise RuntimeError(
            "Gemini returned an empty response."
        )

    return clean_ai_response(
        answer
    )


# Run the AI assistant
def ask_ai_assistant(
    token,
    project_id,
    question
):
    if question is None:
        raise ValueError(
            "Question is required."
        )

    question = str(
        question
    ).strip()

    if not question:
        raise ValueError(
            "Question cannot be empty."
        )

    if project_id is None:
        raise ValueError(
            "Project ID is required."
        )

    project_id = str(
        project_id
    ).strip()

    if not project_id:
        raise ValueError(
            "Project ID cannot be empty."
        )

    try:
        project_information = (
            get_project_information(
                token,
                project_id
            )
        )

    except Exception as error:
        print(
            "Backend data error:",
            type(error).__name__,
            ":",
            str(error)
        )

        raise RuntimeError(
            f"Unable to retrieve project data: {str(error)}"
        )

    # Handle email requests separately
    if is_email_request(question):
        email_result = generate_email_draft(
            project_information,
            question
        )

        return {
            "success": email_result.get(
                "success",
                False
            ),
            "answer": email_result.get(
                "answer",
                "I could not prepare the email draft."
            ),
            "email": email_result.get(
                "email"
            ),
            "provider": email_result.get(
                "provider"
            ),
            "model": email_result.get(
                "model"
            ),
            "project_id": project_id
        }

    user_prompt = (
        build_user_prompt(
            project_information,
            question
        )
    )

    groq_error = None

    if groq_client:
        try:
            answer = call_groq(
                user_prompt
            )

            print(
                "AI provider used: GROQ"
            )

            return {
                "success": True,
                "answer": answer,
                "provider": "groq",
                "model": GROQ_MODEL,
                "project_id": project_id
            }

        except Exception as error:
            groq_error = error

            print(
                "============================================================"
            )

            print(
                "GROQ FAILED - SWITCHING TO GEMINI"
            )

            print(
                f"Groq error: "
                f"{type(error).__name__}: {str(error)}"
            )

            print(
                "============================================================"
            )

    gemini_error = None

    if gemini_client:
        try:
            answer = call_gemini(
                user_prompt
            )

            print(
                "AI provider used: GEMINI BACKUP"
            )

            return {
                "success": True,
                "answer": answer,
                "provider": "gemini",
                "model": GEMINI_MODEL,
                "project_id": project_id
            }

        except Exception as error:
            gemini_error = error

            print(
                "============================================================"
            )

            print(
                "GEMINI BACKUP FAILED"
            )

            print(
                f"Gemini error: "
                f"{type(error).__name__}: {str(error)}"
            )

            print(
                "============================================================"
            )

    error_messages = []

    if groq_error:
        error_messages.append(
            f"Groq: "
            f"{type(groq_error).__name__}: "
            f"{str(groq_error)}"
        )

    if gemini_error:
        error_messages.append(
            f"Gemini: "
            f"{type(gemini_error).__name__}: "
            f"{str(gemini_error)}"
        )

    if not error_messages:
        error_messages.append(
            "No AI provider is configured."
        )

    final_error = " | ".join(
        error_messages
    )

    print(
        "============================================================"
    )

    print(
        "ALL AI PROVIDERS FAILED"
    )

    print(
        final_error
    )

    print(
        "============================================================"
    )

    raise RuntimeError(
        f"AI assistant failed: {final_error}"
    )