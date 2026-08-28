
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getTasks,
  getProjectTasks,
  updateTask,
  deleteTask as removeTask,
  deleteAllProjectTasks,
} from "../services/api";

export default function Tasks() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  // ==========================================================
  // CONSTANTS
  // ==========================================================

  const PAGE_LIMIT = 10;

  // ==========================================================
  // TASK STATE
  // ==========================================================

  const [tasks, setTasks] = useState([]);

  const [taskSummary, setTaskSummary] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });

  // ==========================================================
  // PAGINATION STATE
  // ==========================================================

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [totalTasks, setTotalTasks] = useState(0);

  // ==========================================================
  // UI STATE
  // ==========================================================

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editTaskData, setEditTaskData] = useState(null);

  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);

  // ==========================================================
  // AUTH CHECK
  // ==========================================================

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      localStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  // ==========================================================
  // RESET PAGINATION WHEN PROJECT CHANGES
  // ==========================================================

  useEffect(() => {
    setCurrentPage(1);
    setTotalPages(1);
    setTotalTasks(0);

    setTasks([]);

    setTaskSummary({
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
    });
  }, [projectId]);

  // ==========================================================
  // NORMALIZE API RESPONSE
  // ==========================================================

  const normalizeTaskResponse = (result) => {
    if (Array.isArray(result)) {
      return result;
    }

    if (Array.isArray(result?.tasks)) {
      return result.tasks;
    }

    if (Array.isArray(result?.data)) {
      return result.data;
    }

    if (Array.isArray(result?.data?.tasks)) {
      return result.data.tasks;
    }

    if (Array.isArray(result?.rows)) {
      return result.rows;
    }

    return [];
  };

  // ==========================================================
  // GET PAGINATION INFORMATION
  // ==========================================================

  const extractPagination = (result, taskCount) => {
    const pagination = result?.pagination || result?.data?.pagination || {};

    const page =
      Number(pagination.page) ||
      Number(result?.page) ||
      currentPage;

    const limit =
      Number(pagination.limit) ||
      PAGE_LIMIT;

    const total =
      Number(pagination.total) ||
      Number(result?.summary?.total) ||
      Number(result?.total) ||
      Number(result?.data?.total) ||
      taskCount;

    let pages =
      Number(pagination.totalPages) ||
      Number(pagination.total_pages) ||
      Number(result?.totalPages) ||
      Number(result?.total_pages) ||
      Number(result?.data?.totalPages) ||
      Number(result?.data?.total_pages);

    // If backend does not provide totalPages,
    // calculate it from total / limit.
    if (!pages || pages < 1) {
      pages = Math.ceil(total / limit);
    }

    return {
      page,
      limit,
      total,
      totalPages: Math.max(1, pages),
    };
  };

  // ==========================================================
  // FETCH TASKS
  // ==========================================================

  const fetchTasks = useCallback(
    async (showFullLoading = true) => {
      const token = localStorage.getItem("token");

      if (!token) {
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      try {
        if (showFullLoading) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setErrorMessage("");

        let result;

        /*
         * IMPORTANT:
         *
         * currentPage and PAGE_LIMIT are explicitly passed
         * to the API service.
         *
         * Page 1:
         * ?page=1&limit=10
         *
         * Page 2:
         * ?page=2&limit=10
         *
         * Page 3:
         * ?page=3&limit=10
         */

        if (projectId) {
          result = await getProjectTasks(
            projectId,
            currentPage,
            PAGE_LIMIT
          );
        } else {
          result = await getTasks(
            currentPage,
            PAGE_LIMIT
          );
        }

        console.log(
          "TASK API RESPONSE:",
          result
        );

        const taskData =
          normalizeTaskResponse(result);

        // ======================================================
        // SET CURRENT PAGE TASKS ONLY
        // ======================================================

        setTasks(taskData);

        // ======================================================
        // SUMMARY
        // ======================================================

        if (result?.summary) {
          setTaskSummary({
            total:
              Number(result.summary.total) || 0,

            pending:
              Number(result.summary.pending) || 0,

            inProgress:
              Number(result.summary.inProgress) || 0,

            completed:
              Number(result.summary.completed) || 0,
          });
        } else {
          /*
           * Fallback only.
           *
           * Normally your backend provides summary.
           */

          const pendingCount =
            taskData.filter(
              (task) =>
                String(task.status).toLowerCase() ===
                "pending"
            ).length;

          const inProgressCount =
            taskData.filter(
              (task) =>
                String(task.status).toLowerCase() ===
                "in progress"
            ).length;

          const completedCount =
            taskData.filter(
              (task) =>
                String(task.status).toLowerCase() ===
                "completed"
            ).length;

          const fallbackTotal =
            Number(result?.total) ||
            taskData.length;

          setTaskSummary({
            total: fallbackTotal,
            pending: pendingCount,
            inProgress: inProgressCount,
            completed: completedCount,
          });
        }

        // ======================================================
        // PAGINATION
        // ======================================================

        const pagination =
          extractPagination(
            result,
            taskData.length
          );

        console.log(
          "PAGINATION:",
          pagination
        );

        setTotalTasks(pagination.total);

        setTotalPages(
          Math.max(
            1,
            pagination.totalPages
          )
        );

        /*
         * If backend tells us the current page,
         * synchronize the frontend with it.
         */

        if (
          pagination.page >= 1 &&
          pagination.page <= pagination.totalPages
        ) {
          if (
            pagination.page !== currentPage
          ) {
            setCurrentPage(
              pagination.page
            );
          }
        }

      } catch (error) {
        console.error(
          "Error fetching tasks:",
          error
        );

        if (
          error?.status === 401 ||
          String(error?.message || "")
            .toLowerCase()
            .includes("401")
        ) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");

          navigate("/login");
          return;
        }

        setErrorMessage(
          error?.message ||
            "Failed to load tasks."
        );

        setTasks([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      projectId,
      currentPage,
      navigate,
    ]
  );

  // ==========================================================
  // LOAD TASKS WHEN PAGE CHANGES
  // ==========================================================

  useEffect(() => {
    fetchTasks(true);
  }, [fetchTasks]);

  // ==========================================================
  // REFRESH AFTER TASK CHANGE
  // ==========================================================

  const refreshAfterTaskChange =
    async () => {
      await fetchTasks(false);
    };

  // ==========================================================
  // PAGE NAVIGATION
  // ==========================================================

  const goToPage = (page) => {
    const requestedPage =
      Number(page);

    if (
      requestedPage < 1 ||
      requestedPage > totalPages ||
      requestedPage === currentPage
    ) {
      return;
    }

    setCurrentPage(requestedPage);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(
        (previousPage) =>
          previousPage - 1
      );
    }
  };

  const goToNextPage = () => {
    if (
      currentPage < totalPages
    ) {
      setCurrentPage(
        (previousPage) =>
          previousPage + 1
      );
    }
  };

  // ==========================================================
  // PAGE NUMBERS
  // ==========================================================

  const pageNumbers = useMemo(() => {
    const pages = [];

    /*
     * For small number of pages,
     * show all pages.
     */

    if (totalPages <= 7) {
      for (
        let i = 1;
        i <= totalPages;
        i++
      ) {
        pages.push(i);
      }

      return pages;
    }

    /*
     * Always show first page.
     */

    pages.push(1);

    /*
     * Show pages around current page.
     */

    const start = Math.max(
      2,
      currentPage - 1
    );

    const end = Math.min(
      totalPages - 1,
      currentPage + 1
    );

    if (start > 2) {
      pages.push("...");
    }

    for (
      let i = start;
      i <= end;
      i++
    ) {
      pages.push(i);
    }

    if (
      end < totalPages - 1
    ) {
      pages.push("...");
    }

    /*
     * Always show last page.
     */

    pages.push(totalPages);

    return pages;
  }, [
    currentPage,
    totalPages,
  ]);

  // ==========================================================
  // EDIT MODAL
  // ==========================================================

  const openEditModal = (task) => {
    setEditTaskData({
      ...task,

      id:
        task.id ||
        task._id,

      title:
        task.title || "",

      description:
        task.description || "",

      priority:
        task.priority || "Medium",

      status:
        task.status || "Pending",

      due_date:
        task.due_date
          ? String(
              task.due_date
            ).slice(0, 10)
          : "",

      project_id:
        task.project_id ||
        task.projectId ||
        projectId ||
        null,

      is_recurring:
        Boolean(
          task.is_recurring
        ),

      repeat_type:
        task.repeat_type ||
        "Monthly",

      repeat_months:
        Array.isArray(
          task.repeat_months
        )
          ? task.repeat_months
          : [],

      repeat_days:
        Array.isArray(
          task.repeat_days
        )
          ? task.repeat_days
          : [],
    });

    setShowEditModal(true);
  };

  const closeModal = () => {
    setShowEditModal(false);
    setEditTaskData(null);
  };

  // ==========================================================
  // UPDATE TASK
  // ==========================================================

  const handleUpdateTask = async (
    e
  ) => {
    e.preventDefault();

    if (!editTaskData) {
      return;
    }

    const taskId =
      editTaskData.id ||
      editTaskData._id;

    if (!taskId) {
      alert("Task ID is missing.");
      return;
    }

    const title =
      editTaskData.title?.trim();

    if (!title) {
      alert(
        "Task title is required."
      );
      return;
    }

    try {
      setErrorMessage("");

      const payload = {
        title,

        description:
          editTaskData.description?.trim() ||
          "",

        priority:
          editTaskData.priority ||
          "Medium",

        status:
          editTaskData.status ||
          "Pending",

        due_date:
          editTaskData.due_date ||
          null,

        project_id:
          editTaskData.project_id ||
          projectId ||
          null,

        is_recurring:
          Boolean(
            editTaskData.is_recurring
          ),

        repeat_type:
          editTaskData.is_recurring
            ? editTaskData.repeat_type ||
              "Monthly"
            : null,

        repeat_months:
          editTaskData.is_recurring
            ? editTaskData.repeat_months ||
              []
            : [],

        repeat_days:
          editTaskData.is_recurring
            ? editTaskData.repeat_days ||
              []
            : [],
      };

      await updateTask(
        taskId,
        payload
      );

      closeModal();

      await refreshAfterTaskChange();

    } catch (error) {
      console.error(
        "Error updating task:",
        error
      );

      alert(
        error?.message ||
          "Failed to update task."
      );
    }
  };

  // ==========================================================
  // DELETE SINGLE TASK
  // ==========================================================

  const handleDeleteTask =
    async (taskId) => {
      if (!taskId) {
        return;
      }

      if (
        !window.confirm(
          "Are you sure you want to delete this task?"
        )
      ) {
        return;
      }

      try {
        setDeletingTaskId(taskId);
        setErrorMessage("");

        await removeTask(taskId);

        /*
         * If the last task on the current page
         * was deleted, go back one page.
         */

        if (
          tasks.length === 1 &&
          currentPage > 1
        ) {
          setCurrentPage(
            (page) => page - 1
          );
        } else {
          await refreshAfterTaskChange();
        }

      } catch (error) {
        console.error(
          "Error deleting task:",
          error
        );

        alert(
          error?.message ||
            "Failed to delete task."
        );
      } finally {
        setDeletingTaskId(null);
      }
    };

  // ==========================================================
  // DELETE ALL PROJECT TASKS
  // ==========================================================

  const handleDeleteAllTasks =
    async () => {
      if (!projectId) {
        alert(
          "Delete all is available only inside a project."
        );
        return;
      }

      if (taskSummary.total === 0) {
        alert(
          "There are no tasks in this project."
        );
        return;
      }

      if (
        !window.confirm(
          "Are you sure you want to delete ALL tasks from this project?"
        )
      ) {
        return;
      }

      try {
        setDeletingAll(true);
        setErrorMessage("");

        await deleteAllProjectTasks(
          projectId
        );

        setCurrentPage(1);

        setTasks([]);

        setTotalPages(1);

        setTotalTasks(0);

        setTaskSummary({
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
        });

        await fetchTasks(false);

      } catch (error) {
        console.error(
          "Error deleting all tasks:",
          error
        );

        alert(
          error?.message ||
            "Failed to delete all tasks."
        );

        await fetchTasks(false);

      } finally {
        setDeletingAll(false);
      }
    };

  // ==========================================================
  // SORT CURRENT PAGE TASKS
  // ==========================================================

  const sortedTasks = useMemo(() => {
    return [...tasks].sort(
      (a, b) => {
        const statusOrder = {
          Pending: 1,
          "In Progress": 2,
          Completed: 3,
        };

        const statusDiff =
          (statusOrder[a.status] ||
            4) -
          (statusOrder[b.status] ||
            4);

        if (
          statusDiff !== 0
        ) {
          return statusDiff;
        }

        if (
          a.due_date &&
          b.due_date
        ) {
          return (
            new Date(
              a.due_date
            ) -
            new Date(
              b.due_date
            )
          );
        }

        if (a.due_date) {
          return -1;
        }

        if (b.due_date) {
          return 1;
        }

        return 0;
      }
    );
  }, [tasks]);

  // ==========================================================
  // LOADING SCREEN
  // ==========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center">
        <div className="text-center">

          <div className="w-9 h-9 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />

          <p className="text-sm font-semibold text-slate-500">
            Loading tasks...
          </p>

        </div>
      </div>
    );
  }

  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-slate-900 font-sans p-5 lg:p-8">

      <div className="max-w-7xl mx-auto">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">

          <div>

            <p className="text-[10px] uppercase tracking-wider font-bold text-teal-600 mb-1">
              Project Tasks
            </p>

            <h1 className="text-2xl font-extrabold text-slate-900">
              Task Management
            </h1>

            <p className="text-xs text-slate-500 mt-1">
              {projectId
                ? "Manage all tasks belonging to this project."
                : "Manage your tasks."}
            </p>

          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() =>
                fetchTasks(false)
              }
              disabled={
                refreshing ||
                deletingAll
              }
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-teal-300 hover:text-teal-700 disabled:opacity-50"
            >
              {refreshing
                ? "Refreshing..."
                : "↻ Refresh"}
            </button>

            {taskSummary.total >
              0 &&
              projectId && (
                <button
                  type="button"
                  onClick={
                    handleDeleteAllTasks
                  }
                  disabled={
                    deletingAll ||
                    refreshing
                  }
                  className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                >
                  {deletingAll
                    ? "Deleting..."
                    : "Delete All"}
                </button>
              )}

            {projectId && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/projects/${projectId}/tasks/new`
                  )
                }
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                + Add Task
              </button>
            )}

          </div>

        </div>

        {/* ======================================================
            ERROR
        ====================================================== */}

        {errorMessage && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* ======================================================
            GLOBAL STATS
        ====================================================== */}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-[10px] uppercase font-bold text-slate-400">
              Total Tasks
            </p>

            <p className="text-2xl font-extrabold text-slate-800 mt-1">
              {taskSummary.total}
            </p>

            <p className="text-[10px] text-slate-400 mt-1">
              All pages
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-[10px] uppercase font-bold text-slate-400">
              To Do
            </p>

            <p className="text-2xl font-extrabold text-amber-600 mt-1">
              {taskSummary.pending}
            </p>

            <p className="text-[10px] text-slate-400 mt-1">
              All pages
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-[10px] uppercase font-bold text-slate-400">
              In Progress
            </p>

            <p className="text-2xl font-extrabold text-blue-600 mt-1">
              {taskSummary.inProgress}
            </p>

            <p className="text-[10px] text-slate-400 mt-1">
              All pages
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-[10px] uppercase font-bold text-slate-400">
              Completed
            </p>

            <p className="text-2xl font-extrabold text-emerald-600 mt-1">
              {taskSummary.completed}
            </p>

            <p className="text-[10px] text-slate-400 mt-1">
              All pages
            </p>
          </div>

        </div>

        {/* ======================================================
            TABLE
        ====================================================== */}

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full text-left border-collapse text-xs">

              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">

                  <th className="p-4 font-bold">
                    Title
                  </th>

                  <th className="p-4 font-bold">
                    Description
                  </th>

                  <th className="p-4 font-bold">
                    Priority
                  </th>

                  <th className="p-4 font-bold">
                    Status
                  </th>

                  <th className="p-4 font-bold">
                    Due Date
                  </th>

                  <th className="p-4 font-bold">
                    Recurring
                  </th>

                  <th className="p-4 font-bold text-right">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody>

                {sortedTasks.length === 0 ? (

                  <tr>

                    <td
                      colSpan="7"
                      className="text-center p-12"
                    >

                      <div className="w-12 h-12 mx-auto rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-xl mb-3">
                        ✓
                      </div>

                      <h3 className="text-sm font-bold text-slate-800">
                        No tasks found
                      </h3>

                      <p className="text-xs text-slate-400 mt-1">
                        This project does not have any tasks yet.
                      </p>

                      {projectId && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/projects/${projectId}/tasks/new`
                            )
                          }
                          className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
                        >
                          + Create First Task
                        </button>
                      )}

                    </td>

                  </tr>

                ) : (

                  sortedTasks.map(
                    (task) => {

                      const taskId =
                        task.id ||
                        task._id;

                      return (
                        <tr
                          key={taskId}
                          className="border-b border-slate-100 hover:bg-slate-50/60"
                        >

                          <td className="p-4">

                            <div>

                              <p className="font-bold text-slate-900">
                                {task.title ||
                                  "Untitled Task"}
                              </p>

                              {task.assigned_to_name && (
                                <p className="text-[10px] text-slate-400 mt-1">
                                  Assigned to:{" "}
                                  {
                                    task.assigned_to_name
                                  }
                                </p>
                              )}

                            </div>

                          </td>

                          <td className="p-4 max-w-[250px]">

                            <p className="text-slate-500 line-clamp-2">
                              {task.description ||
                                "No description"}
                            </p>

                          </td>

                          <td className="p-4">

                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                task.priority ===
                                "High"
                                  ? "bg-red-100 text-red-700"
                                  : task.priority ===
                                    "Medium"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {task.priority ||
                                "Medium"}
                            </span>

                          </td>

                          <td className="p-4">

                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                task.status ===
                                "Completed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : task.status ===
                                    "In Progress"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {task.status ||
                                "Pending"}
                            </span>

                          </td>

                          <td className="p-4 text-slate-600">
                            {task.due_date
                              ? String(
                                  task.due_date
                                ).slice(
                                  0,
                                  10
                                )
                              : "N/A"}
                          </td>

                          <td className="p-4">

                            {task.is_recurring ? (

                              <span className="text-teal-600 font-semibold">
                                Yes
                                {task.repeat_type
                                  ? ` (${task.repeat_type})`
                                  : ""}
                              </span>

                            ) : (

                              <span className="text-slate-400">
                                No
                              </span>

                            )}

                          </td>

                          <td className="p-4 text-right">

                            <div className="flex justify-end items-center gap-3">

                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    task
                                  )
                                }
                                disabled={
                                  deletingTaskId ===
                                    taskId ||
                                  deletingAll
                                }
                                className="text-teal-600 hover:text-teal-800 font-bold disabled:opacity-40"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteTask(
                                    taskId
                                  )
                                }
                                disabled={
                                  deletingTaskId ===
                                    taskId ||
                                  deletingAll
                                }
                                className="text-red-600 hover:text-red-800 font-bold disabled:opacity-40"
                              >
                                {deletingTaskId ===
                                taskId
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )

                )}

              </tbody>

            </table>

          </div>

        </div>

        {/* ======================================================
            PAGINATION
        ====================================================== */}

        {totalPages > 1 && (

          <div className="mt-5 bg-white border border-slate-200 rounded-2xl px-4 py-4">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

              {/* LEFT SIDE */}

              <div>

                <p className="text-xs font-semibold text-slate-600">

                  Showing{" "}

                  <span className="font-extrabold text-slate-900">
                    {totalTasks === 0
                      ? 0
                      : (currentPage - 1) *
                          PAGE_LIMIT +
                        1}
                  </span>

                  {" – "}

                  <span className="font-extrabold text-slate-900">
                    {Math.min(
                      currentPage *
                        PAGE_LIMIT,
                      totalTasks
                    )}
                  </span>

                  {" of "}

                  <span className="font-extrabold text-slate-900">
                    {totalTasks}
                  </span>

                  {" tasks"}

                </p>

                <p className="text-[10px] text-slate-400 mt-1">
                  Page {currentPage} of{" "}
                  {totalPages}
                </p>

              </div>

              {/* RIGHT SIDE */}

              <div className="flex items-center gap-1">

                {/* PREVIOUS */}

                <button
                  type="button"
                  onClick={
                    goToPreviousPage
                  }
                  disabled={
                    currentPage === 1 ||
                    refreshing ||
                    deletingAll
                  }
                  className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {/* PAGE NUMBERS */}

                {pageNumbers.map(
                  (page, index) => {

                    if (
                      page === "..."
                    ) {
                      return (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-2 text-xs text-slate-400"
                        >
                          ...
                        </span>
                      );
                    }

                    const isActive =
                      page ===
                      currentPage;

                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={() =>
                          goToPage(
                            page
                          )
                        }
                        disabled={
                          refreshing ||
                          deletingAll
                        }
                        className={`min-w-[34px] px-3 py-2 rounded-lg text-xs font-bold transition ${
                          isActive
                            ? "bg-teal-600 text-white"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                        } disabled:opacity-50`}
                      >
                        {page}
                      </button>
                    );
                  }
                )}

                {/* NEXT */}

                <button
                  type="button"
                  onClick={
                    goToNextPage
                  }
                  disabled={
                    currentPage >=
                      totalPages ||
                    refreshing ||
                    deletingAll
                  }
                  className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>

              </div>

            </div>

          </div>

        )}

        {/* ======================================================
            SINGLE PAGE MESSAGE
        ====================================================== */}

        {totalPages === 1 &&
          totalTasks > 0 && (

            <div className="flex justify-between items-center mt-5">

              <p className="text-xs text-slate-500 font-medium">
                Showing{" "}
                <span className="font-bold text-slate-800">
                  {totalTasks}
                </span>{" "}
                task
                {totalTasks !== 1
                  ? "s"
                  : ""}
              </p>

            </div>

          )}

      </div>

      {/* ========================================================
          EDIT MODAL
      ======================================================== */}

      {showEditModal &&
        editTaskData && (

          <div
            className="fixed inset-0 z-[1000] bg-slate-900/45 backdrop-blur-sm flex justify-center items-center p-4"
            onClick={closeModal}
          >

            <div
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-[500px] max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="flex justify-between items-center mb-5">

                <div>

                  <p className="text-[10px] uppercase tracking-wider font-bold text-teal-600">
                    Task
                  </p>

                  <h2 className="text-lg font-bold text-slate-900">
                    Edit Task
                  </h2>

                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  ✕
                </button>

              </div>

              <form
                onSubmit={
                  handleUpdateTask
                }
                className="space-y-4"
              >

                {/* TITLE */}

                <div>

                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Task Title
                  </label>

                  <input
                    type="text"
                    required
                    value={
                      editTaskData.title ||
                      ""
                    }
                    onChange={(e) =>
                      setEditTaskData({
                        ...editTaskData,
                        title:
                          e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-teal-600"
                  />

                </div>

                {/* DESCRIPTION */}

                <div>

                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Description
                  </label>

                  <textarea
                    rows="4"
                    value={
                      editTaskData.description ||
                      ""
                    }
                    onChange={(e) =>
                      setEditTaskData({
                        ...editTaskData,
                        description:
                          e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none resize-none focus:bg-white focus:border-teal-600"
                  />

                </div>

                {/* PRIORITY + STATUS */}

                <div className="grid grid-cols-2 gap-3">

                  <div>

                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Priority
                    </label>

                    <select
                      value={
                        editTaskData.priority ||
                        "Medium"
                      }
                      onChange={(e) =>
                        setEditTaskData({
                          ...editTaskData,
                          priority:
                            e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-teal-600"
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

                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Status
                    </label>

                    <select
                      value={
                        editTaskData.status ||
                        "Pending"
                      }
                      onChange={(e) =>
                        setEditTaskData({
                          ...editTaskData,
                          status:
                            e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-teal-600"
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

                {/* DUE DATE */}

                <div>

                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Due Date
                  </label>

                  <input
                    type="date"
                    value={
                      editTaskData.due_date
                        ? String(
                            editTaskData.due_date
                          ).slice(
                            0,
                            10
                          )
                        : ""
                    }
                    onChange={(e) =>
                      setEditTaskData({
                        ...editTaskData,
                        due_date:
                          e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-teal-600"
                  />

                </div>

                {/* BUTTONS */}

                <div className="flex justify-end gap-2 pt-2">

                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
                  >
                    Save Changes
                  </button>

                </div>

              </form>

            </div>

          </div>
        )}

    </div>
  );
}

