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
  // STATUS STYLING
  // ============================================================
  const getStatusClass = (status) => {
    const normalized = String(status).trim().toLowerCase();

    if (normalized === "completed") {
      return "bg-purple-100 text-purple-800 border-purple-200";
    }

    if (
      normalized === "in progress" ||
      normalized === "in-progress" ||
      normalized === "inprogress"
    ) {
      return "bg-pink-100 text-pink-800 border-pink-200";
    }

    if (normalized === "blocked") {
      return "bg-purple-100 text-purple-800 border-purple-200";
    }

    return "bg-purple-50 text-purple-700 border-purple-200";
  };

  // ============================================================
  // PRIORITY STYLING
  // ============================================================
  const getPriorityClass = (priority) => {
    const normalized = String(priority).trim().toLowerCase();

    if (normalized === "high") {
      return "text-pink-700 bg-pink-50 border-pink-200";
    }

    if (normalized === "medium") {
      return "text-purple-700 bg-purple-50 border-purple-200";
    }

    return "text-purple-600 bg-purple-50 border-purple-100";
  };

  // ============================================================
  // TASK CARD ACCENT
  // ============================================================
  const getStatusCardAccent = (status) => {
    const normalized = String(status).trim().toLowerCase();

    if (normalized === "completed") {
      return "border-l-purple-500";
    }

    if (
      normalized === "in progress" ||
      normalized === "in-progress" ||
      normalized === "inprogress"
    ) {
      return "border-l-pink-500";
    }

    if (normalized === "blocked") {
      return "border-l-purple-600";
    }

    return "border-l-purple-400";
  };

  // ============================================================
  // CALENDAR TILE CONTENT
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
            const status = String(getStatus(task))
              .trim()
              .toLowerCase();

            let dotClass = "bg-purple-500";

            if (status === "completed") {
              dotClass = "bg-purple-600";
            } else if (
              status === "in progress" ||
              status === "in-progress" ||
              status === "inprogress"
            ) {
              dotClass = "bg-pink-500";
            } else if (status === "blocked") {
              dotClass = "bg-purple-700";
            }

            return (
              <span
                key={`${task.id}-${index}`}
                className={`w-2 h-2 rounded-full ${dotClass} ring-1 ring-white shadow-sm`}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6 font-sans">
      {/* ======================================================
          CALENDAR STYLES
      ====================================================== */}
      <style>{`
        .task-calendar.react-calendar {
          width: 100% !important;
          max-width: 100% !important;
          background: transparent !important;
          border: none !important;
          font-family: inherit !important;
        }

        /* Navigation */
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
          color: #334155;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          background: #ffffff;
          border: 1px solid #e9d5ff;
        }

        .task-calendar
          .react-calendar__navigation
          button:enabled:hover {
          background: linear-gradient(
            to right,
            #9333ea,
            #ec4899
          );
          color: #ffffff;
          border-color: #9333ea;
          box-shadow: 0 4px 12px rgba(147, 51, 234, 0.25);
        }

        .task-calendar .react-calendar__navigation__label {
          background: #faf5ff !important;
          border: 1px solid #e9d5ff !important;
          font-size: 1rem !important;
          font-weight: 800 !important;
          color: #581c87 !important;
        }

        /* Weekday Headers */
        .task-calendar .react-calendar__month-view__weekdays {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr) !important;
          text-transform: uppercase;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #6b21a8;
          margin-bottom: 0;
          background: #faf5ff;
          border-top: 1px solid #e9d5ff;
          border-left: 1px solid #e9d5ff;
          border-right: 1px solid #e9d5ff;
          border-top-left-radius: 0.75rem;
          border-top-right-radius: 0.75rem;
        }

        .task-calendar
          .react-calendar__month-view__weekdays__weekday {
          padding: 0.75rem 0.25rem;
          text-align: center;
          border-right: 1px solid #e9d5ff;
          border-bottom: 2px solid #d8b4fe;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .task-calendar
          .react-calendar__month-view__weekdays__weekday:last-child {
          border-right: none;
        }

        .task-calendar
          .react-calendar__month-view__weekdays__weekday
          abbr {
          text-decoration: none;
        }

        /* Days Grid */
        .task-calendar .react-calendar__month-view__days {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr) !important;
          gap: 1px !important;
          background-color: #e9d5ff !important;
          border-left: 1px solid #e9d5ff !important;
          border-right: 1px solid #e9d5ff !important;
          border-bottom: 1px solid #e9d5ff !important;
          border-bottom-left-radius: 0.75rem;
          border-bottom-right-radius: 0.75rem;
          overflow: hidden;
        }

        /* Day Cells */
        .task-calendar .react-calendar__month-view__days__day {
          width: 100% !important;
          max-width: none !important;
          padding: 0.85rem 0.25rem !important;
          font-weight: 600;
          font-size: 0.875rem;
          color: #334155;
          background-color: #ffffff !important;
          border: none !important;
          border-radius: 0 !important;
          transition: all 0.15s ease-in-out;
        }

        /* Hover */
        .task-calendar .react-calendar__tile:enabled:hover,
        .task-calendar .react-calendar__tile:enabled:focus {
          background: #faf5ff !important;
          color: #7e22ce !important;
        }

        /* Today */
        .task-calendar .react-calendar__tile--now {
          background: #fdf4ff !important;
          color: #9333ea !important;
          font-weight: 800 !important;
        }

        /* Selected Date */
        .task-calendar .react-calendar__tile--active,
        .task-calendar
          .react-calendar__tile--active:enabled:hover,
        .task-calendar
          .react-calendar__tile--active:enabled:focus {
          background: linear-gradient(
            to right,
            #9333ea,
            #ec4899
          ) !important;
          color: #ffffff !important;
          font-weight: 800 !important;
        }

        .task-calendar
          .react-calendar__tile--active
          .ring-white {
          --tw-ring-color: #9333ea !important;
        }

        /* Neighboring Month */
        .task-calendar
          .react-calendar__month-view__days__day--neighboringMonth {
          background: #fafafa !important;
          color: #c4b5fd !important;
        }
      `}</style>

      {/* ======================================================
          CALENDAR CONTAINER
      ====================================================== */}
      <div className="w-full bg-white rounded-2xl shadow-sm border border-purple-100 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-purple-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-purple-200">
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
          <div className="flex items-center gap-3 bg-purple-50 border border-purple-100 px-3.5 py-2 rounded-xl text-xs font-semibold text-purple-800">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
              Completed
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
              In Progress
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
              To Do
            </span>
          </div>
        </div>

        {/* Calendar */}
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
      <div className="w-full bg-white rounded-2xl shadow-sm border border-purple-100 p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-purple-100">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100">
              Day Breakdown
            </span>

            <h3 className="text-lg font-bold text-slate-900 tracking-tight mt-1.5">
              Tasks for{" "}
              <span className="text-purple-600">
                {selectedDate.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </h3>
          </div>

          <span className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl text-xs font-bold tracking-wide shadow-sm">
            {selectedDateTasks.length}{" "}
            {selectedDateTasks.length === 1 ? "Task" : "Tasks"}
          </span>
        </div>

        {/* Empty State */}
        {selectedDateTasks.length === 0 && (
          <div className="text-center py-12 px-4 bg-purple-50/50 rounded-xl border border-dashed border-purple-200">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white border border-purple-100 text-purple-400 flex items-center justify-center shadow-sm">
              <svg
                className="w-6 h-6 text-purple-400"
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

            <p className="text-sm font-bold text-purple-900">
              No tasks scheduled for this date.
            </p>

            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Select another grid cell on the calendar to view its
              deadlined items.
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
                className={`group bg-white border border-purple-100 border-l-4 ${getStatusCardAccent(
                  status
                )} rounded-xl p-5 hover:shadow-lg hover:shadow-purple-500/5 hover:border-purple-200 transition-all duration-200`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-purple-600 transition-colors">
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
                        <div className="flex items-center gap-1.5 ml-auto text-xs font-semibold text-purple-800 bg-purple-50 px-3 py-1 rounded-lg border border-purple-100">
                          <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white text-[9px] font-bold flex items-center justify-center">
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

