// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";

// const API_URL =
//   import.meta.env.VITE_API_URL ||
//   import.meta.env.VITE_API_BASE_URL ||
//   "http://localhost:3000";

// function Projects() {
//   const navigate = useNavigate();

//   const [projects, setProjects] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [errorMessage, setErrorMessage] = useState("");

//   const [editProjectData, setEditProjectData] = useState(null);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [updating, setUpdating] = useState(false);
//   const [deletingId, setDeletingId] = useState(null);

//   // =========================================================
//   // Get JWT Token
//   // =========================================================
//   const getToken = () => {
//     return localStorage.getItem("token");
//   };

//   // =========================================================
//   // Logout
//   // =========================================================
//   const handleLogout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("user");
//     localStorage.removeItem("userName");

//     navigate("/login");
//   };

//   // =========================================================
//   // Check Authentication
//   // =========================================================
//   useEffect(() => {
//     const token = getToken();

//     if (!token) {
//       navigate("/login");
//       return;
//     }

//     fetchProjects();
//   }, [navigate]);

//   // =========================================================
//   // GET ALL PROJECTS
//   // GET /api/projects
//   // =========================================================
//   const fetchProjects = async () => {
//     setLoading(true);
//     setErrorMessage("");

//     try {
//       const token = getToken();

//       if (!token) {
//         navigate("/login");
//         return;
//       }

//       const response = await fetch(`${API_URL}/api/projects`, {
//         method: "GET",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       });

//       // Token expired / invalid
//       if (response.status === 401) {
//         handleLogout();
//         return;
//       }

//       const result = await response.json();

//       if (!response.ok) {
//         setErrorMessage(
//           result.message ||
//             result.error ||
//             "Failed to load projects."
//         );
//         return;
//       }

//       let projectList = [];

//       if (Array.isArray(result)) {
//         projectList = result;
//       } else if (Array.isArray(result.data)) {
//         projectList = result.data;
//       } else if (Array.isArray(result.projects)) {
//         projectList = result.projects;
//       }

//       setProjects(projectList);
//     } catch (error) {
//       console.error("Fetch projects failed:", error);

//       setErrorMessage(
//         "Unable to connect to the server. Please make sure your backend is running."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   // =========================================================
//   // DELETE PROJECT
//   // DELETE /api/projects/:id
//   // =========================================================
//   const deleteProject = async (id) => {
//     if (!id) {
//       return;
//     }

//     const confirmed = window.confirm(
//       "Are you sure you want to delete this project?"
//     );

//     if (!confirmed) return;

//     try {
//       const token = getToken();

//       if (!token) {
//         navigate("/login");
//         return;
//       }

//       setDeletingId(id);

//       const response = await fetch(`${API_URL}/api/projects/${id}`, {
//         method: "DELETE",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       });

//       if (response.status === 401) {
//         handleLogout();
//         return;
//       }

//       const result = await response.json();

//       if (!response.ok) {
//         console.error(result.message || result.error || "Failed to delete project.");
//         return;
//       }

//       // Remove deleted project immediately from UI without blocking alerts
//       setProjects((prevProjects) =>
//         prevProjects.filter(
//           (project) =>
//             String(project.id || project._id) !== String(id)
//         )
//       );
//     } catch (error) {
//       console.error("Delete project failed:", error);
//     } finally {
//       setDeletingId(null);
//     }
//   };

//   // =========================================================
//   // OPEN EDIT MODAL
//   // =========================================================
//   const editProject = (project) => {
//     setEditProjectData({
//       ...project,

//       id: project.id || project._id,

//       name: project.name || project.title || "",

//       title: project.title || project.name || "",

//       description: project.description || "",

//       status: project.status || "Pending",
//     });

//     setShowEditModal(true);
//   };

//   // =========================================================
//   // UPDATE PROJECT
//   // PUT /api/projects/:id
//   // =========================================================
//   const updateProject = async () => {
//     if (!editProjectData) return;

//     const projectId = editProjectData.id;

//     const projectTitle =
//       editProjectData.name?.trim() ||
//       editProjectData.title?.trim() ||
//       "";

//     const description =
//       editProjectData.description?.trim() || "";

//     if (!projectTitle) {
//       return;
//     }

//     try {
//       const token = getToken();

//       if (!token) {
//         navigate("/login");
//         return;
//       }

//       setUpdating(true);

//       const response = await fetch(
//         `${API_URL}/api/projects/${projectId}`,
//         {
//           method: "PUT",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },

//           body: JSON.stringify({
//             name: projectTitle,
//             title: projectTitle,
//             description,
//             status: editProjectData.status || "Pending",
//           }),
//         }
//       );

//       if (response.status === 401) {
//         handleLogout();
//         return;
//       }

//       const result = await response.json();

//       if (!response.ok) {
//         console.error(result.message || result.error || "Failed to update project.");
//         return;
//       }

//       const updatedProject =
//         result.data ||
//         result.project ||
//         result;

//       setProjects((prevProjects) =>
//         prevProjects.map((project) => {
//           const currentId = project.id || project._id;

//           if (String(currentId) === String(projectId)) {
//             return {
//               ...project,
//               ...updatedProject,

//               id: updatedProject.id || project.id,
//               _id: updatedProject._id || project._id,

//               name:
//                 updatedProject.name ||
//                 updatedProject.title ||
//                 projectTitle,

//               title:
//                 updatedProject.title ||
//                 updatedProject.name ||
//                 projectTitle,

//               description:
//                 updatedProject.description ?? description,

//               status:
//                 updatedProject.status ||
//                 editProjectData.status ||
//                 "Pending",
//             };
//           }

//           return project;
//         })
//       );

//       setShowEditModal(false);
//       setEditProjectData(null);
//     } catch (error) {
//       console.error("Update project failed:", error);
//     } finally {
//       setUpdating(false);
//     }
//   };

//   // =========================================================
//   // PROJECT CARD COLORS
//   // =========================================================
//   const getCardBg = (status) => {
//     if (!status) return "bg-[#E2F8F0]";

//     const lower = status.toLowerCase();

//     if (lower.includes("progress")) {
//       return "bg-[#E2F8F0]";
//     }

//     if (lower.includes("complete")) {
//       return "bg-[#EDE9FE]";
//     }

//     if (lower.includes("pending")) {
//       return "bg-[#FEF3C7]";
//     }

//     return "bg-[#E2F8F0]";
//   };

//   const getBadgeStyle = (status) => {
//     if (!status) {
//       return "bg-white/80 text-teal-700";
//     }

//     const lower = status.toLowerCase();

//     if (lower.includes("progress")) {
//       return "bg-white/80 text-emerald-700";
//     }

//     if (lower.includes("complete")) {
//       return "bg-white/80 text-purple-700";
//     }

//     if (lower.includes("pending")) {
//       return "bg-white/80 text-amber-700";
//     }

//     return "bg-white/80 text-teal-700";
//   };

//   const getDotColor = (status) => {
//     if (!status) return "bg-teal-600";

//     const lower = status.toLowerCase();

//     if (lower.includes("progress")) {
//       return "bg-emerald-600";
//     }

//     if (lower.includes("complete")) {
//       return "bg-purple-600";
//     }

//     if (lower.includes("pending")) {
//       return "bg-amber-600";
//     }

//     return "bg-teal-600";
//   };

//   // =========================================================
//   // LOADING SCREEN
//   // =========================================================
//   if (loading) {
//     return (
//       <div className="min-h-screen bg-[#DCE3E6] flex items-center justify-center">
//         <div className="bg-white rounded-3xl px-8 py-6 shadow-sm">
//           <p className="text-sm font-semibold text-slate-700">
//             Loading projects...
//           </p>
//         </div>
//       </div>
//     );
//   }

//   // =========================================================
//   // MAIN UI
//   // =========================================================
//   return (
//     <div className="min-h-screen bg-[#DCE3E6] p-2.5 sm:p-5 flex justify-center items-stretch font-sans text-slate-800">
//       <div className="flex w-full min-h-[calc(100vh-40px)] bg-[#F4F6F8] rounded-[32px] p-4 sm:p-6 lg:p-8 gap-5 border border-slate-200 shadow-sm">

