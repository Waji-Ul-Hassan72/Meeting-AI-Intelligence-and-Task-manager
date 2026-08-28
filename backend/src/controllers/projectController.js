
const db = require('../config/db');

// Helper to safely extract user ID from JWT payload variations
const getUserId = (req) =>
    req.user?.id ||
    req.user?.userId ||
    req.user?.user_id;

// ==========================================
// CREATE PROJECT CONTROLLER
// ==========================================
const createProject = async (req, res) => {
    try {
        const { name, title, description, status } = req.body;

        const projectName = (name || title || '').trim();
        const projectStatus = status || 'Active';
        const user_id = getUserId(req);

        if (!user_id) {
            return res.status(401).json({
                error: "User authentication missing or invalid token."
            });
        }

        if (!projectName) {
            return res.status(400).json({
                error: "Project name is required."
            });
        }

        const result = await db.query(
            `INSERT INTO projects
                (name, description, status, created_by)
             VALUES
                ($1, $2, $3, $4)
             RETURNING *`,
            [
                projectName,
                description || '',
                projectStatus,
                user_id
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(
            "❌ Error creating project:",
            error.message
        );

        res.status(500).json({
            error: error.message
        });
    }
};

// ==========================================
// GET ALL PROJECTS CONTROLLER
// ==========================================
const getProjects = async (req, res) => {
    try {
        const user_id = getUserId(req);

        if (!user_id) {
            return res.status(401).json({
                error:
                    "User authentication missing or invalid token."
            });
        }

        const result = await db.query(
            `SELECT *
             FROM projects
             WHERE created_by = $1
                OR id IN (
                    SELECT project_id
                    FROM project_members
                    WHERE user_id = $1
                )
             ORDER BY created_at DESC`,
            [user_id]
        );

        res.status(200).json(result.rows);

    } catch (error) {
        console.error(
            "❌ Error fetching projects:",
            error.message
        );

        res.status(500).json({
            error: error.message
        });
    }
};

// ==========================================
// GET SINGLE PROJECT BY ID CONTROLLER
// ==========================================
const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = getUserId(req);

        const result = await db.query(
            `SELECT *
             FROM projects
             WHERE id = $1
             AND (
                 created_by = $2
                 OR id IN (
                     SELECT project_id
                     FROM project_members
                     WHERE user_id = $2
                 )
             )`,
            [id, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Project Not Found"
            });
        }

        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error(
            "❌ Error fetching project details:",
            error.message
        );

        res.status(500).json({
            error: error.message
        });
    }
};

// ==========================================
// GET PROJECT TEAM MEMBERS
// ==========================================
const getProjectMembers = async (req, res) => {
    try {
        const { projectId } = req.params;
        const user_id = getUserId(req);

        if (!user_id) {
            return res.status(401).json({
                error:
                    "User authentication missing or invalid token."
            });
        }

        if (!projectId) {
            return res.status(400).json({
                error: "Project ID is required."
            });
        }

        const parsedProjectId = parseInt(projectId, 10);

        if (Number.isNaN(parsedProjectId)) {
            return res.status(400).json({
                error: "Invalid project ID."
            });
        }

        // Make sure the logged-in user has access
        // to this project.
        const projectAccess = await db.query(
            `SELECT id
             FROM projects
             WHERE id = $1
             AND (
                 created_by = $2
                 OR id IN (
                     SELECT project_id
                     FROM project_members
                     WHERE user_id = $2
                 )
             )`,
            [
                parsedProjectId,
                user_id
            ]
        );

        if (projectAccess.rows.length === 0) {
            return res.status(403).json({
                error:
                    "You do not have access to this project."
            });
        }

        // Get all members of this project.
        const result = await db.query(
            `SELECT
                u.id,
                u.name,
                u.email
             FROM project_members pm
             INNER JOIN users u
                ON pm.user_id = u.id
             WHERE pm.project_id = $1
             ORDER BY u.name ASC`,
            [parsedProjectId]
        );

        return res.status(200).json({
            members: result.rows
        });

    } catch (error) {
        console.error(
            "❌ Error fetching project members:",
            error.message
        );

        return res.status(500).json({
            error: error.message
        });
    }
};

// ==========================================
// UPDATE PROJECT CONTROLLER
// ==========================================
const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            title,
            description,
            status
        } = req.body;

        const projectName = name || title;
        const user_id = getUserId(req);

        const result = await db.query(
            `UPDATE projects
             SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                status = COALESCE($3, status)
             WHERE id = $4
             AND created_by = $5
             RETURNING *`,
            [
                projectName,
                description,
                status,
                id,
                user_id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message:
                    "Project Not Found or unauthorized to edit"
            });
        }

        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error(
            "❌ Error updating project:",
            error.message
        );

        res.status(500).json({
            error: error.message
        });
    }
};

// ==========================================
// DELETE PROJECT CONTROLLER
// ==========================================
const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = getUserId(req);

        const result = await db.query(
            `DELETE FROM projects
             WHERE id = $1
             AND created_by = $2
             RETURNING *`,
            [id, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message:
                    "Project Not Found or unauthorized to delete"
            });
        }

        res.status(200).json({
            message: "Project Deleted Successfully"
        });

    } catch (error) {
        console.error(
            "❌ Error deleting project:",
            error.message
        );

        res.status(500).json({
            error: error.message
        });
    }
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    createProject,
    getProjects,
    getProjectById,
    getProjectMembers,
    updateProject,
    deleteProject
};

