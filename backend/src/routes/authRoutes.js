const express = require("express");
const router = express.Router();

const {
    signup,
    login,
    googleLogin,
    verifyEmail,
    getPublicKey,
} = require("../controllers/authController");

// ============================================================
// NORMAL AUTHENTICATION
// ============================================================

router.get("/public-key", getPublicKey);
router.post("/signup", signup);
router.post("/login", login);
router.get("/verify-email", verifyEmail);

// ============================================================
// GOOGLE LOGIN
// ============================================================

router.post("/google", googleLogin);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;