
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
  //
  // Both owner and project members can VIEW the team.
  //
  // IMPORTANT:
  // Permission to CREATE a task is still enforced by the
  // backend task controller.
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

        // ------------------------------------------------------
        // AUTHENTICATION
        // ------------------------------------------------------

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        // ------------------------------------------------------
        // FORBIDDEN
        // ------------------------------------------------------

        if (response.status === 403) {
          throw new Error(
            data.message ||
              data.error ||
              "You do not have access to this project."
          );
        }

        // ------------------------------------------------------
        // OTHER ERRORS
        // ------------------------------------------------------

        if (!response.ok) {
          throw new Error(
            data.message ||
              data.error ||
              "Unable to load project members."
          );
        }

        // ------------------------------------------------------
        // RESPONSE
        // Backend returns:
        //
        // {
        //   members: [...]
        // }
        // ------------------------------------------------------

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

    // Maximum 10 MB
    const maxSize = 10 * 1024 * 1024;

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

    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // VALIDATE ASSIGNEE
    //
    // Make sure the selected user actually exists in the
    // project members returned by the backend.
    // ----------------------------------------------------------

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
      // --------------------------------------------------------
      // FORM DATA
      // --------------------------------------------------------

      const formData = new FormData();

      formData.append(
        "title",
        trimmedTitle
      );

      formData.append(
        "description",
        trimmedDesc
      );

      formData.append(
        "priority",
        priority
      );

      formData.append(
        "status",
        status
      );

      formData.append(
        "due_date",
        dueDate || ""
      );

      formData.append(
        "project_id",
        String(projectId)
      );

      formData.append(
        "assigned_to",
        String(assignedTo)
      );

      // --------------------------------------------------------
      // OPTIONAL ATTACHMENT
      // --------------------------------------------------------

      if (attachment) {
        formData.append(
          "attachment",
          attachment
        );
      }

      // --------------------------------------------------------
      // CREATE TASK
      //
      // createTask() should send the JWT token and FormData.
      // --------------------------------------------------------

      await createTask(formData);

      // --------------------------------------------------------
      // SUCCESS
      // --------------------------------------------------------

      navigate(-1);

    } catch (error) {
      console.error(
        "Error creating task:",
        error
      );

      // --------------------------------------------------------
      // HANDLE 401
      // --------------------------------------------------------

      if (
        error?.response?.status === 401 ||
        error?.status === 401
      ) {
        handleUnauthorized();
        return;
      }

      // --------------------------------------------------------
      // HANDLE 403
      //
      // Backend can reject a member trying to create a task.
      // --------------------------------------------------------

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

      <div className="w-full max-w-[480px] max-h-[90vh] overflow-y-auto bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="flex items-start justify-between mb-4">

          <div>

            <span className="inline-block px-2.5 py-0.5 mb-1.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-[10px] font-bold uppercase tracking-wider">
              New Task
            </span>

            <h1 className="text-xl font-bold text-slate-900">
              Create Project Task
            </h1>

            <p className="text-xs text-slate-500 mt-0.5">
              Organize your execution schedule and details.
            </p>

          </div>

          <button
            type="button"
            onClick={handleCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>

        </div>

        {/* ======================================================
            ERROR MESSAGE
        ====================================================== */}

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* ======================================================
            FORM
        ====================================================== */}

        <form
          onSubmit={handleSaveTask}
          className="space-y-3.5"
        >

          {/* ====================================================
              TASK TITLE
          ==================================================== */}

          <div>

            <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Task Title *
            </label>

            <input
              type="text"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
              placeholder="e.g. Implement Auth Middleware"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              maxLength={100}
              required
            />

          </div>

          {/* ====================================================
              DESCRIPTION
          ==================================================== */}

          <div>

            <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Description *
            </label>

            <textarea
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 resize-y h-[70px]"
              placeholder="Detail task requirements..."
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              maxLength={500}
              required
            />

          </div>

          {/* ====================================================
              PRIORITY & STATUS
          ==================================================== */}

          <div className="grid grid-cols-2 gap-2.5">

            <div>

              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
                Priority
              </label>

              <select
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value)
                }
              >
                <option value="Low">
                  Low
                </option>

                <option value="Medium">
                  Medium
                </option>

                <option value="High">
                  High
                </option>
              </select>

            </div>

            <div>

              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
                Status
              </label>

              <select
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value)
                }
              >

                <option value="Pending">
                  Pending
                </option>

                <option value="In Progress">
                  In Progress
                </option>

                <option value="Completed">
                  Completed
                </option>

              </select>

            </div>

          </div>

          {/* ====================================================
              ASSIGN TO
          ==================================================== */}

          <div>

            <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Assign To *
            </label>

            <select
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
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
                <p className="mt-1.5 text-[10px] text-amber-600">
                  No team members found for this project.
                </p>
              )}

          </div>

          {/* ====================================================
              DUE DATE
          ==================================================== */}

          <div>

            <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Due Date
            </label>

            <input
              type="date"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 outline-none cursor-pointer transition-all focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
              value={dueDate}
              onChange={(e) =>
                setDueDate(e.target.value)
              }
            />

          </div>

          {/* ====================================================
              ATTACHMENT
          ==================================================== */}

          <div>

            <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Attachment
            </label>

            <div className="flex items-center gap-2">

              {/* Hidden File Input */}

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={handleAttachmentChange}
              />

              {/* Paperclip Button */}

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={loading}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-all cursor-pointer disabled:opacity-50"
                title="Attach a file"
                aria-label="Attach a file"
              >
                <Paperclip
                  size={18}
                  strokeWidth={2}
                />
              </button>

              {/* Selected File */}

              {attachment ? (

                <div className="flex items-center gap-2 min-w-0 flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">

                  <FileText
                    size={16}
                    className="text-teal-600 flex-shrink-0"
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
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 hover:text-red-600 transition-colors cursor-pointer flex-shrink-0"
                    title="Remove attachment"
                    aria-label="Remove attachment"
                  >
                    <X size={14} />
                  </button>

                </div>

              ) : (

                <p className="text-xs text-slate-400">
                  Optional — attach a file or image
                </p>

              )}

            </div>

            <p className="mt-1.5 text-[10px] text-slate-400">
              Maximum file size: 10 MB
            </p>

          </div>

          {/* ====================================================
              ACTION BUTTONS
          ==================================================== */}

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">

            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="w-full sm:flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
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
              className="w-full sm:flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

