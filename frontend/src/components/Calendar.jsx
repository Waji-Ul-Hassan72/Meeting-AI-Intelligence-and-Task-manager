import React, { useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function TaskCalendar({ tasks = [] }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // ============================================================
  // FORMAT DATE
  // ============================================================
  const formatDate = (date) => {
    if (!date) return "";

    if (typeof date === "string") {
      const match = date.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }

    const parsedDate = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return "";

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // ============================================================
  // GET TASK DUE DATE
  // ============================================================
  const getTaskDueDate = (task) => {
    return (
      task?.due_date ||
      task?.dueDate ||
      task?.task_due_date ||
      task?.taskDueDate ||
      null
    );
  };

  const selectedDateString = formatDate(selectedDate);

  // ============================================================
  // TASKS FOR SELECTED DATE
  // ============================================================
  const selectedDateTasks = useMemo(() => {
    return tasks.filter((task) => {
      const dueDate = getTaskDueDate(task);
      if (!dueDate) return false;
      return formatDate(dueDate) === selectedDateString;
    });
  }, [tasks, selectedDateString]);

  // ============================================================
  // GET STATUS & PRIORITY
  // ============================================================
  const getStatus = (task) => {
    return task.status || task.task_status || task.taskStatus || "To Do";
  };

  const getPriority = (task) => {
    return task.priority || "Medium";
  };

  // ============================================================
  // STYLING HELPERS
  // ============================================================
  const getStatusClass = (status) => {
    const normalized = String(status).trim().toLowerCase();
    if (normalized === "completed") {
      return "bg-emerald-100/80 text-emerald-800 border-emerald-300";
    }
    if (
      normalized === "in progress" ||
      normalized === "in-progress" ||
      normalized === "inprogress"
    ) {
      return "bg-indigo-100/80 text-indigo-800 border-indigo-300";
    }
    if (normalized === "blocked") {
      return "bg-rose-100/80 text-rose-800 border-rose-300";
    }
    return "bg-amber-100/80 text-amber-800 border-amber-300";
  };

  const getPriorityClass = (priority) => {
    const normalized = String(priority).trim().toLowerCase();
    if (normalized === "high") {
      return "text-rose-700 bg-rose-50 border-rose-200";
    }
    if (normalized === "medium") {
      return "text-amber-700 bg-amber-50 border-amber-200";
    }
    return "text-slate-600 bg-slate-100 border-slate-200";
  };

  const getStatusCardAccent = (status) => {
    const normalized = String(status).trim().toLowerCase();
    if (normalized === "completed") return "border-l-emerald-500";
    if (
      normalized === "in progress" ||
      normalized === "in-progress" ||
      normalized === "inprogress"
    ) {
      return "border-l-indigo-500";
    }
    if (normalized === "blocked") return "border-l-rose-500";
    return "border-l-amber-500";
  };

  // ============================================================
  // CALENDAR TILE CONTENT (INDICATORS)
  // ============================================================
  const tileContent = ({ date, view }) => {
    if (view !== "month") return null;

    const dateString = formatDate(date);
    const dateTasks = tasks.filter((task) => {
      const dueDate = getTaskDueDate(task);
      return dueDate && formatDate(dueDate) === dateString;
    });

    if (dateTasks.length === 0) return null;

    return (
      <div className="flex justify-center mt-1.5">
        <div className="flex items-center gap-1">
          {dateTasks.slice(0, 3).map((task, index) => {
            const status = String(getStatus(task)).trim().toLowerCase();

            let dotClass = "bg-amber-500";
            if (status === "completed") dotClass = "bg-emerald-500";
            else if (
              status === "in progress" ||
              status === "in-progress" ||
              status === "inprogress"
            ) {
              dotClass = "bg-indigo-600";
            } else if (status === "blocked") dotClass = "bg-rose-500";

            return (
              <span
                key={`${task.id}-${index}`}
                className={`w-2 h-2 rounded-full ${dotClass} ring-1 ring-white shadow-xs`}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6 font-sans">
      {/* GRID LINES & FIXED 7-COLUMN CSS OVERRIDES */}
      <style>{`
        .task-calendar.react-calendar {
          width: 100% !important;
          max-width: 100% !important;
          background: transparent !important;
          border: none !important;
          font-family: inherit !important;
        }

        /* Navigation Header */
        .task-calendar .react-calendar__navigation {
          display: flex;
          align-items: center;
          margin-bottom: 1.25rem;
          gap: 0.5rem;
        }
        .task-calendar .react-calendar__navigation button {
          min-width: 42px;
          height: 42px;
          border-radius: 0.75rem;
          font-weight: 700;
          color: #1e293b;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          background: #ffffff;
          border: 1px solid #cbd5e1;
        }
        .task-calendar .react-calendar__navigation button:enabled:hover {
          background-color: #4f46e5;
          color: #ffffff;
          border-color: #4f46e5;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
        }
        .task-calendar .react-calendar__navigation__label {
          background: #f8fafc !important;
          border: 1px solid #e2e8f0 !important;
          font-size: 1rem !important;
          font-weight: 800 !important;
          color: #0f172a !important;
        }

        /* Weekday Headers (Strict 7-Column Grid) */
        .task-calendar .react-calendar__month-view__weekdays {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr) !important;
          text-transform: uppercase;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #475569;
          margin-bottom: 0px;
          background-color: #f1f5f9;
          border-top: 1px solid #cbd5e1;
          border-left: 1px solid #cbd5e1;
          border-right: 1px solid #cbd5e1;
          border-top-left-radius: 0.75rem;
          border-top-right-radius: 0.75rem;
        }
        .task-calendar .react-calendar__month-view__weekdays__weekday {
          padding: 0.75rem 0.25rem;
          text-align: center;
          border-right: 1px solid #cbd5e1;
          border-bottom: 2px solid #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .task-calendar .react-calendar__month-view__weekdays__weekday:last-child {
          border-right: none;
        }
        .task-calendar .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none;
        }

        /* Days Grid Container (Strict 7-Column Grid Fix) */
        .task-calendar .react-calendar__month-view__days {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr) !important;
          gap: 1px !important;
          background-color: #cbd5e1 !important; /* Grid line color */
          border-left: 1px solid #cbd5e1 !important;
          border-right: 1px solid #cbd5e1 !important;
          border-bottom: 1px solid #cbd5e1 !important;
          border-bottom-left-radius: 0.75rem;
          border-bottom-right-radius: 0.75rem;
          overflow: hidden;
        }

        /* Day Grid Cell */
        .task-calendar .react-calendar__month-view__days__day {
          width: 100% !important;
          max-width: none !important;
          padding: 0.85rem 0.25rem !important;
          font-weight: 600;
          font-size: 0.875rem;
          color: #1e293b;
          background-color: #ffffff !important;
          border: none !important;
          border-radius: 0 !important;
          transition: all 0.15s ease-in-out;
        }

        /* Hover State */
        .task-calendar .react-calendar__tile:enabled:hover,
        .task-calendar .react-calendar__tile:enabled:focus {
          background-color: #eef2ff !important;
          color: #4338ca !important;
        }

        /* Today Highlight */
        .task-calendar .react-calendar__tile--now {
          background-color: #f0fdf4 !important;
          color: #15803d !important;
          font-weight: 800 !important;
        }

        /* Active Selected Date */
        .task-calendar .react-calendar__tile--active,
        .task-calendar .react-calendar__tile--active:enabled:hover,
        .task-calendar .react-calendar__tile--active:enabled:focus {
          background-color: #4f46e5 !important;
          color: #ffffff !important;
          font-weight: 800 !important;
        }
        .task-calendar .react-calendar__tile--active .ring-white {
          --tw-ring-color: #4f46e5 !important;
        }

        /* Neighboring Month Days */
        .task-calendar .react-calendar__month-view__days__day--neighboringMonth {
          background-color: #f8fafc !important;
          color: #94a3b8 !important;
        }
      `}</style>

      {/* ======================================================
          CALENDAR CONTAINER CARD
      ====================================================== */}
      <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Schedule & Calendar
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Click any calendar day to inspect due tasks
              </p>
            </div>
          </div>

          {/* Status Legend */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> In Progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> To Do
            </span>
          </div>
        </div>

        {/* Structured Grid Calendar */}
        <div className="w-full">
          <Calendar
            onChange={setSelectedDate}
            value={selectedDate}
            tileContent={tileContent}
            className="task-calendar w-full max-w-none"
          />
        </div>
      </div>

      {/* ======================================================
          SELECTED DATE TASKS
      ====================================================== */}
      <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
              Day Breakdown
            </span>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight mt-1.5">
              Tasks for{" "}
              <span className="text-indigo-600">
                {selectedDate.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </h3>
          </div>

          <span className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold tracking-wide shadow-sm">
            {selectedDateTasks.length}{" "}
            {selectedDateTasks.length === 1 ? "Task" : "Tasks"}
          </span>
        </div>

        {/* Empty State */}
        {selectedDateTasks.length === 0 && (
          <div className="text-center py-12 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center shadow-xs">
              <svg
                className="w-6 h-6 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-sm font-bold text-slate-800">
              No tasks scheduled for this date.
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Select another grid cell on the calendar to view its deadlined items.
            </p>
          </div>
        )}

        {/* Task Cards */}
        <div className="space-y-3.5">
          {selectedDateTasks.map((task) => {
            const status = getStatus(task);
            const priority = getPriority(task);
            const assigneeName =
              task.assigned_to_name ||
              task.assignedToName ||
              task.assignee_name ||
              task.assigned_to;

            return (
              <div
                key={task.id}
                className={`group bg-white border border-slate-200 border-l-4 ${getStatusCardAccent(
                  status
                )} rounded-xl p-5 hover:shadow-md hover:border-slate-300 transition-all duration-200`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {task.name || task.title || "Untitled Task"}
                    </h4>

                    {task.description && (
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2.5 mt-4">
                      {/* Status */}
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold capitalize border ${getStatusClass(
                          status
                        )}`}
                      >
                        {status}
                      </span>

                      {/* Priority */}
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold capitalize border ${getPriorityClass(
                          priority
                        )}`}
                      >
                        {priority} Priority
                      </span>

                      {/* Assignee */}
                      {assigneeName && (
                        <div className="flex items-center gap-1.5 ml-auto text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                          <span className="w-4 h-4 rounded-full bg-slate-800 text-white text-[9px] font-bold flex items-center justify-center">
                            {assigneeName.charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate max-w-[120px]">
                            {assigneeName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}