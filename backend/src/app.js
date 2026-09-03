// ============================================================
// Load Environment Variables
// ============================================================

require("dotenv").config();

// ============================================================
// Imports
// ============================================================

const express = require("express");
const path = require("path");
const cors = require("cors");
const passport = require("passport");
const helmet = require("helmet");

// ============================================================
// Passport Configuration
// ============================================================

require("./config/passport");

// ============================================================
// Route Imports
// ============================================================

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const transcriptionRoutes = require("./routes/transcriptionRoutes");
const aiPipelineRoutes = require("./routes/aiPipelineRoutes");
const projectMemberRoutes = require("./routes/projectMemberRoutes");
const teamRoutes = require("./routes/teamRoutes");
const projectInvitationRoutes = require("./routes/projectInvitationRoutes");
const emailRoutes = require("./routes/emailRoutes");
// ============================================================
// Initialize Express
// ============================================================

const app = express();

// ============================================================
// Trust Proxy
// ============================================================

if (process.env.NODE_ENV === "production") {
    app.enable("trust proxy");
}

// ============================================================
// Security
// ============================================================

app.use(helmet());

// ============================================================
// HTTPS Redirect - Production Only
// ============================================================

app.use((req, res, next) => {
    if (
        process.env.NODE_ENV === "production" &&
        req.headers["x-forwarded-proto"] !== "https"
    ) {
        return res.redirect(
            `https://${req.headers.host}${req.url}`
        );
    }

    next();
});

// ============================================================
// CORS
// ============================================================

const rawClientUrl =
    process.env.CLIENT_URL || "http://localhost:5173";

const CLIENT_URL = rawClientUrl.replace(/\/+$/, "");

app.use(
    cors({
        origin: CLIENT_URL,
        credentials: true,

        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]
    })
);

// ============================================================
// Body Parsers
// ============================================================

app.use(express.json({ limit: "10mb" }));

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);

// ============================================================
// Passport
// ============================================================

app.use(passport.initialize());

// ============================================================
// API Routes
// ============================================================

app.use("/api/auth", authRoutes);

app.use("/api/projects", projectRoutes);

app.use("/api/tasks", taskRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/meetings", meetingRoutes);

app.use("/api/transcription", transcriptionRoutes);

app.use("/api/ai-pipeline", aiPipelineRoutes);

app.use("/api/email", emailRoutes);

// Project members use /api/projects/:projectId/...
app.use("/api/projects", projectMemberRoutes);

app.use("/api/teams", teamRoutes);

app.use(
    "/api/project-invitations",
    projectInvitationRoutes
);

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

// ============================================================
// Health Check
// ============================================================

app.get("/", (req, res) => {
    res.status(200).json({
        status: "success",
        message: "API is running successfully"
    });
});

// ============================================================
// 404 Handler
// ============================================================

app.use((req, res) => {
    res.status(404).json({
        error: "Route not found",
        path: req.originalUrl
    });
});

// ============================================================
// Global Error Handler
// ============================================================

app.use((err, req, res, next) => {
    console.error("🔥 Global Error:");

    console.error(err);

    const statusCode = err.status || 500;

    res.status(statusCode).json({
        error:
            process.env.NODE_ENV === "production"
                ? "Internal Server Error"
                : err.message || "Internal Server Error"
    });
});

// ============================================================
// Export App
// ============================================================

module.exports = app;