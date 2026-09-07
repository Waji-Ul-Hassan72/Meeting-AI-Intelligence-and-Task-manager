import React, { useEffect, useState } from "react";
import { askAIAssistant } from "../services/api";

export default function AIAssistant({ projectId, onTaskCreated }) {
  const [question, setQuestion] = useState("");
  // ============================================================
  // PERSIST AI CHAT PER PROJECT
  // ============================================================

  const getChatStorageKey = () => {
    return `aiAssistantMessages_${projectId}`;
  };

  const [messages, setMessages] = useState(() => {
    if (!projectId) return [];

    try {
      const savedMessages = localStorage.getItem(
        `aiAssistantMessages_${projectId}`
      );

      if (!savedMessages) return [];

      const parsedMessages = JSON.parse(savedMessages);

      return Array.isArray(parsedMessages)
        ? parsedMessages
        : [];
    } catch (error) {
      console.error("Failed to restore AI chat:", error);
      return [];
    }
  });

  useEffect(() => {
    if (!projectId) return;

    try {
      localStorage.setItem(
        getChatStorageKey(),
        JSON.stringify(messages)
      );
    } catch (error) {
      console.error("Failed to save AI chat:", error);
    }
  }, [messages, projectId]);

  useEffect(() => {
    if (!projectId) {
      setMessages([]);
      return;
    }

    try {
      const savedMessages = localStorage.getItem(
        `aiAssistantMessages_${projectId}`
      );

      if (!savedMessages) {
        setMessages([]);
        return;
      }

      const parsedMessages = JSON.parse(savedMessages);

      setMessages(
        Array.isArray(parsedMessages)
          ? parsedMessages
          : []
      );
    } catch (error) {
      console.error("Failed to load project AI chat:", error);
      setMessages([]);
    }
  }, [projectId]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ============================================================
  // EMAIL STATES
  // ============================================================

  const [emailDraft, setEmailDraft] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  // ============================================================
  // TASK ASSIGNMENT STATES
  // ============================================================

  const [taskAssignmentLoading, setTaskAssignmentLoading] =
    useState(false);

  const [taskAssignmentError, setTaskAssignmentError] =
    useState("");

  // ============================================================
  // GET AUTH TOKEN
  // ============================================================

  const getToken = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("Authentication token not found.");
    }

    return token;
  };

  // ============================================================
  // NORMALIZE TASK STATUS
  // ============================================================

  const normalizeTaskStatus = (status) => {
    const value = String(status || "").trim().toLowerCase();

    if (
      value === "in progress" ||
      value === "in-progress" ||
      value === "in_progress" ||
      value === "progress"
    ) {
      return "In Progress";
    }

    if (
      value === "completed" ||
      value === "complete" ||
      value === "done"
    ) {
      return "Completed";
    }

    if (
      value === "pending" ||
      value === "to do" ||
      value === "todo" ||
      value === "to-do"
    ) {
      return "To Do";
    }

    if (value === "blocked") {
      return "Blocked";
    }

    if (status) {
      return String(status).trim();
    }

    return "To Do";
  };


  // ============================================================
  // ASSIGN TASK THROUGH BACKEND
  // ============================================================

  const assignTaskFromAI = async (taskData) => {
    try {
      setTaskAssignmentLoading(true);
      setTaskAssignmentError("");

      const token = getToken();

      if (!projectId) {
        throw new Error("Project ID is required.");
      }

      if (!taskData?.title?.trim()) {
        throw new Error("Task title is required.");
      }

      const assignedTo =
        taskData.assigned_to ||
        taskData.assignedTo ||
        taskData.member_name ||
        taskData.memberName ||
        taskData.recipientName ||
        "";

      if (!assignedTo.trim()) {
        throw new Error(
          "The team member to assign the task to was not specified."
        );
      }

      const response = await fetch(
        "http://localhost:3000/api/ai-tasks/assign",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            project_id: projectId,

            title: taskData.title.trim(),

            description:
              taskData.description || "",

            assigned_to: assignedTo.trim(),

            priority:
              taskData.priority || "Medium",

            status: normalizeTaskStatus(
              taskData.status || "To Do"
            ),

            due_date:
              taskData.due_date ||
              taskData.dueDate ||
              null,
          }),
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            data?.detail ||
            "Failed to assign task."
        );
      }

      if (!data?.task) {
        throw new Error(
          "Task assignment succeeded, but the created task was not returned."
        );
      }

      setTaskAssignmentError("");

      const createdTask = {
        ...data.task,
        status: normalizeTaskStatus(
          data.task?.status || taskData.status || "To Do"
        ),
      };

      if (typeof onTaskCreated === "function") {
        try {
          onTaskCreated(createdTask);
        } catch (callbackError) {
          console.error(
            "onTaskCreated callback error:",
            callbackError
          );
        }
      }

      window.dispatchEvent(
        new CustomEvent("ai-task-created", {
          detail: {
            task: createdTask,
            assignedMember:
              data.assignedMember || null,
            emailSent:
              data.emailSent !== false,
          },
        })
      );

      return {
        ...data,
        task: createdTask,
      };
    } catch (error) {
      console.error(
        "AI task assignment error:",
        error
      );

      setTaskAssignmentError(
        error?.message ||
          "Failed to assign task."
      );

      throw error;
    } finally {
      setTaskAssignmentLoading(false);
    }
  };

  // ============================================================
  // EXTRACT AI TASK ASSIGNMENT
  // ============================================================

  const getTaskAssignmentFromResult = (result) => {
    if (!result) {
      return null;
    }

    if (
      result.action === "assign_task" &&
      result.task
    ) {
      return result.task;
    }

    if (
      result.action === "assign_task" &&
      result.assign_task
    ) {
      return result.assign_task;
    }

    if (result.assign_task) {
      return result.assign_task;
    }

    if (result.assignTask) {
      return result.assignTask;
    }

    if (result.taskAssignment) {
      return result.taskAssignment;
    }

    if (result.task_assignment) {
      return result.task_assignment;
    }

    return null;
  };

  // ============================================================
  // ASK AI
  // ============================================================

  const handleAskAI = async (e) => {
    e.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      return;
    }

    if (!projectId) {
      setError("Please select a project first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setEmailError("");
      setTaskAssignmentError("");

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "user",
          content: trimmedQuestion,
        },
      ]);

      setQuestion("");

      const result = await askAIAssistant(
        projectId,
        trimmedQuestion
      );

      console.log(
        "AI Assistant response:",
        result
      );

      const isAssignmentRequest =
        result?.action === "assign_task" ||
        Boolean(
          result?.assign_task ||
            result?.assignTask ||
            result?.taskAssignment ||
            result?.task_assignment
        );

      if (
        isAssignmentRequest &&
        !getTaskAssignmentFromResult(result)
      ) {
        const assignmentMessage =
          result?.message ||
          result?.answer ||
          "Please provide the task and team member you want to assign it to.";

        setMessages((previousMessages) => [
          ...previousMessages,
          {
            role: "assistant",
            content: assignmentMessage,
          },
        ]);

        setTaskAssignmentError(
          result?.message || ""
        );

        return;
      }

      const taskAssignment =
        getTaskAssignmentFromResult(result);

      if (taskAssignment) {
        try {
          const assignmentResult =
            await assignTaskFromAI(
              taskAssignment
            );

          const assignedMember =
            assignmentResult?.assignedMember;

          const assignedMemberName =
            assignedMember?.name ||
            taskAssignment.assigned_to ||
            taskAssignment.assignedTo ||
            taskAssignment.member_name ||
            taskAssignment.memberName ||
            "the selected member";

          const emailWasSent =
            assignmentResult?.emailSent !== false;

          const taskTitle =
            assignmentResult?.task?.title ||
            taskAssignment.title ||
            "the task";

          let assignmentMessage =
            `Task "${taskTitle}" has been assigned to ${assignedMemberName}.`;

          if (emailWasSent) {
            assignmentMessage +=
              " The task assignment email was sent successfully.";
          } else {
            assignmentMessage +=
              " However, the task assignment email could not be sent.";
          }

          setMessages((previousMessages) => [
            ...previousMessages,
            {
              role: "assistant",
              content: assignmentMessage,
            },
          ]);

        } catch (assignmentError) {
          console.error(
            "Task assignment failed:",
            assignmentError
          );

          setMessages((previousMessages) => [
            ...previousMessages,
            {
              role: "assistant",
              content:
                assignmentError?.message ||
                "I understood the task assignment, but I could not create the task.",
            },
          ]);
        }

        return;
      }

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "assistant",
          content:
            result?.answer ||
            "I could not generate an answer.",
        },
      ]);

      const generatedEmail =
        result?.email ||
        result?.emailDraft ||
        result?.email_draft ||
        null;

      if (generatedEmail) {
        await createEmailDraft(
          generatedEmail
        );
      }

    } catch (error) {
      console.error(
        "AI assistant error:",
        error
      );

      setError(
        error?.message ||
          "Failed to communicate with AI assistant."
      );

    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CREATE EMAIL DRAFT
  // ============================================================

  const createEmailDraft = async (email) => {
    try {
      setEmailLoading(true);
      setEmailError("");

      const token = getToken();

      const recipientEmail =
        email?.recipientEmail ||
        email?.recipient_email ||
        "";

      if (!recipientEmail) {
        throw new Error(
          "The AI did not provide a recipient email."
        );
      }

      if (
        !email.subject ||
        !email.body
      ) {
        throw new Error(
          "The AI did not provide complete email information."
        );
      }

      const response = await fetch(
        "http://localhost:3000/api/email/draft",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            recipientName:
              email.recipientName ||
              email.recipient_name ||
              "",

            recipientEmail,

            subject:
              email.subject,

            body:
              email.body,
          }),
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            data?.detail ||
            "Failed to create email draft."
        );
      }

      setEmailDraft(data.draft);

    } catch (error) {
      console.error(
        "Create email draft error:",
        error
      );

      setEmailError(
        error?.message ||
          "Failed to create email draft."
      );

    } finally {
      setEmailLoading(false);
    }
  };

  // ============================================================
  // UPDATE EMAIL DRAFT
  // ============================================================

  const handleUpdateEmailDraft = async () => {
    if (!emailDraft) {
      return;
    }

    try {
      setEmailLoading(true);
      setEmailError("");

      const token = getToken();

      const response = await fetch(
        "http://localhost:3000/api/email/draft",
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            draft: emailDraft,

            recipientName:
              emailDraft?.to?.name || "",

            recipientEmail:
              emailDraft?.to?.email || "",

            subject:
              emailDraft?.subject || "",

            body:
              emailDraft?.body || "",
          }),
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            data?.detail ||
            "Failed to update email draft."
        );
      }

      setEmailDraft(data.draft);

    } catch (error) {
      console.error(
        "Update email draft error:",
        error
      );

      setEmailError(
        error?.message ||
          "Failed to update email draft."
      );

    } finally {
      setEmailLoading(false);
    }
  };

  // ============================================================
  // APPROVE EMAIL
  // ============================================================

  const handleApproveEmail = async () => {
    if (!emailDraft) {
      return;
    }

    try {
      setEmailLoading(true);
      setEmailError("");

      const token = getToken();

      const response = await fetch(
        "http://localhost:3000/api/email/draft/approve",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            draft: emailDraft,
          }),
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            data?.detail ||
            "Failed to approve email."
        );
      }

      setEmailDraft(data.draft);

    } catch (error) {
      console.error(
        "Approve email error:",
        error
      );

      setEmailError(
        error?.message ||
          "Failed to approve email."
      );

    } finally {
      setEmailLoading(false);
    }
  };

  // ============================================================
  // SEND EMAIL
  // ============================================================

  const handleSendEmail = async () => {
    if (!emailDraft) {
      return;
    }

    try {
      setEmailLoading(true);
      setEmailError("");

      const token = getToken();

      let approvedDraft = emailDraft;

      if (
        emailDraft.status === "draft"
      ) {
        const approveResponse =
          await fetch(
            "http://localhost:3000/api/email/draft/approve",
            {
              method: "POST",

              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },

              body: JSON.stringify({
                draft: emailDraft,
              }),
            }
          );

        let approveData = null;

        try {
          approveData =
            await approveResponse.json();
        } catch {
          approveData = null;
        }

        if (!approveResponse.ok) {
          throw new Error(
            approveData?.message ||
              approveData?.error ||
              approveData?.detail ||
              "Failed to approve email."
          );
        }

        approvedDraft =
          approveData.draft;

        setEmailDraft(
          approvedDraft
        );
      }

      if (
        approvedDraft.status !==
        "approved"
      ) {
        throw new Error(
          "Email must be approved before sending."
        );
      }

      const sendResponse =
        await fetch(
          "http://localhost:3000/api/email/send",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },

            body: JSON.stringify({
              draft: approvedDraft,
            }),
          }
        );

      let sendData = null;

      try {
        sendData =
          await sendResponse.json();
      } catch {
        sendData = null;
      }

      if (!sendResponse.ok) {
        throw new Error(
          sendData?.message ||
            sendData?.error ||
            sendData?.detail ||
            "Failed to send email."
        );
      }

      setEmailDraft(
        sendData?.result || {
          ...approvedDraft,
          status: "sent",
        }
      );

    } catch (error) {
      console.error(
        "Send email error:",
        error
      );

      setEmailError(
        error?.message ||
          "Failed to send email."
      );

    } finally {
      setEmailLoading(false);
    }
  };

  // ============================================================
  // UPDATE EMAIL FIELD
  // ============================================================

  const updateEmailField = (
    field,
    value
  ) => {
    setEmailDraft(
      (previousDraft) => {
        if (!previousDraft) {
          return previousDraft;
        }

        if (
          field ===
          "recipientName"
        ) {
          return {
            ...previousDraft,

            to: {
              ...previousDraft.to,
              name: value,
            },
          };
        }

        if (
          field ===
          "recipientEmail"
        ) {
          return {
            ...previousDraft,

            to: {
              ...previousDraft.to,
              email: value,
            },
          };
        }

        return {
          ...previousDraft,
          [field]: value,
        };
      }
    );
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="bg-white border border-purple-100 rounded-2xl shadow-sm overflow-hidden font-sans">

      {/* ======================================================
          HEADER
      ======================================================= */}

      <div className="px-5 py-4 border-b border-purple-100 bg-purple-50/50">

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center font-black shadow-sm">
            AI
          </div>

          <div>

            <h2 className="text-sm font-extrabold text-slate-900">
              AI Project Assistant
            </h2>

            <p className="text-[10px] text-purple-700 font-medium mt-0.5">
              Ask about your project, tasks, team or emails.
            </p>

          </div>

        </div>

      </div>

      {/* ======================================================
          CHAT AREA
      ======================================================= */}

      <div className="h-[360px] overflow-y-auto p-5 space-y-4">

        {/* Empty State */}

        {messages.length === 0 && (

          <div className="h-full flex items-center justify-center">

            <div className="text-center max-w-md">

              <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center text-sm font-black mb-3 shadow-sm">
                AI
              </div>

              <h3 className="text-sm font-bold text-slate-900">
                How can I help?
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                Ask about project tasks, team members,
                assignments or send an email.
              </p>

              <div className="mt-4 space-y-2">

                <div className="text-xs bg-purple-50/50 border border-purple-200 rounded-xl px-3 py-2 text-slate-700 font-medium">
                  "How many tasks are pending?"
                </div>

                <div className="text-xs bg-purple-50/50 border border-purple-200 rounded-xl px-3 py-2 text-slate-700 font-medium">
                  "Which tasks are assigned to Ali?"
                </div>

                <div className="text-xs bg-purple-50/50 border border-purple-200 rounded-xl px-3 py-2 text-slate-700 font-medium">
                  "Assign login API task to Ali."
                </div>

                <div className="text-xs bg-purple-50/50 border border-purple-200 rounded-xl px-3 py-2 text-slate-700 font-medium">
                  "Send an email to Ali about his task."
                </div>

              </div>

            </div>

          </div>

        )}

        {/* Messages */}

        {messages.map(
          (message, index) => (

            <div
              key={index}
              className={`flex ${
                message.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >

              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                  message.role === "user"
                    ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-br-sm shadow-sm"
                    : "bg-purple-50/60 border border-purple-100 text-slate-800 rounded-bl-sm font-medium"
                }`}
              >
                {message.content}
              </div>

            </div>

          )
        )}

        {/* AI Loading */}

        {loading && (

          <div className="flex justify-start">

            <div className="bg-purple-50 border border-purple-100 rounded-2xl rounded-bl-sm px-4 py-3">

              <div className="flex items-center gap-1.5">

                <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" />

                <span
                  className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce"
                  style={{
                    animationDelay:
                      "0.15s",
                  }}
                />

                <span
                  className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce"
                  style={{
                    animationDelay:
                      "0.3s",
                  }}
                />

              </div>

            </div>

          </div>

        )}

        {/* ====================================================
            TASK ASSIGNMENT LOADING
        ===================================================== */}

        {taskAssignmentLoading && (

          <div className="mt-3 px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl">

            <div className="flex items-center gap-2">

              <div className="w-3 h-3 border-2 border-purple-400 border-t-purple-700 rounded-full animate-spin" />

              <span className="text-xs text-purple-700 font-semibold">
                Creating task and sending assignment email...
              </span>

            </div>

          </div>

        )}

        {/* ====================================================
            TASK ASSIGNMENT ERROR
        ===================================================== */}

        {taskAssignmentError && (

          <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-800">
            {taskAssignmentError}
          </div>

        )}

        {/* ====================================================
            EMAIL DRAFT
        ===================================================== */}

        {emailDraft && (

          <div className="mt-4 border border-purple-200 bg-purple-50/40 rounded-2xl p-4 shadow-sm">

            {/* Email Header */}

            <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-100">

              <div>

                <h3 className="text-xs font-extrabold text-slate-900">
                  Email Draft
                </h3>

                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                  Review the email before sending.
                </p>

              </div>

              <span className="px-2.5 py-1 rounded-full bg-white border border-purple-200 text-[10px] font-bold text-purple-700">
                {emailDraft.status}
              </span>

            </div>

            {/* Email Error */}

            {emailError && (

              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-800">
                {emailError}
              </div>

            )}

            {/* Recipient Name */}

            <div className="mb-3">

              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Recipient Name
              </label>

              <input
                type="text"
                value={
                  emailDraft?.to?.name ||
                  ""
                }
                onChange={(e) =>
                  updateEmailField(
                    "recipientName",
                    e.target.value
                  )
                }
                disabled={
                  emailLoading ||
                  emailDraft.status !==
                    "draft"
                }
                className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 disabled:bg-slate-100 transition"
              />

            </div>

            {/* Recipient Email */}

            <div className="mb-3">

              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Recipient Email
              </label>

              <input
                type="email"
                value={
                  emailDraft?.to?.email ||
                  ""
                }
                onChange={(e) =>
                  updateEmailField(
                    "recipientEmail",
                    e.target.value
                  )
                }
                disabled={
                  emailLoading ||
                  emailDraft.status !==
                    "draft"
                }
                className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 disabled:bg-slate-100 transition"
              />

            </div>

            {/* Subject */}

            <div className="mb-3">

              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Subject
              </label>

              <input
                type="text"
                value={
                  emailDraft?.subject ||
                  ""
                }
                onChange={(e) =>
                  updateEmailField(
                    "subject",
                    e.target.value
                  )
                }
                disabled={
                  emailLoading ||
                  emailDraft.status !==
                    "draft"
                }
                className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 disabled:bg-slate-100 transition"
              />

            </div>

            {/* Message */}

            <div className="mb-4">

              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Message
              </label>

              <textarea
                value={
                  emailDraft?.body ||
                  ""
                }
                onChange={(e) =>
                  updateEmailField(
                    "body",
                    e.target.value
                  )
                }
                disabled={
                  emailLoading ||
                  emailDraft.status !==
                    "draft"
                }
                rows={5}
                className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 resize-none disabled:bg-slate-100 transition"
              />

            </div>

            {/* Draft Actions */}

            {emailDraft.status ===
              "draft" && (

              <div className="flex gap-2">

                <button
                  type="button"
                  onClick={
                    handleUpdateEmailDraft
                  }
                  disabled={emailLoading}
                  className="flex-1 px-3 py-2.5 bg-white border border-purple-200 text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-50 disabled:opacity-50 transition shadow-sm"
                >
                  {emailLoading
                    ? "Updating..."
                    : "Update Draft"}
                </button>

                <button
                  type="button"
                  onClick={
                    handleApproveEmail
                  }
                  disabled={emailLoading}
                  className="flex-1 px-3 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50 transition shadow-md shadow-purple-500/20"
                >
                  {emailLoading
                    ? "Approving..."
                    : "Approve Email"}
                </button>

              </div>

            )}

            {emailDraft.status ===
              "approved" && (

              <div className="flex gap-2">

                <button
                  type="button"
                  onClick={
                    handleSendEmail
                  }
                  disabled={emailLoading}
                  className="w-full px-3 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50 transition shadow-md shadow-purple-500/20"
                >
                  {emailLoading
                    ? "Sending..."
                    : "Send Email"}
                </button>

              </div>

            )}

          </div>

        )}

        {/* Global Error */}

        {error && (

          <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-800">
            {error}
          </div>

        )}

      </div>

      {/* ======================================================
          INPUT BAR
      ======================================================= */}

      <div className="p-4 border-t border-purple-100 bg-purple-50/30">

        <form
          onSubmit={handleAskAI}
          className="flex items-center gap-2"
        >

          <input
            type="text"
            value={question}
            onChange={(e) =>
              setQuestion(e.target.value)
            }
            placeholder="Ask AI assistant or assign task..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 disabled:opacity-50 transition shadow-sm"
          />

          <button
            type="submit"
            disabled={
              loading || !question.trim()
            }
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50 transition shadow-md shadow-purple-500/20 shrink-0"
          >
            {loading ? "Thinking..." : "Ask AI"}
          </button>

        </form>

      </div>

    </div>
  );
}