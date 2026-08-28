
const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
    createProject,
    getProjects,
    getProjectById,
    getProjectMembers,
    updateProject,
    deleteProject
} = require("../controllers/projectController");

// ==========================================
// Apply authentication middleware
// ==========================================

router.use(authMiddleware);

// ==========================================
// PROJECT ENDPOINTS
// ==========================================

// Create a new project
router.post("/", createProject);

// Get all projects
router.get("/", getProjects);

// ==========================================
// PROJECT TEAM MEMBERS
// IMPORTANT: Keep this BEFORE /:id
// ==========================================

router.get(
    "/:projectId/members",
    getProjectMembers
);

// Get single project
router.get(
    "/:id",
    getProjectById
);

// Update project
router.put(
    "/:id",
    updateProject
);

// Delete project
router.delete(
    "/:id",
    deleteProject
);

module.exports = router;

