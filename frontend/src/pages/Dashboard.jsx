// import React, { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";

// const API_URL =
//   import.meta.env.VITE_API_URL ||
//   import.meta.env.VITE_API_BASE_URL ||
//   "http://localhost:3000";

// export default function Dashboard() {
//   const navigate = useNavigate();

//   // =========================================================
//   // USER
//   // =========================================================

//   const [userName, setUserName] = useState("User");
//   const [profileOpen, setProfileOpen] = useState(false);

//   // =========================================================
//   // DATA
//   // =========================================================

//   const [projects, setProjects] = useState([]);
//   const [tasks, setTasks] = useState([]);
//   const [meetings, setMeetings] = useState([]);

//   const [selectedProjectId, setSelectedProjectId] = useState(null);

//   const [loading, setLoading] = useState(true);
//   const [tasksLoading, setTasksLoading] = useState(false);
//   const [meetingsLoading, setMeetingsLoading] = useState(false);

//   // =========================================================
//   // PROJECT MODAL
//   // =========================================================

//   const [projectModalOpen, setProjectModalOpen] = useState(false);
//   const [editingProject, setEditingProject] = useState(null);

//   const [projectName, setProjectName] = useState("");
//   const [projectDescription, setProjectDescription] = useState("");
//   const [projectStatus, setProjectStatus] = useState("Pending");
//   const [projectSaving, setProjectSaving] = useState(false);

//   // =========================================================
//   // TASK MODAL (Unified for BOTH Creating and Editing Tasks)
//   // =========================================================

//   const [taskModalOpen, setTaskModalOpen] = useState(false);
//   const [editingTask, setEditingTask] = useState(null); // null = Creating, Object = Editing

//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");
//   const [priority, setPriority] = useState("Medium");
//   const [status, setStatus] = useState("Pending");
//   const [dueDate, setDueDate] = useState("");

//   const [isRecurring, setIsRecurring] = useState(false);
//   const [repeatType, setRepeatType] = useState("Monthly");
//   const [repeatMonths, setRepeatMonths] = useState([]);
//   const [repeatDays, setRepeatDays] = useState([]);

//   const [showMonths, setShowMonths] = useState(false);
//   const [showDays, setShowDays] = useState(false);

//   const [taskSaving, setTaskSaving] = useState(false);

//   // =========================================================
//   // RECURRING OPTIONS
//   // =========================================================

//   const months = [
//     "January", "February", "March", "April", "May", "June",
//     "July", "August", "September", "October", "November", "December",
//   ];

//   const days = [
//     "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
//   ];

//   // =========================================================
//   // AUTH
//   // =========================================================

//   const getToken = () => localStorage.getItem("token");

//   // =========================================================
//   // INITIAL LOAD
//   // =========================================================

//   useEffect(() => {
//     const token = getToken();

//     if (!token) {
//       navigate("/login");
//       return;
//     }

//     const storedUser = localStorage.getItem("user");

//     if (storedUser) {
//       try {
//         const user = JSON.parse(storedUser);
//         setUserName(
//           user?.full_name || user?.name || user?.username || "User"
//         );
//       } catch {
//         setUserName(localStorage.getItem("userName") || "User");
//       }
//     } else {
//       setUserName(localStorage.getItem("userName") || "User");
//     }

//     loadProjects(token);
//     loadTasks(token);
//     loadMeetings(token);
//   }, [navigate]);

//   // =========================================================
//   // LOAD PROJECTS
//   // =========================================================

//   const loadProjects = async (token = getToken()) => {
//     try {
//       if (!token) {
//         navigate("/login");
//         return;
//       }

//       const response = await fetch(`${API_URL}/api/projects`, {
//         method: "GET",
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       const result = await response.json();

//       if (!response.ok) {
//         throw new Error(
//           result.message || result.error || "Failed to load projects"
//         );
//       }

//       const projectData = Array.isArray(result)
//         ? result
//         : result.projects || result.data || [];

//       setProjects(projectData);

//       setSelectedProjectId((currentId) => {
//         const exists = projectData.some(
//           (project) =>
//             String(project.id || project._id) === String(currentId)
//         );

//         if (exists) {
//           return currentId;
//         }

//         return projectData.length > 0
//           ? projectData[0].id || projectData[0]._id
//           : null;
//       });
//     } catch (error) {
//       console.error("Projects loading error:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // =========================================================
//   // LOAD TASKS
//   // =========================================================

//   const loadTasks = async (token = getToken()) => {
//     try {
//       if (!token) {
//         navigate("/login");
//         return;
//       }

//       setTasksLoading(true);

//       const response = await fetch(`${API_URL}/api/tasks`, {
//         method: "GET",
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       const result = await response.json();

//       if (!response.ok) {
//         throw new Error(
//           result.message || result.error || "Failed to load tasks"
//         );
//       }

//       const taskData = Array.isArray(result)
//         ? result
//         : result.tasks || result.data || [];

//       setTasks(taskData);
//     } catch (error) {
//       console.error("Tasks loading error:", error);
//     } finally {
//       setTasksLoading(false);
//     }
//   };

//   // =========================================================
//   // LOAD MEETINGS
//   // =========================================================

//   const loadMeetings = async (token = getToken()) => {
//     try {
//       if (!token) {
//         navigate("/login");
//         return;
//       }

//       setMeetingsLoading(true);

//       const response = await fetch(`${API_URL}/api/meetings`, {
//         method: "GET",
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       const result = await response.json();

