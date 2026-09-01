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

// IMPORTANT:
// upload.js exports:
// module.exports = { uploadTaskAttachment };
//
// Therefore we must destructure it here.
const {
    uploadTaskAttachment
} = require("../middleware/upload");

// ============================================================
// AUTHENTICATION
// ============================================================

// Apply authentication middleware to all task endpoints.
router.use(authMiddleware);

// ============================================================
// CREATE TASK
// ============================================================

// Attachment is optional.
// If no file is selected, the task will still be created.
router.post(
    "/",
    uploadTaskAttachment.single("attachment"),
    createTask
);

// ============================================================
// GET ALL TASKS
// ============================================================

router.get(
    "/",
    getTasks
);

// ============================================================
// GET PROJECT TASKS
// ============================================================

router.get(
    "/project/:projectId",
    getTasksByProject
);

// ============================================================
// DELETE ALL PROJECT TASKS
// ============================================================

router.delete(
    "/project/:projectId/all",
    deleteAllProjectTasks
);

// ============================================================
// GET SINGLE TASK
// ============================================================

router.get(
    "/:id",
    getTaskById
);

// ============================================================
// UPDATE TASK
// ============================================================

// Attachment can optionally be uploaded while updating.
router.put(
    "/:id",
    uploadTaskAttachment.single("attachment"),
    updateTask
);

// ============================================================
// DELETE SINGLE TASK
// ============================================================

router.delete(
    "/:id",
    deleteTask
);

// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;

