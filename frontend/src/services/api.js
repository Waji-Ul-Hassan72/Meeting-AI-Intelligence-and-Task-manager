
// ============================================================
// API BASE URL
// ============================================================

const rawApiUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3000";

const API_URL = rawApiUrl.replace(/\/+$/, "");


// ============================================================
// API REQUEST HELPER
// ============================================================

const apiRequest = async (endpoint, options = {}) => {
    const token = localStorage.getItem("token");

    const isFormData = options.body instanceof FormData;

    const headers = {
        ...(token
            ? {
                  Authorization: `Bearer ${token}`,
              }
            : {}),

        ...(isFormData
            ? {}
            : {
                  "Content-Type": "application/json",
              }),

        ...(options.headers || {}),
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    // --------------------------------------------------------
    // Unauthorized
    // --------------------------------------------------------

    if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
    }

    // --------------------------------------------------------
    // Error handling
    // --------------------------------------------------------

    if (!response.ok) {
        throw new Error(
            data?.error ||
                data?.message ||
                `Request failed with status ${response.status}`
        );
    }

    return data;
};


// ============================================================
// PROJECTS
// ============================================================

export const getProjects = () => {
    return apiRequest("/api/projects");
};


export const createProject = (projectData) => {
    return apiRequest("/api/projects", {
        method: "POST",
        body: JSON.stringify(projectData),
    });
};


export const deleteProject = (projectId) => {
    return apiRequest(`/api/projects/${projectId}`, {
        method: "DELETE",
    });
};


// ============================================================
// TASKS
// ============================================================

// ------------------------------------------------------------
// Get all tasks
// ------------------------------------------------------------

export const getTasks = (page = 1, limit = 10) => {
    return apiRequest(
        `/api/tasks?page=${Number(page)}&limit=${Number(limit)}`
    );
};


// ------------------------------------------------------------
// Get tasks for a specific project
// ------------------------------------------------------------

export const getProjectTasks = (
    projectId,
    page = 1,
    limit = 10
) => {
    if (!projectId) {
        throw new Error("Project ID is required.");
    }

    return apiRequest(
        `/api/tasks/project/${projectId}?page=${Number(
            page
        )}&limit=${Number(limit)}`
    );
};


// ------------------------------------------------------------
// Get single task
// ------------------------------------------------------------

export const getTaskById = (taskId) => {
    if (!taskId) {
        throw new Error("Task ID is required.");
    }

    return apiRequest(`/api/tasks/${taskId}`);
};


// ------------------------------------------------------------
// Create task
//
// Supports:
// - Normal task
// - Task with attachment
//
// The frontend can pass either:
// 1. FormData
// 2. Normal JavaScript object
// ------------------------------------------------------------

export const createTask = (taskData) => {

    // --------------------------------------------------------
    // FormData
    // --------------------------------------------------------

    if (taskData instanceof FormData) {
        return apiRequest("/api/tasks", {
            method: "POST",
            body: taskData,
        });
    }

    // --------------------------------------------------------
    // Normal JSON task
    // --------------------------------------------------------

    return apiRequest("/api/tasks", {
        method: "POST",
        body: JSON.stringify(taskData),
    });
};


// ------------------------------------------------------------
// Update task
//
// Supports:
// - Normal task update
// - Task update with attachment
// ------------------------------------------------------------

export const updateTask = (taskId, taskData) => {

    if (!taskId) {
        throw new Error("Task ID is required.");
    }

    // --------------------------------------------------------
    // FormData
    // --------------------------------------------------------

    if (taskData instanceof FormData) {
        return apiRequest(`/api/tasks/${taskId}`, {
            method: "PUT",
            body: taskData,
        });
    }

    // --------------------------------------------------------
    // Normal JSON update
    // --------------------------------------------------------

    return apiRequest(`/api/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify(taskData),
    });
};


// ------------------------------------------------------------
// Delete single task
// ------------------------------------------------------------

export const deleteTask = (taskId) => {
    if (!taskId) {
        throw new Error("Task ID is required.");
    }

    return apiRequest(`/api/tasks/${taskId}`, {
        method: "DELETE",
    });
};


// ------------------------------------------------------------
// Delete all tasks belonging to a project
// ------------------------------------------------------------

export const deleteAllProjectTasks = (projectId) => {
    if (!projectId) {
        throw new Error("Project ID is required.");
    }

    return apiRequest(
        `/api/tasks/project/${projectId}/all`,
        {
            method: "DELETE",
        }
    );
};


// ============================================================
// MEETINGS
// ============================================================

export const createMeeting = (meetingData) => {
    return apiRequest("/api/meetings", {
        method: "POST",
        body: JSON.stringify(meetingData),
    });
};


// ============================================================
// AI ASSISTANT
// ============================================================

export const askAIAssistant = async (
    projectId,
    question
) => {

    const token = localStorage.getItem("token");

    if (!token) {
        throw new Error(
            "Authentication token is missing."
        );
    }

    if (!projectId) {
        throw new Error(
            "Project ID is required."
        );
    }

    if (!question?.trim()) {
        throw new Error(
            "Question is required."
        );
    }

    const response = await fetch(
        "http://localhost:8000/assistant",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",

                Authorization:
                    `Bearer ${token}`,
            },

            body: JSON.stringify({
                project_id: projectId,
                question: question.trim(),
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data?.detail ||
                data?.message ||
                "AI assistant request failed."
        );
    }

    return data;
};


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default apiRequest;

