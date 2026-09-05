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

      // ========================================================
      // SEND TASK TO NODE BACKEND
      // ========================================================

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

            status:
              taskData.status || "Pending",

            due_date:
              taskData.due_date ||
              taskData.dueDate ||
              null,
          }),
        }
      );

      // ========================================================
      // READ RESPONSE SAFELY
      // ========================================================

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      // ========================================================
      // HANDLE BACKEND ERROR
      // ========================================================

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            data?.detail ||
            "Failed to assign task."
        );
      }

      // ========================================================
      // VALIDATE CREATED TASK
      // ========================================================

      if (!data?.task) {
        throw new Error(
          "Task assignment succeeded, but the created task was not returned."
        );
      }

      // ========================================================
      // CLEAR ERROR AFTER SUCCESS
      // ========================================================

      setTaskAssignmentError("");

      // ========================================================
      // NOTIFY PARENT PROJECT DETAILS COMPONENT
      // ========================================================

      if (typeof onTaskCreated === "function") {
        try {
          onTaskCreated(data.task);
        } catch (callbackError) {
          console.error(
            "onTaskCreated callback error:",
            callbackError
          );
        }
      }

      // ========================================================
      // GLOBAL EVENT
      //
      // This allows ProjectDetails to refresh its task list
      // without requiring a prop.
      // ========================================================

      window.dispatchEvent(
        new CustomEvent("ai-task-created", {
          detail: {
            task: data.task,
            assignedMember:
              data.assignedMember || null,
            emailSent:
              data.emailSent !== false,
          },
        })
      );

      return data;
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

    // ----------------------------------------------------------
    // Format 1:
    //
    // {
    //   action: "assign_task",
    //   task: {
    //      title: "...",
    //      assigned_to: "Ali"
    //   }
    // }
    // ----------------------------------------------------------

    if (
      result.action === "assign_task" &&
      result.task
    ) {
      return result.task;
    }

    // ----------------------------------------------------------
    // Format 2:
    //
    // {
    //   action: "assign_task",
    //   assign_task: {
    //      ...
    //   }
    // }
    // ----------------------------------------------------------

    if (
      result.action === "assign_task" &&
      result.assign_task
    ) {
      return result.assign_task;
    }

    // ----------------------------------------------------------
    // Format 3:
    //
    // {
    //   assign_task: {
    //      ...
    //   }
    // }
    // ----------------------------------------------------------

    if (result.assign_task) {
      return result.assign_task;
    }

    // ----------------------------------------------------------
    // Format 4:
    //
    // {
    //   assignTask: {
    //      ...
    //   }
    // }
    // ----------------------------------------------------------

    if (result.assignTask) {
      return result.assignTask;
    }

    // ----------------------------------------------------------
    // Format 5:
    //
    // {
    //   taskAssignment: {
    //      ...
    //   }
    // }
    // ----------------------------------------------------------

    if (result.taskAssignment) {
      return result.taskAssignment;
    }

    // ----------------------------------------------------------
    // Format 6:
    //
    // {
    //   task_assignment: {
    //      ...
    //   }
    // }
    // ----------------------------------------------------------

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

      // ========================================================
      // ADD USER QUESTION TO CHAT
      // ========================================================

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "user",
          content: trimmedQuestion,
        },
      ]);

      setQuestion("");

      // ========================================================
      // ASK AI
      // ========================================================

      const result = await askAIAssistant(
        projectId,
        trimmedQuestion
      );

      console.log(
        "AI Assistant response:",
        result
      );

      // ========================================================
      // TASK ASSIGNMENT
      // ========================================================

      const isAssignmentRequest =
        result?.action === "assign_task" ||
        Boolean(
          result?.assign_task ||
            result?.assignTask ||
            result?.taskAssignment ||
            result?.task_assignment
        );

      // --------------------------------------------------------
      // Assignment request detected but Python could not
      // extract a valid task.
      //
      // Example:
      //
      // "Assign a task"
      //
      // Python may return:
      //
      // {
      //   success: false,
      //   action: "assign_task",
      //   message: "Please specify..."
      // }
      // --------------------------------------------------------

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

      // --------------------------------------------------------
      // Valid assignment request
      // --------------------------------------------------------

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

        // --------------------------------------------------------
        // This was a task-assignment request.
        //
        // Do NOT process an email draft from the same response.
        // --------------------------------------------------------

        return;
      }

      // ========================================================
      // NORMAL AI RESPONSE
      // ========================================================

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "assistant",
          content:
            result?.answer ||
            "I could not generate an answer.",
        },
      ]);

      // ========================================================
      // EMAIL DRAFT
      // ========================================================

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

      // --------------------------------------------------------
      // Approve the draft first if it is still a draft
      // --------------------------------------------------------

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

      // --------------------------------------------------------
      // Email must be approved before sending
      // --------------------------------------------------------

      if (
        approvedDraft.status !==
        "approved"
      ) {
        throw new Error(
          "Email must be approved before sending."
        );
      }

      // --------------------------------------------------------
      // Send approved email
      // --------------------------------------------------------

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
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

      {/* ======================================================
          HEADER
      ======================================================= */}

      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
            AI
          </div>

          <div>

            <h2 className="text-sm font-extrabold text-slate-900">
              AI Project Assistant
            </h2>

            <p className="text-[11px] text-slate-500 mt-0.5">
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

              <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center text-lg font-bold mb-3">
                AI
              </div>

              <h3 className="text-sm font-bold text-slate-800">
                How can I help?
              </h3>

              <p className="text-xs text-slate-400 mt-1">
                Ask about project tasks, team members,
                assignments or send an email.
              </p>

              <div className="mt-4 space-y-2">

                <div className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600">
                  "How many tasks are pending?"
                </div>

                <div className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600">
                  "Which tasks are assigned to Ali?"
                </div>

                <div className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600">
                  "Assign login API task to Ali."
                </div>

                <div className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600">
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
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-xs leading-5 ${
                  message.role === "user"
                    ? "bg-slate-900 text-white rounded-br-md"
                    : "bg-slate-100 text-slate-700 rounded-bl-md"
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

            <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">

              <div className="flex items-center gap-1">

                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />

                <span
                  className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                  style={{
                    animationDelay:
                      "0.15s",
                  }}
                />

                <span
                  className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
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

          <div className="mt-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">

            <div className="flex items-center gap-2">

              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />

              <span className="text-xs text-blue-700 font-semibold">
                Creating task and sending assignment email...
              </span>

            </div>

          </div>

        )}

        {/* ====================================================
            TASK ASSIGNMENT ERROR
        ===================================================== */}

        {taskAssignmentError && (

          <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {taskAssignmentError}
          </div>

        )}

        {/* ====================================================
            EMAIL DRAFT
        ===================================================== */}

        {emailDraft && (

          <div className="mt-4 border border-teal-200 bg-teal-50 rounded-2xl p-4">

            {/* Email Header */}

            <div className="flex items-center justify-between mb-4">

              <div>

                <h3 className="text-sm font-bold text-slate-900">
                  Email Draft
                </h3>

                <p className="text-[11px] text-slate-500 mt-1">
                  Review the email before sending.
                </p>

              </div>

              <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-semibold text-slate-600">
                {emailDraft.status}
              </span>

            </div>

            {/* Email Error */}

            {emailError && (

              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                {emailError}
              </div>

            )}

            {/* Recipient Name */}

            <div className="mb-3">

              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
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
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-teal-500 disabled:bg-slate-100"
              />

            </div>

            {/* Recipient Email */}

            <div className="mb-3">

              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
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
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-teal-500 disabled:bg-slate-100"
              />

            </div>

            {/* Subject */}

            <div className="mb-3">

              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
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
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-teal-500 disabled:bg-slate-100"
              />

            </div>

            {/* Message */}

            <div className="mb-4">

              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
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
                rows={6}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-teal-500 resize-none disabled:bg-slate-100"
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
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
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
                  className="flex-1 px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 disabled:opacity-50"
                >
                  {emailLoading
                    ? "Approving..."
                    : "Approve Email"}
                </button>

                <button
                  type="button"
                  onClick={
                    handleSendEmail
                  }
                  disabled={emailLoading}
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                >
                  {emailLoading
                    ? "Sending..."
                    : "Send Email"}
                </button>

              </div>

            )}

            {/* Approved Actions */}

            {emailDraft.status ===
              "approved" && (

              <button
                type="button"
                onClick={
                  handleSendEmail
                }
                disabled={emailLoading}
                className="w-full px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50"
              >
                {emailLoading
                  ? "Sending..."
                  : "Send Email"}
              </button>

            )}

            {/* Sent Message */}

            {emailDraft.status ===
              "sent" && (

              <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs font-semibold text-green-700 text-center">
                Email sent successfully.
              </div>

            )}

          </div>

        )}

      </div>

      {/* ======================================================
          GENERAL ERROR
      ======================================================= */}

      {error && (

        <div className="mx-5 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
          {error}
        </div>

      )}

      {/* ======================================================
          INPUT
      ======================================================= */}

      <form
        onSubmit={handleAskAI}
        className="p-4 border-t border-slate-200"
      >

        <div className="flex items-center gap-2">

          <input
            type="text"
            value={question}
            onChange={(e) =>
              setQuestion(e.target.value)
            }
            placeholder="Ask about your project or email a member..."
            disabled={
              loading ||
              taskAssignmentLoading
            }
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-teal-500 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={
              loading ||
              taskAssignmentLoading ||
              !question.trim() ||
              !projectId
            }
            className="px-5 py-3 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? "Thinking..."
              : taskAssignmentLoading
              ? "Assigning..."
              : "Ask"}
          </button>

        </div>

      </form>

    </div>
  );
}    AIAssistant.jsx
