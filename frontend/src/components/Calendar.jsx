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

    // PostgreSQL DATE:
    // "2026-09-07"
    //
    // PostgreSQL timestamp:
    // "2026-09-07T00:00:00.000Z"
    //
    // Both become:
    // "2026-09-07"

    if (typeof date === "string") {
      const match = date.match(/^(\d{4}-\d{2}-\d{2})/);

      if (match) {
        return match[1];
      }
    }

    const parsedDate =
      date instanceof Date ? date : new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }

    const year = parsedDate.getFullYear();

    const month = String(
      parsedDate.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      parsedDate.getDate()
    ).padStart(2, "0");

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

      if (!dueDate) {
        return false;
      }

      return (
        formatDate(dueDate) === selectedDateString
      );
    });
  }, [tasks, selectedDateString]);

  // ============================================================
  // GET STATUS
  // ============================================================
  const getStatus = (task) => {
    return (
      task.status ||
      task.task_status ||
      task.taskStatus ||
      "To Do"
    );
  };

  // ============================================================
  // GET PRIORITY
  // ============================================================
  const getPriority = (task) => {
    return task.priority || "Medium";
  };

  // ============================================================
  // STATUS CLASS
  // ============================================================
  const getStatusClass = (status) => {
    const normalized = String(status)
      .trim()
      .toLowerCase();

    if (normalized === "completed") {
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
    }

    if (
      normalized === "in progress" ||
      normalized === "in-progress" ||
      normalized === "inprogress"
    ) {
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-600/20";
    }

    if (normalized === "blocked") {
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20";
    }

    return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
  };

  // ============================================================
  // PRIORITY CLASS
  // ============================================================
  const getPriorityClass = (priority) => {
    const normalized = String(priority)
      .trim()
      .toLowerCase();

    if (normalized === "high") {
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20";
    }

    if (normalized === "medium") {
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
    }

    return "bg-slate-100 text-slate-600 ring-1 ring-slate-500/10";
  };

  // ============================================================
  // CALENDAR TILE CONTENT
  // ============================================================
  const tileContent = ({ date, view }) => {
    if (view !== "month") {
      return null;
    }

    const dateString = formatDate(date);

    const dateTasks = tasks.filter((task) => {
      const dueDate = getTaskDueDate(task);

      if (!dueDate) {
        return false;
      }

      return formatDate(dueDate) === dateString;
    });

    if (dateTasks.length === 0) {
      return null;
    }

    return (
      <div className="flex justify-center mt-1.5">
        <div className="flex items-center gap-1">
          {dateTasks
            .slice(0, 3)
            .map((task, index) => {
              const status = String(
                getStatus(task)
              )
                .trim()
                .toLowerCase();

              let dotClass = "bg-amber-400";

              if (status === "completed") {
                dotClass = "bg-emerald-500";
              } else if (
                status === "in progress" ||
                status === "in-progress" ||
                status === "inprogress"
              ) {
                dotClass = "bg-sky-500";
              } else if (status === "blocked") {
                dotClass = "bg-rose-500";
              }

              return (
                <span
                  key={`${task.id}-${index}`}
                  className={`w-1.5 h-1.5 rounded-full ${dotClass} ring-2 ring-white`}
                />
              );
            })}
        </div>
      </div>
    );
  };

  // ============================================================
  // RETURN
  // ============================================================
  return (
    <div className="w-full space-y-6">

      {/* Embedded Modern Calendar Overrides */}
      <style>{`
        .task-calendar.react-calendar {
          width: 100% !important;
          max-width: 100% !important;
          background: transparent !important;
          border: none !important;
          font-family: inherit !important;
        }
        .task-calendar .react-calendar__navigation {
          display: flex;
          align-items: center;
          margin-bottom: 1.5rem;
          height: auto;
        }
        .task-calendar .react-calendar__navigation button {
          min-width: 36px;
          height: 36px;
          background: transparent;
          border-radius: 0.75rem;
          font-weight: 600;
          color: #1e293b;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }
        .task-calendar .react-calendar__navigation button:enabled:hover,
        .task-calendar .react-calendar__navigation button:enabled:focus {
          background-color: #f1f5f9;
        }
        .task-calendar .react-calendar__navigation__label {
          font-weight: 700 !important;
          font-size: 1rem !important;
          color: #0f172a !important;
        }
        .task-calendar .react-calendar__month-view__weekdays {
          text-transform: uppercase;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #94a3b8;
          margin-bottom: 0.5rem;
        }
        .task-calendar .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none;
        }
        .task-calendar .react-calendar__month-view__days__day {
          padding: 0.625rem 0.25rem;
          font-weight: 500;
          font-size: 0.875rem;
          color: #334155;
          border-radius: 0.875rem;
          transition: all 0.15s ease;
        }
        .task-calendar .react-calendar__tile:enabled:hover,
        .task-calendar .react-calendar__tile:enabled:focus {
          background-color: #f1f5f9;
          color: #0f172a;
        }
        .task-calendar .react-calendar__tile--now {
          background: #f8fafc !important;
          color: #0d9488 !important;
          font-weight: 700 !important;
          border: 1px solid #ccfbf1 !important;
        }
        .task-calendar .react-calendar__tile--active,
        .task-calendar .react-calendar__tile--active:enabled:hover,
        .task-calendar .react-calendar__tile--active:enabled:focus {
          background: #0f172a !important;
          color: #ffffff !important;
          font-weight: 600 !important;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
        }
        .task-calendar .react-calendar__month-view__days__day--neighboringMonth {
          color: #cbd5e1 !important;
        }
      `}</style>

      {/* ======================================================
          CALENDAR SECTION
      ====================================================== */}
      <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 transition-all">

        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Task Calendar
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select a date to view tasks due on that day.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Done
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span> In Progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> To Do
            </span>
          </div>
        </div>

        {/* Full-width calendar wrapper */}
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
          SELECTED DATE DETAILS
      ====================================================== */}
      <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 transition-all">

        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">

          <div>
            <h3 className="text-base font-bold text-slate-900">
              Tasks for{" "}
              <span className="text-teal-600">
                {selectedDate.toLocaleDateString(
                  "en-US",
                  {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }
                )}
              </span>
            </h3>

            <p className="text-xs text-slate-500 mt-0.5">
              Scheduled task overview and assignment status
            </p>
          </div>

          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold tracking-wide">
            {selectedDateTasks.length}{" "}
            {selectedDateTasks.length === 1 ? "Task" : "Tasks"}
          </span>

        </div>

        {/* ====================================================
            NO TASKS EMPTY STATE
        ==================================================== */}
        {selectedDateTasks.length === 0 && (
          <div className="text-center py-12 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">

            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center text-xl shadow-xs">
              📅
            </div>

            <p className="text-sm font-bold text-slate-800">
              No tasks due on this date
            </p>

            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Select another day on the calendar above to check for upcoming deadlines.
            </p>

          </div>
        )}

        {/* ====================================================
            TASKS LIST
        ==================================================== */}
        <div className="space-y-3">

          {selectedDateTasks.map((task) => {

            const status = getStatus(task);
            const priority = getPriority(task);

            return (
              <div
                key={task.id}
                className="group relative bg-white border border-slate-200/80 hover:border-teal-500/40 rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:shadow-md hover:shadow-slate-100"
              >

                <div className="flex items-start justify-between gap-4">

                  <div className="flex-1 min-w-0">

                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-teal-600 transition-colors">
                      {task.name ||
                        task.title ||
                        "Untitled Task"}
                    </h4>

                    {task.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3.5">

                      {/* Status */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${getStatusClass(
                          status
                        )}`}
                      >
                        {status}
                      </span>

                      {/* Priority */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${getPriorityClass(
                          priority
                        )}`}
                      >
                        {priority} Priority
                      </span>

                      {/* Assigned User */}
                      {(
                        task.assigned_to_name ||
                        task.assignedToName ||
                        task.assignee_name ||
                        task.assigned_to
                      ) && (
                        <div className="flex items-center gap-1.5 ml-auto text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                          <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 flex items-center justify-center">
                            {(
                              task.assigned_to_name ||
                              task.assignedToName ||
                              task.assignee_name ||
                              task.assigned_to
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                          <span>
                            {task.assigned_to_name ||
                              task.assignedToName ||
                              task.assignee_name ||
                              task.assigned_to}
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