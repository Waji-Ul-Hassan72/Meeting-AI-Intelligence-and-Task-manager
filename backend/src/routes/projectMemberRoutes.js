const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
    getDevelopers,
    getProjectMembers,
    addProjectMember,
    removeProjectMember
} = require("../controllers/projectMemberController");


// ==========================================
// AUTHENTICATION
// ==========================================

router.use(authMiddleware);


// ==========================================
// GET ALL DEVELOPERS
// ==========================================
// GET /api/users/developers
// ==========================================

router.get("/developers", getDevelopers);


// ==========================================
// GET PROJECT MEMBERS
// ==========================================
// GET /api/projects/:projectId/members
// ==========================================

router.get(
    "/projects/:projectId/members",
    getProjectMembers
);


// ==========================================
// ADD MEMBER
// ==========================================
// POST /api/projects/:projectId/members
// ==========================================

router.post(
    "/projects/:projectId/members",
    addProjectMember
);


// ==========================================
// REMOVE MEMBER
// ==========================================
// DELETE /api/projects/:projectId/members/:userId
// ==========================================

router.delete(
    "/projects/:projectId/members/:userId",
    removeProjectMember
);


module.exports = router;