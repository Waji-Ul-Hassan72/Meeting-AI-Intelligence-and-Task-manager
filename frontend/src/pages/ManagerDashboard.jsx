import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../services/api";

function ManagerDashboard() {
  const navigate = useNavigate();

  // ============================================================
  // STATE
  // ============================================================

  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);

  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
  });

  const [editingProject, setEditingProject] = useState(null);

  const [creatingProject, setCreatingProject] = useState(false);
  const [updatingProject, setUpdatingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState(null);

  // ============================================================
  // AUTO-HIDE SUCCESS MESSAGE
  // ============================================================

  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [successMessage]);

  // ============================================================
  // GET CURRENT USER
  // ============================================================

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!storedUser || !token) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    } catch (error) {
      console.error("Invalid stored user:", error);

      localStorage.removeItem("user");
      localStorage.removeItem("token");

      navigate("/login");
    }
  }, [navigate]);

  // ============================================================
  // NORMALIZE PROJECT RESPONSE
  // ============================================================

  const normalizeProjects = (data) => {
    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.projects)) {
      return data.projects;
    }

    if (Array.isArray(data?.data)) {
      return data.data;
    }

    if (Array.isArray(data?.projects?.rows)) {
      return data.projects.rows;
    }

    if (Array.isArray(data?.rows)) {
      return data.rows;
    }

    return [];
  };

  // ============================================================
  // FETCH PROJECTS
  // ============================================================

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getProjects();
      console.log("Manager projects response:", data);

      const projectList = normalizeProjects(data);
      console.log("Manager projects:", projectList);

      setProjects(projectList);
    } catch (error) {
      console.error("Fetch manager projects error:", error);

      if (
        error.message?.toLowerCase().includes("unauthorized") ||
        error.message?.toLowerCase().includes("token") ||
        error.message?.toLowerCase().includes("authentication")
      ) {
        navigate("/login");
        return;
      }

      setErrorMessage(
        error.message || "Unable to load manager projects."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LOAD PROJECTS
  // ============================================================

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    fetchProjects();
  }, [navigate]);

  // ============================================================
  // CLEAR MESSAGES
  // ============================================================

  const clearMessages = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  // ============================================================
  // CREATE PROJECT
  // ============================================================

  const handleCreateProject = async (e) => {
    e.preventDefault();

    const name = projectForm.name.trim();
    const description = projectForm.description.trim();

    if (!name) {
      setErrorMessage("Project name is required.");
      return;
    }

    if (!description) {
      setErrorMessage("Project description is required.");
      return;
    }

    try {
      setCreatingProject(true);
      clearMessages();

      const data = await createProject({
        name,
        description,
        status: "Active",
      });

      console.log("Create project response:", data);

      const createdProject = data?.project || data?.data || data;

      if (createdProject?.id) {
        setProjects((prev) => [createdProject, ...prev]);
      } else {
        await fetchProjects();
      }

      setProjectForm({
        name: "",
        description: "",
      });

      setShowCreateProject(false);
      setSuccessMessage("Project created successfully.");
    } catch (error) {
      console.error("Create project error:", error);
      setErrorMessage(error.message || "Failed to create project.");
    } finally {
      setCreatingProject(false);
    }
  };

  // ============================================================
  // OPEN EDIT PROJECT
  // ============================================================

  const openEditProject = (project) => {
    clearMessages();
    setEditingProject(project);

    setProjectForm({
      name: project.name || project.title || "",
      description: project.description || "",
    });

    setShowEditProject(true);
  };

  // ============================================================
  // UPDATE PROJECT
  // ============================================================

  const handleUpdateProject = async (e) => {
    e.preventDefault();

    if (!editingProject?.id) {
      setErrorMessage("Project ID is missing.");
      return;
    }

    const name = projectForm.name.trim();
    const description = projectForm.description.trim();

    if (!name) {
      setErrorMessage("Project name is required.");
      return;
    }

    if (!description) {
      setErrorMessage("Project description is required.");
      return;
    }

    try {
      setUpdatingProject(true);
      clearMessages();

      const data = await updateProject(editingProject.id, {
        name,
        description,
      });

      console.log("Update project response:", data);

      const updatedProject = data?.project || data?.data || data;

      setProjects((prev) =>
        prev.map((project) =>
          String(project.id) === String(editingProject.id)
            ? {
                ...project,
                ...(updatedProject || {}),
                name,
                description,
              }
            : project
        )
      );

      setShowEditProject(false);
      setEditingProject(null);

      setProjectForm({
        name: "",
        description: "",
      });

      setSuccessMessage("Project updated successfully.");
    } catch (error) {
      console.error("Update project error:", error);
      setErrorMessage(error.message || "Failed to update project.");
    } finally {
      setUpdatingProject(false);
    }
  };

  // ============================================================
  // DELETE PROJECT
  // ============================================================

  const handleDeleteProject = async (project) => {
    if (!project?.id) {
      setErrorMessage("Project ID is missing.");
      return;
    }

    const projectName =
      project.name || project.title || "this project";

    const confirmed = window.confirm(
      `Are you sure you want to delete "${projectName}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingProjectId(project.id);
      clearMessages();

      await deleteProject(project.id);

      setProjects((prev) =>
        prev.filter((item) => String(item.id) !== String(project.id))
      );

      setSuccessMessage(`"${projectName}" deleted successfully.`);
    } catch (error) {
      console.error("Delete project error:", error);
      setErrorMessage(error.message || "Failed to delete project.");
    } finally {
      setDeletingProjectId(null);
    }
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

    Object.keys(localStorage)
      .filter((key) => key.startsWith("aiAssistantMessages_"))
      .forEach((key) => {
        localStorage.removeItem(key);
      });

    navigate("/login");
  };

  // ============================================================
  // OPEN PROJECT
  // ============================================================

  const openProject = (projectId) => {
    if (!projectId) return;
    navigate(`/projects/${projectId}`);
  };

  // ============================================================
  // CREATE PROJECT MODAL
  // ============================================================

  const openCreateProject = () => {
    clearMessages();
    setProjectForm({
      name: "",
      description: "",
    });
    setShowCreateProject(true);
  };

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-purple-900">
            Loading manager workspace...
          </p>
        </div>
      </div>
    );
  }

  // Active projects counter helper
  const activeProjectsCount = projects.filter(
    (p) => (p.status || "Active").toLowerCase() === "active"
  ).length;

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans pb-12">
      {/* TOP NAVIGATION BAR */}
      <header className="h-16 bg-white/90 backdrop-blur-md border-b border-purple-100 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white font-black shadow-md shadow-purple-500/20">
            MI
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900">
              Meeting Intelligence
            </h1>
            <p className="text-[10px] text-purple-700 font-medium">
              Manager Workspace
            </p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          <button className="px-4 py-2 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
            Dashboard
          </button>
          <button
            onClick={() => navigate("/teams")}
            className="px-4 py-2 rounded-lg text-slate-600 hover:bg-purple-50 hover:text-purple-700 text-xs font-semibold transition"
          >
            Teams
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-slate-900">
              {user?.name || "Waji Ul Hassan"}
            </p>
            <p className="text-[10px] text-purple-700 font-medium">
              Project Manager
            </p>
          </div>

          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center text-xs font-black shadow-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : "W"}
          </div>

          <button
            onClick={handleLogout}
            className="text-xs font-bold text-slate-500 hover:text-red-600 transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-6 lg:px-10 pt-8">
        {/* DASHBOARD HEADER TITLE & SUBHEADER */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Good to see you, {user?.name ? user.name.split(" ")[0] : "Waji"}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage your projects, teams and tasks from your workspace.
          </p>
        </div>

        {/* NOTIFICATION MESSAGES */}
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-800 font-medium">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-800 font-medium">
            {errorMessage}
          </div>
        )}

        {/* TOP 2 GRADIENT STAT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* CARD 1: PURPLE TO PINK GRADIENT */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#8b5cf6] via-[#a855f7] to-[#ec4899] p-6 text-white shadow-lg shadow-purple-500/20">
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-sm font-semibold opacity-90">
                  Total Projects
                </p>
                <h3 className="text-3xl font-extrabold mt-3 tracking-tight">
                  {projects.length}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xs font-medium mt-6 opacity-90 relative z-10">
              Managed workstreams
            </p>
            {/* Background decorative circles */}
            <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute right-12 -bottom-12 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
          </div>

          {/* CARD 2: VIBRANT INDIGO TO PURPLE GRADIENT */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#d946ef] p-6 text-white shadow-lg shadow-indigo-500/20">
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-sm font-semibold opacity-95">
                  Active Projects
                </p>
                <h3 className="text-3xl font-extrabold mt-3 tracking-tight">
                  {activeProjectsCount}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xs font-medium mt-6 opacity-95 relative z-10">
              Currently in progress
            </p>
            {/* Background decorative circles */}
            <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute right-12 -bottom-12 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
          </div>
        </div>

        {/* PROJECTS SECTION */}
        <section className="bg-white rounded-2xl border border-purple-100 p-6 md:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-5 border-b border-purple-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Your Projects
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Manage, edit and view all team projects under your care.
              </p>
            </div>

            <button
              onClick={openCreateProject}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs font-bold hover:opacity-90 transition shadow-md shadow-purple-500/20 self-start sm:self-auto"
            >
              + Create Project
            </button>
          </div>

          {/* EMPTY STATE */}
          {projects.length === 0 ? (
            <div className="bg-purple-50/50 border border-dashed border-purple-200 rounded-2xl p-12 text-center my-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl mb-4 font-bold border border-purple-200">
                +
              </div>
              <h4 className="font-bold text-slate-900 text-sm">
                No projects yet
              </h4>
              <p className="text-xs text-slate-500 mt-1 mb-5">
                Create your first project to start managing team tasks.
              </p>
              <button
                onClick={openCreateProject}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl text-xs font-bold hover:opacity-90 transition shadow-sm"
              >
                Create Project
              </button>
            </div>
          ) : (
            /* PROJECT CARDS GRID */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white border border-purple-100 rounded-2xl p-6 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-200 flex flex-col justify-between shadow-sm"
                >
                  <div>
                    {/* CARD TOP ROW */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center font-extrabold text-sm shadow-sm">
                        {(project.name || project.title || "P")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                          (project.status || "Active").toLowerCase() ===
                          "active"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {project.status || "Active"}
                      </span>
                    </div>

                    {/* PROJECT DETAILS */}
                    <button
                      onClick={() => openProject(project.id)}
                      className="text-left w-full group"
                    >
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition">
                        {project.name || project.title || "Unnamed Project"}
                      </h4>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-2 min-h-[36px]">
                        {project.description ||
                          "No project description available."}
                      </p>
                    </button>
                  </div>

                  {/* ACTION BUTTONS WITH PURPLE/PINK GRADIENT OPEN BUTTON */}
                  <div className="flex items-center gap-2 mt-6 pt-4 border-t border-purple-50">
                    <button
                      onClick={() => openProject(project.id)}
                      title="Open Project"
                      className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-[11px] font-bold hover:opacity-90 transition shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      <span>Open</span>
                    </button>

                    <button
                      onClick={() => openEditProject(project)}
                      disabled={deletingProjectId === project.id}
                      title="Edit Project"
                      className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition disabled:opacity-50 flex items-center justify-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={() => handleDeleteProject(project)}
                      disabled={deletingProjectId === project.id}
                      title="Delete Project"
                      className="p-2.5 rounded-xl bg-pink-50 text-pink-600 border border-pink-200 hover:bg-pink-100 transition disabled:opacity-50 flex items-center justify-center"
                    >
                      {deletingProjectId === project.id ? (
                        <span className="text-[11px] font-bold px-1">...</span>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* CREATE PROJECT MODAL */}
      {showCreateProject && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="w-full max-w-md bg-white border border-purple-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between p-6 border-b border-purple-100 bg-purple-50/50">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-purple-700">
                  New Workstream
                </p>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Create Project
                </h3>
              </div>

              <button
                onClick={() => setShowCreateProject(false)}
                disabled={creatingProject}
                className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center justify-center text-xs font-bold transition disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectForm.name}
                  onChange={(e) =>
                    setProjectForm({
                      ...projectForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g. AI Meeting Intelligence"
                  maxLength={100}
                  disabled={creatingProject}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-purple-200 outline-none text-sm text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={projectForm.description}
                  onChange={(e) =>
                    setProjectForm({
                      ...projectForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe the project..."
                  rows={4}
                  maxLength={500}
                  disabled={creatingProject}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-purple-200 outline-none text-sm text-slate-900 placeholder-slate-400 resize-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition disabled:opacity-60"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateProject(false)}
                  disabled={creatingProject}
                  className="flex-1 py-3 rounded-xl border border-purple-200 text-xs font-bold text-purple-700 hover:bg-purple-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creatingProject}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs font-bold hover:opacity-90 transition shadow-md shadow-purple-500/20 disabled:opacity-50"
                >
                  {creatingProject ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROJECT MODAL */}
      {showEditProject && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="w-full max-w-md bg-white border border-purple-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between p-6 border-b border-purple-100 bg-purple-50/50">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-purple-700">
                  Settings
                </p>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Edit Project
                </h3>
              </div>

              <button
                onClick={() => setShowEditProject(false)}
                disabled={updatingProject}
                className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center justify-center text-xs font-bold transition disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateProject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectForm.name}
                  onChange={(e) =>
                    setProjectForm({
                      ...projectRefactorName = e.target.value, // safe state update
                      name: e.target.value,
                    })
                  }
                  placeholder="Project name"
                  maxLength={100}
                  disabled={updatingProject}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-purple-200 outline-none text-sm text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={projectForm.description}
                  onChange={(e) =>
                    setProjectForm({
                      ...projectForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Project description"
                  rows={4}
                  maxLength={500}
                  disabled={updatingProject}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-purple-200 outline-none text-sm text-slate-900 placeholder-slate-400 resize-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition disabled:opacity-60"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditProject(false)}
                  disabled={updatingProject}
                  className="flex-1 py-3 rounded-xl border border-purple-200 text-xs font-bold text-purple-700 hover:bg-purple-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={updatingProject}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs font-bold hover:opacity-90 transition shadow-md shadow-purple-500/20 disabled:opacity-50"
                >
                  {updatingProject ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerDashboard;