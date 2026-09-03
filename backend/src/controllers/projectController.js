const db = require("../config/db");

const getUserId = (req) => {
    return (
        req.user?.id ||
        req.user?.userId ||
        req.user?.user_id
    );
};
// CREATE PROJECT

const createProject = async (req, res) => {
    try {
        const {
            name,
            title,
            description,
            status,
        } = req.body;

        const user_id = getUserId(req);

        if (!user_id) {
            return res.status(401).json({
                error:
                    "User authentication missing or invalid token.",
            });
        }

        const projectName = (
            name ||
            title ||
            ""
        ).trim();

        if (!projectName) {
            return res.status(400).json({
                error:
                    "Project name is required.",
            });
        }

        const projectStatus =
            status || "Active";

        const result = await db.query(
            `
            INSERT INTO projects (
                name,
                description,
                status,
                created_by
            )

            VALUES (
                $1,
                $2,
                $3,
                $4
            )

            RETURNING *
            `,
            [
                projectName,
                description || "",
                projectStatus,
                user_id,
            ]
        );

        return res.status(201).json(
            result.rows[0]
        );

    } catch (error) {

        console.error(
            "❌ Error creating project:",
            error
        );

        return res.status(500).json({
            error: error.message,
        });
    }
};


const getProjects = async (req, res) => {
    try {

        const user_id = getUserId(req);

        if (!user_id) {
            return res.status(401).json({
                error:
                    "User authentication missing or invalid token.",
            });
        }

        const result = await db.query(
            `
            SELECT
                p.*,

                CASE
                    WHEN p.created_by = $1
                    THEN true
                    ELSE false
                END AS is_owner,

                CASE
                    WHEN p.created_by = $1
                    THEN 'owner'

                    WHEN EXISTS (
                        SELECT 1
                        FROM project_members pm
                        WHERE pm.project_id = p.id
                        AND pm.user_id = $1
                    )
                    THEN 'member'

                    ELSE null
                END AS user_role

            FROM projects p

            WHERE
                p.created_by = $1

                OR EXISTS (
                    SELECT 1
                    FROM project_members pm
                    WHERE pm.project_id = p.id
                    AND pm.user_id = $1
                )

            ORDER BY
                p.created_at DESC
            `,
            [user_id]
        );

        return res.status(200).json({
            projects: result.rows,
        });

    } catch (error) {

        console.error(
            "❌ Error fetching projects:",
            error
        );

        return res.status(500).json({
            error: error.message,
        });
    }
};

// GET SINGLE PROJECT

const getProjectById = async (req, res) => {

    try {

        const {
            id,
        } = req.params;

        const user_id = getUserId(req);

        if (!user_id) {
            return res.status(401).json({
                error:
                    "User authentication missing or invalid token.",
            });
        }

        if (!id) {
            return res.status(400).json({
                error:
                    "Project ID is required.",
            });
        }

        const result = await db.query(
            `
            SELECT

                p.*,

                CASE
                    WHEN p.created_by = $2
                    THEN true
                    ELSE false
                END AS is_owner,

                CASE
                    WHEN p.created_by = $2
                    THEN 'owner'

                    WHEN EXISTS (
                        SELECT 1
                        FROM project_members pm
                        WHERE pm.project_id = p.id
                        AND pm.user_id = $2
                    )
                    THEN 'member'

                    ELSE null
                END AS user_role

            FROM projects p

            WHERE p.id = $1

            AND (
                p.created_by = $2

                OR EXISTS (
                    SELECT 1
                    FROM project_members pm
                    WHERE pm.project_id = p.id
                    AND pm.user_id = $2
                )
            )

            LIMIT 1
            `,
            [
                id,
                user_id,
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error:
                    "Project not found or you do not have access to it.",
            });
        }

        return res.status(200).json(
            result.rows[0]
        );

    } catch (error) {

        console.error(
            "❌ Error fetching project details:",
            error
        );

        return res.status(500).json({
            error: error.message,
        });
    }
};
// GET PROJECT TEAM MEMBERS

const getProjectMembers = async (req, res) => {

    try {

        const {
            projectId,
        } = req.params;

        const user_id = getUserId(req);

        if (!user_id) {
            return res.status(401).json({
                error:
                    "User authentication missing or invalid token.",
            });
        }

        if (!projectId) {
            return res.status(400).json({
                error:
                    "Project ID is required.",
            });
        }

        const parsedProjectId =
            parseInt(projectId, 10);

        if (
            Number.isNaN(parsedProjectId)
        ) {
            return res.status(400).json({
                error:
                    "Invalid project ID.",
            });
        }

        // ----------------------------------------------------
        // CHECK PROJECT ACCESS
        // ----------------------------------------------------

        const projectAccess =
            await db.query(
                `
                SELECT
                    p.id,

                    CASE
                        WHEN p.created_by = $2
                        THEN true
                        ELSE false
                    END AS is_owner

                FROM projects p

                WHERE p.id = $1

                AND (
                    p.created_by = $2

                    OR EXISTS (
                        SELECT 1
                        FROM project_members pm
                        WHERE pm.project_id = p.id
                        AND pm.user_id = $2
                    )
                )

                LIMIT 1
                `,
                [
                    parsedProjectId,
                    user_id,
                ]
            );

        if (
            projectAccess.rows.length === 0
        ) {
            return res.status(403).json({
                error:
                    "You do not have access to this project.",
            });
        }

        // ----------------------------------------------------
        // GET MEMBERS
        // ----------------------------------------------------

        const result =
            await db.query(
                `
                SELECT
                    u.id,
                    u.name,
                    u.email

                FROM project_members pm

                INNER JOIN users u
                    ON pm.user_id = u.id

                WHERE pm.project_id = $1

                ORDER BY
                    u.name ASC
                `,
                [
                    parsedProjectId,
                ]
            );

        return res.status(200).json({
            members: result.rows,
        });

    } catch (error) {

        console.error(
            "❌ Error fetching project members:",
            error
        );

        return res.status(500).json({
            error: error.message,
        });
    }
};

