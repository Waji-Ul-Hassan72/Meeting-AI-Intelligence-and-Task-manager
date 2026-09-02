
// ============================================================
// API BASE URL
// ============================================================

const rawApiUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

const API_URL = rawApiUrl.replace(/\/+$/, "");


// ============================================================
// GET AUTH TOKEN
// ============================================================

const getAuthToken = () => {
  return (
    localStorage.getItem("token") ||
    sessionStorage.getItem("token")
  );
};


// ============================================================
// CLEAR AUTH DATA
// ============================================================

const clearAuthData = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("userName");

  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("userName");
};


// ============================================================
// API REQUEST HELPER
// ============================================================

const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();

  const isFormData =
    options.body instanceof FormData;

  const headers = {
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),

    // IMPORTANT:
    // Do NOT manually set Content-Type for FormData.
    // The browser automatically adds the multipart boundary.
    ...(isFormData
      ? {}
      : {
          "Content-Type": "application/json",
        }),

    ...(options.headers || {}),
  };

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );


  // ==========================================================
  // PARSE RESPONSE
  // ==========================================================

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }


  // ==========================================================
  // UNAUTHORIZED
  // ==========================================================

  if (response.status === 401) {
    clearAuthData();
  }


  // ==========================================================
  // ERROR HANDLING
  // ==========================================================

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


// ------------------------------------------------------------
// GET ALL PROJECTS
// ------------------------------------------------------------

export const getProjects = () => {
  return apiRequest("/api/projects");
};


// ------------------------------------------------------------
// GET SINGLE PROJECT
// ------------------------------------------------------------

export const getProjectById = (projectId) => {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  return apiRequest(
    `/api/projects/${projectId}`
  );
};


// ------------------------------------------------------------
// CREATE PROJECT
// ------------------------------------------------------------

export const createProject = (projectData) => {
  if (!projectData) {
    throw new Error("Project data is required.");
  }

  return apiRequest("/api/projects", {
    method: "POST",
    body: JSON.stringify(projectData),
  });
};


// ------------------------------------------------------------
// UPDATE PROJECT
// ------------------------------------------------------------

export const updateProject = (
  projectId,
  projectData
) => {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  if (!projectData) {
    throw new Error("Project data is required.");
  }

  return apiRequest(
    `/api/projects/${projectId}`,
    {
      method: "PUT",
      body: JSON.stringify(projectData),
    }
  );
};


// ------------------------------------------------------------
// DELETE PROJECT
// ------------------------------------------------------------

export const deleteProject = (projectId) => {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  return apiRequest(
    `/api/projects/${projectId}`,
    {
      method: "DELETE",
    }
  );
};


// ============================================================
// PROJECT MEMBERS
// ============================================================


// ------------------------------------------------------------
// GET PROJECT MEMBERS
// ------------------------------------------------------------

export const getProjectMembers = (
  projectId
) => {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  return apiRequest(
    `/api/projects/${projectId}/members`
  );
};


// ============================================================
// TASKS
// ============================================================


// ------------------------------------------------------------
// GET ALL TASKS
// ------------------------------------------------------------

export const getTasks = (
  page = 1,
  limit = 10
) => {
  return apiRequest(
    `/api/tasks?page=${Number(page)}&limit=${Number(limit)}`
  );
};


// ------------------------------------------------------------
// GET PROJECT TASKS
// ------------------------------------------------------------

export const getProjectTasks = (
  projectId,
  page = 1,
  limit = 100
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
// GET SINGLE TASK
// ------------------------------------------------------------

export const getTaskById = (taskId) => {
  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  return apiRequest(
    `/api/tasks/${taskId}`
  );
};


// ============================================================
// CREATE TASK
// ============================================================
//
// Supports:
//
// 1. Normal JavaScript object
// 2. FormData
//
// FormData is required when uploading an attachment.
//
// ============================================================

export const createTask = (taskData) => {
  if (!taskData) {
    throw new Error("Task data is required.");
  }


  // ----------------------------------------------------------
  // FORM DATA
  // ----------------------------------------------------------

  if (taskData instanceof FormData) {
    return apiRequest("/api/tasks", {
      method: "POST",
      body: taskData,
    });
  }


  // ----------------------------------------------------------
  // NORMAL JSON
  // ----------------------------------------------------------

  return apiRequest("/api/tasks", {
    method: "POST",
    body: JSON.stringify(taskData),
  });
};


// ============================================================
// UPDATE TASK
// ============================================================
//
// Supports:
//
// 1. Normal JSON update
// 2. FormData update
//
// ============================================================

export const updateTask = (
  taskId,
  taskData
) => {
  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  if (!taskData) {
    throw new Error("Task data is required.");
  }


  // ----------------------------------------------------------
  // FORM DATA
  // ----------------------------------------------------------

  if (taskData instanceof FormData) {
    return apiRequest(
      `/api/tasks/${taskId}`,
      {
        method: "PUT",
        body: taskData,
      }
    );
  }


  // ----------------------------------------------------------
  // NORMAL JSON
  // ----------------------------------------------------------

  return apiRequest(
    `/api/tasks/${taskId}`,
    {
      method: "PUT",
      body: JSON.stringify(taskData),
    }
  );
};


// ============================================================
// DELETE SINGLE TASK
// ============================================================

export const deleteTask = (taskId) => {
  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  return apiRequest(
    `/api/tasks/${taskId}`,
    {
      method: "DELETE",
    }
  );
};


// ============================================================
// DELETE ALL PROJECT TASKS
// ============================================================

export const deleteAllProjectTasks = (
  projectId
) => {
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


// ------------------------------------------------------------
// CREATE MEETING
// ------------------------------------------------------------

export const createMeeting = (
  meetingData
) => {
  if (!meetingData) {
    throw new Error("Meeting data is required.");
  }

  return apiRequest(
    "/api/meetings",
    {
      method: "POST",
      body: JSON.stringify(meetingData),
    }
  );
};


// ============================================================
// AI ASSISTANT
// ============================================================

export const askAIAssistant = async (
  projectId,
  question
) => {
  const token = getAuthToken();


  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // FASTAPI AI ASSISTANT
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // RESPONSE
  // ----------------------------------------------------------

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }


  // ----------------------------------------------------------
  // UNAUTHORIZED
  // ----------------------------------------------------------

  if (response.status === 401) {
    clearAuthData();
  }


  // ----------------------------------------------------------
  // ERROR
  // ----------------------------------------------------------

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        data?.message ||
        data?.error ||
        "AI assistant request failed."
    );
  }

  return data;
};


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default apiRequest;