//       if (!response.ok) {
//         throw new Error(
//           result.message || result.error || "Failed to load meetings"
//         );
//       }

//       const meetingData = Array.isArray(result)
//         ? result
//         : result.meetings || result.data || [];

//       setMeetings(meetingData);
//     } catch (error) {
//       console.error("Meetings loading error:", error);
//     } finally {
//       setMeetingsLoading(false);
//     }
//   };

//   // =========================================================
//   // PROJECT HELPERS
//   // =========================================================

//   const getProjectId = (project) => project?.id || project?._id;

//   const getProjectName = (project) =>
//     project?.name || project?.title || "Untitled Project";

//   // =========================================================
//   // SELECTED PROJECT
//   // =========================================================

//   const selectedProject = useMemo(() => {
//     return projects.find(
//       (project) =>
//         String(getProjectId(project)) === String(selectedProjectId)
//     );
//   }, [projects, selectedProjectId]);

//   // =========================================================
//   // SELECTED PROJECT TASKS & MEETINGS
//   // =========================================================

//   const selectedProjectTasks = useMemo(() => {
//     if (!selectedProjectId) {
//       return [];
//     }

//     return tasks.filter(
//       (task) =>
//         String(task.project_id || task.projectId) ===
//         String(selectedProjectId)
//     );
//   }, [tasks, selectedProjectId]);

//   // =========================================================
//   // TASK STATUS
//   // =========================================================

//   const getTaskStatus = (task) => {
//     const taskStatus = String(
//       task?.status || task?.task_status || "Pending"
//     ).toLowerCase();

//     if (taskStatus.includes("complete") || taskStatus === "done") {
//       return "Completed";
//     }

//     if (taskStatus.includes("progress") || taskStatus === "in_progress") {
//       return "In Progress";
//     }

//     return "Pending";
//   };

//   // =========================================================
//   // SORTED TASKS
//   // =========================================================

//   const sortedTasks = useMemo(() => {
//     const statusWeight = {
//       "Pending": 1,
//       "In Progress": 2,
//       "Completed": 3,
//     };

//     const priorityWeight = {
//       "High": 1,
//       "Medium": 2,
//       "Low": 3,
//     };

//     return [...selectedProjectTasks].sort((a, b) => {
//       const statusA = getTaskStatus(a);
//       const statusB = getTaskStatus(b);

//       const weightDiff =
//         (statusWeight[statusA] || 1) - (statusWeight[statusB] || 1);
//       if (weightDiff !== 0) return weightDiff;

//       const pA = a.priority || "Medium";
//       const pB = b.priority || "Medium";
//       const priorityDiff =
//         (priorityWeight[pA] || 2) - (priorityWeight[pB] || 2);
//       if (priorityDiff !== 0) return priorityDiff;

//       const dateA = a.due_date || a.dueDate || a.deadline;
//       const dateB = b.due_date || b.dueDate || b.deadline;
//       if (dateA && dateB) {
//         return new Date(dateA) - new Date(dateB);
//       }

//       return 0;
//     });
//   }, [selectedProjectTasks]);

//   const selectedProjectMeetings = useMemo(() => {
//     if (!selectedProjectId) {
//       return [];
//     }

//     return meetings.filter(
//       (meeting) =>
//         String(meeting.project_id || meeting.projectId) ===
//         String(selectedProjectId)
//     );
//   }, [meetings, selectedProjectId]);

//   // =========================================================
//   // TASK COUNTS
//   // =========================================================

//   const taskCounts = useMemo(() => {
//     const counts = {
//       pending: 0,
//       progress: 0,
//       completed: 0,
//     };

//     selectedProjectTasks.forEach((task) => {
//       const taskStatus = getTaskStatus(task);

//       if (taskStatus === "Completed") {
//         counts.completed++;
//       } else if (taskStatus === "In Progress") {
//         counts.progress++;
//       } else {
//         counts.pending++;
//       }
//     });

//     return counts;
//   }, [selectedProjectTasks]);

//   // =========================================================
//   // DATE FORMAT
//   // =========================================================

//   const formatDate = (date) => {
//     if (!date) return null;
//     const parsedDate = new Date(date);
//     if (Number.isNaN(parsedDate.getTime())) return null;
//     return parsedDate.toLocaleDateString("en-US", {
//       month: "short",
//       day: "numeric",
//     });
//   };

//   // =========================================================
//   // OPEN CREATE PROJECT
//   // =========================================================

//   const openCreateProject = () => {
//     setEditingProject(null);
//     setProjectName("");
//     setProjectDescription("");
//     setProjectStatus("Pending");
//     setProjectModalOpen(true);
//   };

//   const openEditProject = (project, e) => {
//     if (e) e.stopPropagation();
//     setEditingProject(project);
//     setProjectName(project?.name || project?.title || "");
//     setProjectDescription(project?.description || "");
//     setProjectStatus(project?.status || "Pending");
//     setProjectModalOpen(true);
//   };

//   const closeProjectModal = () => {
//     if (projectSaving) return;
//     setProjectModalOpen(false);
//     setEditingProject(null);
//   };

//   const saveProject = async (e) => {
//     e.preventDefault();
//     const name = projectName.trim();
//     if (!name) {
//       alert("Please enter a project name.");
//       return;
//     }
//     const token = getToken();
//     if (!token) {
//       navigate("/login");
//       return;
//     }
//     setProjectSaving(true);
//     try {
//       const isEditing = Boolean(editingProject);
//       const projectId = editingProject ? getProjectId(editingProject) : null;
//       const url = isEditing
//         ? `${API_URL}/api/projects/${projectId}`
//         : `${API_URL}/api/projects`;

