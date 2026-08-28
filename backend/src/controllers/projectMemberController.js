const db = require("../config/db");

// ==========================================
// HELPER: GET USER ID FROM JWT
// ==========================================
const getUserId = (req) => {
    return req.user?.id || req.user?.userId || req.user?.user_id;
};

// ==========================================
// GET ALL DEVELOPERS
// ==========================================
// Used by Manager Dashboard when selecting
// a developer to add to a project.
// ==========================================

const getDevelopers = async (req, res) => {
    try {
        const userId = getUserId(req);

        if (!userId) {
            return res.status(401).json({
                message: "Authentication required."
            });
        }

        const result = await db.query(
            `SELECT id, name, email, role
             FROM users
             WHERE role = 'Developer'
             ORDER BY name ASC`
        );

        return res.status(200).json(result.rows);

    } catch (error) {
        console.error("Error fetching developers:", error);

        return res.status(500).json({
            message: "Failed to fetch developers.",
            error: error.message
        });
    }
};


// ==========================================
// GET PROJECT MEMBERS
// ==========================================
// GET /api/projects/:projectId/members
// ==========================================

const getProjectMembers = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { projectId } = req.params;

        if (!userId) {
            return res.status(401).json({
                message: "Authentication required."
            });
        }

        // Check that project exists and manager owns it
        const projectResult = await db.query(
            `SELECT id, name, created_by
             FROM projects
             WHERE id = $1`,
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                message: "Project not found."
            });
        }

        const project = projectResult.rows[0];

        if (Number(project.created_by) !== Number(userId)) {
            return res.status(403).json({
                message: "You are not authorized to view this project's team."
            });
        }

        // Get members
        const result = await db.query(
            `SELECT
                pm.id,
                pm.project_id,
                pm.user_id,
                pm.joined_at,
                u.name,
                u.email,
                u.role
             FROM project_members pm
             INNER JOIN users u
                 ON pm.user_id = u.id
             WHERE pm.project_id = $1
             ORDER BY pm.joined_at DESC`,
            [projectId]
        );

        return res.status(200).json(result.rows);

    } catch (error) {
        console.error("Error fetching project members:", error);

        return res.status(500).json({
            message: "Failed to fetch project members.",
            error: error.message
        });
    }
};


// ==========================================
// ADD MEMBER TO PROJECT
// ==========================================
// POST /api/projects/:projectId/members
// ==========================================

const addProjectMember = async (req, res) => {
    try {
        const managerId = getUserId(req);
        const { projectId } = req.params;
        const { user_id } = req.body;

        // ------------------------------------------
        // 1. CHECK MANAGER AUTHENTICATION
        // ------------------------------------------

        if (!managerId) {
            return res.status(401).json({
                message: "Authentication required."
            });
        }

        // ------------------------------------------
        // 2. VALIDATE USER ID
        // ------------------------------------------

        if (!user_id) {
            return res.status(400).json({
                message: "Developer user_id is required."
            });
        }

        // ------------------------------------------
        // 3. CHECK PROJECT
        // ------------------------------------------

        const projectResult = await db.query(
            `SELECT id, name, created_by
             FROM projects
             WHERE id = $1`,
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                message: "Project not found."
            });
        }

        const project = projectResult.rows[0];

        // ------------------------------------------
        // 4. ONLY PROJECT OWNER CAN ADD MEMBERS
        // ------------------------------------------

        if (Number(project.created_by) !== Number(managerId)) {
            return res.status(403).json({
                message: "Only the project manager can add team members."
            });
        }

        // ------------------------------------------
        // 5. CHECK DEVELOPER
        // ------------------------------------------

        const userResult = await db.query(
            `SELECT id, name, email, role
             FROM users
             WHERE id = $1`,
            [user_id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                message: "Developer not found."
            });
        }

        const developer = userResult.rows[0];

        // Only Developer accounts can be assigned
        if (developer.role !== "Developer") {
            return res.status(400).json({
                message: "Only users with Developer role can be assigned to projects."
            });
        }

        // ------------------------------------------
        // 6. CHECK DUPLICATE MEMBER
        // ------------------------------------------

        const existingMember = await db.query(
            `SELECT id
             FROM project_members
             WHERE project_id = $1
             AND user_id = $2`,
            [projectId, user_id]
        );

        if (existingMember.rows.length > 0) {
            return res.status(409).json({
                message: "This developer is already a member of the project."
            });
        }

        // ------------------------------------------
        // 7. INSERT MEMBER
        // ------------------------------------------

        const result = await db.query(
            `INSERT INTO project_members
                (project_id, user_id, joined_at)
             VALUES
                ($1, $2, NOW())
             RETURNING id, project_id, user_id, joined_at`,
            [projectId, user_id]
        );

        // ------------------------------------------
        // 8. RETURN MEMBER INFORMATION
        // ------------------------------------------

        return res.status(201).json({
            message: "Developer added to project successfully.",
            member: {
                ...result.rows[0],
                name: developer.name,
                email: developer.email,
                role: developer.role
            }
        });

    } catch (error) {
        console.error("Error adding project member:", error);

        return res.status(500).json({
            message: "Failed to add developer to project.",
            error: error.message
        });
    }
};


// ==========================================
// REMOVE MEMBER FROM PROJECT
// ==========================================

const removeProjectMember = async (req, res) => {
    try {
        const managerId = getUserId(req);
        const { projectId, userId } = req.params;

        if (!managerId) {
            return res.status(401).json({
                message: "Authentication required."
            });
        }

        // Check project ownership
        const projectResult = await db.query(
            `SELECT id, created_by
             FROM projects
             WHERE id = $1`,
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                message: "Project not found."
            });
        }

        if (
            Number(projectResult.rows[0].created_by) !==
            Number(managerId)
        ) {
            return res.status(403).json({
                message: "Only the project manager can remove members."
            });
        }

        const result = await db.query(
            `DELETE FROM project_members
             WHERE project_id = $1
             AND user_id = $2
             RETURNING *`,
            [projectId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Project member not found."
            });
        }

        return res.status(200).json({
            message: "Member removed successfully."
        });

    } catch (error) {
        console.error("Error removing project member:", error);

        return res.status(500).json({
            message: "Failed to remove project member.",
            error: error.message
        });
    }
};


module.exports = {
    getDevelopers,
    getProjectMembers,
    addProjectMember,
    removeProjectMember
};