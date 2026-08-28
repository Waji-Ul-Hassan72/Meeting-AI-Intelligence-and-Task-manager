const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createMeeting,
  getMeetings,
  getMeetingById,
  updateMeeting,
  deleteMeeting,
} = require("../controllers/meetingController");

// ==========================================
// Authentication
// ==========================================

router.use(authMiddleware);

// ==========================================
// MEETING ROUTES
// ==========================================

// Create meeting
// POST /api/meetings
router.post("/", createMeeting);

// Get all meetings
// GET /api/meetings
router.get("/", getMeetings);

// Get single meeting
// GET /api/meetings/:id
router.get("/:id", getMeetingById);

// Update meeting
// PUT /api/meetings/:id
router.put("/:id", updateMeeting);

// Delete meeting
// DELETE /api/meetings/:id
router.delete("/:id", deleteMeeting);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;