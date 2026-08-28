
const express = require("express");
const router = express.Router();
const multer = require("multer");

const authMiddleware = require("../middleware/authMiddleware");

const {
  transcribeMeetingAudio,
} = require("../controllers/transcriptionController");

// ============================================================
// MULTER CONFIGURATION
// ============================================================

const upload = multer({
  dest: "uploads/",
});

// ============================================================
// TRANSCRIBE MEETING
// ============================================================

router.post(
  "/transcribe",
  authMiddleware,
  upload.single("file"),
  transcribeMeetingAudio
);

module.exports = router;

