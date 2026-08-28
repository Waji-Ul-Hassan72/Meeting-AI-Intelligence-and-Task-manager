const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const { processMeetingAudio } = require("../controllers/aiPipelineController");

const router = express.Router();

// ==========================================
// MULTER CONFIGURATION
// ==========================================
const upload = multer({ dest: "uploads/" });

// ==========================================
// PROCESS MEETING AUDIO
// ==========================================
router.post(
  "/process",
  authMiddleware,
  upload.single("file"),
  processMeetingAudio
);

module.exports = router;