const db = require("../config/db");

// ==========================================
// GET USER ID FROM JWT
// ==========================================

const getUserId = (req) =>
    req.user?.id ||
    req.user?.userId ||
    req.user?.user_id;


// ==========================================
// GET TEAM MEMBERS
// ==========================================

const getTeamMembers = async (req, res) => {
    try {
        const managerId = getUserId(req);

        if (!managerId) {
            return res.status(401).json({
                error: "User authentication missing or invalid token."
            });
        }

        const result = await db.query(
            `
            SELECT DISTINCT
                u.id,
                u.name,
                u.email,
                u.role,
                pm.joined_at,
                p.id AS project_id,
                p.name AS project_name

            FROM project_members pm

            INNER JOIN users u
                ON u.id = pm.user_id

            INNER JOIN projects p
                ON p.id = pm.project_id

            WHERE p.created_by = $1

            ORDER BY u.name ASC
            `,
            [managerId]
        );

        res.status(200).json(result.rows);

    } catch (error) {
        console.error(
            "❌ Error fetching team members:",
            error.message
        );

        res.status(500).json({
            error: "Failed to fetch team members."
        });
    }
};


// ==========================================
// ADD MEMBER TO PROJECT
// ==========================================

const addTeamMember = async (req, res) => {
    try {
        const managerId = getUserId(req);

        if (!managerId) {
            return res.status(401).json({
                error: "User authentication missing or invalid token."
            });
        }

        const { email, project_id } = req.body;

        // ------------------------------------------
        // VALIDATION
        // ------------------------------------------

        if (!email || !project_id) {
            return res.status(400).json({
                error: "Member email and project are required."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        // ------------------------------------------
        // FIND USER
        // ------------------------------------------

        const userResult = await db.query(
            `
            SELECT id, name, email, role
            FROM users
            WHERE LOWER(email) = $1
            `,
            [cleanEmail]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: "No user found with this email address."
            });
        }

        const member = userResult.rows[0];

        // ------------------------------------------
        // CHECK PROJECT BELONGS TO MANAGER
        // ------------------------------------------

        const projectResult = await db.query(
            `
            SELECT id, name
            FROM projects
            WHERE id = $1
            AND created_by = $2
            `,
            [project_id, managerId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(403).json({
                error:
                    "You are not authorized to add members to this project."
            });
        }

        const project = projectResult.rows[0];

        // ------------------------------------------
        // DON'T ALLOW MANAGER TO ADD THEMSELVES
        // ------------------------------------------

        if (String(member.id) === String(managerId)) {
            return res.status(400).json({
                error: "You cannot add yourself as a team member."
            });
        }

        // ------------------------------------------
        // CHECK IF ALREADY MEMBER
        // ------------------------------------------

        const existingMember = await db.query(
            `
            SELECT id
            FROM project_members
            WHERE project_id = $1
            AND user_id = $2
            `,
            [project_id, member.id]
        );

        if (existingMember.rows.length > 0) {
            return res.status(409).json({
                error:
                    `${member.name} is already a member of this project.`
            });
        }

        // ------------------------------------------
        // ADD MEMBER
        // ------------------------------------------

        const insertResult = await db.query(
            `
            INSERT INTO project_members
            (
                project_id,
                user_id,
                joined_at
            )
            VALUES
            (
                $1,
                $2,
                NOW()
            )
            RETURNING *
            `,
            [project_id, member.id]
        );

        // ------------------------------------------
        // RESPONSE
        // ------------------------------------------

        res.status(201).json({
            message: "Team member added successfully.",

            member: {
                id: member.id,
                name: member.name,
                email: member.email,
                role: member.role,
            },

            project: {
                id: project.id,
                name: project.name,
            },

            membership: insertResult.rows[0],
        });

    } catch (error) {
        console.error(
            "❌ Error adding team member:",
            error.message
        );

        res.status(500).json({
            error: "Failed to add team member."
        });
    }
};


// ==========================================
// REMOVE MEMBER FROM PROJECT
// ==========================================

const removeTeamMember = async (req, res) => {
    try {
        const managerId = getUserId(req);

        if (!managerId) {
            return res.status(401).json({
                error: "User authentication missing or invalid token."
            });
        }

        const { projectId, userId } = req.params;

        if (!projectId || !userId) {
            return res.status(400).json({
                error: "Project ID and user ID are required."
            });
        }

        // ------------------------------------------
        // CHECK PROJECT BELONGS TO MANAGER
        // ------------------------------------------

        const projectResult = await db.query(
            `
            SELECT id, name
            FROM projects
            WHERE id = $1
            AND created_by = $2
            `,
            [projectId, managerId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(403).json({
                error:
                    "You are not authorized to remove members from this project."
            });
        }

        // ------------------------------------------
        // DON'T ALLOW MANAGER TO REMOVE THEMSELVES
        // ------------------------------------------

        if (String(userId) === String(managerId)) {
            return res.status(400).json({
                error: "You cannot remove yourself from your own project."
            });
        }

        // ------------------------------------------
        // REMOVE MEMBER
        // ------------------------------------------

        const deleteResult = await db.query(
            `
            DELETE FROM project_members
            WHERE project_id = $1
            AND user_id = $2
            RETURNING *
            `,
            [projectId, userId]
        );

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({
                error: "Team member is not a member of this project."
            });
        }

        // ------------------------------------------
        // SUCCESS
        // ------------------------------------------

        res.status(200).json({
            message: "Team member removed successfully.",
            membership: deleteResult.rows[0]
        });

    } catch (error) {
        console.error(
            "❌ Error removing team member:",
            error.message
        );

        res.status(500).json({
            error: "Failed to remove team member."
        });
    }
};


// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
    getTeamMembers,
    addTeamMember,
    removeTeamMember,
};