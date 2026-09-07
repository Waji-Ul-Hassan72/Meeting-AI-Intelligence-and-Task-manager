import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createTask } from "../services/api";
import { Paperclip, X, FileText } from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

function Task() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const fileInputRef = useRef(null);

  // ============================================================
  // TASK FORM STATE
  // ============================================================

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("Pending");
  const [dueDate, setDueDate] = useState("");

  // ============================================================
  // PROJECT MEMBERS
  // ============================================================

  const [members, setMembers] = useState([]);
  const [assignedTo, setAssignedTo] = useState("");

  // ============================================================
  // ATTACHMENT
  // ============================================================

  const [attachment, setAttachment] = useState(null);

  // ============================================================
  // UI STATE
  // ============================================================

  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // ============================================================
  // GET TOKEN
  // ============================================================

  const getToken = () => {
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token")
    );
  };

  // ============================================================
  // UNAUTHORIZED
  // ============================================================

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    navigate("/login", {
      replace: true,
    });
  };

  // ============================================================
  // FETCH PROJECT MEMBERS
  // ============================================================

  useEffect(() => {
    const fetchMembers = async () => {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      if (!projectId) {
        setErrorMessage("Project ID is missing.");
        setLoadingMembers(false);
        return;
      }

      try {
        setLoadingMembers(true);
        setErrorMessage("");

        const response = await fetch(
          `${API_URL}/api/projects/${projectId}/members`,
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

        if (response.status === 403) {
          throw new Error(
            data.message ||
              data.error ||
              "You do not have access to this project."
          );
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
              data.error ||
              "Unable to load project members."
          );
        }

        const projectMembers = Array.isArray(data)
          ? data
          : Array.isArray(data.members)
          ? data.members
          : [];

        setMembers(projectMembers);

      } catch (error) {
        console.error(
          "Error loading project members:",
          error
        );

        setMembers([]);

        setErrorMessage(
          error.message ||
            "Unable to load team members."
        );
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [projectId, navigate]);

  // ============================================================
  // HANDLE ATTACHMENT SELECTION
  // ============================================================

  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10 MB

    if (file.size > maxSize) {
      setErrorMessage(
        "File is too large. Maximum attachment size is 10 MB."
      );

      e.target.value = "";
      setAttachment(null);

      return;
    }

    setErrorMessage("");
    setAttachment(file);
  };

  // ============================================================
  // REMOVE ATTACHMENT
  // ============================================================

  const handleRemoveAttachment = () => {
    setAttachment(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ============================================================
  // SAVE TASK
  // ============================================================

  const handleSaveTask = async (e) => {
    e.preventDefault();

    setErrorMessage("");

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (!projectId) {
      setErrorMessage("Project ID is missing.");
      return;
    }

    if (!trimmedTitle) {
      setErrorMessage("Task title is required.");
      return;
    }

    if (!trimmedDesc) {
      setErrorMessage("Task description is required.");
      return;
    }

    if (!assignedTo) {
      setErrorMessage(
        "Please select a team member to assign this task."
      );
      return;
    }

    const selectedMember = members.find(
      (member) =>
        String(member.id) === String(assignedTo)
    );

    if (!selectedMember) {
      setErrorMessage(
        "Selected team member is not valid for this project."
      );
      return;
    }

    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("title", trimmedTitle);
      formData.append("description", trimmedDesc);
      formData.append("priority", priority);
      formData.append("status", status);
      formData.append("due_date", dueDate || "");
      formData.append("project_id", String(projectId));
      formData.append("assigned_to", String(assignedTo));

      if (attachment) {
        formData.append("attachment", attachment);
      }

      await createTask(formData);

      navigate(-1);

    } catch (error) {
      console.error(
        "Error creating task:",
        error
      );

      if (
        error?.response?.status === 401 ||
        error?.status === 401
      ) {
        handleUnauthorized();
        return;
      }

      if (
        error?.response?.status === 403 ||
        error?.status === 403
      ) {
        setErrorMessage(
          error.message ||
            "You do not have permission to create tasks in this project."
        );

        return;
      }

      setErrorMessage(
        error.message ||
          "Server Error: Unable to create task."
      );

    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CANCEL
  // ============================================================

  const handleCancel = () => {
    navigate(-1);
  };

  // ============================================================
  // FORMAT FILE SIZE
  // ============================================================

  const formatFileSize = (bytes) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm font-sans overflow-y-auto">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-purple-200 p-6 sm:p-7">
        
        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="flex items-center justify-between pb-4 mb-5 border-b border-purple-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Create Project Task
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Organize your execution schedule and details.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-600 hover:text-purple-800 border border-purple-200 transition cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ======================================================
            ERROR MESSAGE
        ====================================================== */}

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* ======================================================
            FORM
        ====================================================== */}

        <form
          onSubmit={handleSaveTask}
          className="space-y-4"
        >

          {/* ====================================================
              TASK TITLE
          ==================================================== */}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Task Title <span className="text-purple-600">*</span>
            </label>

            <input
              type="text"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-purple-200 outline-none text-sm text-slate-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition disabled:opacity-60"
              placeholder="e.g. Implement Auth Middleware"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              maxLength={100}
              disabled={loading}
              required
            />
          </div>

          {/* ====================================================
              DESCRIPTION
          ==================================================== */}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Description <span className="text-purple-600">*</span>
            </label>

            <textarea
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-purple-200 outline-none text-sm text-slate-900 resize-none h-24 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition disabled:opacity-60"
              placeholder="Detail task requirements..."
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              maxLength={500}
              disabled={loading}
              required
            />
          </div>

          {/* ====================================================
              PRIORITY & STATUS
          ==================================================== */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Priority
              </label>

              <select
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-purple-200 outline-none text-sm text-slate-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition disabled:opacity-60"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value)
                }
                disabled={loading}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Status
              </label>

              <select
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-purple-200 outline-none text-sm text-slate-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition disabled:opacity-60"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value)
                }
                disabled={loading}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* ====================================================
              ASSIGN TO
          ==================================================== */}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Assign To <span className="text-purple-600">*</span>
            </label>

            <select
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-purple-200 outline-none text-sm text-slate-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition disabled:opacity-60"
              value={assignedTo}
              onChange={(e) =>
                setAssignedTo(e.target.value)
              }
              disabled={
                loadingMembers ||
                loading
              }
              required
            >
              <option value="">
                {loadingMembers
                  ? "Loading team members..."
                  : "Select team member"}
              </option>

              {members.map((member) => (
                <option
                  key={member.id}
                  value={member.id}
                >
                  {member.name ||
                    member.full_name ||
                    member.username ||
                    member.email}

                  {member.email &&
                  (
                    member.name ||
                    member.full_name ||
                    member.username
                  )
                    ? ` (${member.email})`
                    : ""}
                </option>
              ))}
            </select>

            {!loadingMembers &&
              members.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600">
                  No team members found for this project.
                </p>
              )}
          </div>

          {/* ====================================================
              DUE DATE
          ==================================================== */}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Due Date
            </label>

            <input
              type="date"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-purple-200 outline-none text-sm text-slate-900 cursor-pointer focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition disabled:opacity-60"
              value={dueDate}
              onChange={(e) =>
                setDueDate(e.target.value)
              }
              disabled={loading}
            />
          </div>

          {/* ====================================================
              ATTACHMENT
          ==================================================== */}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Attachment
            </label>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={handleAttachmentChange}
              />

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={loading}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-50 border border-purple-200 text-slate-600 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition cursor-pointer disabled:opacity-50 flex-shrink-0"
                title="Attach a file"
                aria-label="Attach a file"
              >
                <Paperclip
                  size={18}
                  strokeWidth={2}
                />
              </button>

              {attachment ? (
                <div className="flex items-center gap-2 min-w-0 flex-1 px-3 py-2.5 bg-slate-50 border border-purple-200 rounded-xl">
                  <FileText
                    size={16}
                    className="text-purple-600 flex-shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-700 truncate">
                      {attachment.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formatFileSize(
                        attachment.size
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleRemoveAttachment
                    }
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-purple-100 text-slate-500 hover:text-red-600 transition cursor-pointer flex-shrink-0"
                    title="Remove attachment"
                    aria-label="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Optional — attach a file or image (max 10MB)
                </p>
              )}
            </div>
          </div>

          {/* ====================================================
              ACTION BUTTONS
          ==================================================== */}

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 py-3 rounded-xl border border-purple-200 text-xs font-bold text-slate-600 hover:bg-purple-50 hover:border-purple-300 transition disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                loadingMembers ||
                members.length === 0
              }
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold hover:opacity-90 transition shadow-md shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading
                ? "Saving Task..."
                : "Save Task"}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

export default Task;