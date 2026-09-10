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
// PUBLIC KEY
// ============================================================

router.get("/public-key", getPublicKey);

// ============================================================
// NORMAL AUTHENTICATION
// ============================================================

router.post("/signup", signup);

router.post("/login", login);

router.get("/verify-email", verifyEmail);

// ============================================================
// GOOGLE AUTHENTICATION
// ============================================================

router.post("/google", googleLogin);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;