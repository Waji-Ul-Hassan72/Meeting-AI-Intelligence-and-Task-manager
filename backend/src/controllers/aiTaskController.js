
const db = require("../config/db");

const {
    findProjectMember,
    createAITask,
} = require("./taskAssignmentController");

const {
    sendTaskAssignmentEmail,
} = require("./taskController");


// ============================================================
// GET USER ID
// ============================================================

const getUserId = (req) => {
    return (
        req.user?.id ||
        req.user?.userId ||
        req.user?.user_id
    );
};


// ============================================================
// GET USER ROLE
// ============================================================

const getUserRole = (req) => {
    return String(
        req.user?.role ||
        req.user?.userRole ||
        ""
    ).toLowerCase();
};


// ============================================================
// ASSIGN TASK FROM AI
// ============================================================

const assignTaskFromAI = async (req, res) => {

    try {

        const userId = getUserId(req);
        const userRole = getUserRole(req);

        // ====================================================
        // AUTHENTICATION
        // ====================================================

        if (!userId) {
            return res.status(401).json({
                error: "User authentication missing.",
            });
        }


        // ====================================================
        // ONLY PROJECT MANAGER CAN USE AI ASSIGNMENT
        // ====================================================

        if (userRole !== "project manager") {
            return res.status(403).json({
                error:
                    "Only Project Managers can assign tasks through AI.",
            });
        }


        // ====================================================
        // REQUEST DATA
        // ====================================================

        const {
            project_id,
            title,
            description,
            assigned_to,
            priority,
            status,
            due_date,
        } = req.body;


        // ====================================================
        // VALIDATION
        // ====================================================

        if (!project_id) {
            return res.status(400).json({
                error: "Project ID is required.",
            });
        }

        if (!title || !title.trim()) {
            return res.status(400).json({
                error: "Task title is required.",
            });
        }

        if (!assigned_to || !assigned_to.trim()) {
            return res.status(400).json({
                error: "Assigned member name is required.",
            });
        }


        const projectId = parseInt(
            project_id,
            10
        );

        if (Number.isNaN(projectId)) {
            return res.status(400).json({
                error: "Invalid project ID.",
            });
        }


        // ====================================================
        // CHECK PROJECT
        // ====================================================

        const projectResult = await db.query(
            `
            SELECT
                id,
                name,
                created_by
            FROM projects
            WHERE id = $1
            LIMIT 1
            `,
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                error: "Project not found.",
            });
        }


        const project = projectResult.rows[0];


        // ====================================================
        // CHECK PROJECT OWNERSHIP
        // ====================================================

        if (
            String(project.created_by) !==
            String(userId)
        ) {
            return res.status(403).json({
                error:
                    "You can only assign tasks in your own project.",
            });
        }


        // ====================================================
        // FIND MEMBER
        // ====================================================

        const member = await findProjectMember(
            projectId,
            assigned_to
        );

        if (!member) {
            return res.status(404).json({
                error:
                    `Team member "${assigned_to}" was not found in this project.`,
            });
        }


        // ====================================================
        // CREATE TASK
        // ====================================================

        const task = await createAITask({
            projectId,

            title,

            description,

            priority,

            // IMPORTANT:
            // Pass the status received from AI.
            status,

            dueDate: due_date,

            memberId: member.id,

            createdBy: userId,
        });


        // ====================================================
        // SEND EXISTING TASK ASSIGNMENT EMAIL
        // ====================================================

        const emailSent =
            await sendTaskAssignmentEmail({
                memberEmail: member.email,

                memberName: member.name,

                taskTitle: task.title,

                taskDescription: task.description,

                dueDate: task.due_date,

                projectName: project.name,
            });


        // ====================================================
        // RESPONSE
        // ====================================================

        return res.status(201).json({

            message:
                "Task created and assigned successfully.",

            task,

            assignedMember: {
                id: member.id,
                name: member.name,
                email: member.email,
            },

            emailSent,

        });

    } catch (error) {

        console.error(
            "AI task assignment error:",
            error
        );

        return res.status(500).json({
            error: error.message,
        });
    }
};


// ============================================================
// EXPORT
// ============================================================

module.exports = {
    assignTaskFromAI,
};

