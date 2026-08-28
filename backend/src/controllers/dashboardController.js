// ==========================================
// BACKEND: Express Dashboard Controller
// ==========================================

const db = require('../config/db');

/**
 * Controller to fetch aggregated dashboard statistics, project lists, and task lists.
 */
const getDashboardStats = async (req, res) => {
    try {
        // 1. Extract the authenticated user's ID attached by authMiddleware
        const user_id = req.user.id;

        // 2. Format today's date (YYYY-MM-DD) to filter overdue tasks
        const today = new Date().toISOString().split("T")[0];

        // 3. Execute queries concurrently using 'db.query'
        const [
            projectsResult,
            tasksResult,
            totalProjectsResult,
            totalTasksResult,
            completedTasksResult,
            pendingTasksResult,
            overdueTasksResult
        ] = await Promise.all([

            // Fetch actual project records created by or assigned to the user
            db.query(
                `SELECT * FROM projects 
                 WHERE created_by = $1 
                 OR id IN (SELECT project_id FROM project_members WHERE user_id = $1)
                 ORDER BY created_at DESC`,
                [user_id]
            ),

            // FIXED: Changed assignee_id to user_id to match taskController schema
            db.query(
                "SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC",
                [user_id]
            ),

            // Count total projects created by the user
            db.query(
                "SELECT COUNT(*) FROM projects WHERE created_by = $1",
                [user_id]
            ),

            // FIXED: Changed assignee_id to user_id
            db.query(
                "SELECT COUNT(*) FROM tasks WHERE user_id = $1",
                [user_id]
            ),

            // FIXED: Changed assignee_id to user_id
            db.query(
                "SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND status = $2",
                [user_id, "Completed"]
            ),

            // FIXED: Changed assignee_id to user_id
            db.query(
                "SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND status != $2",
                [user_id, "Completed"]
            ),

            // FIXED: Changed assignee_id to user_id
            db.query(
                `SELECT COUNT(*)
                 FROM tasks
                 WHERE user_id = $1
                 AND due_date < $2
                 AND status != $3`,
                [user_id, today, "Completed"]
            )
        ]);

        // 4. Return both actual list data and metrics
        res.status(200).json({
            projects: projectsResult.rows,
            tasks: tasksResult.rows,
            stats: {
                totalProjects: Number(totalProjectsResult.rows[0].count),
                totalTasks: Number(totalTasksResult.rows[0].count),
                completedTasks: Number(completedTasksResult.rows[0].count),
                pendingTasks: Number(pendingTasksResult.rows[0].count),
                overdueTasks: Number(overdueTasksResult.rows[0].count)
            }
        });

    } catch (error) {
        console.error("❌ Error fetching dashboard data:", error.message);
        res.status(500).json({
            error: error.message
        });
    }
};

module.exports = {
    getDashboardStats
};