//       const response = await fetch(url, {
//         method: isEditing ? "PUT" : "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({
//           name,
//           title: name,
//           description: projectDescription.trim(),
//           status: projectStatus,
//         }),
//       });

//       const result = await response.json();
//       if (!response.ok) {
//         throw new Error(result.message || result.error || "Failed to save project.");
//       }

//       const savedProject = result.data || result.project || result;

//       if (isEditing) {
//         setProjects((previousProjects) =>
//           previousProjects.map((project) => {
//             const currentId = getProjectId(project);
//             if (String(currentId) === String(projectId)) {
//               return {
//                 ...project,
//                 ...savedProject,
//                 id: currentId,
//                 name,
//                 title: name,
//                 description: projectDescription.trim(),
//                 status: projectStatus,
//               };
//             }
//             return project;
//           })
//         );
//       } else {
//         const newProject = {
//           ...savedProject,
//           name: savedProject?.name || name,
//           title: savedProject?.title || name,
//           description: savedProject?.description || projectDescription.trim(),
//           status: savedProject?.status || projectStatus,
//         };
//         setProjects((previousProjects) => [...previousProjects, newProject]);
//         const newProjectId = getProjectId(newProject);
//         if (newProjectId) {
//           setSelectedProjectId(newProjectId);
//         }
//       }
//       closeProjectModal();
//     } catch (error) {
//       console.error("Save project error:", error);
//       alert(error.message || "Unable to save project.");
//     } finally {
//       setProjectSaving(false);
//     }
//   };

//   const deleteProject = async (project, e) => {
//     if (e) e.stopPropagation();
//     const projectId = getProjectId(project);
//     if (!projectId) {
//       alert("Project ID is missing.");
//       return;
//     }
//     const confirmed = window.confirm(
//       `Delete "${getProjectName(project)}"?\n\nThis may also affect its tasks.`
//     );
//     if (!confirmed) return;

//     const token = getToken();
//     if (!token) {
//       navigate("/login");
//       return;
//     }

//     try {
//       const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
//         method: "DELETE",
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       const result = await response.json();
//       if (!response.ok) {
//         throw new Error(result.message || result.error || "Failed to delete project.");
//       }

//       setProjects((previousProjects) =>
//         previousProjects.filter((item) => String(getProjectId(item)) !== String(projectId))
//       );
//       setTasks((previousTasks) =>
//         previousTasks.filter((task) => String(task.project_id || task.projectId) !== String(projectId))
//       );
//       setMeetings((previousMeetings) =>
//         previousMeetings.filter((meeting) => String(meeting.project_id || meeting.projectId) !== String(projectId))
//       );

//       setSelectedProjectId((currentId) => {
//         if (String(currentId) !== String(projectId)) return currentId;
//         const remainingProjects = projects.filter(
//           (item) => String(getProjectId(item)) !== String(projectId)
//         );
//         return remainingProjects.length > 0 ? getProjectId(remainingProjects[0]) : null;
//       });
//     } catch (error) {
//       console.error("Delete project error:", error);
//       alert(error.message || "Unable to delete project.");
//     }
//   };

//   // =========================================================
//   // RESET TASK FORM
//   // =========================================================

//   const resetTaskForm = () => {
//     setTitle("");
//     setDescription("");
//     setPriority("Medium");
//     setStatus("Pending");
//     setDueDate("");
//     setIsRecurring(false);
//     setRepeatType("Monthly");
//     setRepeatMonths([]);
//     setRepeatDays([]);
//     setShowMonths(false);
//     setShowDays(false);
//   };

//   // =========================================================
//   // OPEN CREATE TASK
//   // =========================================================

//   const openCreateTask = () => {
//     if (!selectedProjectId) {
//       alert("Please select a project first.");
//       return;
//     }
//     setEditingTask(null);
//     resetTaskForm();
//     setTaskModalOpen(true);
//   };

//   // =========================================================
//   // OPEN EDIT TASK
//   // =========================================================

//   const openEditTask = (task, e) => {
//     if (e) e.stopPropagation();
//     setEditingTask(task);
//     setTitle(task?.title || task?.name || "");
//     setDescription(task?.description || "");
//     setPriority(task?.priority || "Medium");
//     setStatus(getTaskStatus(task));

//     const existingDueDate =
//       task?.due_date || task?.dueDate || task?.deadline || "";
//     setDueDate(existingDueDate ? String(existingDueDate).slice(0, 10) : "");

//     setIsRecurring(Boolean(task?.is_recurring));
//     setRepeatType(task?.repeat_type || "Monthly");
//     setRepeatMonths(Array.isArray(task?.repeat_months) ? task.repeat_months : []);
//     setRepeatDays(Array.isArray(task?.repeat_days) ? task.repeat_days : []);

//     setShowMonths(false);
//     setShowDays(false);
//     setTaskModalOpen(true);
//   };

//   // =========================================================
//   // CLOSE TASK MODAL
//   // =========================================================

//   const closeTaskModal = () => {
//     if (taskSaving) return;
//     setTaskModalOpen(false);
//     setEditingTask(null);
//     resetTaskForm();
//   };

//   const toggleMonthSelection = (month) => {
//     setRepeatMonths((previous) =>
//       previous.includes(month)
//         ? previous.filter((item) => item !== month)
//         : [...previous, month]
//     );
//   };

