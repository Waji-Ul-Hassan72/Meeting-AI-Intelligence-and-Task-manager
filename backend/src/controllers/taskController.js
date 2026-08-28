
const db = require("../config/db");
const nodemailer = require("nodemailer");

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// ============================================================
// EMAIL CONFIGURATION
// ============================================================

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ============================================================
// PAGINATION
// ============================================================

const getPagination = (req) => {
    const page = Math.max(
        1,
        parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
        MAX_LIMIT,
        Math.max(
            1,
            parseInt(req.query.limit, 10) || DEFAULT_LIMIT
        )
    );

    const offset = (page - 1) * limit;

    return {
        page,
        limit,
        offset,
    };
};

// ============================================================
// SEND TASK ASSIGNMENT EMAIL
// ============================================================

const sendTaskAssignmentEmail = async ({
    memberEmail,
    memberName,
    taskTitle,
    taskDescription,
    dueDate,
    projectName,
}) => {
    if (!memberEmail) {
        console.log("No email address found for assigned member.");
        return false;
    }

    try {
        await transporter.sendMail({
            from: `"CollabFlow AI" <${process.env.EMAIL_USER}>`,
            to: memberEmail,
            subject: `New Task Assigned: ${taskTitle}`,

            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8" />
                    <title>New Task Assigned</title>
                </head>

                <body style="
                    margin:0;
                    padding:0;
                    background:#f5f7fb;
                    font-family:Arial,Helvetica,sans-serif;
                ">

                    <div style="
                        max-width:600px;
                        margin:40px auto;
                        background:#ffffff;
                        border-radius:16px;
                        overflow:hidden;
                        box-shadow:0 8px 30px rgba(0,0,0,0.08);
                    ">

                        <div style="
                            background:#111827;
                            padding:28px;
                            color:white;
                        ">
                            <h1 style="
                                margin:0;
                                font-size:24px;
                            ">
                                New Task Assigned
                            </h1>

                            <p style="
                                margin:8px 0 0;
                                color:#d1d5db;
                            ">
                                CollabFlow AI
                            </p>
                        </div>

                        <div style="padding:30px;">

                            <p style="
                                font-size:16px;
                                color:#374151;
                            ">
                                Hello ${memberName || "Team Member"},
                            </p>

                            <p style="
                                font-size:15px;
                                line-height:1.6;
                                color:#4b5563;
                            ">
                                You have been assigned a new task.
                            </p>

                            <div style="
                                margin:25px 0;
                                padding:22px;
                                background:#f9fafb;
                                border:1px solid #e5e7eb;
                                border-radius:12px;
                            ">

                                <h2 style="
                                    margin:0 0 15px;
                                    color:#111827;
                                    font-size:20px;
                                ">
                                    ${taskTitle}
                                </h2>

                                ${
                                    projectName
                                        ? `
                                            <p style="
                                                margin:8px 0;
                                                color:#6b7280;
                                            ">
                                                <strong>Project:</strong>
                                                ${projectName}
                                            </p>
                                        `
                                        : ""
                                }

                                ${
                                    taskDescription
                                        ? `
                                            <p style="
                                                margin:15px 0;
                                                color:#4b5563;
                                                line-height:1.6;
                                            ">
                                                ${taskDescription}
                                            </p>
                                        `
                                        : ""
                                }

                                ${
                                    dueDate
                                        ? `
                                            <p style="
                                                margin:8px 0;
                                                color:#6b7280;
                                            ">
                                                <strong>Due Date:</strong>
                                                ${dueDate}
                                            </p>
                                        `
                                        : ""
                                }

                            </div>

                            <p style="
                                font-size:14px;
                                color:#6b7280;
                                line-height:1.6;
                            ">
                                Please log in to CollabFlow AI to view
                                and work on this task.
                            </p>

                        </div>

                        <div style="
                            padding:20px 30px;
                            background:#f9fafb;
                            border-top:1px solid #e5e7eb;
                            color:#9ca3af;
                            font-size:12px;
                            text-align:center;
                        ">
                            This is an automated email from CollabFlow AI.
                        </div>

                    </div>

                </body>
                </html>
            `,
        });

        console.log(
            `Task assignment email sent to ${memberEmail}`
        );

        return true;

    } catch (error) {
        console.error(
            "Task assignment email error:",
            error.message
        );

        return false;
    }
};

// ============================================================
// TASK COUNTS
// ============================================================

const getTaskCounts = async (userId, projectId = null) => {

    let query = `
        SELECT
            COUNT(*) AS total,

            COUNT(*) FILTER (
                WHERE status = 'Pending'
            ) AS pending,

            COUNT(*) FILTER (
                WHERE status = 'In Progress'
            ) AS in_progress,

            COUNT(*) FILTER (
                WHERE status = 'Completed'
            ) AS completed

        FROM tasks

        WHERE user_id = $1
    `;

    const params = [userId];

    if (projectId) {

        query += `
            AND project_id = $2::integer
        `;

        params.push(
            parseInt(projectId, 10)
        );
    }

    const result = await db.query(
        query,
        params
    );

    const row = result.rows[0];

    return {
        total: parseInt(row.total, 10) || 0,
        pending: parseInt(row.pending, 10) || 0,
        inProgress: parseInt(row.in_progress, 10) || 0,
        completed: parseInt(row.completed, 10) || 0,
    };
};

// ============================================================
// CREATE TASK
// ============================================================

const createTask = async (req, res) => {

    const client = await db.connect();

    try {

        const {
            title,
            name,
            description,
            priority,
            status,
            due_date,
            attachment,
            project_id,
            assigned_to,
            is_recurring,
            repeat_type,
            repeat_months,
            repeat_days,
        } = req.body;

        // ====================================================
        // CURRENT USER
        // ====================================================

        const user_id =
            req.user?.id ||
            req.user?.userId ||
            req.user?.user_id;

        if (!user_id) {
            return res.status(401).json({
                error: "User authentication missing.",
            });
        }

        // ====================================================
        // TASK TITLE
        // ====================================================

        const taskTitle =
            title?.trim() ||
            name?.trim();

        if (!taskTitle) {
            return res.status(400).json({
                error: "Task title or name is required.",
            });
        }

        // ====================================================
        // PROJECT ID
        // ====================================================

        const parsedProjectId =
            project_id !== undefined &&
            project_id !== null &&
            project_id !== ""
                ? parseInt(project_id, 10)
                : null;

        if (
            project_id &&
            Number.isNaN(parsedProjectId)
        ) {
            return res.status(400).json({
                error: "Invalid project ID.",
            });
        }

        // ====================================================
        // DEFAULT VALUES
        // ====================================================

        const taskPriority =
            priority || "Medium";

        const taskStatus =
            status || "Pending";

        // ====================================================
        // ASSIGNED MEMBER
        // ====================================================

        let assignedMember = null;

        if (
            assigned_to !== undefined &&
            assigned_to !== null &&
            assigned_to !== ""
        ) {

            if (!parsedProjectId) {
                return res.status(400).json({
                    error:
                        "A project is required when assigning a task.",
                });
            }

            const assignedUserId =
                parseInt(assigned_to, 10);

            if (Number.isNaN(assignedUserId)) {
                return res.status(400).json({
                    error: "Invalid assigned user ID.",
                });
            }

            const memberResult =
                await client.query(
                    `
                    SELECT
                        u.id,
                        u.name,
                        u.email

                    FROM project_members pm

                    INNER JOIN users u
                        ON u.id = pm.user_id

                    WHERE pm.project_id = $1
                    AND pm.user_id = $2

                    LIMIT 1
                    `,
                    [
                        parsedProjectId,
                        assignedUserId,
                    ]
                );

            if (memberResult.rows.length === 0) {
                return res.status(400).json({
                    error:
                        "Selected user is not a member of this project.",
                });
            }

            assignedMember =
                memberResult.rows[0];
        }

        // ====================================================
        // PROJECT NAME
        // ====================================================

        let projectName = "";

        if (parsedProjectId) {

            const projectResult =
                await client.query(
                    `
                    SELECT name
                    FROM projects
                    WHERE id = $1
                    LIMIT 1
                    `,
                    [parsedProjectId]
                );

            if (projectResult.rows.length > 0) {
                projectName =
                    projectResult.rows[0].name;
            }
        }

        // ====================================================
        // BEGIN TRANSACTION
        // ====================================================

        await client.query("BEGIN");

        // ====================================================
        // INSERT TASK
        // ====================================================

        const result =
            await client.query(
                `
                INSERT INTO tasks (
                    title,
                    description,
                    priority,
                    status,
                    due_date,
                    attachment,
                    project_id,
                    user_id,
                    assigned_to,
                    is_recurring,
                    repeat_type,
                    repeat_months,
                    repeat_days
                )

                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7::integer,
                    $8,
                    $9::integer,
                    $10,
                    $11,
                    $12,
                    $13
                )

                RETURNING *
                `,
                [
                    taskTitle,

                    description || "",

                    taskPriority,

                    taskStatus,

                    due_date || null,

                    attachment || null,

                    parsedProjectId,

                    user_id,

                    assignedMember
                        ? assignedMember.id
                        : null,

                    is_recurring || false,

                    is_recurring
                        ? repeat_type || null
                        : null,

                    is_recurring &&
                    Array.isArray(repeat_months)
                        ? repeat_months
                        : null,

                    is_recurring &&
                    Array.isArray(repeat_days)
                        ? repeat_days
                        : null,
                ]
            );

        await client.query("COMMIT");

        const createdTask =
            result.rows[0];

        // ====================================================
        // SEND ASSIGNMENT EMAIL
        // ====================================================

        let emailSent = false;

        if (assignedMember) {

            emailSent =
                await sendTaskAssignmentEmail({

                    memberEmail:
                        assignedMember.email,

                    memberName:
                        assignedMember.name,

                    taskTitle:
                        createdTask.title,

                    taskDescription:
                        createdTask.description,

                    dueDate:
                        createdTask.due_date,

                    projectName,
                });
        }

        // ====================================================
        // RETURN TASK WITH ASSIGNED USER
        // ====================================================

        const finalTaskResult =
            await db.query(
                `
                SELECT
                    t.*,

                    u.id AS assigned_user_id,

                    u.name AS assigned_to_name,

                    u.email AS assigned_to_email

                FROM tasks t

                LEFT JOIN users u
                    ON u.id = t.assigned_to

                WHERE t.id = $1
                `,
                [createdTask.id]
            );

        return res.status(201).json({

            ...finalTaskResult.rows[0],

            emailSent,
        });

    } catch (error) {

        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error(
                "Rollback error:",
                rollbackError.message
            );
        }

        console.error(
            "Create task error:",
            error
        );

        return res.status(500).json({
            error: error.message,
        });

    } finally {

        client.release();
    }
};

// ============================================================
// GET ALL TASKS
// ============================================================

const getTasks = async (req, res) => {

    try {

        const user_id =
            req.user?.id ||
            req.user?.userId ||
            req.user?.user_id;

        if (!user_id) {
            return res.status(401).json({
                error: "User authentication missing.",
            });
        }

        const {
            page,
            limit,
            offset,
        } = getPagination(req);

        const counts =
            await getTaskCounts(user_id);

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    counts.total / limit
                )
            );

        const result =
            await db.query(
                `
                SELECT

                    t.*,

                    u.id AS assigned_user_id,

                    u.name AS assigned_to_name,

                    u.email AS assigned_to_email

                FROM tasks t

                LEFT JOIN users u
                    ON u.id = t.assigned_to

                WHERE t.user_id = $1

                ORDER BY
                    t.due_date ASC NULLS LAST,
                    t.id ASC

                LIMIT $2
                OFFSET $3
                `,
                [
                    user_id,
                    limit,
                    offset,
                ]
            );

        return res.status(200).json({

            tasks:
                result.rows,

            summary:
                counts,

            pagination: {

                page,
                limit,

                total:
                    counts.total,

                totalPages,
            },

            totalPages,
        });

    } catch (error) {

        console.error(
            "Get tasks error:",
            error
        );

        return res.status(500).json({
            error: error.message,
        });
    }
};

// ============================================================
// GET TASKS BY PROJECT
// ============================================================

const getTasksByProject = async (req, res) => {

    try {

        const {
            projectId,
        } = req.params;

        const user_id =
            req.user?.id ||
            req.user?.userId ||
            req.user?.user_id;

        if (!user_id) {
            return res.status(401).json({
                error: "User authentication missing.",
            });
        }

        if (!projectId) {
            return res.status(400).json({
                error: "Project ID is required.",
            });
        }

        const parsedProjectId =
            parseInt(projectId, 10);

        if (
            Number.isNaN(parsedProjectId)
        ) {
            return res.status(400).json({
                error: "Invalid project ID.",
            });
        }

        // ====================================================
        // CHECK PROJECT ACCESS
        // ====================================================

        const projectAccess =
            await db.query(
                `
                SELECT p.id

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

        // ====================================================
        // PAGINATION
        // ====================================================

        const {
            page,
            limit,
            offset,
        } = getPagination(req);

        // ====================================================
        // COUNTS
        // ====================================================

        const countResult =
            await db.query(
                `
                SELECT

                    COUNT(*) AS total,

                    COUNT(*) FILTER (
                        WHERE status = 'Pending'
                    ) AS pending,

                    COUNT(*) FILTER (
                        WHERE status = 'In Progress'
                    ) AS in_progress,

                    COUNT(*) FILTER (
                        WHERE status = 'Completed'
                    ) AS completed

                FROM tasks

                WHERE project_id = $1
                `,
                [parsedProjectId]
            );

        const countRow =
            countResult.rows[0];

        const counts = {

            total:
                parseInt(
                    countRow.total,
                    10
                ) || 0,

            pending:
                parseInt(
                    countRow.pending,
                    10
                ) || 0,

            inProgress:
                parseInt(
                    countRow.in_progress,
                    10
                ) || 0,

            completed:
                parseInt(
                    countRow.completed,
                    10
                ) || 0,
        };

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    counts.total / limit
                )
            );

        // ====================================================
        // GET PROJECT TASKS
        // ====================================================

        const result =
            await db.query(
                `
                SELECT

                    t.*,

                    -- IMPORTANT:
                    -- Return assigned user's ID
                    -- name and email

                    u.id AS assigned_user_id,

                    u.name AS assigned_to_name,

                    u.email AS assigned_to_email

                FROM tasks t

                LEFT JOIN users u
                    ON u.id = t.assigned_to

                WHERE t.project_id = $1

                ORDER BY
                    t.due_date ASC NULLS LAST,
                    t.id ASC

                LIMIT $2
                OFFSET $3
                `,
                [
                    parsedProjectId,
                    limit,
                    offset,
                ]
            );

        return res.status(200).json({

            tasks:
                result.rows,

            summary:
                counts,

            pagination: {

                page,
                limit,

                total:
                    counts.total,

                totalPages,
            },

            totalPages,
        });

    } catch (error) {

        console.error(
            "Get project tasks error:",
            error
        );

        return res.status(500).json({
            error: error.message,
        });
    }
};

