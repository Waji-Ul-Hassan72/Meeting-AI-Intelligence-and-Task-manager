const express = require("express");
const router = express.Router();

const {
    createTask,
    getTasks,
    getTasksByProject,
    getTaskById,
    updateTask,
    deleteTask,
    deleteAllProjectTasks
} = require("../controllers/taskController");

const authMiddleware = require("../middleware/authMiddleware");

// Apply authentication middleware globally to all task endpoints
router.use(authMiddleware);

// ===============================
// Task Endpoints
// ===============================

// Create Task (Single or Recurring Bulk Creation)
router.post("/", createTask);

// Get All Tasks for Logged-In User (Paginated & Sorted)
router.get("/", getTasks);

// Get Tasks for a Specific Project (Paginated)
router.get("/project/:projectId", getTasksByProject);

// Delete All Tasks in a Specific Project
router.delete("/project/:projectId/all", deleteAllProjectTasks);

// Get Single Task Details
router.get("/:id", getTaskById);

// Update Existing Task
router.put("/:id", updateTask);

// Delete Single Task
router.delete("/:id", deleteTask);

module.exports = router;