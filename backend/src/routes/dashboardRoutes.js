const express = require("express");
const router = express.Router();

const { getDashboardStats } = require("../controllers/dashboardController");
const authMiddleware = require("../middleware/authMiddleware");

// @route   GET /api/dashboard
// @desc    Get aggregated dashboard analytics and stats
// @access  Private
router.get("/", authMiddleware, getDashboardStats);

module.exports = router;