//         {/* =====================================================
//             SIDEBAR
//         ====================================================== */}
//         <aside className="w-16 bg-[#191E24] rounded-3xl flex flex-col items-center py-5 justify-between shrink-0">

//           <div className="flex flex-col items-center w-full">

//             {/* Logo */}
//             <div className="text-[#38BDF8] text-2xl font-extrabold mb-[18px]">
//               ✦
//             </div>

//             <nav className="flex flex-col gap-2.5">

//               {/* Dashboard */}
//               <button
//                 onClick={() => navigate("/dashboard")}
//                 title="Dashboard"
//                 className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-[#2D3748] hover:text-white transition-all"
//               >
//                 <svg
//                   width="18"
//                   height="18"
//                   viewBox="0 0 24 24"
//                   fill="currentColor"
//                 >
//                   <rect x="3" y="3" width="8" height="8" rx="2.5" />
//                   <rect x="13" y="3" width="8" height="8" rx="2.5" />
//                   <rect x="3" y="13" width="8" height="8" rx="2.5" />
//                   <rect x="13" y="13" width="8" height="8" rx="2.5" />
//                 </svg>
//               </button>

//               {/* Projects */}
//               <button
//                 onClick={() => navigate("/projects")}
//                 title="Projects"
//                 className="w-10 h-10 rounded-full flex items-center justify-center bg-[#2D3748] text-white transition-all"
//               >
//                 <svg
//                   width="18"
//                   height="18"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                   stroke="currentColor"
//                   strokeWidth="2"
//                 >
//                   <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
//                   <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
//                 </svg>
//               </button>

//               {/* Tasks */}
//               <button
//                 onClick={() => navigate("/tasks")}
//                 title="Tasks"
//                 className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-[#2D3748] hover:text-white transition-all"
//               >
//                 <svg
//                   width="18"
//                   height="18"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                   stroke="currentColor"
//                   strokeWidth="2"
//                 >
//                   <rect
//                     x="3"
//                     y="4"
//                     width="18"
//                     height="18"
//                     rx="2"
//                   />
//                   <line x1="16" y1="2" x2="16" y2="6" />
//                   <line x1="8" y1="2" x2="8" y2="6" />
//                   <line x1="3" y1="10" x2="21" y2="10" />
//                 </svg>
//               </button>

//             </nav>
//           </div>

//           {/* Logout */}
//           <button
//             onClick={handleLogout}
//             title="Logout"
//             className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-[#2D3748] hover:text-white transition-all"
//           >
//             <svg
//               width="18"
//               height="18"
//               viewBox="0 0 24 24"
//               fill="none"
//               stroke="currentColor"
//               strokeWidth="2"
//             >
//               <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
//               <polyline points="16 17 21 12 16 7" />
//               <line x1="21" y1="12" x2="9" y2="12" />
//             </svg>
//           </button>
//         </aside>

//         {/* =====================================================
//             MAIN CONTENT
//         ====================================================== */}
//         <main className="flex-1 w-full flex flex-col min-w-0">

//           {/* Header */}
//           <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-7 gap-3.5 w-full">

//             <div>
//               <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
//                 📁 My Workspaces
//               </h1>

//               <p className="text-slate-500 text-sm mt-1">
//                 Manage and monitor your project workspaces
//               </p>
//             </div>

//             <div className="flex items-center gap-3 w-full sm:w-auto">

//               <button
//                 onClick={() => navigate("/dashboard")}
//                 className="bg-white text-slate-900 border border-slate-200 px-5 py-2.5 rounded-full font-bold text-xs hover:bg-slate-100 transition-all"
//               >
//                 ← Dashboard
//               </button>

//               <button
//                 onClick={() => navigate("/project")}
//                 className="bg-[#191E24] text-white px-5 py-2.5 rounded-full font-bold text-xs hover:bg-slate-900 transition-all"
//               >
//                 + Add Project
//               </button>

//             </div>
//           </header>

//           {/* Error */}
//           {errorMessage && (
//             <div className="mb-5 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm">
//               <div className="flex justify-between items-center gap-4">
//                 <span>{errorMessage}</span>

