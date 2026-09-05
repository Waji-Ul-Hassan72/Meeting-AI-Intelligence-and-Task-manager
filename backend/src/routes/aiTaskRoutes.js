const express = require("express");

const {
    assignTaskFromAI,
} = require("../controllers/aiTaskController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
    "/assign",
    authMiddleware,
    assignTaskFromAI
);

module.exports = router;