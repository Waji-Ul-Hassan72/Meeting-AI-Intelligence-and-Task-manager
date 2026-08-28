
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

function MemberDashboard() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch(`${API_URL}/api/projects`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userName");

        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Failed to load projects."
        );
      }

      const projectList = Array.isArray(data)
        ? data
        : data.projects || [];

      setProjects(projectList);
    } catch (error) {
      console.error("Error fetching projects:", error);

      setErrorMessage(
        error.message || "Unable to load your projects."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userName");

    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Member Dashboard
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Welcome back, {user.name || "Team Member"}
            </p>
          </div>

          <div className="flex items-center gap-3">

            <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold">
              Developer / Team Member
            </span>

            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>

          </div>

        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Heading */}
        <div className="mb-8">

          <h2 className="text-2xl font-bold text-slate-900">
            My Projects
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            View your projects, assigned tasks, meetings and deadlines.
          </p>

        </div>

        {/* Error */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        {/* Loading */}
        {loading ? (

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-48 bg-white rounded-2xl border border-slate-200 animate-pulse"
              />
            ))}

          </div>

        ) : projects.length === 0 ? (

          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">

            <div className="text-4xl mb-4">
              📁
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              No projects assigned
            </h3>

            <p className="text-sm text-slate-500 mt-2">
              Projects assigned to you will appear here.
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

            {projects.map((project) => (

              <button
                key={project.id}
                type="button"
                onClick={() => handleProjectClick(project.id)}
                className="text-left bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all group"
              >

                <div className="flex items-start justify-between mb-5">

                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl">
                    📁
                  </div>

                  <span className="text-xs font-semibold text-slate-400 group-hover:text-blue-600">
                    Open →
                  </span>

                </div>

                {/* IMPORTANT:
                    Backend projects table uses "name".
                    Keep title as fallback in case an older
                    response still contains title.
                */}
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition">
                  {project.name ||
                    project.title ||
                    "Unnamed Project"}
                </h3>

                <p className="text-sm text-slate-500 mt-2 line-clamp-3">
                  {project.description ||
                    "No project description available."}
                </p>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">

                  <span className="text-xs text-slate-400">
                    Assigned project
                  </span>

                  <span className="text-xs font-semibold text-blue-600">
                    View project
                  </span>

                </div>

              </button>

            ))}

          </div>

        )}

      </main>

    </div>
  );
}

export default MemberDashboard;

