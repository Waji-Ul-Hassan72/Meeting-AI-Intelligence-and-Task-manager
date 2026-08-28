import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

function Project() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Create project
  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorMessage("");

    const title = formData.title.trim();
    const description = formData.description.trim();

    // Frontend validation
    if (!title) {
      setErrorMessage("Project title is required.");
      return;
    }

    if (!description) {
      setErrorMessage("Project description is required.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setErrorMessage("Your session has expired. Please log in again.");
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
        }),
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("userName");

          navigate("/login");
          return;
        }

        setErrorMessage(
          data.message ||
            data.error ||
            "Failed to create project. Please try again."
        );

        return;
      }

      // Project created successfully
      navigate("/projects");
    } catch (error) {
      console.error("Error creating project:", error);

      setErrorMessage(
        "Unable to connect to the server. Make sure your backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/projects");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[500px] bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className="inline-block px-2.5 py-1 mb-2 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-[11px] font-bold uppercase tracking-wider">
              New Project
            </span>

            <h1 className="text-2xl font-bold text-slate-900">
              Create Project
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Add a new project to your workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCancel}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Project Title */}
          <div>
            <label
              htmlFor="project-title"
              className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide"
            >
              Project Title *
            </label>

            <input
              id="project-title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. AI Meeting Intelligence Platform"
              maxLength={100}
              required
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
            />

            <p className="text-[10px] text-slate-400 mt-1.5 text-right">
              {formData.title.length}/100
            </p>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="project-description"
              className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide"
            >
              Description *
            </label>

            <textarea
              id="project-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the project goals, requirements, or purpose..."
              rows={5}
              maxLength={500}
              required
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 resize-y"
            />

            <p className="text-[10px] text-slate-400 mt-1.5 text-right">
              {formData.description.length}/500
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="w-full sm:flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Project..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Project;