//                 <button
//                   onClick={fetchProjects}
//                   className="font-bold underline"
//                 >
//                   Retry
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* ===================================================
//               NO PROJECTS
//           ==================================================== */}
//           {projects.length === 0 ? (
//             <div className="bg-white rounded-3xl p-16 text-center flex flex-col items-center justify-center gap-3 w-full border border-dashed border-slate-300 mt-5">

//               <div className="text-5xl">
//                 📂
//               </div>

//               <h3 className="text-xl font-extrabold text-slate-900">
//                 No Workspaces Found
//               </h3>

//               <p className="text-sm text-slate-500 mb-3">
//                 Get started by creating your first project workspace.
//               </p>

//               <button
//                 onClick={() => navigate("/project")}
//                 className="bg-[#191E24] text-white px-6 py-2.5 rounded-full font-bold text-xs hover:bg-slate-900 transition-all"
//               >
//                 + Create Project
//               </button>

//             </div>
//           ) : (

//             /* =================================================
//                PROJECT GRID
//             ================================================== */
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">

//               {projects.map((project) => {

//                 const projectId =
//                   project.id || project._id;

//                 const projectTitle =
//                   project.name ||
//                   project.title ||
//                   "Untitled Project";

//                 const status =
//                   project.status ||
//                   "Pending";

//                 const cardBg =
//                   getCardBg(status);

//                 const badgeStyle =
//                   getBadgeStyle(status);

//                 const dotColor =
//                   getDotColor(status);

//                 return (
//                   <div
//                     key={projectId}
//                     className={`${cardBg} rounded-[28px] p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-md border border-black/5 relative`}
//                   >

//                     {/* Top Row */}
//                     <div className="flex justify-between items-center mb-6">

//                       {/* Status */}
//                       <div
//                         className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${badgeStyle}`}
//                       >
//                         <span
//                           className={`w-2 h-2 rounded-full ${dotColor}`}
//                         />

//                         {status}
//                       </div>

//                       {/* Actions */}
//                       <div className="flex items-center gap-2">

//                         {/* Edit */}
//                         <button
//                           onClick={() =>
//                             editProject(project)
//                           }
//                           disabled={deletingId === projectId}
//                           className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
//                           title="Edit Project"
//                         >
//                           <svg
//                             className="w-3.5 h-3.5"
//                             fill="none"
//                             stroke="currentColor"
//                             strokeWidth="2"
//                             viewBox="0 0 24 24"
//                           >
//                             <path
//                               strokeLinecap="round"
//                               strokeLinejoin="round"
//                               d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
//                             />
//                           </svg>
//                         </button>

//                         {/* Delete */}
//                         <button
//                           onClick={() =>
//                             deleteProject(projectId)
//                           }
//                           disabled={
//                             deletingId === projectId
//                           }
//                           className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 hover:bg-rose-50 hover:text-rose-600 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
//                           title="Delete Project"
//                         >
//                           {deletingId === projectId ? (
//                             <span className="text-xs">
//                               ...
//                             </span>
//                           ) : (
//                             <svg
//                               className="w-3.5 h-3.5"
//                               fill="none"
//                               stroke="currentColor"
//                               strokeWidth="2"
//                               viewBox="0 0 24 24"
//                             >
//                               <path
//                                 strokeLinecap="round"
//                                 strokeLinejoin="round"
//                                 d="M6 18L18 6M6 6l12 12"
//                               />
//                             </svg>
//                           )}
//                         </button>

//                       </div>
//                     </div>

//                     {/* Project Information */}
//                     <div className="mb-8">

//                       <h3 className="text-xl font-bold text-slate-900 mb-1 break-words">
//                         {projectTitle}
//                       </h3>

//                       <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
//                         {project.description ||
//                           "No project description provided."}
//                       </p>

//                     </div>

//                     {/* Buttons */}
//                     <div className="flex items-center gap-3 pt-2">

//                       <button
//                         onClick={() =>
//                           navigate(
//                             `/tasks/${projectId}`
//                           )
//                         }
//                         className="flex-1 py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-900 text-xs font-semibold rounded-2xl shadow-sm transition-all border border-slate-200/60"
//                       >
//                         View Tasks
//                       </button>

