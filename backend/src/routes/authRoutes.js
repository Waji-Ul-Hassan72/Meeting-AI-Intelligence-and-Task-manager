const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");

const {
    signup,
    login,
    verifyEmail,
    getPublicKey
} = require("../controllers/authController");

// Dynamic Client URL fallback for flexibility across dev/prod environments
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// =====================
// Normal Authentication
// =====================

router.get("/public-key", getPublicKey);
router.post("/signup", signup);
router.post("/login", login);
router.get("/verify-email", verifyEmail);

// =====================
// Google OAuth Routes
// =====================

// Initiate Google Authentication
router.get(
    "/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
        session: false
    })
);

// Google OAuth Callback Handler
router.get(
    "/google/callback",
    passport.authenticate("google", {
        session: false,
        failureRedirect: `${CLIENT_URL}/login?error=oauth_failed`
    }),
    (req, res) => {
        try {
            if (!req.user) {
                return res.redirect(`${CLIENT_URL}/login?error=user_not_found`);
            }

            const token = jwt.sign(
                {
                    id: req.user.id,
                    email: req.user.email
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: process.env.JWT_EXPIRES_IN || "1d"
                }
            );

            // Redirect to frontend auth handler route
            return res.redirect(`${CLIENT_URL}/google-success?token=${token}`);
        } catch (error) {
            return res.redirect(`${CLIENT_URL}/login?error=token_generation_failed`);
        }
    }
);

module.exports = router;