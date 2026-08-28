const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
    getTeamMembers,
    addTeamMember,
    removeTeamMember,
} = require("../controllers/teamController");


// ==========================================
// AUTHENTICATION
// ==========================================

router.use(authMiddleware);


// ==========================================
// GET TEAM MEMBERS
// ==========================================

router.get("/", getTeamMembers);


// ==========================================
// ADD MEMBER TO PROJECT
// ==========================================

router.post("/members", addTeamMember);


// ==========================================
// REMOVE MEMBER FROM PROJECT
// ==========================================

router.delete(
    "/:projectId/members/:userId",
    removeTeamMember
);


module.exports = router;