// ============================================================
// GET SINGLE TASK
// ============================================================

const getTaskById = async (req, res) => {

    try {

        const {
            id,
        } = req.params;

        const user_id =
            req.user?.id ||
            req.user?.userId ||
            req.user?.user_id;

        if (!user_id) {
            return res.status(401).json({
                error: "User authentication missing.",
            });
        }

        const result =
            await db.query(
                `
                SELECT

                    t.*,

                    u.id AS assigned_user_id,

                    u.name AS assigned_to_name,

                    u.email AS assigned_to_email

                FROM tasks t

                LEFT JOIN users u
                    ON u.id = t.assigned_to

                WHERE t.id = $1

                AND t.user_id = $2
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
                error: "Task not found.",
            });
        }

        return res.status(200).json(
            result.rows[0]
        );

    } catch (error) {

        console.error(
            "Get task error:",
            error
        );

        return res.status(500).json({
            error: error.message,
        });
    }
};

// ============================================================
// UPDATE TASK
// ============================================================

const updateTask = async (req, res) => {

    try {

        const {
            id,
        } = req.params;

        const user_id =
            req.user?.id ||
            req.user?.userId ||
            req.user?.user_id;

        if (!user_id) {
            return res.status(401).json({
                error: "User authentication missing.",
            });
        }

        const allowedFields = [

            "title",
            "description",
            "priority",
            "status",
            "due_date",
            "attachment",
            "project_id",
            "assigned_to",
            "is_recurring",
            "repeat_type",
            "repeat_months",
            "repeat_days",

        ];

        const body = {
            ...req.body,
        };

        // ====================================================
        // NAME -> TITLE
        // ====================================================

        if (
            body.name &&
            !body.title
        ) {
            body.title =
                body.name;
        }

        // ====================================================
        // VALIDATE TITLE
        // ====================================================

        if (
            body.title !== undefined &&
            !String(body.title).trim()
        ) {
            return res.status(400).json({
                error:
                    "Task title cannot be empty.",
            });
        }

        // ====================================================
        // GET CURRENT TASK
        // ====================================================

        const existingTaskResult =
            await db.query(
                `
                SELECT *
                FROM tasks
                WHERE id = $1
                AND user_id = $2
                `,
                [
                    id,
                    user_id,
                ]
            );

        if (
            existingTaskResult.rows.length === 0
        ) {
            return res.status(404).json({
                error:
                    "Task not found.",
            });
        }

        const existingTask =
            existingTaskResult.rows[0];

        // ====================================================
        // FINAL PROJECT
        // ====================================================

        const finalProjectId =
            body.project_id !== undefined
                ? body.project_id
                : existingTask.project_id;

        // ====================================================
        // VALIDATE ASSIGNED MEMBER
        // ====================================================

        if (
            body.assigned_to !== undefined &&
            body.assigned_to !== null &&
            body.assigned_to !== ""
        ) {

            if (!finalProjectId) {
                return res.status(400).json({
                    error:
                        "A project is required when assigning a task.",
                });
            }

            const assignedUserId =
                parseInt(
                    body.assigned_to,
                    10
                );

            if (
                Number.isNaN(
                    assignedUserId
                )
            ) {
                return res.status(400).json({
                    error:
                        "Invalid assigned user ID.",
                });
            }

            const memberResult =
                await db.query(
                    `
                    SELECT
                        u.id,
                        u.name,
                        u.email

                    FROM project_members pm

                    INNER JOIN users u
                        ON u.id = pm.user_id

                    WHERE pm.project_id = $1
                    AND pm.user_id = $2

                    LIMIT 1
                    `,
                    [
                        parseInt(
                            finalProjectId,
                            10
                        ),
                        assignedUserId,
                    ]
                );

            if (
                memberResult.rows.length === 0
            ) {
                return res.status(400).json({
                    error:
                        "Selected user is not a member of this project.",
                });
            }
        }

        // ====================================================
        // BUILD UPDATE QUERY
        // ====================================================

        const updates = [];
        const values = [];

        let parameterIndex = 1;

        for (
            const field of allowedFields
        ) {

            if (
                body[field] !== undefined
            ) {

                if (
                    field === "project_id"
                ) {

                    updates.push(
                        `project_id = $${parameterIndex}::integer`
                    );

                    values.push(
                        body[field]
                            ? parseInt(
                                body[field],
                                10
                            )
                            : null
                    );

                } else if (
                    field === "assigned_to"
                ) {

                    updates.push(
                        `assigned_to = $${parameterIndex}::integer`
                    );

                    values.push(
                        body[field] === null ||
                        body[field] === ""
                            ? null
                            : parseInt(
                                body[field],
                                10
                            )
                    );

                } else {

                    updates.push(
                        `${field} = $${parameterIndex}`
                    );

                    values.push(

                        field === "title"

                            ? String(
                                body[field]
                            ).trim()

                            : body[field]
                    );
                }

                parameterIndex++;
            }
        }

        if (
            updates.length === 0
        ) {
            return res.status(400).json({
                error:
                    "No valid fields provided to update.",
            });
        }

        // ====================================================
        // WHERE PARAMETERS
        // ====================================================

        values.push(
            id,
            user_id
        );

        const query = `
            UPDATE tasks

            SET
                ${updates.join(", ")}

            WHERE id = $${parameterIndex}

            AND user_id = $${parameterIndex + 1}

            RETURNING *
        `;

        const result =
            await db.query(
                query,
                values
            );

        if (
            result.rows.length === 0
        ) {
            return res.status(404).json({
                error:
                    "Task not found.",
            });
        }

        const updatedTask =
            result.rows[0];

        // ====================================================
        // CHECK IF ASSIGNMENT CHANGED
        // ====================================================

        const assignmentChanged =
            body.assigned_to !== undefined &&
            String(body.assigned_to) !==
                String(existingTask.assigned_to);

        // ====================================================
        // SEND EMAIL AFTER ASSIGNMENT CHANGE
        // ====================================================

        if (
            assignmentChanged &&
            updatedTask.assigned_to
        ) {

            const memberResult =
                await db.query(
                    `
                    SELECT
                        u.name,
                        u.email

                    FROM users u

                    WHERE u.id = $1
                    `,
                    [
                        updatedTask.assigned_to,
                    ]
                );

            if (
                memberResult.rows.length > 0
            ) {

                const member =
                    memberResult.rows[0];

                let projectName = "";

                if (
                    updatedTask.project_id
                ) {

                    const projectResult =
                        await db.query(
                            `
                            SELECT name
                            FROM projects
                            WHERE id = $1
                            `,
                            [
                                updatedTask.project_id,
                            ]
                        );

                    if (
                        projectResult.rows.length > 0
                    ) {
                        projectName =
                            projectResult.rows[0].name;
                    }
                }

                await sendTaskAssignmentEmail({

                    memberEmail:
                        member.email,

                    memberName:
                        member.name,

                    taskTitle:
                        updatedTask.title,

                    taskDescription:
                        updatedTask.description,

                    dueDate:
                        updatedTask.due_date,

                    projectName,
                });
            }
        }

        // ====================================================
        // RETURN UPDATED TASK WITH MEMBER NAME
        // ====================================================

        const finalResult =
            await db.query(
                `
                SELECT

                    t.*,

                    u.id AS assigned_user_id,

                    u.name AS assigned_to_name,

                    u.email AS assigned_to_email

                FROM tasks t

                LEFT JOIN users u
                    ON u.id = t.assigned_to

                WHERE t.id = $1
                `,
                [
                    updatedTask.id,
                ]
            );

        return res.status(200).json(
            finalResult.rows[0]
        );

    } catch (error) {

        console.error(
            "Update task error:",
            error
        );

        return res.status(500).json({
            error: error.message,
        });
    }
};

// ============================================================
// DELETE ONE TASK
// ============================================================

const deleteTask = async (req, res) => {

    try {

        const {
            id,
        } = req.params;

        const user_id =
            req.user?.id ||
            req.user?.userId ||
            req.user?.user_id;

        if (!user_id) {
            return res.status(401).json({
                error:
                    "User authentication missing.",
            });
        }

        const result =
            await db.query(
                `
                DELETE FROM tasks

                WHERE id = $1

                AND user_id = $2

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
                    "Task not found.",
            });
        }

        return res.status(200).json({

            message:
                "Task deleted successfully.",

            task:
                result.rows[0],
        });

    } catch (error) {

        console.error(
            "Delete task error:",
            error
        );

        return res.status(500).json({
            error: error.message,
        });
    }
};

