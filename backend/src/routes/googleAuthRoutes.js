const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");

const router = express.Router();
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ===============================
// Start Google Login
// ===============================
router.get(
    "/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
        session: false
    })
);

// ===============================
// Google Callback
// ===============================
router.get(
    "/google/callback",
    passport.authenticate("google", {
        session: false,
        failureRedirect: `${CLIENT_URL}/login`
    }),
    (req, res) => {
        try {
            console.log("========== GOOGLE LOGIN ==========");
            console.log("Authenticated User:", req.user);

            if (!req.user) {
                console.log("Google Authentication Failed: User missing in req");
                return res.redirect(`${CLIENT_URL}/login`);
            }

            // Create JWT Token
            const token = jwt.sign(
                {
                    id: req.user.id,
                    user_id: req.user.id,
                    email: req.user.email,
                    full_name: req.user.full_name
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: process.env.JWT_EXPIRES_IN || "1d"
                }
            );

            console.log("JWT Token Created Successfully.");

            // Redirect to React App with token
            return res.redirect(`${CLIENT_URL}/google-success?token=${token}`);

        } catch (error) {
            console.error("Google Callback Error:", error.message);
            return res.redirect(`${CLIENT_URL}/login`);
        }
    }
);

module.exports = router;