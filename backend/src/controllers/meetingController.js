const db = require("../config/db");

// Get user ID from JWT
const getUserId = (req) => {
  return req.user?.id || req.user?.userId || req.user?.user_id;
};

// ==========================================
// CREATE MEETING
// ==========================================
const createMeeting = async (req, res) => {
  try {
    const {
      title,
      description,
      meeting_date,
      duration,
      location,
      project_id,
    } = req.body;

    const created_by = getUserId(req);

    if (!created_by) {
      return res.status(401).json({
        error: "User authentication missing or invalid token.",
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        error: "Meeting title is required.",
      });
    }

    if (!project_id) {
      return res.status(400).json({
        error: "Project ID is required.",
      });
    }

    const projectResult = await db.query(
      `SELECT id
       FROM projects
       WHERE id = $1`,
      [project_id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        error: "Project not found.",
      });
    }

    const result = await db.query(
      `INSERT INTO meetings
       (
         project_id,
         created_by,
         title,
         description,
         meeting_date,
         duration,
         location,
         status
       )
       VALUES
       (
         $1,
         $2,
         $3,
         $4,
         $5,
         $6,
         $7,
         $8
       )
       RETURNING *`,
      [
        project_id,
        created_by,
        title.trim(),
        description?.trim() || "",
        meeting_date || null,
        duration || null,
        location?.trim() || "",
        "Scheduled",
      ]
    );

    return res.status(201).json({
      message: "Meeting created successfully.",
      meeting: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error creating meeting:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
};

// ==========================================
// GET ALL MEETINGS
// ==========================================
const getMeetings = async (req, res) => {
  try {
    const created_by = getUserId(req);

    if (!created_by) {
      return res.status(401).json({
        error: "User authentication missing or invalid token.",
      });
    }

    const result = await db.query(
      `SELECT *
       FROM meetings
       WHERE created_by = $1
          OR project_id IN (
              SELECT id
              FROM projects
              WHERE created_by = $1
          )
       ORDER BY meeting_date DESC NULLS LAST`,
      [created_by]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("❌ Error fetching meetings:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
};

// ==========================================
// GET SINGLE MEETING
// ==========================================
const getMeetingById = async (req, res) => {
  try {
    const { id } = req.params;
    const created_by = getUserId(req);

    if (!created_by) {
      return res.status(401).json({
        error: "User authentication missing or invalid token.",
      });
    }

    const result = await db.query(
      `SELECT *
       FROM meetings
       WHERE id = $1
       AND (
         created_by = $2
         OR project_id IN (
           SELECT id
           FROM projects
           WHERE created_by = $2
         )
       )`,
      [id, created_by]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Meeting not found.",
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error fetching meeting:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE MEETING
// ==========================================
const updateMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const created_by = getUserId(req);
    const {
      title,
      description,
      meeting_date,
      duration,
      location,
      status,
      project_id,
    } = req.body;

    if (!created_by) {
      return res.status(401).json({
        error: "User authentication missing or invalid token.",
      });
    }

    const existingMeeting = await db.query(
      `SELECT * FROM meetings WHERE id = $1 AND (created_by = $2 OR project_id IN (SELECT id FROM projects WHERE created_by = $2))`,
      [id, created_by]
    );

    if (existingMeeting.rows.length === 0) {
      return res.status(404).json({ error: "Meeting not found." });
    }

    const result = await db.query(
      `UPDATE meetings
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           meeting_date = COALESCE($3, meeting_date),
           duration = COALESCE($4, duration),
           location = COALESCE($5, location),
           status = COALESCE($6, status),
           project_id = COALESCE($7, project_id)
       WHERE id = $8
       RETURNING *`,
      [
        title ? title.trim() : null,
        description ? description.trim() : null,
        meeting_date || null,
        duration || null,
        location ? location.trim() : null,
        status || null,
        project_id || null,
        id,
      ]
    );

    return res.status(200).json({
      message: "Meeting updated successfully.",
      meeting: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error updating meeting:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ==========================================
// DELETE MEETING
// ==========================================
const deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const created_by = getUserId(req);

    if (!created_by) {
      return res.status(401).json({
        error: "User authentication missing or invalid token.",
      });
    }

    const result = await db.query(
      `DELETE FROM meetings
       WHERE id = $1 AND (created_by = $2 OR project_id IN (SELECT id FROM projects WHERE created_by = $2))
       RETURNING *`,
      [id, created_by]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Meeting not found." });
    }

    return res.status(200).json({
      message: "Meeting deleted successfully.",
    });
  } catch (error) {
    console.error("❌ Error deleting meeting:", error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createMeeting,
  getMeetings,
  getMeetingById,
  updateMeeting,
  deleteMeeting,
};