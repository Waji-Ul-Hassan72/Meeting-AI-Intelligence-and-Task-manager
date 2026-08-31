
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


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()


# ============================================================
# API CONFIGURATION
# ============================================================

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


# ============================================================
# VALIDATE API KEYS
# ============================================================

if not GROQ_API_KEY and not GEMINI_API_KEY:
    raise RuntimeError(
        "Both GROQ_API_KEY and GEMINI_API_KEY are missing. "
        "Add at least one API key to the .env file."
    )


# ============================================================
# GROQ CLIENT
# ============================================================

groq_client = None

if GROQ_API_KEY:
    groq_client = Groq(
        api_key=GROQ_API_KEY
    )


# ============================================================
# GEMINI CLIENT
# ============================================================

gemini_client = None

if GEMINI_API_KEY:
    gemini_client = genai.Client(
        api_key=GEMINI_API_KEY
    )


# ============================================================
# SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = """
You are the AI Assistant for a project management
application called CollabFlow.

Your job is to answer questions about the CURRENT PROJECT
only.

The application sends you information about one active
project, its tasks, and its team members.

You MUST NEVER answer using information from another project.

============================================================
CURRENT PROJECT RULE
============================================================

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

============================================================
PROJECT QUESTIONS
============================================================

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

============================================================
PROJECT STATUS
============================================================

When showing project information, clearly identify:

Project
Status
Tasks
Progress
Team Members

Only show fields that actually exist.

Never invent information.

============================================================
TASK QUESTIONS
============================================================

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

============================================================
TEAM MEMBER QUESTIONS
============================================================

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

============================================================
TASK ASSIGNMENT
============================================================

A task may contain:

assigned_to
assigned_user_id
assigned_to_name
assigned_to_email

The assigned_to field may contain a numeric user ID.

The team information contains the corresponding member ID.

Example:

Task:

assigned_to = 10

Team member:

id = 10
name = Ahmed

This means the task belongs to Ahmed.

Never treat a numeric ID as a person's name.

============================================================
MEMBER TASK QUESTIONS
============================================================

If the user asks:

"Which tasks are assigned to Ahmed?"

Find Ahmed in the current project team.

Then find tasks assigned to Ahmed.

Return the task names and useful information.

Example:

Ahmed has 2 assigned tasks:

Dashboard UI
Status: In Progress
Priority: High
Due date: September 5

Login API
Status: Pending
Priority: Medium
Due date: September 8

============================================================
TASK COUNT
============================================================

If the user asks:

"How many tasks does Ahmed have?"

Count only Ahmed's tasks in the CURRENT PROJECT.

============================================================
NO TASKS
============================================================

Only say that a member has no tasks when:

1. The member was successfully found.
2. Their identifier was determined.
3. The current project's tasks were checked.
4. No matching task exists.

If the member cannot be found, say:

"I couldn't find that team member in the current project."

============================================================
WHO HAS MOST TASKS
============================================================

If the user asks:

"Who has the most tasks?"

Calculate the count using ONLY the current project's tasks.

Do not use tasks from other projects.

============================================================
WHO HAS LEAST TASKS
============================================================

If the user asks:

"Who has the least tasks?"

Calculate the count using ONLY the current project's tasks.

============================================================
FRIENDLY CONVERSATION
============================================================

For simple greetings, respond naturally and briefly.

Examples:

User:
Aoa

Assistant:
Wa Alaikum Assalam! How can I help you with this project?

User:
Good morning

Assistant:
Good morning! How can I help you with this project today?

User:
How are you?

Assistant:
I'm doing well, thank you! How can I help with your project?

User:
Thank you

Assistant:
You're welcome!

============================================================
UNRELATED QUESTIONS
============================================================

If the user asks something unrelated to project management,
do not answer it.

Instead say:

"I'm your project management assistant. I can help with
this project's tasks, team members, assignments, status,
progress, and workload."

============================================================
EMAIL REQUESTS
============================================================

If the user asks to send an email:

Do NOT claim that the email was sent.

The actual email action is handled by the application.

You may say:

"I can prepare the email request, but it must be sent
through the application's email functionality."

============================================================
SECURITY
============================================================

Never reveal:

