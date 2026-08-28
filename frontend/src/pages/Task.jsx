import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createTask } from "../services/api";

function Task() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("Pending");
  const [dueDate, setDueDate] = useState("");

  const [members, setMembers] = useState([]);
  const [assignedTo, setAssignedTo] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // ============================================================
  // FETCH PROJECT MEMBERS
  // ============================================================

  useEffect(() => {
    const fetchMembers = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setLoadingMembers(true);

        const response = await fetch(
          `http://localhost:3000/api/projects/${projectId}/members`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
              data.error ||
              "Unable to load project members."
          );
        }

        // Supports either:
        // { members: [...] }
        // OR directly [...]
        const projectMembers = Array.isArray(data)
          ? data
          : data.members || [];

        setMembers(projectMembers);
      } catch (error) {
        console.error("Error loading project members:", error);

        setErrorMessage(
          error.message || "Unable to load team members."
        );
      } finally {
        setLoadingMembers(false);
      }
    };

    if (projectId) {
      fetchMembers();
    }
  }, [projectId, navigate]);

  // ============================================================
  // SAVE TASK
  // ============================================================

  const handleSaveTask = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (!trimmedTitle) {
      setErrorMessage("Task title is required.");
      return;
    }

    if (!trimmedDesc) {
      setErrorMessage("Task description is required.");
      return;
    }

    if (!assignedTo) {
      setErrorMessage("Please select a team member to assign this task.");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setErrorMessage(
          "Your session has expired. Please log in again."
        );

        navigate("/login");
        return;
      }

      const formattedProjectId = projectId
        ? isNaN(projectId)
          ? projectId
          : parseInt(projectId, 10)
        : null;

      const taskPayload = {
        title: trimmedTitle,
        description: trimmedDesc,
        priority,
        status,
        due_date: dueDate || null,
        attachment: null,
        project_id: formattedProjectId,

        // Assigned team member
        assigned_to: parseInt(assignedTo, 10),
      };

      await createTask(taskPayload);

      navigate(-1);
    } catch (error) {
      console.error("Error creating task:", error);

      setErrorMessage(
        error.message || "Server Error: Unable to create task"
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
            ✕
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

        <form onSubmit={handleSaveTask} className="space-y-3.5">

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
              onChange={(e) => setTitle(e.target.value)}
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
              onChange={(e) => setDescription(e.target.value)}
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
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
                Status
              </label>

              <select
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
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
            <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Assign To *
            </label>

            <select
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              disabled={loadingMembers}
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
                  (member.name ||
                    member.full_name ||
                    member.username)
                    ? ` (${member.email})`
                    : ""}
                </option>
              ))}
            </select>

            {!loadingMembers && members.length === 0 && (
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
              onChange={(e) => setDueDate(e.target.value)}
            />
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
              disabled={loading || loadingMembers || members.length === 0}
              className="w-full sm:flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Saving Task..." : "Save Task"}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}

export default Task;