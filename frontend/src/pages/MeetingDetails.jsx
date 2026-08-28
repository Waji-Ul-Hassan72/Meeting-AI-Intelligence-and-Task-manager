import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

export default function MeetingDetails() {
  const navigate = useNavigate();
  const { id: meetingId } = useParams();

  const [meeting, setMeeting] = useState(null);
  const [project, setProject] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // FETCH MEETING + PROJECT
  // =====================================================

  useEffect(() => {
    const fetchMeetingAndProject = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        if (!meetingId) {
          setError("Meeting ID is missing.");
          return;
        }

        // =================================================
        // 1. FETCH MEETING
        // =================================================

        console.log("Fetching meeting:", meetingId);

        const meetingResponse = await fetch(
          `${API_URL}/api/meetings/${meetingId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const meetingData = await meetingResponse.json();

        console.log("MEETING RESPONSE:", meetingData);

        if (!meetingResponse.ok) {
          throw new Error(
            meetingData.error ||
              meetingData.message ||
              "Failed to fetch meeting."
          );
        }

        // Your backend returns the meeting directly
        // from getMeetingById()
        setMeeting(meetingData);

        // =================================================
        // 2. GET PROJECT ID FROM MEETING
        // =================================================

        const projectId = meetingData.project_id;

        console.log("PROJECT ID FROM MEETING:", projectId);

        if (!projectId) {
          throw new Error(
            "This meeting is not connected to a project."
          );
        }

        // =================================================
        // 3. FETCH PROJECT
        // =================================================

        console.log(
          "Fetching project:",
          `${API_URL}/api/projects/${projectId}`
        );

        const projectResponse = await fetch(
          `${API_URL}/api/projects/${projectId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const projectData = await projectResponse.json();

        console.log("PROJECT RESPONSE:", projectData);

        if (!projectResponse.ok) {
          throw new Error(
            projectData.error ||
              projectData.message ||
              "Project not found."
          );
        }

        setProject(projectData);
      } catch (err) {
        console.error(
          "❌ Error fetching meeting/project:",
          err
        );

        setError(
          err.message ||
            "Unable to load meeting details."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMeetingAndProject();
  }, [meetingId, navigate]);

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) return "Not specified";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleString();
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>

          <p className="text-sm font-semibold text-slate-600">
            Loading meeting...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
        <div className="w-full max-w-lg bg-white border border-red-200 rounded-2xl p-6 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xl mb-4">
            !
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Unable to Load Meeting
          </h2>

          <p className="text-sm text-red-600 mb-5">
            {error}
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800"
            >
              Try Again
            </button>

            <button
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex items-center justify-between mb-6">

          <div>
            <button
              onClick={() => navigate("/dashboard")}
              className="text-sm text-slate-500 hover:text-slate-900 mb-2"
            >
              ← Back to Dashboard
            </button>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Meeting Details
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              View meeting information and project details.
            </p>
          </div>

        </div>

        {/* =================================================
            MEETING INFORMATION
        ================================================= */}

        {meeting && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 mb-5">

            <div className="flex items-start justify-between gap-4 mb-6">

              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wide mb-3">
                  Meeting
                </span>

                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {meeting.title || "Untitled Meeting"}
                </h2>
              </div>

              <span
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                  meeting.status === "Completed"
                    ? "bg-green-100 text-green-700"
                    : meeting.status === "Cancelled"
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {meeting.status || "Scheduled"}
              </span>

            </div>

            {/* =================================================
                MEETING DETAILS GRID
            ================================================= */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">

              {/* Date */}

              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400 mb-1">
                  Meeting Date
                </p>

                <p className="text-sm font-semibold text-slate-800">
                  {formatDate(meeting.meeting_date)}
                </p>
              </div>

              {/* Duration */}

              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400 mb-1">
                  Duration
                </p>

                <p className="text-sm font-semibold text-slate-800">
                  {meeting.duration
                    ? `${meeting.duration} minutes`
                    : "Not specified"}
                </p>
              </div>

              {/* Location */}

              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400 mb-1">
                  Location
                </p>

                <p className="text-sm font-semibold text-slate-800">
                  {meeting.location || "Not specified"}
                </p>
              </div>

              {/* Project ID */}

              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400 mb-1">
                  Project ID
                </p>

                <p className="text-sm font-semibold text-slate-800">
                  {meeting.project_id || "Not available"}
                </p>
              </div>

            </div>

            {/* =================================================
                DESCRIPTION
            ================================================= */}

            <div className="mb-6">

              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Description
              </h3>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {meeting.description ||
                    "No description provided."}
                </p>
              </div>

            </div>

            {/* =================================================
                TRANSCRIPT
            ================================================= */}

            <div className="mb-6">

              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Meeting Transcript
              </h3>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 min-h-[120px]">
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {meeting.transcript ||
                    "No transcript available yet."}
                </p>
              </div>

            </div>

            {/* =================================================
                AI SUMMARY
            ================================================= */}

            <div>

              <div className="flex items-center gap-2 mb-2">

                <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center">
                  🤖
                </div>

                <h3 className="text-sm font-bold text-slate-900">
                  AI Meeting Summary
                </h3>

              </div>

              <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 min-h-[120px]">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {meeting.summary ||
                    "AI summary will appear here after meeting processing."}
                </p>
              </div>

            </div>

          </div>
        )}

        {/* =================================================
            PROJECT INFORMATION
        ================================================= */}

        {project && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">

            <div className="flex items-center gap-3 mb-5">

              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                📁
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
                  Related Project
                </p>

                <h2 className="text-lg font-bold text-slate-900">
                  {project.name ||
                    project.title ||
                    "Unnamed Project"}
                </h2>
              </div>

            </div>

            <div className="bg-slate-50 rounded-xl p-4">

              <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400 mb-1">
                Project Description
              </p>

              <p className="text-sm text-slate-600">
                {project.description ||
                  "No project description available."}
              </p>

            </div>

            <div className="mt-4">

              <button
                onClick={() =>
                  navigate(`/project/${project.id}`)
                }
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
              >
                View Project
              </button>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}