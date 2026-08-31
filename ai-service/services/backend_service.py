import os
import requests
from dotenv import load_dotenv


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()


BACKEND_API_URL = os.getenv(
    "BACKEND_API_URL",
    "http://localhost:3000"
).rstrip("/")


# ============================================================
# HELPER
# ============================================================

def make_request(
    method,
    endpoint,
    token=None,
    params=None,
    data=None
):
    """
    Send a request from the Python AI service
    to the Node/Express backend.
    """

    url = f"{BACKEND_API_URL}{endpoint}"

    headers = {
        "Accept": "application/json"
    }

    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:

        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            params=params,
            json=data,
            timeout=15
        )

        response.raise_for_status()

        return response.json()

    except requests.exceptions.RequestException as error:

        print("\n==========================================")
        print("BACKEND API ERROR")
        print("==========================================")

        print("Method:", method)
        print("URL:", url)

        if params:
            print("Params:", params)

        print("Error:", str(error))

        if getattr(error, "response", None) is not None:

            try:
                print(
                    "Backend response:",
                    error.response.text
                )

            except Exception:
                pass

        print("==========================================")

        raise


# ============================================================
# SINGLE PROJECT
# ============================================================

def get_project(
    project_id,
    token
):
    """
    Get ONLY the selected project.

    This is important because the AI assistant should
    answer questions using the currently selected project,
    not every project belonging to the user.
    """

    return make_request(
        method="GET",
        endpoint=f"/api/projects/{project_id}",
        token=token
    )


# ============================================================
# ALL PROJECTS
# ============================================================

def get_projects(token):
    """
    Get all projects.

    This function can still be used by other parts of the
    application, but the AI assistant should NOT use this
    function when answering project-specific questions.
    """

    return make_request(
        method="GET",
        endpoint="/api/projects",
        token=token
    )


# ============================================================
# ALL TASKS
# ============================================================

def get_tasks(token):
    """
    Get all tasks available to the authenticated user.
    """

    return make_request(
        method="GET",
        endpoint="/api/tasks",
        token=token
    )


# ============================================================
# PROJECT TASKS
# ============================================================

def get_project_tasks(
    project_id,
    token
):
    """
    Get tasks belonging ONLY to the selected project.

    Pagination is explicitly requested so the AI receives
    a larger set of project tasks.
    """

    return make_request(
        method="GET",
        endpoint=f"/api/tasks/project/{project_id}",
        token=token,
        params={
            "page": 1,
            "limit": 100
        }
    )


# ============================================================
# TEAM MEMBERS
# ============================================================

def get_team_members(token):
    """
    Get team members available to the authenticated user.

    The assistant_service will use the selected project's
    task assignments to determine which members are relevant
    to the current project.
    """

    return make_request(
        method="GET",
        endpoint="/api/teams",
        token=token
    )