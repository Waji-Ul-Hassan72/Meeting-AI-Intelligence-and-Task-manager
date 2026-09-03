const express = require("express");

const {
  createEmailDraft,
  updateEmailDraft,
  approveEmailDraft,
  sendEmail,
} = require("../controllers/emailController");

// Use the SAME authentication middleware
// that you already use in your other protected routes.
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Create email draft
router.post("/draft", authMiddleware, createEmailDraft);

// Update email draft
router.put("/draft", authMiddleware, updateEmailDraft);

// Approve email draft
router.post("/draft/approve", authMiddleware, approveEmailDraft);

// Send approved email
router.post("/send", authMiddleware, sendEmail);

module.exports = router;