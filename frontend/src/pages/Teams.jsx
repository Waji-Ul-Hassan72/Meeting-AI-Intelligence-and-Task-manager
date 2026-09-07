import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

function Team() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");

  const [members, setMembers] = useState([]);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [removingMember, setRemovingMember] = useState(null);

  const [showAddMember, setShowAddMember] = useState(false);

  const [memberEmail, setMemberEmail] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ============================================================
  // GET TOKEN
  // ============================================================

  const getToken = () => {
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token")
    );
  };

  // ============================================================
  // HANDLE AUTH ERROR
  // ============================================================

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    navigate("/login");
  };

  // ============================================================
  // GET PROJECT ID
  // ============================================================

  const getProjectId = (project) => {
    return project?.id || project?._id || project?.project_id;
  };

  // ============================================================
  // GET PROJECT NAME
  // ============================================================

  const getProjectName = (project) => {
    return (
      project?.name ||
      project?.title ||
      project?.project_name ||
      "Unnamed Project"
    );
  };

  // ============================================================
  // GET MEMBER ID
  // ============================================================

  const getMemberId = (member) => {
    return (
      member?.user_id ||
      member?.id ||
      member?.member_id
    );
  };

  // ============================================================
  // GET MEMBER NAME
  // ============================================================

  const getMemberName = (member) => {
    return (
      member?.name ||
      member?.full_name ||
      member?.username ||
      "Unknown Member"
    );
  };

  // ============================================================
  // FETCH PROJECTS
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const fetchProjects = async () => {
      const token = getToken();

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setLoadingProjects(true);
        setErrorMessage("");

        const response = await fetch(
          `${API_URL}/api/projects`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        let data = {};

        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
              data?.error ||
              "Unable to load projects."
          );
        }

        const projectList = Array.isArray(data)
          ? data
          : Array.isArray(data?.projects)
          ? data.projects
          : Array.isArray(data?.data)
          ? data.data
          : [];

        if (cancelled) {
          return;
        }

        setProjects(projectList);

        // Automatically select first project
        if (projectList.length > 0) {
          const firstProjectId = getProjectId(
            projectList[0]
          );

          setSelectedProject(
            firstProjectId !== undefined &&
              firstProjectId !== null
              ? String(firstProjectId)
              : ""
          );
        } else {
          setSelectedProject("");
          setMembers([]);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Fetch projects error:",
          error
        );

        setProjects([]);
        setSelectedProject("");
        setMembers([]);

        setErrorMessage(
          error.message ||
            "Unable to connect to the server."
        );
      } finally {
        if (!cancelled) {
          setLoadingProjects(false);
        }
      }
    };

    fetchProjects();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // ============================================================
  // FETCH MEMBERS FOR SELECTED PROJECT
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const fetchMembers = async () => {
      if (!selectedProject) {
        setMembers([]);
        return;
      }

      const token = getToken();

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setLoadingMembers(true);
        setErrorMessage("");

        const response = await fetch(
          `${API_URL}/api/projects/${selectedProject}/members`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        let data = {};

        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
              data?.error ||
              "Unable to load team members."
          );
        }

        const memberList = Array.isArray(data)
          ? data
          : Array.isArray(data?.members)
          ? data.members
          : Array.isArray(data?.team)
          ? data.team
          : Array.isArray(data?.team_members)
          ? data.team_members
          : Array.isArray(data?.data)
          ? data.data
          : [];

        if (cancelled) {
          return;
        }

        const normalizedMembers =
          memberList.map((member) => ({
            ...member,
            project_id:
              member?.project_id ||
              selectedProject,
          }));

        setMembers(normalizedMembers);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Fetch team members error:",
          error
        );

        setMembers([]);

        setErrorMessage(
          error.message ||
            "Unable to load team members."
        );
      } finally {
        if (!cancelled) {
          setLoadingMembers(false);
        }
      }
    };

    fetchMembers();

    return () => {
      cancelled = true;
    };
  }, [selectedProject, navigate]);

  // ============================================================
  // ADD TEAM MEMBER / SEND INVITATION
  // ============================================================

  const handleAddMember = async (e) => {
    e.preventDefault();

    const email = memberEmail
      .trim()
      .toLowerCase();

    if (!selectedProject) {
      setErrorMessage(
        "Please select a project first."
      );
      return;
    }

    if (!email) {
      setErrorMessage(
        "Please enter the member's email."
      );
      return;
    }

    if (!email.includes("@")) {
      setErrorMessage(
        "Please enter a valid email address."
      );
      return;
    }

    const token = getToken();

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setAddingMember(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(
        `${API_URL}/api/project-invitations`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email,
            project_id: selectedProject,
          }),
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Unable to add team member."
        );
      }

      if (data?.type === "existing_user") {
        setSuccessMessage(
          data?.message ||
            "Team member added successfully."
        );

        await refreshMembers();

      } else if (data?.type === "invitation") {
        setSuccessMessage(
          data?.message ||
            `Invitation sent to ${email}.`
        );
      } else {
        setSuccessMessage(
          data?.message ||
            "Team member operation completed successfully."
        );

        await refreshMembers();
      }

      setMemberEmail("");
      setShowAddMember(false);

      setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
    } catch (error) {
      console.error(
        "Add team member / invitation error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to add team member."
      );
    } finally {
      setAddingMember(false);
    }
  };

  // ============================================================
  // REFRESH MEMBERS
  // ============================================================

  const refreshMembers = async () => {
    if (!selectedProject) {
      setMembers([]);
      return;
    }

    const token = getToken();

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoadingMembers(true);

      const response = await fetch(
        `${API_URL}/api/projects/${selectedProject}/members`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Unable to refresh team members."
        );
      }

      const memberList = Array.isArray(data)
        ? data
        : Array.isArray(data?.members)
        ? data.members
        : Array.isArray(data?.team)
        ? data.team
        : Array.isArray(data?.team_members)
        ? data.team_members
        : Array.isArray(data?.data)
        ? data.data
        : [];

      setMembers(
        memberList.map((member) => ({
          ...member,
          project_id:
            member?.project_id ||
            selectedProject,
        }))
      );
    } catch (error) {
      console.error(
        "Refresh members error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to refresh team members."
      );
    } finally {
      setLoadingMembers(false);
    }
  };

  // ============================================================
  // REMOVE TEAM MEMBER
  // ============================================================

  const handleRemoveMember = async (userId) => {
    if (!selectedProject || !userId) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to remove this member from the project?"
    );

    if (!confirmed) {
      return;
    }

    const token = getToken();

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setRemovingMember(userId);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(
        `${API_URL}/api/teams/${selectedProject}/members/${userId}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Unable to remove team member."
        );
      }

      setMembers((prev) =>
        prev.filter(
          (member) =>
            String(getMemberId(member)) !==
            String(userId)
        )
      );

      setSuccessMessage(
        data?.message ||
          "Team member removed successfully."
      );

      setTimeout(() => {
        setSuccessMessage("");
      }, 4000);
    } catch (error) {
      console.error(
        "Remove member error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to remove team member."
      );
    } finally {
      setRemovingMember(null);
    }
  };

  // ============================================================
  // LOADING PROJECTS
  // ============================================================

  if (loadingProjects) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />

          <p className="text-sm font-medium text-slate-600">
            Loading team workspace...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // SELECTED PROJECT OBJECT
  // ============================================================

  const selectedProjectData = projects.find(
    (project) =>
      String(getProjectId(project)) ===
      String(selectedProject)
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-purple-500/20">
              AI
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                Meeting Intelligence
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Team Management
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/manager-dashboard")
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all shadow-2xs"
          >
            <span>←</span> Dashboard
          </button>
        </div>
      </header>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ====================================================
            PAGE HEADER
        ==================================================== */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Manage your team
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Add members to your projects and manage project access.
            </p>
          </div>

          {/* PROJECT SELECTOR */}
          <div className="w-full md:w-72">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setMembers([]);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
            >
              {projects.length === 0 ? (
                <option value="">
                  No projects available
                </option>
              ) : (
                projects.map((project) => {
                  const projectId =
                    getProjectId(project);

                  return (
                    <option
                      key={projectId}
                      value={projectId}
                    >
                      {getProjectName(project)}
                    </option>
                  );
                })
              )}
            </select>
          </div>
        </div>

        {/* ====================================================
            ALERTS
        ==================================================== */}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start justify-between gap-4 shadow-2xs">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage("")}
              className="text-red-400 hover:text-red-700 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 shadow-2xs">
            ✓ {successMessage}
          </div>
        )}

        {/* ====================================================
            SELECTED PROJECT INFO
        ==================================================== */}

        {selectedProjectData && (
          <div className="mb-6 bg-white border border-slate-200 rounded-xl shadow-xs p-5">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-2">
              Active Project
            </span>
            <h3 className="text-base font-bold text-slate-900">
              {getProjectName(selectedProjectData)}
            </h3>
            {selectedProjectData.description && (
              <p className="text-xs text-slate-500 mt-1">
                {selectedProjectData.description}
              </p>
            )}
          </div>
        )}

        {/* ====================================================
            TEAM MEMBERS
        ==================================================== */}

        <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">

          {/* HEADER */}
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Team Members
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                People who have access to this project.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAddMember(true);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              disabled={!selectedProject}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition shadow-2xs disabled:opacity-40 cursor-pointer"
            >
              + Add Team Member
            </button>
          </div>

          {/* MEMBERS LIST */}
          {loadingMembers ? (
            <div className="p-12 text-center">
              <div className="w-7 h-7 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-medium text-slate-500">
                Loading team members...
              </p>
            </div>
          ) : members.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-lg font-bold mx-auto mb-3">
                +
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                No team members yet
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Add developers or other team members to give them access to this project.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowAddMember(true);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                disabled={!selectedProject}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition shadow-2xs disabled:opacity-40 cursor-pointer"
              >
                Add First Member
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {members.map((member) => {
                const memberName = getMemberName(member);
                const memberEmail =
                  member?.email || "No email available";
                const memberId = getMemberId(member);

                return (
                  <div
                    key={memberId}
                    className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                  >
                    {/* MEMBER INFO */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {memberName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {memberName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {memberEmail}
                        </p>
                      </div>
                    </div>

                    {/* ROLE + REMOVE */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold">
                        {member?.role || "Developer"}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveMember(memberId)
                        }
                        disabled={removingMember === memberId}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 transition disabled:opacity-40 cursor-pointer"
                      >
                        {removingMember === memberId
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </section>

      </main>

      {/* ======================================================
          ADD MEMBER MODAL
      ====================================================== */}

      {showAddMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">

            {/* HEADER */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Add Team Member
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter an email to add an existing user or send them an invitation.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!addingMember) {
                    setShowAddMember(false);
                    setMemberEmail("");
                  }
                }}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* FORM */}
            <form
              onSubmit={handleAddMember}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Member Email
                </label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) =>
                    setMemberEmail(e.target.value)
                  }
                  placeholder="developer@example.com"
                  autoFocus
                  disabled={addingMember}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 disabled:opacity-50"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  If the user has an account, they will be added directly. Otherwise, an invitation will be sent.
                </p>
              </div>

              {/* PROJECT */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  Adding to
                </p>
                <p className="text-xs font-semibold text-slate-800 mt-0.5">
                  {selectedProjectData
                    ? getProjectName(selectedProjectData)
                    : "Selected Project"}
                </p>
              </div>

              {/* BUTTONS */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMember(false);
                    setMemberEmail("");
                    setErrorMessage("");
                  }}
                  disabled={addingMember}
                  className="flex-1 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    addingMember ||
                    !memberEmail.trim() ||
                    !selectedProject
                  }
                  className="flex-1 py-2.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {addingMember ? "Processing..." : "Add Member"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default Team;