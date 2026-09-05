const db = require("../config/db");

const findProjectMember = async (projectId, memberName) => {
    const result = await db.query(
        `
        SELECT
            u.id,
            u.name,
            u.email
        FROM project_members pm
        INNER JOIN users u
            ON u.id = pm.user_id
        WHERE pm.project_id = $1
        AND LOWER(u.name) = LOWER($2)
        LIMIT 1
        `,
        [projectId, memberName.trim()]
    );

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
};

const createAITask = async ({
    projectId,
    title,
    description,
    priority,
    dueDate,
    memberId,
    createdBy
}) => {

    const result = await db.query(
        `
        INSERT INTO tasks (
            title,
            description,
            priority,
            status,
            due_date,
            project_id,
            user_id,
            assigned_to
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
        )
        RETURNING *
        `,
        [
            title.trim(),
            description || "",
            priority || "Medium",
            "Pending",
            dueDate || null,
            parseInt(projectId, 10),
            createdBy,
            memberId
        ]
    );

    return result.rows[0];
};

module.exports = {
    findProjectMember,
    createAITask
};