//   const toggleDaySelection = (day) => {
//     setRepeatDays((previous) =>
//       previous.includes(day)
//         ? previous.filter((item) => item !== day)
//         : [...previous, day]
//     );
//   };

//   // =========================================================
//   // SAVE TASK
//   // =========================================================

//   const saveTask = async (e) => {
//     e.preventDefault();

//     if (!title.trim()) {
//       alert("Please enter a task title.");
//       return;
//     }

//     if (!description.trim()) {
//       alert("Please enter a task description.");
//       return;
//     }

//     if (!selectedProjectId) {
//       alert("Please select a project.");
//       return;
//     }

//     const token = getToken();
//     if (!token) {
//       navigate("/login");
//       return;
//     }

//     setTaskSaving(true);

//     try {
//       const isEditing = Boolean(editingTask);
//       const taskId = editingTask ? editingTask.id || editingTask._id : null;

//       const url = isEditing
//         ? `${API_URL}/api/tasks/${taskId}`
//         : `${API_URL}/api/tasks`;

//       const payload = {
//         title: title.trim(),
//         description: description.trim(),
//         priority,
//         status,
//         due_date: dueDate || null,
//         attachment: null,
//         project_id: editingTask?.project_id || editingTask?.projectId || selectedProjectId,
//         is_recurring: Boolean(isRecurring),
//         repeat_type: isRecurring ? repeatType : null,
//         repeat_months: isRecurring ? repeatMonths : [],
//         repeat_days: isRecurring ? repeatDays : [],
//       };

//       const response = await fetch(url, {
//         method: isEditing ? "PUT" : "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(payload),
//       });

//       const result = await response.json();

//       if (!response.ok) {
//         throw new Error(result.message || result.error || "Failed to save task.");
//       }

//       // Re-fetch tasks immediately to keep local state synced with backend generation results
//       await loadTasks(token);
//       closeTaskModal();
//     } catch (error) {
//       console.error("Save task error:", error);
//       alert(error.message || "Unable to save task.");
//     } finally {
//       setTaskSaving(false);
//     }
//   };

//   const deleteTask = async (task, e) => {
//     if (e) e.stopPropagation();
//     const taskId = task?.id || task?._id;
//     if (!taskId) {
//       alert("Task ID is missing.");
//       return;
//     }
//     const taskTitle = task?.title || task?.name || "this task";
//     if (!window.confirm(`Delete "${taskTitle}"?`)) return;

//     const token = getToken();
//     if (!token) {
//       navigate("/login");
//       return;
//     }

//     try {
//       const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
//         method: "DELETE",
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       const result = await response.json();
//       if (!response.ok) {
//         throw new Error(result.message || result.error || "Failed to delete task.");
//       }

//       setTasks((previousTasks) =>
//         previousTasks.filter((item) => String(item.id || item._id) !== String(taskId))
//       );
//     } catch (error) {
//       console.error("Delete task error:", error);
//       alert(error.message || "Unable to delete task.");
//     }
//   };

//   const deleteAllTasks = async () => {
//     if (!selectedProjectId || selectedProjectTasks.length === 0) return;

//     const confirmed = window.confirm(
//       `Are you sure you want to delete ALL ${selectedProjectTasks.length} task(s) from "${getProjectName(
//         selectedProject
//       )}"? This action cannot be undone.`
//     );
//     if (!confirmed) return;

//     const token = getToken();
//     if (!token) {
//       navigate("/login");
//       return;
//     }

