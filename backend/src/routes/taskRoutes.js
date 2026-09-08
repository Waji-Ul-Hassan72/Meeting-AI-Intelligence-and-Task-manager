const express = require("express");
const router = express.Router();

const {
    createTask,
    getTasks,
    getTasksByProject,
    getTaskById,
    updateTask,
    deleteTask,
    deleteAllProjectTasks,
    deleteAllPermanentProjectTasks,
    getTrashedTasks,
    restoreTask,
    permanentlyDeleteTask
} = require("../controllers/taskController");

const authMiddleware = require("../middleware/authMiddleware");

const {
    uploadTaskAttachment
} = require("../middleware/upload");

router.use(authMiddleware);

// ============================================================
// CREATE TASK
// ============================================================

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
// GET TRASHED TASKS
// ============================================================

router.get(
    "/trash",
    getTrashedTasks
);

// ============================================================
// PERMANENTLY DELETE ALL TRASHED PROJECT TASKS
// ============================================================

router.delete(
    "/project/:projectId/trash/all",
    deleteAllPermanentProjectTasks
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

router.put(
    "/:id",
    uploadTaskAttachment.single("attachment"),
    updateTask
);

// ============================================================
// RESTORE TASK FROM TRASH
// ============================================================

router.put(
    "/:id/restore",
    restoreTask
);

// ============================================================
// PERMANENTLY DELETE TASK
// ============================================================

router.delete(
    "/:id/permanent",
    permanentlyDeleteTask
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