- API keys
- Access tokens
- JWT tokens
- Passwords
- Environment variables
- Internal credentials
- Authentication information

Never expose internal database information.

============================================================
DO NOT EXPOSE DATABASE INFORMATION
============================================================

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

============================================================
ANSWER FORMAT
============================================================

Your answers must be clean, readable, and professional.

Do NOT use:

###
---
***
JSON
Raw database output
Long technical explanations

Use simple headings when useful.

Good example:

Project: RAG

Status: Pending

Tasks: 20

Pending: 12
In Progress: 4
Completed: 4

Team Members:
- Najeeb
- Waji Ul Hasaan

Bad example:

### 1. RAG
---
Status: Pending
project_id: 123
assigned_to: 10

Never expose internal fields.

============================================================
PROJECT SUMMARY FORMAT
============================================================

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

============================================================
IMPORTANT
============================================================

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

============================================================
FINAL RULE
============================================================

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


# ============================================================
# GET CURRENT PROJECT INFORMATION
# ============================================================

def get_project_information(token, project_id):
    """
    Retrieve information for the CURRENT project only.

    Although get_projects() may return multiple projects,
    only the project matching project_id is kept.
    """

    # --------------------------------------------------------
    # GET ALL PROJECTS
    # --------------------------------------------------------

    all_projects = get_projects(token)

    # --------------------------------------------------------
    # NORMALIZE PROJECT RESPONSE
    # --------------------------------------------------------

    projects = normalize_projects(all_projects)

    # --------------------------------------------------------
    # FIND CURRENT PROJECT
    # --------------------------------------------------------

    current_project = find_current_project(
        projects,
        project_id
    )

    # --------------------------------------------------------
    # GET CURRENT PROJECT TASKS
    # --------------------------------------------------------

    tasks = get_project_tasks(
        project_id,
        token
    )

    # --------------------------------------------------------
    # GET TEAM
    # --------------------------------------------------------

    team = get_team_members(
        token
    )

    # --------------------------------------------------------
    # FILTER TEAM FOR CURRENT PROJECT
    # --------------------------------------------------------

    team = normalize_team(team)

    # --------------------------------------------------------
    # RETURN ONLY CURRENT PROJECT INFORMATION
    # --------------------------------------------------------

    return {
        "project": current_project,
        "tasks": tasks,
        "team": team
    }


# ============================================================
# NORMALIZE PROJECT RESPONSE
# ============================================================

def normalize_projects(projects):
    """
    Extract project list from backend response.
    """

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


# ============================================================
# FIND CURRENT PROJECT
# ============================================================

def find_current_project(
    projects,
    project_id
):
    """
    Find the project matching the active project ID.
    """

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

    # If project information is unavailable,
    # return a minimal object rather than exposing
    # all projects to the model.

    return {
        "id": project_id,
        "name": "Current Project"
    }


# ============================================================
# NORMALIZE TASKS
# ============================================================

def normalize_tasks(tasks):
    """
    Extract the actual task list.
    """

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


# ============================================================
# NORMALIZE TEAM
# ============================================================

def normalize_team(team):
    """
    Extract the actual team member list.
    """

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


# ============================================================
# ENRICH TASK ASSIGNMENTS
# ============================================================

def enrich_task_assignments(
    project_information
):
    """
    Resolve task assignment IDs using team member data.
    """

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

    # --------------------------------------------------------
    # BUILD TEAM LOOKUP
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # RESOLVE ASSIGNMENTS
    # --------------------------------------------------------

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

            else:

                enriched_task[
                    "resolved_assigned_user_id"
                ] = assigned_id

                enriched_task[
                    "resolved_assigned_to_name"
                ] = None

        else:

            enriched_task[
                "resolved_assigned_user_id"
            ] = None

            enriched_task[
                "resolved_assigned_to_name"
            ] = None

        enriched_tasks.append(
            enriched_task
        )

    project_information["tasks"] = (
        enriched_tasks
    )

    return project_information


# ============================================================
# BUILD PROJECT CONTEXT
# ============================================================

def build_project_context(
    project_information
):
    """
    Convert current project information into JSON.

    IMPORTANT:
    Only the CURRENT project is passed.
    """

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