//                       <button
//                         onClick={() =>
//                           navigate(
//                             `/add-task/${projectId}`
//                           )
//                         }
//                         className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-2xl shadow-sm transition-all"
//                       >
//                         + Task
//                       </button>

//                     </div>
//                   </div>
//                 );
//               })}

//             </div>
//           )}
//         </main>
//       </div>

//       {/* =====================================================
//           EDIT PROJECT MODAL
//       ====================================================== */}
//       {showEditModal && editProjectData && (
//         <div
//           className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4"
//           onClick={() => {
//             if (!updating) {
//               setShowEditModal(false);
//               setEditProjectData(null);
//             }
//           }}
//         >
//           <div
//             className="bg-white rounded-3xl p-7 w-full max-w-md shadow-2xl flex flex-col gap-5"
//             onClick={(e) => e.stopPropagation()}
//           >

//             {/* Modal Header */}
//             <div className="flex justify-between items-center">

//               <h2 className="text-xl font-extrabold text-slate-900">
//                 Edit Project ✏️
//               </h2>

//               <button
//                 disabled={updating}
//                 onClick={() => {
//                   setShowEditModal(false);
//                   setEditProjectData(null);
//                 }}
//                 className="bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full font-bold text-slate-700 transition-all flex items-center justify-center disabled:opacity-50"
//               >
//                 ✕
//               </button>

//             </div>

//             {/* Project Name */}
//             <div className="flex flex-col gap-1.5">

//               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
//                 Project Title
//               </label>

//               <input
//                 type="text"
//                 value={
//                   editProjectData.name ||
//                   editProjectData.title ||
//                   ""
//                 }
//                 onChange={(e) =>
//                   setEditProjectData({
//                     ...editProjectData,
//                     name: e.target.value,
//                     title: e.target.value,
//                   })
//                 }
//                 className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
//                 disabled={updating}
//               />

//             </div>

//             {/* Description */}
//             <div className="flex flex-col gap-1.5">

//               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
//                 Description
//               </label>

//               <textarea
//                 value={
//                   editProjectData.description ||
//                   ""
//                 }
//                 onChange={(e) =>
//                   setEditProjectData({
//                     ...editProjectData,
//                     description: e.target.value,
//                   })
//                 }
//                 className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[80px] resize-y transition-all"
//                 disabled={updating}
//               />

//             </div>

//             {/* Status */}
//             <div className="flex flex-col gap-1.5">

//               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
//                 Status
//               </label>

//               <div className="flex gap-2">

//                 {[
//                   "Pending",
//                   "In Progress",
//                   "Completed",
//                 ].map((status) => {

//                   const isSelected =
//                     editProjectData.status
//                       ?.toLowerCase() ===
//                     status.toLowerCase();

//                   return (
//                     <button
//                       key={status}
//                       type="button"
//                       disabled={updating}
//                       onClick={() =>
//                         setEditProjectData({
//                           ...editProjectData,
//                           status,
//                         })
//                       }
//                       className={`flex-1 py-2 px-2 rounded-full text-xs font-bold border transition-all ${
//                         isSelected
//                           ? "bg-[#191E24] text-white border-[#191E24]"
//                           : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
//                       } disabled:opacity-50`}
//                     >
//                       {status}
//                     </button>
//                   );
//                 })}

//               </div>
//             </div>

//             {/* Modal Buttons */}
//             <div className="flex gap-2.5 mt-2">

//               <button
//                 disabled={updating}
//                 onClick={updateProject}
//                 className="flex-1 bg-[#191E24] hover:bg-slate-900 text-white py-3 rounded-full font-bold text-sm transition-all disabled:opacity-50"
//               >
//                 {updating
//                   ? "Saving..."
//                   : "Save Changes"}
//               </button>

//               <button
//                 disabled={updating}
//                 onClick={() => {
//                   setShowEditModal(false);
//                   setEditProjectData(null);
//                 }}
//                 className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-full font-bold text-sm transition-all disabled:opacity-50"
//               >
//                 Cancel
//               </button>

//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default Projects;