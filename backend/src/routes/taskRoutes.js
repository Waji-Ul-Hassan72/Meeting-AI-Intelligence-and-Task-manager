
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

const uploadTaskAttachment = require(
    "../middleware/upload"
);


// ============================================================
// AUTHENTICATION
// ============================================================

router.use(authMiddleware);


// ============================================================
// CREATE TASK
// ============================================================

// If no attachment is selected, the task is still created.

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
// An attachment can optionally be uploaded while updating
// the task.



router.put(
    "/:id",
    uploadTaskAttachment.single("attachment"),
    updateTask
);


// ============================================================
// DELETE SINGLE TASK
// ============================================================

// Delete one task.

router.delete(
    "/:id",
    deleteTask
);


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;

