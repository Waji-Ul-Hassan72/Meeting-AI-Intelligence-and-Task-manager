import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Trash2,
  RotateCcw,
  AlertTriangle,
  FolderKanban,
  CalendarDays,
  Square,
  CheckSquare,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

function Trash({ embedded = false, projectId = null, onRestore = null }) {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [restoringId, setRestoringId] =
    useState(null);

  const [permanentlyDeletingId, setPermanentlyDeletingId] =
    useState(null);

  const [deletingAll, setDeletingAll] =
    useState(false);

  const [taskToDelete, setTaskToDelete] =
    useState(null);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [showDeleteAllModal, setShowDeleteAllModal] =
    useState(false);

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
  // FORMAT DATE
  // =========================================================

  const formatDate = (date) => {
    if (!date) return "—";

    if (typeof date === "string") {
      const match = date.match(
        /^(\d{4}-\d{2}-\d{2})/
      );

      if (match) {
        const [
          year,
          month,
          day,
        ] = match[1].split("-");

        const localDate = new Date(
          Number(year),
          Number(month) - 1,
          Number(day)
        );

        return localDate.toLocaleDateString(
          "en-US",
          {
            month: "short",
            day: "numeric",
            year: "numeric",
          }
        );
      }
    }

    const parsedDate =
      date instanceof Date
        ? date
        : new Date(date);

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
  // FETCH TRASH
  // =========================================================

  const fetchTrash = async () => {
    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/tasks/trash`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json",
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
            "Unable to load Trash."
        );
      }

      const trashTasks =
        Array.isArray(data)
          ? data
          : Array.isArray(data.tasks)
          ? data.tasks
          : [];

      // Filter by projectId if embedded in ProjectDetails
      const filteredTasks = embedded && projectId
        ? trashTasks.filter(
            (t) => String(t.project_id || t.projectId) === String(projectId)
          )
        : trashTasks;

      setTasks(filteredTasks);
    } catch (err) {
      console.error(
        "Fetch trash error:",
        err
      );

      setError(
        err.message ||
          "Unable to load Trash."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOAD TRASH
  // =========================================================

  useEffect(() => {
    fetchTrash();
  }, [embedded, projectId]);

  // =========================================================
  // RESTORE TASK
  // =========================================================

  const handleRestore = async (task) => {
    if (!task) return;

    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setRestoringId(task.id);
      setError("");

      const response = await fetch(
        `${API_URL}/api/tasks/${task.id}/restore`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json",
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
            "Unable to restore task."
        );
      }

      // Remove from local trash state immediately
      setTasks((prev) =>
        prev.filter(
          (item) =>
            item.id !== task.id
        )
      );

      // Trigger parent callback if provided (updates project tasks instantly)
      if (typeof onRestore === "function") {
        onRestore();
      }

      // Dispatch global window event just in case
      window.dispatchEvent(
        new CustomEvent("task-restored", { detail: { task } })
      );
    } catch (err) {
      console.error(
        "Restore task error:",
        err
      );

      setError(
        err.message ||
          "Unable to restore task."
      );
    } finally {
      setRestoringId(null);
    }
  };

  // =========================================================
  // OPEN PERMANENT DELETE MODAL
  // =========================================================

  const openPermanentDeleteModal = (
    task
  ) => {
    setTaskToDelete(task);
    setShowDeleteModal(true);
  };

  // =========================================================
  // PERMANENT DELETE
  // =========================================================

  const handlePermanentDelete =
    async () => {
      if (!taskToDelete) return;

      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      try {
        setPermanentlyDeletingId(
          taskToDelete.id
        );

        setError("");

        const response = await fetch(
          `${API_URL}/api/tasks/${taskToDelete.id}/permanent`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type":
                "application/json",
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
              "Unable to permanently delete task."
          );
        }

        setTasks((prev) =>
          prev.filter(
            (item) =>
              item.id !==
              taskToDelete.id
          )
        );

        setShowDeleteModal(false);
        setTaskToDelete(null);
      } catch (err) {
        console.error(
          "Permanent delete error:",
          err
        );

        setError(
          err.message ||
            "Unable to permanently delete task."
        );
      } finally {
        setPermanentlyDeletingId(
          null
        );
      }
    };

  // =========================================================
  // PERMANENT DELETE ALL
  // =========================================================

  const handleDeleteAllPermanent = async () => {
    const token = getToken();
    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setDeletingAll(true);
      setError("");

      const endpoint = embedded && projectId
        ? `${API_URL}/api/tasks/project/${projectId}/trash/all`
        : `${API_URL}/api/tasks/trash/all`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Unable to clear trash."
        );
      }

      setTasks([]);
      setShowDeleteAllModal(false);
      
      if (typeof onRestore === "function") {
        onRestore();
      }
    } catch (err) {
      console.error("Delete all permanent error:", err);
      setError(err.message || "Unable to clear trash.");
    } finally {
      setDeletingAll(false);
    }
  };

  // =========================================================
  // GO BACK
  // =========================================================

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className={embedded ? "w-full" : "min-h-screen bg-slate-50 text-slate-900 font-sans"}>
      {/* =====================================================
          HEADER (Only shown if NOT embedded)
      ====================================================== */}

      {!embedded && (
        <header className="sticky top-0 z-40 bg-white border-b border-purple-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="h-16 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBack}
                  className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors"
                  title="Go Back"
                >
                  <ArrowLeft size={17} />
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-slate-900">
                      Trash
                    </h1>

                    <span className="px-2 py-1 rounded-md bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold">
                      {tasks.length}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-0.5">
                    Deleted tasks
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className={embedded ? "w-full" : "max-w-7xl mx-auto px-6 py-7"}>
        {/* ===================================================
            PAGE HEADER (Only shown if NOT embedded)
        ==================================================== */}

        {!embedded && (
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Trash
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Tasks moved to Trash can be
                restored or permanently deleted.
              </p>
            </div>

            {tasks.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(true)}
                title="Delete all tasks permanently"
                className="w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 flex items-center justify-center transition-colors shadow-xs cursor-pointer group"
              >
                <Square size={18} className="group-hover:hidden" />
                <CheckSquare size={18} className="hidden group-hover:block text-red-600" />
              </button>
            )}
          </div>
        )}

        {embedded && tasks.length > 0 && (
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => setShowDeleteAllModal(true)}
              title="Delete all tasks permanently"
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 flex items-center justify-center transition-colors shadow-xs cursor-pointer group"
            >
              <Square size={18} className="group-hover:hidden" />
              <CheckSquare size={18} className="hidden group-hover:block text-red-600" />
            </button>
          </div>
        )}

        {/* ===================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-3">
            <AlertTriangle
              size={18}
              className="shrink-0 mt-0.5"
            />

            <span>{error}</span>
          </div>
        )}

        {/* ===================================================
            TRASH CONTAINER
        ==================================================== */}

        <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />

              <p className="text-sm text-slate-500">
                Loading Trash...
              </p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={25} />
              </div>

              <h3 className="text-base font-bold text-slate-800">
                Trash is empty
              </h3>

              <p className="text-sm text-slate-400 mt-1">
                Deleted tasks will appear
                here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="px-5 py-5 hover:bg-purple-50/30 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                    {/* =================================================
                        TASK INFORMATION
                    ================================================== */}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-800">
                          {task.title ||
                            task.name ||
                            "Untitled Task"}
                        </h3>

                        <span className="px-2 py-1 rounded-md bg-red-50 border border-red-100 text-red-600 text-[9px] font-bold uppercase">
                          Deleted
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {
                            task.description
                          }
                        </p>
                      )}

                      {/* =================================================
                          TASK META
                      ================================================== */}

                      <div className="flex flex-wrap items-center gap-4 mt-3">
                        {task.project_name && (
                          <div className="flex items-center gap-1.5">
                            <FolderKanban
                              size={13}
                              className="text-purple-500"
                            />

                            <span className="text-xs font-medium text-purple-700">
                              {
                                task.project_name
                              }
                            </span>
                          </div>
                        )}

                        {task.due_date && (
                          <div className="flex items-center gap-1.5">
                            <CalendarDays
                              size={13}
                              className="text-purple-500"
                            />

                            <span className="text-xs font-medium text-slate-500">
                              Due{" "}
                              {formatDate(
                                task.due_date
                              )}
                            </span>
                          </div>
                        )}

                        {task.deleted_at && (
                          <span className="text-xs text-slate-400">
                            Deleted{" "}
                            {formatDate(
                              task.deleted_at
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* =================================================
                        ACTIONS
                    ================================================== */}

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleRestore(
                            task
                          )
                        }
                        disabled={
                          restoringId ===
                          task.id
                        }
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 text-white text-xs font-bold shadow-sm disabled:opacity-50 transition-opacity cursor-pointer"
                      >
                        <RotateCcw
                          size={14}
                        />

                        {restoringId ===
                        task.id
                          ? "Restoring..."
                          : "Restore"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openPermanentDeleteModal(
                            task
                          )
                        }
                        disabled={
                          permanentlyDeletingId ===
                          task.id
                        }
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-200 text-xs font-bold disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <Trash2
                          size={14}
                        />

                        Delete Permanently
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* =====================================================
          PERMANENT DELETE MODAL
      ====================================================== */}

      {showDeleteModal &&
        taskToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
              <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
                <Trash2 size={20} />
              </div>

              <h3 className="text-base font-bold text-slate-900">
                Permanently Delete Task
              </h3>

              <p className="text-sm text-slate-600 mt-2">
                Are you sure you want to
                permanently delete{" "}
                <span className="font-semibold text-slate-900">
                  {taskToDelete.title ||
                    taskToDelete.name ||
                    "this task"}
                </span>
                ?
              </p>

              <p className="text-xs text-red-600 mt-2 font-medium">
                This action cannot be undone.
              </p>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(
                      false
                    );
                    setTaskToDelete(
                      null
                    );
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handlePermanentDelete
                  }
                  disabled={
                    permanentlyDeletingId ===
                    taskToDelete.id
                  }
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {permanentlyDeletingId ===
                  taskToDelete.id
                    ? "Deleting..."
                    : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* =====================================================
          PERMANENT DELETE ALL MODAL
      ====================================================== */}

      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
            <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle size={20} />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Are you sure you want to delete all tasks permanently?
            </h3>
            <p className="text-sm text-slate-600 mt-2">
              This action cannot be undone. All tasks currently in trash will be permanently removed.
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAllPermanent}
                disabled={deletingAll}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {deletingAll ? "Deleting All..." : "Yes, Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Trash;