import { Routes, Route } from "react-router-dom";

// =======================
// Authentication Pages
// =======================
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import GoogleSuccess from "./pages/GoogleSuccess";
import VerifyEmail from "./pages/VerifyEmail";
// =======================
// Dashboard Pages
// =======================
//import Dashboard from "./pages/Dashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import MemberDashboard from "./pages/MemberDashboard";

// =======================
// Project Pages
// =======================
import Project from "./pages/Project";
import Projects from "./pages/Projects";


import ProjectDetails from "./pages/ProjectDetails";

// =======================
// Task Pages
// =======================
import Task from "./pages/Task";
import Tasks from "./pages/Tasks";

// =======================
// Meeting Pages
// =======================
import Meeting from "./pages/Meeting";
import MeetingDetails from "./pages/MeetingDetails";
import Teams from "./pages/Teams";

import AcceptInvitation from "./pages/AcceptInvitation";
import Transcription from "./pages/Transcription";

// =======================
// Authentication Protection
// =======================
import ProtectedRoute from "./components/ProtectedRoutes";


function Unauthorized() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-lg p-8 text-center">
        
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-100 flex items-center justify-center">
          <span className="text-2xl text-red-600">
            !
          </span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900">
          Access Denied
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          You do not have permission to access this page.
        </p>

        <button
          onClick={() => window.history.back()}
          className="mt-6 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition"
        >
          Go Back
        </button>

      </div>
    </div>
  );
}


function App() {
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 antialiased">

      <Routes>

        {/* ==========================================
            PUBLIC ROUTES
        ========================================== */}

        <Route
          path="/"
          element={<Signup />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

          <Route path="/verify-email" element={<VerifyEmail />} />

        <Route
          path="/google-success"
          element={<GoogleSuccess />}
        />


        {/* ==========================================
            UNAUTHORIZED
        ========================================== */}

        <Route
          path="/unauthorized"
          element={<Unauthorized />}
        />
      

        <Route
  path="/accept-invitation/:token"
  element={<AcceptInvitation />}
/>


        {/* ==========================================
            GENERAL DASHBOARD
        ========================================== */}

        {/* <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        /> */}
         
         <Route path="/teams" element={<Teams />} />

        {/* ==========================================
            PROJECT MANAGER DASHBOARD
        ========================================== */}

        <Route
          path="/manager-dashboard"
          element={
            <ProtectedRoute
              allowedRoles={["Project Manager"]}
            >
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />


        {/* ==========================================
            DEVELOPER / MEMBER DASHBOARD
        ========================================== */}

        <Route
          path="/member-dashboard"
          element={
            <ProtectedRoute
              allowedRoles={["Developer"]}
            >
              <MemberDashboard />
            </ProtectedRoute>
          }
        />


        {/* ==========================================
            PROJECT ROUTES
        ========================================== */}

        {/* Create New Project */}
        <Route
          path="/project"
          element={
            <ProtectedRoute>
              <Project />
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          }
        />

        {/* Project Details */}
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <ProjectDetails />
            </ProtectedRoute>
          }
        />


        {/* ==========================================
            TASK ROUTES
        ========================================== */}

        {/* Add Task */}
        <Route
          path="/add-task/:projectId"
          element={
            <ProtectedRoute>
              <Task />
            </ProtectedRoute>
          }
        />

        {/* All Tasks */}
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          }
        />

        {/* Project Tasks */}
        <Route
          path="/tasks/:projectId"
          element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          }
        />


        {/* ==========================================
            MEETING ROUTES
        ========================================== */}

        {/* General Meeting */}
        <Route
          path="/meeting"
          element={
            <ProtectedRoute>
              <Meeting />
            </ProtectedRoute>
          }
        />

        <Route
  path="/projects/:projectId/transcription"
  element={
    <ProtectedRoute>
      <Transcription />
    </ProtectedRoute>
  }
/>

        {/* Project Meeting */}
        <Route
          path="/meeting/:projectId"
          element={
            <ProtectedRoute>
              <Meeting />
            </ProtectedRoute>
          }
        />

        {/* Meeting Details */}
        <Route
          path="/meeting-details/:id"
          element={
            <ProtectedRoute>
              <MeetingDetails />
            </ProtectedRoute>
          }
        />

      </Routes>

    </div>
  );
}

export default App;