// ============================================================
// DELETE ALL PROJECT TASKS
// ============================================================

const deleteAllProjectTasks =
    async (req, res) => {

        try {

            const {
                projectId,
            } = req.params;

            const user_id =
                req.user?.id ||
                req.user?.userId ||
                req.user?.user_id;

            if (!user_id) {
                return res.status(401).json({
                    error:
                        "User authentication missing.",
                });
            }

            if (!projectId) {
                return res.status(400).json({
                    error:
                        "Project ID is required.",
                });
            }

            const parsedProjectId =
                parseInt(
                    projectId,
                    10
                );

            if (
                Number.isNaN(
                    parsedProjectId
                )
            ) {
                return res.status(400).json({
                    error:
                        "Invalid project ID.",
                });
            }

            const result =
                await db.query(
                    `
                    DELETE FROM tasks

                    WHERE project_id = $1::integer

                    AND user_id = $2

                    RETURNING id
                    `,
                    [
                        parsedProjectId,
                        user_id,
                    ]
                );

            return res.status(200).json({

                message:
                    "All project tasks deleted successfully.",

                deletedCount:
                    result.rows.length,
            });

        } catch (error) {

            console.error(
                "Delete all project tasks error:",
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

    createTask,

    getTasks,

    getTasksByProject,

    getTaskById,

    updateTask,

    deleteTask,

    deleteAllProjectTasks,

};