# ============================================================
# LOCAL MEMBER SEARCH
# ============================================================

def find_matching_members(
    project_information,
    question
):
    """
    Find team members by name or email.
    """

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

        # ----------------------------------------------------
        # EMAIL MATCH
        # ----------------------------------------------------

        if (
            email_lower
            and email_lower in question_lower
        ):
            matches.append(member)
            continue

        # ----------------------------------------------------
        # FULL NAME MATCH
        # ----------------------------------------------------

        if (
            name_lower
            and name_lower in question_lower
        ):
            matches.append(member)
            continue

        # ----------------------------------------------------
        # FIRST/LAST NAME MATCH
        # ----------------------------------------------------

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

    # --------------------------------------------------------
    # REMOVE DUPLICATES
    # --------------------------------------------------------

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


# ============================================================
# BUILD MEMBER CONTEXT
# ============================================================

def build_member_context(
    project_information,
    question
):
    """
    Calculate member-specific task information locally.
    """

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


# ============================================================
# BUILD USER PROMPT
# ============================================================

def build_user_prompt(
    project_information,
    question
):
    """
    Build the prompt for the AI model.

    Only the CURRENT PROJECT is included.
    """

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
- emails unless explicitly requested
- database columns
- SQL
- JSON
- hashes
- raw backend objects

Do not use markdown hashes such as ###.

Do not use horizontal separators such as ---.

Use simple readable labels.

For example:

Project: RAG

Status: Pending

Tasks: 20

Pending: 12
In Progress: 4
Completed: 4

Team Members:
- Najeeb
- Waji Ul Hasaan

Answer only what the user asked.

Never invent information.
"""


# ============================================================
# CLEAN AI RESPONSE
# ============================================================

def clean_ai_response(
    answer
):
    """
    Remove unnecessary formatting from the AI response.
    """

    if not answer:
        return ""

    answer = answer.strip()

    # --------------------------------------------------------
    # Remove markdown heading symbols
    # --------------------------------------------------------

    answer = re.sub(
        r"^\s*#{1,6}\s*",
        "",
        answer,
        flags=re.MULTILINE
    )

    # --------------------------------------------------------
    # Remove horizontal separators
    # --------------------------------------------------------

    answer = re.sub(
        r"^\s*[-*_]{3,}\s*$",
        "",
        answer,
        flags=re.MULTILINE
    )

    # --------------------------------------------------------
    # Remove excessive blank lines
    # --------------------------------------------------------

    answer = re.sub(
        r"\n{3,}",
        "\n\n",
        answer
    )

    # --------------------------------------------------------
    # Remove accidental code fences
    # --------------------------------------------------------

    answer = answer.replace(
        "```json",
        ""
    )

    answer = answer.replace(
        "```",
        ""
    )

    return answer.strip()


# ============================================================
# CALL GROQ
# ============================================================

def call_groq(
    user_prompt
):
    """
    Primary AI provider.
    """

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


# ============================================================
# CALL GEMINI
# ============================================================

def call_gemini(
    user_prompt
):
    """
    Backup AI provider.
    """

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


# ============================================================
# ASK AI ASSISTANT
# ============================================================

def ask_ai_assistant(
    token,
    project_id,
    question
):
    """
    Main AI assistant pipeline.

    Flow:

    User question
          ↓
    Get all projects
          ↓
    Select CURRENT project
          ↓
    Get CURRENT project tasks
          ↓
    Get team information
          ↓
    Build CURRENT PROJECT context
          ↓
    Groq
          ↓
    Gemini fallback
    """

    # ========================================================
    # VALIDATE QUESTION
    # ========================================================

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

    # ========================================================
    # VALIDATE PROJECT ID
    # ========================================================

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

    # ========================================================
    # GET CURRENT PROJECT DATA
    # ========================================================

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

    # ========================================================
    # BUILD USER PROMPT
    # ========================================================

    user_prompt = (
        build_user_prompt(
            project_information,
            question
        )
    )

    # ========================================================
    # TRY GROQ FIRST
    # ========================================================

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

    # ========================================================
    # TRY GEMINI BACKUP
    # ========================================================

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

    # ========================================================
    # BOTH PROVIDERS FAILED
    # ========================================================

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

