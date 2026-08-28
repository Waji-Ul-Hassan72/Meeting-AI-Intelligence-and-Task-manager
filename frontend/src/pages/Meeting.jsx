import React, { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

export default function Meeting() {
  const navigate = useNavigate();

  const { projectId: routeProjectId } = useParams();
  const [searchParams] = useSearchParams();

  const queryProjectId = searchParams.get("projectId");
  const projectId = routeProjectId || queryProjectId;

  // ==========================================
  // STATE
  // ==========================================
  const [project, setProject] = useState(null);
  const [loadingProject, setLoadingProject] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [location, setLocation] = useState("");

  const [loading, setLoading] = useState(false);

  // ==========================================
  // FETCH PROJECT
  // ==========================================
  useEffect(() => {
    const fetchProject = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Please log in first.");
        navigate("/login");
        return;
      }

      if (!projectId) {
        console.error("No project ID found.");
        alert("No project selected. Please create the meeting from a project.");
        setLoadingProject(false);
        return;
      }

      try {
        setLoadingProject(true);

        const response = await fetch(
          `${API_URL}/api/projects/${projectId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              data.message ||
              `Failed to fetch project (${response.status})`
          );
        }

        setProject(data);
      } catch (error) {
        console.error("Error fetching project:", error);
        alert(error.message || "Unable to load project information.");
      } finally {
        setLoadingProject(false);
      }
    };

    fetchProject();
  }, [projectId, navigate]);

  // ==========================================
  // CREATE MEETING
  // ==========================================
  const handleCreateMeeting = async (e) => {
    e.preventDefault();

    if (!projectId) {
      alert("No project selected. Please create the meeting from a project.");
      return;
    }

    if (!title.trim()) {
      alert("Meeting title is required.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please log in first.");
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      const meetingPayload = {
        title: title.trim(),
        description: description.trim(),
        meeting_date: meetingDate
          ? new Date(meetingDate).toISOString()
          : null,
        location: location.trim(),
        project_id: projectId,
      };

      const response = await fetch(
        `${API_URL}/api/meetings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(meetingPayload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Failed to create meeting."
        );
      }

      alert("Meeting created successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Create meeting error:", error);
      alert(
        error.message ||
          "Unable to create meeting. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/dashboard");
  };

  // ==========================================
  // LOADING PROJECT
  // ==========================================
  if (loadingProject) {
    return (
      <div className="fixed inset-0 z-[1000] bg-slate-900/45 backdrop-blur-sm flex justify-center items-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-[460px] p-6 shadow-2xl text-center">
          <div className="w-6 h-6 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-semibold text-slate-500">
            Loading project...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // NO PROJECT
  // ==========================================
  if (!projectId) {
    return (
      <div className="fixed inset-0 z-[1000] bg-slate-900/45 backdrop-blur-sm flex justify-center items-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-[460px] p-6 shadow-2xl text-center">
          <div className="text-2xl mb-3">📁</div>
          <h2 className="text-slate-900 text-lg font-bold mb-1">
            No Project Selected
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Please create a meeting from a project.
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="w-full py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN UI
  // ==========================================
  return (
    <div
      className="fixed inset-0 z-[1000] bg-slate-900/45 backdrop-blur-sm flex justify-center items-center p-4"
      onClick={handleCancel}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-[460px] max-h-[85vh] overflow-y-auto p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-slate-900 text-lg font-bold m-0">
            Create Meeting
          </h2>

          <button
            className="border-none bg-transparent text-slate-500 hover:text-slate-900 text-lg p-1 cursor-pointer"
            type="button"
            onClick={handleCancel}
          >
            ✕
          </button>
        </div>

        {/* Selected Project Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs">
            📁
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
              Project
            </span>
            <p className="text-xs font-semibold text-slate-900 truncate">
              {project?.name || project?.title || `Project #${projectId}`}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleCreateMeeting}>
          {/* Meeting Title */}
          <div className="mb-3.5">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Meeting Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Weekly Team Sync"
              className="w-full p-[9px_12px] bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs outline-none focus:bg-white focus:border-[#0d9488] focus:ring-3 focus:ring-[#0d9488]/15 transition-all box-border"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="mb-3.5">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              rows="3"
              placeholder="Add meeting agenda or notes..."
              className="w-full p-[9px_12px] bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs outline-none focus:bg-white focus:border-[#0d9488] focus:ring-3 focus:ring-[#0d9488]/15 transition-all box-border resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Meeting Date */}
          <div className="mb-3.5">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Meeting Date
            </label>
            <input
              type="datetime-local"
              className="w-full p-[9px_12px] bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs outline-none focus:bg-white focus:border-[#0d9488] focus:ring-3 focus:ring-[#0d9488]/15 transition-all box-border"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
            />
          </div>

          {/* Location */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Location
            </label>
            <input
              type="text"
              placeholder="e.g. Google Meet, Zoom, Office"
              className="w-full p-[9px_12px] bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs outline-none focus:bg-white focus:border-[#0d9488] focus:ring-3 focus:ring-[#0d9488]/15 transition-all box-border"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 mt-5">
            <button
              className="px-3.5 py-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
              type="button"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              className="px-3.5 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Meeting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}