//     try {
//       let response = await fetch(
//         `${API_URL}/api/tasks/project/${selectedProjectId}`,
//         {
//           method: "DELETE",
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       if (!response.ok) {
//         response = await fetch(
//           `${API_URL}/api/projects/${selectedProjectId}/tasks`,
//           {
//             method: "DELETE",
//             headers: {
//               Authorization: `Bearer ${token}`,
//             },
//           }
//         );
//       }

//       if (!response.ok) {
//         const deletePromises = selectedProjectTasks.map((task) =>
//           fetch(`${API_URL}/api/tasks/${task.id || task._id}`, {
//             method: "DELETE",
//             headers: {
//               Authorization: `Bearer ${token}`,
//             },
//           })
//         );
//         await Promise.all(deletePromises);
//       }

//       setTasks((previousTasks) =>
//         previousTasks.filter(
//           (task) => String(task.project_id || task.projectId) !== String(selectedProjectId)
//         )
//       );
//     } catch (error) {
//       console.error("Delete all tasks error:", error);
//       alert(error.message || "Unable to delete all tasks.");
//     }
//   };

//   const handleLogout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("user");
//     localStorage.removeItem("userName");
//     navigate("/login");
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-[#eef1f3] flex items-center justify-center">
//         <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 flex items-center gap-3 text-sm text-slate-500 shadow-sm">
//           <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
//           Loading workspace...
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-[#eef1f3] text-slate-900 font-sans p-3 sm:p-5 antialiased">
//       <div className="max-w-[1450px] min-h-[calc(100vh-40px)] mx-auto bg-[#f7f8f9] rounded-[26px] border border-slate-200 overflow-hidden shadow-md flex flex-col">

//         {/* HEADER */}
//         <header className="h-[72px] bg-white border-b border-slate-200 px-5 sm:px-7 flex items-center justify-between shrink-0">
//           <div className="flex items-center gap-3">
//             <div className="w-9 h-9 rounded-xl bg-[#191e24] flex items-center justify-center text-sky-400 font-bold">
//               ✦
//             </div>
//             <div>
//               <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">
//                 Meeting Intelligence
//               </p>
//               <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">
//                 Good to see you, {userName}
//               </h1>
//             </div>
//           </div>

//           <div className="relative">
//             <button
//               onClick={() => setProfileOpen(!profileOpen)}
//               className="w-9 h-9 rounded-full bg-[#191e24] text-white text-xs font-bold flex items-center justify-center hover:ring-4 hover:ring-slate-100 transition-all"
//             >
//               {userName.charAt(0).toUpperCase()}
//             </button>

//             {profileOpen && (
//               <div className="absolute right-0 top-11 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50">
//                 <div className="px-3 py-2 border-b border-slate-100">
//                   <p className="text-xs font-bold truncate">{userName}</p>
//                   <p className="text-[10px] text-slate-400 mt-0.5">Workspace member</p>
//                 </div>
//                 <button
//                   onClick={handleLogout}
//                   className="w-full text-left px-3 py-2 mt-1 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50"
//                 >
//                   Sign out
//                 </button>
//               </div>
//             )}
//           </div>
//         </header>

//         {/* MAIN */}
//         <main className="flex-1 p-4 sm:p-5 flex flex-col min-h-0">
//           {projects.length === 0 ? (
//             <div className="flex-1 flex items-center justify-center">
//               <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center max-w-sm shadow-sm">
//                 <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-2xl mb-4">
//                   📁
//                 </div>
//                 <h2 className="text-base font-bold">No projects yet</h2>
//                 <p className="text-xs text-slate-500 mt-2 leading-relaxed">
//                   Create a project to start managing meeting tasks.
//                 </p>
//                 <button
//                   onClick={openCreateProject}
//                   className="mt-5 px-5 py-2.5 rounded-xl bg-[#191e24] text-white text-xs font-semibold hover:bg-slate-800"
//                 >
//                   + Create Project
//                 </button>
//               </div>
//             </div>
//           ) : (
//             <div className="flex-1 grid grid-cols-1 lg:grid-cols-[270px_1fr] gap-4 min-h-0">
              
//               {/* PROJECT LIST */}
//               <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col min-h-0">
//                 <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/60">
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <h2 className="text-xs font-bold uppercase tracking-wider">Projects</h2>
//                       <p className="text-[10px] text-slate-400 mt-0.5">Select a project</p>
//                     </div>
//                     <button
//                       onClick={openCreateProject}
//                       className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-[#191e24] hover:text-white text-slate-700 font-bold"
//                       title="Create Project"
//                     >
//                       +
//                     </button>
//                   </div>
//                 </div>

//                 <div className="flex-1 overflow-y-auto p-2">
//                   {projects.map((project) => {
//                     const projectId = getProjectId(project);
//                     const isSelected = String(projectId) === String(selectedProjectId);
//                     const projectTaskCount = tasks.filter(
//                       (task) => String(task.project_id || task.projectId) === String(projectId)
//                     ).length;

//                     return (
//                       <div
//                         key={projectId}
//                         className={`group rounded-xl mb-1 border transition-all ${
//                           isSelected
//                             ? "bg-slate-100 border-slate-300 shadow-sm"
//                             : "bg-transparent border-transparent hover:bg-slate-50"
//                         }`}
//                       >
//                         <button
//                           onClick={() => setSelectedProjectId(projectId)}
//                           className="w-full text-left p-3"
//                         >
//                           <div className="flex items-start gap-2.5">
//                             <div
//                               className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
//                                 isSelected ? "bg-white text-slate-800 shadow-sm" : "bg-slate-100 text-slate-500"
//                               }`}
//                             >
//                               📁
//                             </div>
//                             <div className="min-w-0 flex-1">
//                               <p className="text-xs font-semibold truncate text-slate-800">
//                                 {getProjectName(project)}
//                               </p>
//                               <p className="text-[10px] text-slate-500 mt-0.5">
//                                 {projectTaskCount} {projectTaskCount === 1 ? "task" : "tasks"}
//                               </p>
//                             </div>
//                           </div>
//                         </button>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </section>

//               {/* TASK & PROJECT DETAILS PANEL */}
//               <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col min-h-0">
//                 {selectedProject ? (
//                   <>
//                     <div className="px-5 py-4 border-b border-slate-100 bg-white">
//                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
//                         <div className="flex items-center gap-3 min-w-0">
//                           <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-base shrink-0">
//                             📁
//                           </div>
//                           <div className="min-w-0">
//                             <div className="flex items-center gap-2 flex-wrap">
//                               <h2 className="text-base font-bold text-slate-900 truncate">
//                                 {getProjectName(selectedProject)}
//                               </h2>
//                               {selectedProject.status && (
//                                 <span
//                                   className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
//                                     selectedProject.status === "Completed"
//                                       ? "bg-emerald-50 text-emerald-700 border-emerald-200"
//                                       : selectedProject.status === "In Progress"
//                                       ? "bg-blue-50 text-blue-700 border-blue-200"
//                                       : "bg-amber-50 text-amber-700 border-amber-200"
//                                   }`}
//                                 >
//                                   {selectedProject.status}
//                                 </span>
//                               )}
//                             </div>
//                             <p className="text-[11px] text-slate-400">Project details, meetings & tasks</p>
//                           </div>
//                         </div>

//                         <div className="flex items-center gap-2 flex-wrap">
//                           <button
//                             onClick={(e) => openEditProject(selectedProject, e)}
//                             className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
//                           >
//                             ✏ Edit Project
//                           </button>

//                           <button
//                             onClick={(e) => deleteProject(selectedProject, e)}
//                             className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-semibold transition-colors"
//                           >
//                             Delete Project
//                           </button>

//                           <div className="flex items-center gap-2">
//                             <button
//                               onClick={() => {
//                                 if (!selectedProjectId) {
//                                   alert("Please select a project first.");
//                                   return;
//                                 }
//                                 navigate(`/meeting/${selectedProjectId}`);
//                               }}
//                               className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-semibold transition"
//                             >
//                               + Meeting
//                             </button>

//                             <button
//                               onClick={openCreateTask}
//                               className="px-3.5 py-2 rounded-xl bg-[#191e24] hover:bg-slate-800 text-white text-[10px] font-semibold transition"
//                             >
//                               + Add Task
//                             </button>
//                           </div>
//                         </div>
//                       </div>

//                       <div className="mt-3.5 pt-3 border-t border-slate-100">
//                         <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
//                           Description
//                         </p>
//                         <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
//                           {selectedProject.description && selectedProject.description.trim()
//                             ? selectedProject.description
//                             : "No description provided for this project."}
//                         </p>
//                       </div>
//                     </div>

//                     {/* MEETINGS SECTION */}
//                     <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/40">
//                       <div className="flex items-center justify-between mb-2">
//                         <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
//                           Project Meetings ({selectedProjectMeetings.length})
//                         </span>
//                         <button
//                           onClick={() => navigate("/meeting")}
//                           className="text-[10px] font-semibold text-sky-600 hover:underline"
//                         >
//                           + New Meeting
//                         </button>
//                       </div>

//                       {meetingsLoading ? (
//                         <p className="text-[11px] text-slate-400 py-1">Loading meetings...</p>
//                       ) : selectedProjectMeetings.length === 0 ? (
//                         <p className="text-[11px] text-slate-400 italic py-1">No meetings recorded for this project yet.</p>
//                       ) : (
//                         <div className="space-y-2 mt-1">
//                           {selectedProjectMeetings.map((meeting) => {
//                             const meetingId = meeting.id || meeting._id;
//                             const meetingTitle = meeting.title || meeting.name || "Untitled Meeting";
//                             const meetingDate = formatDate(meeting.date || meeting.created_at);

//                             return (
//                               <div
//                                 key={meetingId}
//                                 className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition"
//                               >
//                                 <div className="min-w-0 flex-1">
//                                   <p className="text-xs font-semibold text-slate-800 truncate">{meetingTitle}</p>
//                                   {meetingDate && (
//                                     <p className="text-[10px] text-slate-400 mt-0.5">Date: {meetingDate}</p>
//                                   )}
//                                 </div>
//                                 <button
//                                   onClick={() => navigate(`/meeting/${meetingId}`)}
//                                   className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-semibold transition shrink-0"
//                                 >
//                                   View Meeting
//                                 </button>
//                               </div>
//                             );
//                           })}
//                         </div>
//                       )}
//                     </div>

//                     {/* STATUS BAR */}
//                     <div className="px-5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
//                       <div className="flex items-center gap-6">
//                         <div className="flex items-center gap-2">
//                           <span className="w-2 h-2 rounded-full bg-amber-400" />
//                           <span className="text-[10px] text-slate-400">Pending</span>
//                           <span className="text-xs font-bold">{taskCounts.pending}</span>
//                         </div>
//                         <div className="flex items-center gap-2">
//                           <span className="w-2 h-2 rounded-full bg-blue-500" />
//                           <span className="text-[10px] text-slate-400">In Progress</span>
//                           <span className="text-xs font-bold">{taskCounts.progress}</span>
//                         </div>
//                         <div className="flex items-center gap-2">
//                           <span className="w-2 h-2 rounded-full bg-emerald-500" />
//                           <span className="text-[10px] text-slate-400">Completed</span>
//                           <span className="text-xs font-bold">{taskCounts.completed}</span>
//                         </div>
//                       </div>

//                       {selectedProjectTasks.length > 0 && (
//                         <button
//                           onClick={deleteAllTasks}
//                           className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-red-600 transition-colors py-1 px-2 rounded-lg hover:bg-red-50/50"
//                         >
//                           Delete all tasks
//                         </button>
//                       )}
//                     </div>

//                     {/* TASK LIST */}
//                     <div className="flex-1 overflow-y-auto">
//                       {tasksLoading ? (
//                         <div className="h-full flex items-center justify-center">
//                           <div className="flex items-center gap-2 text-xs text-slate-400">
//                             <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
//                             Loading tasks...
//                           </div>
//                         </div>
//                       ) : selectedProjectTasks.length === 0 ? (
//                         <div className="h-full min-h-[300px] flex items-center justify-center">
//                           <div className="text-center">
//                             <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3">
//                               ✓
//                             </div>
//                             <h3 className="text-xs font-bold">No tasks yet</h3>
//                             <p className="text-[11px] text-slate-400 mt-1">
//                               Add a task to start tracking this project.
//                             </p>
//                             <button
//                               onClick={openCreateTask}
//                               className="mt-4 px-4 py-2 rounded-xl bg-[#191e24] text-white text-[10px] font-semibold"
//                             >
//                               + Add Task
//                             </button>
//                           </div>
//                         </div>
//                       ) : (
//                         <div className="divide-y divide-slate-100">
//                           {sortedTasks.map((task) => {
//                             const taskId = task.id || task._id;
//                             const taskStatus = getTaskStatus(task);
//                             const dueDate = formatDate(task.due_date || task.dueDate || task.deadline);

//                             let statusClass = "bg-amber-50 text-amber-700 border border-amber-200";
//                             if (taskStatus === "In Progress") {
//                               statusClass = "bg-blue-50 text-blue-700 border border-blue-200";
//                             }
//                             if (taskStatus === "Completed") {
//                               statusClass = "bg-emerald-50 text-emerald-700 border border-emerald-200";
//                             }

//                             return (
//                               <div
//                                 key={taskId}
//                                 className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors group"
//                               >
//                                 <div
//                                   className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
//                                     taskStatus === "Completed" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
//                                   }`}
//                                 >
//                                   {taskStatus === "Completed" ? "✓" : "○"}
//                                 </div>

//                                 <div className="flex-1 min-w-0">
//                                   <p
//                                     className={`text-xs font-semibold truncate ${
//                                       taskStatus === "Completed" ? "text-slate-400 line-through" : "text-slate-800"
//                                     }`}
//                                   >
//                                     {task.title || task.name || "Untitled Task"}
//                                   </p>
//                                   <div className="flex items-center gap-2 mt-0.5">
//                                     {task.priority && (
//                                       <span className="text-[10px] text-slate-400">
//                                         Priority: <span className="text-slate-600">{task.priority}</span>
//                                       </span>
//                                     )}
//                                     {dueDate && (
//                                       <span className="text-[10px] text-slate-400">
//                                         • Due <span className="text-slate-600">{dueDate}</span>
//                                       </span>
//                                     )}
//                                   </div>
//                                 </div>

//                                 <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap ${statusClass}`}>
//                                   {taskStatus}
//                                 </span>

//                                 {/* MODERN ICON ACTION BUTTONS */}
//                                 <div className="flex items-center gap-1">
//                                   <button
//                                     onClick={(e) => openEditTask(task, e)}
//                                     className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shadow-2xs"
//                                     title="Edit Task"
//                                   >
//                                     <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
//                                       <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                                     </svg>
//                                   </button>
//                                   <button
//                                     onClick={(e) => deleteTask(task, e)}
//                                     className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors shadow-2xs"
//                                     title="Delete Task"
//                                   >
//                                     <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
//                                       <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                                     </svg>
//                                   </button>
//                                 </div>
//                               </div>
//                             );
//                           })}
//                         </div>
//                       )}
//                     </div>
//                   </>
//                 ) : (
//                   <div className="flex-1 flex items-center justify-center">
//                     <div className="text-center">
//                       <p className="text-sm font-semibold text-slate-700">Select a project</p>
//                       <p className="text-xs text-slate-400 mt-1">Choose a project to see its tasks and meetings.</p>
//                     </div>
//                   </div>
//                 )}
//               </section>
//             </div>
//           )}
//         </main>
//       </div>

//       {/* PROJECT MODAL */}
//       {projectModalOpen && (
//         <div
//           className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
//           onClick={closeProjectModal}
//         >
//           <div
//             className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="flex items-center justify-between mb-5">
//               <div>
//                 <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
//                   {editingProject ? "Project" : "New Project"}
//                 </span>
//                 <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
//                   {editingProject ? "Edit Project" : "Create Project"}
//                 </h2>
//               </div>
//               <button onClick={closeProjectModal} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600">
//                 ✕
//               </button>
//             </div>

//             <form onSubmit={saveProject} className="space-y-4">
//               <div>
//                 <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
//                   Project Name
//                 </label>
//                 <input
//                   type="text"
//                   value={projectName}
//                   onChange={(e) => setProjectName(e.target.value)}
//                   placeholder="e.g. Meeting AI Intelligence"
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
//                   autoFocus
//                 />
//               </div>

//               <div>
//                 <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
//                   Description
//                 </label>
//                 <textarea
//                   value={projectDescription}
//                   onChange={(e) => setProjectDescription(e.target.value)}
//                   placeholder="Describe this project..."
//                   rows="3"
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none resize-none"
//                 />
//               </div>

//               <div>
//                 <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
//                   Status
//                 </label>
//                 <select
//                   value={projectStatus}
//                   onChange={(e) => setProjectStatus(e.target.value)}
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
//                 >
//                   <option value="Pending">Pending</option>
//                   <option value="In Progress">In Progress</option>
//                   <option value="Completed">Completed</option>
//                 </select>
//               </div>

//               <div className="flex gap-2 pt-2">
//                 <button
//                   type="submit"
//                   disabled={projectSaving}
//                   className="flex-1 py-3 rounded-xl bg-[#191e24] text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
//                 >
//                   {projectSaving ? "Saving..." : editingProject ? "Save Changes" : "Create Project"}
//                 </button>
//                 <button
//                   type="button"
//                   onClick={closeProjectModal}
//                   className="px-5 py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* UNIFIED TASK MODAL */}
//       {taskModalOpen && (
//         <div
//           className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
//           onClick={closeTaskModal}
//         >
//           <div
//             className="w-full max-w-[500px] max-h-[92vh] overflow-y-auto bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="flex items-start justify-between mb-5">
//               <div>
//                 <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
//                   {editingTask ? "Task" : "New Task"}
//                 </span>
//                 <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
//                   {editingTask ? "Edit Task" : "Create Task"}
//                 </h2>
//                 <p className="text-xs text-slate-500 mt-1">
//                   {editingTask ? "Update the task details below." : "Organize your project work seamlessly."}
//                 </p>
//               </div>

//               <button
//                 type="button"
//                 onClick={closeTaskModal}
//                 className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
//               >
//                 ✕
//               </button>
//             </div>

//             <form onSubmit={saveTask} className="space-y-4">
//               <div>
//                 <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
//                   Task Title *
//                 </label>
//                 <input
//                   type="text"
//                   value={title}
//                   onChange={(e) => setTitle(e.target.value)}
//                   placeholder="e.g. Prepare meeting notes"
//                   required
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-800"
//                 />
//               </div>

//               <div>
//                 <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
//                   Description *
//                 </label>
//                 <textarea
//                   value={description}
//                   onChange={(e) => setDescription(e.target.value)}
//                   placeholder="Describe the task..."
//                   required
//                   rows="3"
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none resize-none focus:border-slate-800"
//                 />
//               </div>

//               <div className="grid grid-cols-2 gap-3">
//                 <div>
//                   <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
//                     Priority
//                   </label>
//                   <select
//                     value={priority}
//                     onChange={(e) => setPriority(e.target.value)}
//                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
//                   >
//                     <option value="Low">Low</option>
//                     <option value="Medium">Medium</option>
//                     <option value="High">High</option>
//                   </select>
//                 </div>

//                 <div>
//                   <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
//                     Status
//                   </label>
//                   <select
//                     value={status}
//                     onChange={(e) => setStatus(e.target.value)}
//                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
//                   >
//                     <option value="Pending">Pending</option>
//                     <option value="In Progress">In Progress</option>
//                     <option value="Completed">Completed</option>
//                   </select>
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
//                   Due Date
//                 </label>
//                 <input
//                   type="date"
//                   value={dueDate}
//                   onChange={(e) => setDueDate(e.target.value)}
//                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
//                 />
//               </div>

//               <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer py-1">
//                 <input
//                   type="checkbox"
//                   checked={isRecurring}
//                   onChange={(e) => setIsRecurring(e.target.checked)}
//                   className="w-4 h-4 accent-slate-900"
//                 />
//                 Recurring Task
//               </label>

//               {isRecurring && (
//                 <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
//                   <div className="mb-3">
//                     <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
//                       Repeat Frequency
//                     </label>
//                     <select
//                       value={repeatType}
//                       onChange={(e) => setRepeatType(e.target.value)}
//                       className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"
//                     >
//                       <option value="Monthly">Monthly</option>
//                       <option value="Weekly">Weekly</option>
//                     </select>
//                   </div>

//                   <div className="grid grid-cols-2 gap-2.5">
//                     <div>
//                       <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
//                         Months
//                       </label>
//                       <button
//                         type="button"
//                         onClick={() => {
//                           setShowMonths(!showMonths);
//                           setShowDays(false);
//                         }}
//                         className="w-full flex justify-between items-center px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
//                       >
//                         <span>{repeatMonths.length > 0 ? `${repeatMonths.length} selected` : "Select Months"}</span>
//                         <span>{showMonths ? "▲" : "▼"}</span>
//                       </button>

//                       {showMonths && (
//                         <div className="bg-white border border-slate-200 rounded-lg max-h-32 overflow-y-auto p-1.5 mt-1.5 shadow-sm">
//                           {months.map((month) => (
//                             <label key={month} className="flex items-center gap-2 p-1 text-xs cursor-pointer hover:bg-slate-50">
//                               <input
//                                 type="checkbox"
//                                 checked={repeatMonths.includes(month)}
//                                 onChange={() => toggleMonthSelection(month)}
//                                 className="accent-slate-900"
//                               />
//                               {month}
//                             </label>
//                           ))}
//                         </div>
//                       )}
//                     </div>

//                     <div>
//                       <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
//                         Days
//                       </label>
//                       <button
//                         type="button"
//                         onClick={() => {
//                           setShowDays(!showDays);
//                           setShowMonths(false);
//                         }}
//                         className="w-full flex justify-between items-center px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
//                       >
//                         <span>{repeatDays.length > 0 ? `${repeatDays.length} selected` : "Select Days"}</span>
//                         <span>{showDays ? "▲" : "▼"}</span>
//                       </button>

//                       {showDays && (
//                         <div className="bg-white border border-slate-200 rounded-lg max-h-32 overflow-y-auto p-1.5 mt-1.5 shadow-sm">
//                           {days.map((day) => (
//                             <label key={day} className="flex items-center gap-2 p-1 text-xs cursor-pointer hover:bg-slate-50">
//                               <input
//                                 type="checkbox"
//                                 checked={repeatDays.includes(day)}
//                                 onChange={() => toggleDaySelection(day)}
//                                 className="accent-slate-900"
//                               />
//                               {day}
//                             </label>
//                           ))}
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               )}

//               <div className="flex gap-2 pt-2">
//                 <button
//                   type="submit"
//                   disabled={taskSaving}
//                   className="flex-1 py-3 rounded-xl bg-[#191e24] text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
//                 >
//                   {taskSaving ? "Saving..." : editingTask ? "Save Changes" : "Save Task"}
//                 </button>
//                 <button
//                   type="button"
//                   onClick={closeTaskModal}
//                   className="px-5 py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }