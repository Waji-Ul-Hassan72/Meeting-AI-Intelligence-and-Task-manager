import { useEffect, useMemo, useState } from "react";

import AIAssistant from "../components/AIAssistant";

import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Plus,
  List,
  LayoutGrid,
  Trash2,
  Pencil,
  AlertTriangle,
  FolderKanban,
  CalendarDays,
  X,
  Save,
  Paperclip,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // =========================================================
  // PROJECT STATE
  // =========================================================

  const [project, setProject] = useState(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState("");

  // =========================================================
  // CURRENT USER STATE (For Member vs Manager verification)
  // =========================================================
  const [currentUser, setCurrentUser] = useState(null);

  // =========================================================
  // TASK STATE
  // =========================================================

  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskError, setTaskError] = useState("");

  // =========================================================
  // UI STATE
  // =========================================================

  const [activeTab, setActiveTab] = useState("tasks");
  const [activeTaskStatus, setActiveTaskStatus] = useState("all");
  const [taskViewMode, setTaskViewMode] = useState("list");

  // =========================================================
  // MODALS
  // =========================================================

  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [deletingAllTasks, setDeletingAllTasks] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  // =========================================================
  // EDIT TASK MODAL
  // =========================================================

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [editFormName, setEditFormName] = useState("");
  const [editFormDesc, setEditFormDesc] = useState("");
  const [editFormStatus, setEditFormStatus] = useState("todo");
  const [editFormDueDate, setEditFormDueDate] = useState("");

  const [savingEdit, setSavingEdit] = useState(false);

  // =========================================================
  // GET TOKEN
  // =========================================================

  const getToken = () => {
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token")
    );
  };

  // =========================================================
  // GET CURRENT USER FROM STORAGE
  // =========================================================
  useEffect(() => {
    try {
      const storedUser =
        localStorage.getItem("user") ||
        sessionStorage.getItem("user");
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Failed to parse user from storage", e);
    }
  }, []);

  // =========================================================
  // UNAUTHORIZED
  // =========================================================

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    navigate("/login", {
      replace: true,
    });
  };

  // =========================================================
  // PERMISSION HELPERS
  // =========================================================

  const isProjectOwner =
    project?.is_owner === true ||
    String(project?.user_role || "")
      .trim()
      .toLowerCase() === "owner";

  const projectUserRole =
    String(project?.user_role || "")
      .trim()
      .toLowerCase();

  // Helper to check if the current logged-in user created the task
  const isTaskCreator = (task) => {
    if (!currentUser) return false;
    const currentUserId = currentUser.id || currentUser._id;
    
    const creatorId =
      task.created_by_id ||
      task.createdBy ||
      task.created_by ||
      (typeof task.creator === "object" ? task.creator?.id || task.creator?._id : task.creator);

    if (currentUserId && creatorId) {
      return String(currentUserId) === String(creatorId);
    }

    // Fallback comparison by email/name if IDs aren't directly aligned
    const creatorEmail = task.created_by_email || (typeof task.creator === "object" ? task.creator?.email : null);
    if (currentUser.email && creatorEmail) {
      return currentUser.email.toLowerCase() === creatorEmail.toLowerCase();
    }

    return false;
  };

  // Can the user edit this specific task?
  // Owners can edit any task. Members can edit tasks they created OR tasks assigned to them (to change status).
  const canEditTask = (task) => {
    if (isProjectOwner) return true;
    if (isTaskCreator(task)) return true;

    // Check if task is assigned to current user
    const currentUserId = currentUser?.id || currentUser?._id;
    const assigneeId =
      task.assignee_id ||
      task.assigned_to ||
      (typeof task.assignee === "object" ? task.assignee?.id || task.assignee?._id : null);

    if (currentUserId && assigneeId && String(currentUserId) === String(assigneeId)) {
      return true;
    }

    const assigneeEmail = task.assigned_to_email || (typeof task.assignee === "object" ? task.assignee?.email : null);
    if (currentUser?.email && assigneeEmail && currentUser.email.toLowerCase() === assigneeEmail.toLowerCase()) {
      return true;
    }

    return false;
  };

  // Can the user delete this specific task?
  // Members can ONLY delete tasks they created themselves. They cannot delete manager-assigned tasks.
  const canDeleteTask = (task) => {
    if (isProjectOwner) return true;
    return isTaskCreator(task);
  };

  // =========================================================
  // FETCH PROJECT
  // =========================================================

  useEffect(() => {
    const fetchProject = async () => {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      try {
        setLoadingProject(true);
        setProjectError("");

        const response = await fetch(
          `${API_URL}/api/projects/${id}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        let data = {};

        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
              data.error ||
              "Unable to load project."
          );
        }

        setProject(data);
      } catch (error) {
        console.error(
          "Project fetch error:",
          error
        );

        setProjectError(
          error.message ||
            "Unable to connect to the server."
        );
      } finally {
        setLoadingProject(false);
      }
    };

    if (id) {
      fetchProject();
    }
  }, [id]);

  // =========================================================
  // FETCH TASKS
  // =========================================================

  useEffect(() => {
    const fetchTasks = async () => {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      try {
        setLoadingTasks(true);
        setTaskError("");

        const response = await fetch(
          `${API_URL}/api/tasks/project/${id}?limit=100`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        let data = {};

        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
              data.error ||
              "Unable to load project tasks."
          );
        }

        const taskList = Array.isArray(data)
          ? data
          : Array.isArray(data.tasks)
          ? data.tasks
          : [];

        setTasks(taskList);
      } catch (error) {
        console.error(
          "Tasks fetch error:",
          error
        );

        setTaskError(
          error.message ||
            "Unable to load project tasks."
        );
      } finally {
        setLoadingTasks(false);
      }
    };

    if (id) {
      fetchTasks();
    }
  }, [id]);

  // =========================================================
  // ATTACHMENT URL
  // =========================================================

  const getAttachmentUrl = (task) => {
    if (!task) return null;

    const attachment =
      task.attachment ||
      task.attachment_url ||
      task.attachmentUrl ||
      task.file_url ||
      task.fileUrl ||
      task.file_path ||
      task.filePath;

    if (!attachment) {
      return null;
    }

    if (typeof attachment === "object") {
      const objectUrl =
        attachment.url ||
        attachment.file_url ||
        attachment.fileUrl ||
        attachment.path ||
        attachment.file_path;

      if (!objectUrl) {
        return null;
      }

      if (
        objectUrl.startsWith("http://") ||
        objectUrl.startsWith("https://")
      ) {
        return objectUrl;
      }

      return `${API_URL}/${String(objectUrl).replace(/^\/+/, "")}`;
    }

    if (
      String(attachment).startsWith("http://") ||
      String(attachment).startsWith("https://")
    ) {
      return attachment;
    }

    return `${API_URL}/${String(attachment).replace(/^\/+/, "")}`;
  };

  // =========================================================
  // OPEN ATTACHMENT
  // =========================================================

  const handleViewAttachment = (task) => {
    const attachmentUrl =
      getAttachmentUrl(task);

    if (!attachmentUrl) {
      return;
    }

    window.open(
      attachmentUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // =========================================================
  // NORMALIZE STATUS
  // =========================================================

  const normalizeStatus = (status) => {
    if (!status) return "todo";

    const normalized = String(status)
      .trim()
      .toLowerCase()
      .replace(/[\_-]/g, " ");

    if (
      normalized === "completed" ||
      normalized === "complete" ||
      normalized === "done"
    ) {
      return "completed";
    }

    if (
      normalized === "in progress" ||
      normalized === "inprogress" ||
      normalized === "working"
    ) {
      return "in-progress";
    }

    return "todo";
  };

  // =========================================================
  // TASK COUNTS
  // =========================================================

  const taskCounts = useMemo(() => {
    return {
      all: tasks.length,

      todo: tasks.filter(
        (t) =>
          normalizeStatus(t.status) === "todo"
      ).length,

      "in-progress": tasks.filter(
        (t) =>
          normalizeStatus(t.status) ===
          "in-progress"
      ).length,

      completed: tasks.filter(
        (t) =>
          normalizeStatus(t.status) ===
          "completed"
      ).length,
    };
  }, [tasks]);

  // =========================================================
  // FILTERED TASKS
  // =========================================================

  const filteredTasks = useMemo(() => {
    if (activeTaskStatus === "all") {
      return tasks;
    }

    return tasks.filter(
      (t) =>
        normalizeStatus(t.status) ===
        activeTaskStatus
    );
  }, [tasks, activeTaskStatus]);

  // =========================================================
  // STATUS LABEL
  // =========================================================

  const getStatusLabel = (status) => {
    const normalized =
      normalizeStatus(status);

    if (normalized === "completed") {
      return "COMPLETED";
    }

    if (normalized === "in-progress") {
      return "IN PROGRESS";
    }

    return "TO DO";
  };

  // =========================================================
  // STATUS STYLE
  // =========================================================

  const getStatusStyle = (status) => {
    const normalized =
      normalizeStatus(status);

    if (normalized === "completed") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    if (normalized === "in-progress") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }

    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  // =========================================================
  // ASSIGNEE NAME
  // =========================================================

  const getAssigneeName = (task) => {
    if (task.assignee) {
      if (typeof task.assignee === "string") {
        return task.assignee;
      }

      return (
        task.assignee.name ||
        task.assignee.full_name ||
        task.assignee.email ||
        "Unassigned"
      );
    }

    if (task.assigned_to_name) {
      return task.assigned_to_name;
    }

    if (task.assigned_to_email) {
      return task.assigned_to_email;
    }

    return "Unassigned";
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "—";
    }

    return parsedDate.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
  };

  // =========================================================
  // CREATE TASK
  // =========================================================

  const handleCreateTask = () => {
    navigate(`/add-task/${id}`);
  };

  // =========================================================
  // OPEN EDIT MODAL
  // =========================================================

  const handleOpenEditModal = (task) => {
    if (!canEditTask(task)) {
      return;
    }

    setEditingTask(task);

    setEditFormName(
      task.name ||
        task.title ||
        ""
    );

    setEditFormDesc(
      task.description ||
        ""
    );

    setEditFormStatus(
      normalizeStatus(task.status)
    );

    const rawDate =
      task.due_date ||
      task.dueDate;

    if (rawDate) {
      const d = new Date(rawDate);

      if (
        !Number.isNaN(
          d.getTime()
        )
      ) {
        setEditFormDueDate(
          d.toISOString().split("T")[0]
        );
      } else {
        setEditFormDueDate("");
      }
    } else {
      setEditFormDueDate("");
    }

    setShowEditModal(true);
  };

  // =========================================================
  // SAVE EDIT TASK
  // =========================================================

  const handleSaveEditTask = async (e) => {
    e.preventDefault();

    if (!editingTask) return;

    if (!canEditTask(editingTask)) {
      return;
    }

    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    // If a member is editing a task they didn't create (e.g. manager assigned), 
    // they should only be permitted to update the status, keeping title/desc intact if needed, 
    // or we can allow backend rules to handle it. Here we send the form data.
    const isOwnerOrCreator = isProjectOwner || isTaskCreator(editingTask);

    try {
      setSavingEdit(true);

      const payload = isOwnerOrCreator
        ? {
            name: editFormName,
            title: editFormName,
            description: editFormDesc,
            status: editFormStatus,
            due_date: editFormDueDate || null,
          }
        : {
            // Members updating assigned tasks from managers can change status
            status: editFormStatus,
            name: editingTask.name || editingTask.title,
            title: editingTask.name || editingTask.title,
            description: editingTask.description,
            due_date: editingTask.due_date || editingTask.dueDate || null,
          };

      const response = await fetch(
        `${API_URL}/api/tasks/${editingTask.id}`,
        {
          method: "PUT",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Unable to update task."
        );
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id
            ? {
                ...t,
                ...data,
                name: isOwnerOrCreator ? editFormName : t.name,
                title: isOwnerOrCreator ? editFormName : t.title,
                description: isOwnerOrCreator ? editFormDesc : t.description,
                status: editFormStatus,
                due_date: isOwnerOrCreator ? editFormDueDate : t.due_date,
              }
            : t
        )
      );

      setShowEditModal(false);
      setEditingTask(null);
    } catch (error) {
      console.error(
        "Update task error:",
        error
      );

      setTaskError(
        error.message ||
          "Unable to update task."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  // =========================================================
  // DELETE TASK MODAL
  // =========================================================

  const openDeleteTaskModal = (task) => {
    if (!canDeleteTask(task)) {
      return;
    }

    setTaskToDelete(task);
    setShowDeleteModal(true);
  };

  // =========================================================
  // DELETE TASK
  // =========================================================

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    if (!canDeleteTask(taskToDelete)) {
      return;
    }

    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setDeletingTaskId(
        taskToDelete.id
      );

      const response = await fetch(
        `${API_URL}/api/tasks/${taskToDelete.id}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Unable to delete task."
        );
      }

      setTasks((prev) =>
        prev.filter(
          (t) =>
            t.id !==
            taskToDelete.id
        )
      );

      setShowDeleteModal(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error(
        "Delete task error:",
        error
      );

      setTaskError(
        error.message ||
          "Unable to delete task."
      );
    } finally {
      setDeletingTaskId(null);
    }
  };

  // =========================================================
  // DELETE ALL TASKS
  // =========================================================

  const handleDeleteAllTasks = async () => {
    if (!isProjectOwner) {
      return;
    }

    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setDeletingAllTasks(true);

      const response = await fetch(
        `${API_URL}/api/tasks/project/${id}/all`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Unable to delete all tasks."
        );
      }

      setTasks([]);
      setShowDeleteAllModal(false);
    } catch (error) {
      console.error(
        "Delete all tasks error:",
        error
      );

      setTaskError(
        error.message ||
          "Unable to clear project tasks."
      );
    } finally {
      setDeletingAllTasks(false);
    }
  };

  // =========================================================
  // TRANSCRIPTION NAVIGATION
  // =========================================================

  const handleTabClick = (tab) => {
    if (tab === "transcription") {
      navigate(
        `/projects/${id}/transcription`
      );

      return;
    }

    setActiveTab(tab);
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loadingProject) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-9 h-9 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  // =========================================================
  // PROJECT ERROR
  // =========================================================

  if (projectError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-7 text-center shadow-sm">
          <AlertTriangle
            className="w-12 h-12 text-red-600 mx-auto mb-4"
          />

          <h1 className="text-lg font-bold text-slate-900 mb-2">
            Unable to Load Project
          </h1>

          <p className="text-sm text-slate-500 mb-6">
            {projectError}
          </p>

          <button
            onClick={() =>
              navigate(-1)
            }
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!project) return null;

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">

        <div className="max-w-7xl mx-auto px-6">

          <div className="h-16 flex items-center justify-between">

            <div className="flex items-center gap-4">

              <button
                onClick={() =>
                  navigate(-1)
                }
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors"
              >
                <ArrowLeft size={17} />
              </button>

              <div>

                <div className="flex items-center gap-2">

                  <h1 className="text-lg font-bold text-slate-900">
                    {project.name ||
                      project.title ||
                      "Project"}
                  </h1>

                  <span className="px-2 py-1 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold">
                    {project.status ||
                      "Active"}
                  </span>

                </div>

                <p className="text-xs text-slate-400 mt-0.5">
                  Project workspace
                </p>

              </div>

            </div>

            {/* HEADER ACTIONS */}

            <div className="flex items-center gap-2.5">

              {/* DELETE ALL TASKS - OWNER ONLY */}

              {isProjectOwner &&
                tasks.length > 0 && (
                  <button
                    onClick={() =>
                      setShowDeleteAllModal(
                        true
                      )
                    }
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 hover:text-red-600 text-slate-600 text-xs font-semibold shadow-xs transition-colors"
                    title="Clear all tasks from project"
                  >
                    <Trash2 size={14} />

                    Delete All Tasks
                  </button>
                )}

              {/* ADD TASK - AVAILABLE TO ALL MEMBERS AND OWNERS */}
              <button
                onClick={
                  handleCreateTask
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors"
              >
                <Plus
                  size={15}
                  strokeWidth={2.5}
                />

                Add Task
              </button>

            </div>

          </div>

          {/* =================================================
              TABS
          ================================================= */}

          <div className="flex items-center gap-1 overflow-x-auto">

            {[
              "tasks",
              "meetings",
              "transcription",
              "insights",
              "assistant",
            ].map((tab) => (

              <button
                key={tab}
                onClick={() =>
                  handleTabClick(tab)
                }
                className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >

                {tab === "insights"
                  ? "AI Insights"
                  : tab === "assistant"
                  ? "AI Assistant"
                  : tab}

              </button>

            ))}

          </div>

        </div>

      </header>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <main className="max-w-7xl mx-auto px-6 py-7">

        {activeTab === "tasks" && (

          <div>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">

              <div>

                <h2 className="text-xl font-bold text-slate-900">
                  Tasks
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Manage tasks assigned to
                  this project. Role detected:{" "}
                  <span className="font-semibold capitalize">
                    {projectUserRole ||
                      "member"}
                  </span>
                </p>

              </div>

              {/* VIEW TOGGLE */}

              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm self-start lg:self-auto">

                <button
                  onClick={() =>
                    setTaskViewMode(
                      "list"
                    )
                  }
                  className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                    taskViewMode ===
                    "list"
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <List size={14} />
                  List
                </button>

                <button
                  onClick={() =>
                    setTaskViewMode(
                      "board"
                    )
                  }
                  className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                    taskViewMode ===
                    "board"
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <LayoutGrid
                    size={14}
                  />
                  Board
                </button>

              </div>

            </div>

            {/* TASK ERROR */}

            {taskError && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {taskError}
              </div>
            )}

            {/* STATUS CARDS */}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">

              {[
                {
                  key: "all",
                  label: "ALL TASKS",
                  count:
                    taskCounts.all,
                },
                {
                  key: "todo",
                  label: "TO DO",
                  count:
                    taskCounts.todo,
                },
                {
                  key: "in-progress",
                  label: "IN PROGRESS",
                  count:
                    taskCounts[
                      "in-progress"
                    ],
                },
                {
                  key: "completed",
                  label: "COMPLETED",
                  count:
                    taskCounts.completed,
                },
              ].map((item) => (

                <button
                  key={item.key}
                  onClick={() =>
                    setActiveTaskStatus(
                      item.key
                    )
                  }
                  className={`text-left p-4 rounded-2xl border transition-all ${
                    activeTaskStatus ===
                    item.key
                      ? "border-indigo-200 bg-indigo-50/60 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >

                  <span className="text-xs font-bold text-slate-500">
                    {item.label}
                  </span>

                  <p className="text-2xl font-bold text-slate-900 mt-2">
                    {item.count}
                  </p>

                </button>

              ))}

            </div>

            {/* =================================================
                LIST VIEW
            ================================================= */}

            {taskViewMode ===
            "list" ? (

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

                {loadingTasks ? (

                  <div className="py-14 text-center">

                    <div className="w-7 h-7 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />

                    <p className="text-xs text-slate-500">
                      Loading tasks...
                    </p>

                  </div>

                ) : filteredTasks.length ===
                  0 ? (

                  <div className="py-16 text-center">

                    <FolderKanban
                      size={24}
                      className="mx-auto mb-3 text-slate-300"
                    />

                    <h3 className="text-sm font-bold text-slate-800">
                      No tasks found
                    </h3>

                    <p className="text-xs text-slate-400 mt-1">
                      There are no tasks
                      matching this
                      filter view.
                    </p>

                  </div>

                ) : (

                  <div className="divide-y divide-slate-100">

                    {filteredTasks.map(
                      (task) => {
                        const showActions = canEditTask(task) || canDeleteTask(task);
                        return (

                        <div
                          key={task.id}
                          className="px-5 py-4 hover:bg-slate-50/80 transition-colors"
                        >

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">

                            <div
                              className={
                                showActions
                                  ? "md:col-span-4"
                                  : "md:col-span-6"
                              }
                            >

                              <div className="flex items-center gap-2">

                                <p className="text-sm font-semibold text-slate-800">
                                  {task.name ||
                                    task.title}
                                </p>

                                {/* ATTACHMENT */}

                                {getAttachmentUrl(
                                  task
                                ) && (

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleViewAttachment(
                                        task
                                      )
                                    }
                                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-colors shrink-0"
                                    title="View attachment"
                                  >
                                    <Paperclip
                                      size={14}
                                    />
                                  </button>

                                )}

                              </div>

                              {task.description && (

                                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                                  {
                                    task.description
                                  }
                                </p>

                              )}

                            </div>

                            <div className="md:col-span-2">

                              <span
                                className={`inline-flex px-2.5 py-1 rounded-lg border text-[10px] font-bold ${getStatusStyle(
                                  task.status
                                )}`}
                              >
                                {getStatusLabel(
                                  task.status
                                )}
                              </span>

                            </div>

                            <div className="md:col-span-2">

                              <span className="text-xs text-slate-600 font-medium">
                                {getAssigneeName(
                                  task
                                )}
                              </span>

                            </div>

                            <div className="md:col-span-2">

                              <div className="flex items-center gap-2">

                                <CalendarDays
                                  size={14}
                                  className="text-slate-400"
                                />

                                <span className="text-xs font-semibold text-slate-600">
                                  {formatDate(
                                    task.due_date ||
                                      task.dueDate
                                  )}
                                </span>

                              </div>

                            </div>

                            {/* DYNAMIC ACTIONS PER TASK PERMISSION */}

                            {showActions && (

                              <div className="md:col-span-2 flex items-center justify-end gap-2">

                                {canEditTask(task) && (
                                  <button
                                    onClick={() =>
                                      handleOpenEditModal(
                                        task
                                      )
                                    }
                                    className="w-9 h-9 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition-colors"
                                    title="Edit task status or details"
                                  >
                                    <Pencil
                                      size={15}
                                    />
                                  </button>
                                )}

                                {canDeleteTask(task) && (
                                  <button
                                    onClick={() =>
                                      openDeleteTaskModal(
                                        task
                                      )
                                    }
                                    className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 flex items-center justify-center transition-colors"
                                    title="Delete task"
                                  >
                                    <Trash2
                                      size={15}
                                    />
                                  </button>
                                )}

                              </div>

                            )}

                          </div>

                        </div>

                      );
                      }
                    )}

                  </div>

                )}

              </div>

            ) : (

              /* =================================================
                  BOARD VIEW
              ================================================= */

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {[
                  "todo",
                  "in-progress",
                  "completed",
                ].map(
                  (statusKey) => (

                    <div
                      key={statusKey}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"
                    >

                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-4 flex items-center justify-between">

                        {statusKey.replace(
                          "-",
                          " "
                        )}

                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[10px]">

                          {
                            tasks.filter(
                              (t) =>
                                normalizeStatus(
                                  t.status
                                ) ===
                                statusKey
                            ).length
                          }

                        </span>

                      </h3>

                      <div className="space-y-3">

                        {tasks
                          .filter(
                            (t) =>
                              normalizeStatus(
                                t.status
                              ) ===
                              statusKey
                          )
                          .map(
                            (task) => {
                              const showBoardActions = canEditTask(task) || canDeleteTask(task);
                              return (

                              <div
                                key={task.id}
                                className="p-4 border border-slate-200 rounded-xl bg-slate-50 hover:shadow-sm transition-shadow"
                              >

                                <div className="flex items-start justify-between gap-3">

                                  <div className="min-w-0">

                                    <div className="flex items-center gap-2">

                                      <p className="text-sm font-semibold text-slate-800">
                                        {task.name ||
                                          task.title}
                                      </p>

                                      {/* ATTACHMENT */}

                                      {getAttachmentUrl(
                                        task
                                      ) && (

                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleViewAttachment(
                                              task
                                            )
                                          }
                                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 flex items-center justify-center transition-colors shrink-0"
                                          title="View attachment"
                                        >
                                          <Paperclip
                                            size={13}
                                          />
                                        </button>

                                      )}

                                    </div>

                                    {task.description && (

                                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                        {
                                          task.description
                                        }
                                      </p>

                                    )}

                                    <p className="text-xs text-indigo-600 font-medium mt-3">
                                      {getAssigneeName(
                                        task
                                      )}
                                    </p>

                                  </div>

                                  {/* DYNAMIC ACTIONS PER TASK PERMISSION */}

                                  {showBoardActions && (

                                    <div className="flex items-center gap-1 shrink-0">

                                      {canEditTask(task) && (
                                        <button
                                          onClick={() =>
                                            handleOpenEditModal(
                                              task
                                            )
                                          }
                                          className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center"
                                          title="Edit"
                                        >
                                          <Pencil
                                            size={13}
                                          />
                                        </button>
                                      )}

                                      {canDeleteTask(task) && (
                                        <button
                                          onClick={() =>
                                            openDeleteTaskModal(
                                              task
                                            )
                                          }
                                          className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 flex items-center justify-center"
                                          title="Delete"
                                        >
                                          <Trash2
                                            size={13}
                                          />
                                        </button>
                                      )}

                                    </div>

                                  )}

                                </div>

                              </div>

                            );
                            }
                          )}

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </div>

        )}

        {/* =====================================================
            AI ASSISTANT
        ===================================================== */}

        {activeTab === "assistant" && (

          <div>
            <AIAssistant projectId={id} />
          </div>

        )}

      </main>

      {/* =====================================================
          EDIT TASK MODAL
      ===================================================== */}

      {showEditModal &&
        editingTask && (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">

            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">

              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Pencil size={16} />
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    {isProjectOwner || isTaskCreator(editingTask) ? "Edit Task Details" : "Update Task Status"}
                  </h3>

                </div>

                <button
                  onClick={() =>
                    setShowEditModal(
                      false
                    )
                  }
                  className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400"
                >
                  <X size={16} />
                </button>

              </div>

              <form
                onSubmit={
                  handleSaveEditTask
                }
                className="p-6 space-y-4"
              >

                {(isProjectOwner || isTaskCreator(editingTask)) ? (
                  <>
                    <div>

                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Task Title
                      </label>

                      <input
                        type="text"
                        value={
                          editFormName
                        }
                        onChange={(e) =>
                          setEditFormName(
                            e.target.value
                          )
                        }
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600"
                      />

                    </div>

                    <div>

                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Description
                      </label>

                      <textarea
                        rows={3}
                        value={
                          editFormDesc
                        }
                        onChange={(e) =>
                          setEditFormDesc(
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600 resize-none"
                      />

                    </div>
                  </>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs">
                    This task was assigned to you by a manager. You can update its status (e.g., from To Do to Completed), but other details cannot be modified.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div>

                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Status
                    </label>

                    <select
                      value={
                        editFormStatus
                      }
                      onChange={(e) =>
                        setEditFormStatus(
                          e.target.value
                        )
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600 bg-white"
                    >

                      <option value="todo">
                        To Do
                      </option>

                      <option value="in-progress">
                        In Progress
                      </option>

                      <option value="completed">
                        Completed
                      </option>

                    </select>

                  </div>

                  {(isProjectOwner || isTaskCreator(editingTask)) && (
                    <div>

                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Due Date
                      </label>

                      <input
                        type="date"
                        value={
                          editFormDueDate
                        }
                        onChange={(e) =>
                          setEditFormDueDate(
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600"
                      />

                    </div>
                  )}

                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">

                  <button
                    type="button"
                    onClick={() =>
                      setShowEditModal(
                        false
                      )
                    }
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      savingEdit
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50"
                  >

                    <Save size={14} />

                    {savingEdit
                      ? "Saving..."
                      : "Save Changes"}

                  </button>

                </div>

              </form>

            </div>

          </div>

        )}

      {/* =====================================================
          DELETE SINGLE TASK MODAL
      ===================================================== */}

      {showDeleteModal &&
        taskToDelete && (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">

            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">

              <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
                <Trash2 size={20} />
              </div>

              <h3 className="text-base font-bold text-slate-900">
                Delete Task
              </h3>

              <p className="text-sm text-slate-600 mt-2">

                Are you sure you want to
                delete{" "}

                <span className="font-semibold text-slate-900">

                  {taskToDelete.title ||
                    taskToDelete.name}

                </span>

                ? This action cannot be
                undone.

              </p>

              <div className="flex justify-end gap-3 mt-6">

                <button
                  onClick={() =>
                    setShowDeleteModal(
                      false
                    )
                  }
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  onClick={
                    handleDeleteTask
                  }
                  disabled={
                    deletingTaskId ===
                    taskToDelete.id
                  }
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50"
                >

                  {deletingTaskId ===
                  taskToDelete.id
                    ? "Deleting..."
                    : "Delete Task"}

                </button>

              </div>

            </div>

          </div>

        )}

      {/* =====================================================
          DELETE ALL TASKS MODAL
      ===================================================== */}

      {showDeleteAllModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">

          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-6">

            <h3 className="text-base font-bold text-slate-900 mb-2">
              Delete All Tasks?
            </h3>

            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to
              delete all tasks in this
              project?
            </p>

            <div className="flex items-center justify-end gap-3">

              <button
                onClick={() =>
                  setShowDeleteAllModal(
                    false
                  )
                }
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                No
              </button>

              <button
                onClick={
                  handleDeleteAllTasks
                }
                disabled={
                  deletingAllTasks
                }
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm disabled:opacity-50 transition-colors"
              >

                {deletingAllTasks
                  ? "Deleting..."
                  : "Yes"}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default ProjectDetails;