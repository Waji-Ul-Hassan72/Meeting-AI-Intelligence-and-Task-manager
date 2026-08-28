const crypto = require("crypto");
const db = require("../config/db");
const { sendEmail } = require("../config/mailer");

// ============================================================
// GET USER ID FROM JWT
// ============================================================

const getUserId = (req) => {
    return (
        req.user?.id ||
        req.user?.userId ||
        req.user?.user_id
    );
};

// ============================================================
// SEND PROJECT INVITATION
// ============================================================

const inviteProjectMember = async (req, res) => {
    try {
        // ========================================================
        // GET MANAGER ID
        // ========================================================

        const managerId = getUserId(req);

        if (!managerId) {
            return res.status(401).json({
                error: "Authentication required.",
            });
        }

        // ========================================================
        // REQUEST DATA
        // ========================================================

        const { email, project_id } = req.body;

        if (!email || !project_id) {
            return res.status(400).json({
                error:
                    "Email and project are required.",
            });
        }

        const cleanEmail = String(email)
            .trim()
            .toLowerCase();

        // ========================================================
        // EMAIL VALIDATION
        // ========================================================

        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({
                error:
                    "Please enter a valid email address.",
            });
        }

        // ========================================================
        // CHECK PROJECT OWNERSHIP
        // ========================================================

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
                    "You are not authorized to manage this project.",
            });
        }

        const project =
            projectResult.rows[0];

        // ========================================================
        // CHECK USER
        // ========================================================

        const userResult = await db.query(
            `
            SELECT
                id,
                name,
                email,
                role
            FROM users
            WHERE LOWER(TRIM(email)) = $1
            `,
            [cleanEmail]
        );

        // ========================================================
        // CASE 1: USER EXISTS
        // ========================================================

        if (userResult.rows.length > 0) {
            const member =
                userResult.rows[0];

            // Cannot add yourself
            if (
                String(member.id) ===
                String(managerId)
            ) {
                return res.status(400).json({
                    error:
                        "You cannot add yourself to your own project.",
                });
            }

            // Check membership
            const existingMember =
                await db.query(
                    `
                    SELECT id
                    FROM project_members
                    WHERE project_id = $1
                    AND user_id = $2
                    `,
                    [
                        project_id,
                        member.id,
                    ]
                );

            if (
                existingMember.rows.length >
                0
            ) {
                return res.status(409).json({
                    error: `${
                        member.name ||
                        member.email
                    } is already a member of this project.`,
                });
            }

            // Add directly
            await db.query(
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
                `,
                [
                    project_id,
                    member.id,
                ]
            );

            // Notification email
            try {
                await sendEmail(
                    member.email,
                    `You have been added to ${project.name}`,
                    `
                    <div style="
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 30px;
                        color: #1e293b;
                    ">

                        <h2 style="color:#0f766e;">
                            You have been added to a project
                        </h2>

                        <p>
                            Hello ${
                                member.name ||
                                "there"
                            },
                        </p>

                        <p>
                            You have been added to
                            <strong>
                                ${project.name}
                            </strong>
                            on CollabFlow AI.
                        </p>

                        <p>
                            You can now access this project
                            from your dashboard.
                        </p>

                    </div>
                    `
                );
            } catch (emailError) {
                console.error(
                    "⚠️ Member notification email failed:",
                    emailError.message
                );
            }

            return res.status(201).json({
                type: "existing_user",

                message: `${
                    member.name ||
                    member.email
                } has been added to the project.`,

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
            });
        }

        // ========================================================
        // CASE 2: USER DOES NOT EXIST
        // ========================================================

        // Check pending invitation
        const existingInvitation =
            await db.query(
                `
                SELECT
                    id,
                    status,
                    expires_at
                FROM project_invitations
                WHERE project_id = $1
                AND LOWER(TRIM(email)) = $2
                AND status = 'pending'
                `,
                [
                    project_id,
                    cleanEmail,
                ]
            );

        if (
            existingInvitation.rows.length >
            0
        ) {
            return res.status(409).json({
                error:
                    "An invitation has already been sent to this email.",
            });
        }

        // ========================================================
        // GENERATE TOKEN
        // ========================================================

        const invitationToken =
            crypto
                .randomBytes(32)
                .toString("hex");

        // ========================================================
        // EXPIRES IN 48 HOURS
        // ========================================================

        const expiresAt = new Date(
            Date.now() +
                48 *
                    60 *
                    60 *
                    1000
        );

        // ========================================================
        // SAVE INVITATION
        // ========================================================

        const invitationResult =
            await db.query(
                `
                INSERT INTO project_invitations
                (
                    project_id,
                    email,
                    invited_by,
                    token,
                    status,
                    expires_at
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    'pending',
                    $5
                )
                RETURNING
                    id,
                    project_id,
                    email,
                    status,
                    expires_at
                `,
                [
                    project_id,
                    cleanEmail,
                    managerId,
                    invitationToken,
                    expiresAt,
                ]
            );

        // ========================================================
        // FRONTEND LINK
        // ========================================================

        const frontendUrl = (
            process.env.CLIENT_URL ||
            "http://localhost:5173"
        ).replace(/\/$/, "");

        const invitationLink =
            `${frontendUrl}/accept-invitation/${invitationToken}`;

        console.log(
            "🔗 Invitation link:",
            invitationLink
        );

        // ========================================================
        // SEND EMAIL
        // ========================================================

        try {
            await sendEmail(
                cleanEmail,
                `Invitation to join ${project.name}`,
                `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 30px;
                    color: #1e293b;
                ">

                    <div style="
                        background:#0f766e;
                        color:white;
                        padding:18px 22px;
                        border-radius:10px;
                    ">

                        <h2 style="margin:0;">
                            CollabFlow AI
                        </h2>

                    </div>

                    <h2>
                        You're invited to join a project
                    </h2>

                    <p>
                        You have been invited to join
                        <strong>
                            ${project.name}
                        </strong>
                        on CollabFlow AI.
                    </p>

                    <p>
                        Click the button below to continue.
                    </p>

                    <div style="
                        margin:30px 0;
                    ">

                        <a
                            href="${invitationLink}"
                            style="
                                display:inline-block;
                                padding:13px 22px;
                                background:#0f766e;
                                color:#ffffff;
                                text-decoration:none;
                                border-radius:8px;
                                font-weight:bold;
                            "
                        >
                            Join Project
                        </a>

                    </div>

                    <p style="
                        color:#64748b;
                        font-size:14px;
                    ">
                        This invitation expires in 48 hours.
                    </p>

                    <p style="
                        color:#94a3b8;
                        font-size:12px;
                    ">
                        If you did not expect this invitation,
                        you can safely ignore this email.
                    </p>

                </div>
                `
            );

            console.log(
                `📧 Project invitation sent to ${cleanEmail}`
            );
        } catch (emailError) {
            console.error(
                "❌ Invitation email failed:",
                emailError.message
            );

            await db.query(
                `
                DELETE FROM project_invitations
                WHERE id = $1
                `,
                [
                    invitationResult
                        .rows[0].id,
                ]
            );

            return res.status(500).json({
                error:
                    "Invitation could not be sent. Please check email configuration.",
            });
        }

        // ========================================================
        // SUCCESS
        // ========================================================

        return res.status(201).json({
            type: "invitation",

            message:
                `Invitation sent to ${cleanEmail}.`,

            invitation:
                invitationResult.rows[0],
        });
    } catch (error) {
        console.error(
            "❌ Invite project member error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to process project invitation.",
        });
    }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    inviteProjectMember,
};