// UPDATE PROJECT

const updateProject = async (req, res) => {

    try {

        const {
            id,
        } = req.params;

        const {
            name,
            title,
            description,
            status,
        } = req.body;

        const user_id = getUserId(req);

        if (!user_id) {
            return res.status(401).json({
                error:
                    "User authentication missing or invalid token.",
            });
        }

        if (!id) {
            return res.status(400).json({
                error:
                    "Project ID is required.",
            });
        }

        // ----------------------------------------------------
        // PROJECT NAME
        // ----------------------------------------------------

        let projectName;

        if (name !== undefined) {
            projectName =
                String(name).trim();
        }
        else if (title !== undefined) {
            projectName =
                String(title).trim();
        }

        if (
            projectName !== undefined &&
            !projectName
        ) {
            return res.status(400).json({
                error:
                    "Project name cannot be empty.",
            });
        }

        // ----------------------------------------------------
        // UPDATE ONLY OWNER'S PROJECT
        // ----------------------------------------------------

        const result = await db.query(
            `
            UPDATE projects

            SET
                name =
                    COALESCE(
                        $1,
                        name
                    ),

                description =
                    COALESCE(
                        $2,
                        description
                    ),

                status =
                    COALESCE(
                        $3,
                        status
                    )

            WHERE id = $4

            AND created_by = $5

            RETURNING *
            `,
            [
                projectName !== undefined
                    ? projectName
                    : null,

                description !== undefined
                    ? description
                    : null,

                status !== undefined
                    ? status
                    : null,

                id,
                user_id,
            ]
        );

        // ----------------------------------------------------
        // NO PROJECT UPDATED
        // ----------------------------------------------------

        if (
            result.rows.length === 0
        ) {

            const projectCheck =
                await db.query(
                    `
                    SELECT
                        id,
                        created_by

                    FROM projects

                    WHERE id = $1

                    LIMIT 1
                    `,
                    [id]
                );

            // Project does not exist
            if (
                projectCheck.rows.length === 0
            ) {
                return res.status(404).json({
                    error:
                        "Project not found.",
                });
            }

            // Project exists but user is not owner
            return res.status(403).json({
                error:
                    "You cannot edit a project created by another user.",
            });
        }

        return res.status(200).json(
            result.rows[0]
        );

    } catch (error) {

        console.error(
            "❌ Error updating project:",
            error
        );

        return res.status(500).json({
            error: error.message,
        });
    }
};
// DELETE PROJECT

const deleteProject = async (req, res) => {

    try {

        const {
            id,
        } = req.params;

        const user_id = getUserId(req);

        if (!user_id) {
            return res.status(401).json({
                error:
                    "User authentication missing or invalid token.",
            });
        }

        if (!id) {
            return res.status(400).json({
                error:
                    "Project ID is required.",
            });
        }

        // ----------------------------------------------------
        // CHECK PROJECT EXISTS
        // ----------------------------------------------------

        const projectCheck =
            await db.query(
                `
                SELECT
                    id,
                    created_by

                FROM projects

                WHERE id = $1

                LIMIT 1
                `,
                [id]
            );

        if (
            projectCheck.rows.length === 0
        ) {
            return res.status(404).json({
                error:
                    "Project not found.",
            });
        }

        // ----------------------------------------------------
        // CHECK OWNERSHIP
        // ----------------------------------------------------

        if (
            String(
                projectCheck.rows[0].created_by
            ) !== String(user_id)
        ) {

            return res.status(403).json({
                error:
                    "You cannot delete a project created by another user.",
            });
        }

        // ----------------------------------------------------
        // DELETE PROJECT
        // ----------------------------------------------------

        const result =
            await db.query(
                `
                DELETE FROM projects

                WHERE id = $1

                AND created_by = $2

                RETURNING *
                `,
                [
                    id,
                    user_id,
                ]
            );

        if (
            result.rows.length === 0
        ) {
            return res.status(404).json({
                error:
                    "Project not found.",
            });
        }

        return res.status(200).json({

            message:
                "Project deleted successfully.",

            project:
                result.rows[0],
        });

    } catch (error) {

        console.error(
            "❌ Error deleting project:",
            error
        );

        return res.status(500).json({
            error: error.message,
        });
    }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    createProject,

    getProjects,

    getProjectById,

    getProjectMembers,

    updateProject,

    deleteProject,

};