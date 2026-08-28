const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
    inviteProjectMember,
} = require("../controllers/projectInvitationController");

// ============================================================
// ALL PROJECT INVITATION ROUTES REQUIRE LOGIN
// ============================================================

router.use(authMiddleware);

// ============================================================
// MANAGER SENDS INVITATION
//
// POST
// /api/project-invitations
// ============================================================

router.post(
    "/",
    inviteProjectMember
);

module.exports = router;