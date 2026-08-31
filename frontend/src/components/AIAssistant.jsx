import React, { useState } from "react";
import { askAIAssistant } from "../services/api";

export default function AIAssistant({
  projectId,
}) {
  const [question, setQuestion] = useState("");

  const [messages, setMessages] = useState([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  // ==========================================================
  // ASK AI
  // ==========================================================

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

      // ------------------------------------------------------
      // ADD USER MESSAGE
      // ------------------------------------------------------

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "user",
          content: trimmedQuestion,
        },
      ]);

      setQuestion("");

      // ------------------------------------------------------
      // CALL PYTHON AI SERVICE
      // ------------------------------------------------------

      const result = await askAIAssistant(
        projectId,
        trimmedQuestion
      );

      // ------------------------------------------------------
      // ADD AI RESPONSE
      // ------------------------------------------------------

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "assistant",
          content:
            result?.answer ||
            "I could not generate an answer.",
        },
      ]);
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

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

      {/* ======================================================
          HEADER
      ====================================================== */}

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
              Ask about your project, tasks and team.
            </p>

          </div>

        </div>

      </div>

      {/* ======================================================
          CHAT AREA
      ====================================================== */}

      <div className="h-[360px] overflow-y-auto p-5 space-y-4">

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
                Ask me about project tasks, team members,
                assignments or workload.
              </p>

              <div className="mt-4 space-y-2">

                <div className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600">
                  "How many tasks are pending?"
                </div>

                <div className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600">
                  "Which tasks are assigned to Ali?"
                </div>

                <div className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600">
                  "Who is free right now?"
                </div>

              </div>

            </div>

          </div>
        )}

        {messages.map((message, index) => (
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
        ))}

        {/* ====================================================
            LOADING
        ==================================================== */}

        {loading && (
          <div className="flex justify-start">

            <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">

              <div className="flex items-center gap-1">

                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />

                <span
                  className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                  style={{
                    animationDelay: "0.15s",
                  }}
                />

                <span
                  className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                  style={{
                    animationDelay: "0.3s",
                  }}
                />

              </div>

            </div>

          </div>
        )}

      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="mx-5 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
          {error}
        </div>
      )}

      {/* ======================================================
          INPUT
      ====================================================== */}

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
            placeholder="Ask about your project..."
            disabled={loading}
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-teal-500 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={
              loading ||
              !question.trim() ||
              !projectId
            }
            className="px-5 py-3 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Thinking..." : "Ask"}
          </button>

        </div>

      </form>

    </div>
  );
}