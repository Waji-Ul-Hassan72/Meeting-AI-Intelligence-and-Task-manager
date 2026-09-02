
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getProjects } from "../services/api";

function MemberDashboard() {
  const navigate = useNavigate();

  // ============================================================
  // STATE
  // ============================================================

  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // ============================================================
  // GET CURRENT USER
  // ============================================================

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    } catch (error) {
      console.error("Invalid stored user:", error);

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("userName");

      navigate("/login");
    }
  }, [navigate]);

  // ============================================================
  // FETCH MEMBER PROJECTS
  // ============================================================

  const fetchProjects = async () => {
    const token =
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getProjects();

      /*
       * Backend may return:
       *
       * [
       *   { id, name, description }
       * ]
       *
       * OR:
       *
       * {
       *   projects: [...]
       * }
       */

      const projectList = Array.isArray(data)
        ? data
        : Array.isArray(data?.projects)
        ? data.projects
        : [];

      setProjects(projectList);
    } catch (error) {
      console.error(
        "Error fetching member projects:",
        error
      );

      /*
       * api.js handles 401 and removes authentication data.
       */

      if (
        error.message?.toLowerCase().includes("401") ||
        error.message
          ?.toLowerCase()
          .includes("unauthorized")
      ) {
        navigate("/login");
        return;
      }

      setErrorMessage(
        error.message ||
          "Unable to load your projects."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LOAD PROJECTS
  // ============================================================

  useEffect(() => {
    fetchProjects();
  }, []);

  // ============================================================
  // OPEN PROJECT
  // ============================================================

  const handleProjectClick = (projectId) => {
    if (!projectId) {
      setErrorMessage(
        "Unable to open this project."
      );
      return;
    }

    navigate(`/projects/${projectId}`);
  };

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userName");

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    navigate("/login");
  };

  // ============================================================
  // USER DISPLAY
  // ============================================================

  const userName =
    user?.name ||
    user?.username ||
    "Team Member";

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center">
        <div className="text-center">
          <div className="w-9 h-9 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />

          <p className="text-sm font-semibold text-slate-500">
            Loading your workspace...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-slate-900 font-sans">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-5 lg:px-8 sticky top-0 z-40">

        {/* LOGO */}

        <div className="flex items-center gap-3">

          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black">
            AI
          </div>

          <div>
            <h1 className="text-sm font-extrabold text-slate-900">
              Meeting Intelligence
            </h1>

            <p className="text-[10px] text-slate-400">
              Team Member Workspace
            </p>
          </div>

        </div>

        {/* NAVIGATION */}

        <nav className="hidden md:flex items-center gap-1">

          <button
            className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold"
          >
            Dashboard
          </button>

          <button
            onClick={() => navigate("/teams")}
            className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100 text-xs font-semibold transition"
          >
            Teams
          </button>

        </nav>

        {/* USER */}

        <div className="flex items-center gap-3">

          <div className="hidden sm:block text-right">

            <p className="text-xs font-bold text-slate-800">
              {userName}
            </p>

            <p className="text-[10px] text-slate-400">
              Team Member
            </p>

          </div>

          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">
            {userName
              .charAt(0)
              .toUpperCase()}
          </div>

          <button
            onClick={handleLogout}
            className="text-xs font-semibold text-slate-400 hover:text-red-600 transition"
          >
            Logout
          </button>

        </div>

      </header>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="max-w-7xl mx-auto px-5 lg:px-8 py-8">

        {/* PAGE HEADER */}

        <div className="mb-8">

          <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
            Team Member Dashboard
          </p>

          <h2 className="text-2xl font-extrabold text-slate-900">
            Good to see you,{" "}
            {userName.split(" ")[0]}
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            View your assigned projects, tasks,
            meetings and deadlines.
          </p>

        </div>

        {/* ======================================================
            ERROR MESSAGE
        ====================================================== */}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start justify-between gap-4">

            <span>
              {errorMessage}
            </span>

            <button
              onClick={() =>
                setErrorMessage("")
              }
              className="text-red-500 hover:text-red-700 font-bold"
            >
              ✕
            </button>

          </div>
        )}

        {/* ======================================================
            STATISTICS
        ====================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">

          {/* PROJECT COUNT */}

          <div className="bg-white border border-slate-200 rounded-2xl p-5">

            <div className="flex items-center justify-between mb-4">

              <span className="text-xs font-bold text-slate-500">
                Assigned Projects
              </span>

              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                ◈
              </span>

            </div>

            <p className="text-2xl font-extrabold text-slate-900">
              {projects.length}
            </p>

            <p className="text-[11px] text-slate-400 mt-1">
              Projects available to you
            </p>

          </div>

          {/* ACCESS */}

          <div className="bg-white border border-slate-200 rounded-2xl p-5">

            <div className="flex items-center justify-between mb-4">

              <span className="text-xs font-bold text-slate-500">
                Access Level
              </span>

              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                ✓
              </span>

            </div>

            <p className="text-lg font-extrabold text-slate-900">
              Team Member
            </p>

            <p className="text-[11px] text-slate-400 mt-1">
              View projects and manage assigned tasks
            </p>

          </div>

        </div>

        {/* ======================================================
            PROJECT SECTION
        ====================================================== */}

        <section>

          <div className="flex items-center justify-between mb-4">

            <div>

              <h3 className="text-base font-extrabold text-slate-900">
                My Projects
              </h3>

              <p className="text-xs text-slate-400 mt-1">
                Open a project to view your assigned
                work and team information.
              </p>

            </div>

            <span className="text-xs font-bold text-slate-400">
              {projects.length} project
              {projects.length !== 1
                ? "s"
                : ""}
            </span>

          </div>

          {/* ====================================================
              NO PROJECTS
          ==================================================== */}

          {projects.length === 0 ? (

            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">

              <div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl mb-4">
                ◈
              </div>

              <h4 className="font-bold text-slate-800">
                No projects assigned
              </h4>

              <p className="text-xs text-slate-400 mt-1">
                Projects assigned to you by a manager
                will appear here.
              </p>

            </div>

          ) : (

            /* ==================================================
               PROJECT GRID
            ================================================== */

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

              {projects.map((project) => {

                const projectName =
                  project.name ||
                  project.title ||
                  "Unnamed Project";

                const projectDescription =
                  project.description ||
                  "No project description available.";

                const projectStatus =
                  project.status ||
                  "Active";

                return (

                  <div
                    key={project.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-lg hover:shadow-slate-200/50 transition-all"
                  >

                    {/* PROJECT HEADER */}

                    <div className="flex items-start justify-between mb-5">

                      <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-extrabold">
                        {projectName
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          projectStatus
                            .toLowerCase() ===
                          "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {projectStatus}
                      </span>

                    </div>

                    {/* PROJECT CONTENT */}

                    <button
                      type="button"
                      onClick={() =>
                        handleProjectClick(
                          project.id
                        )
                      }
                      className="text-left w-full"
                    >

                      <h4 className="text-sm font-extrabold text-slate-900 hover:text-blue-700 transition">
                        {projectName}
                      </h4>

                      <p className="text-xs text-slate-500 mt-2 leading-5 line-clamp-3 min-h-[60px]">
                        {projectDescription}
                      </p>

                    </button>

                    {/* PROJECT FOOTER */}

                    <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100">

                      <button
                        type="button"
                        onClick={() =>
                          handleProjectClick(
                            project.id
                          )
                        }
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-900 text-white text-[10px] font-bold hover:bg-slate-800 transition"
                      >
                        Open Project
                      </button>

                      {/* IMPORTANT:
                          NO EDIT BUTTON
                          NO DELETE BUTTON
                          NO CREATE PROJECT BUTTON
                      */}

                    </div>

                  </div>

                );
              })}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default MemberDashboard;


