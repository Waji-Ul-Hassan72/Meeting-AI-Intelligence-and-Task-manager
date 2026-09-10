const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { sendEmail } = require("../config/mailer");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);

const ALLOWED_ROLES = [
    "Project Manager",
    "Developer",
];

const { publicKey, privateKey } =
    crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,

        publicKeyEncoding: {
            type: "spki",
            format: "pem",
        },

        privateKeyEncoding: {
            type: "pkcs8",
            format: "pem",
        },
    });

// ============================================================
// DECRYPT PASSWORD
// ============================================================

const decryptPassword = (encryptedPassword) => {
    return crypto
        .privateDecrypt(
            {
                key: privateKey,
                padding: crypto.constants.RSA_PKCS1_PADDING,
            },
            Buffer.from(encryptedPassword, "base64")
        )
        .toString("utf8");
};

// ============================================================
// GET PUBLIC KEY
// ============================================================

const getPublicKey = (req, res) => {
    return res.status(200).json({
        publicKey,
    });
};

// ============================================================
// SIGNUP
// ============================================================

const signup = async (req, res) => {
    const client = await pool.connect();

    try {
        const body = req.body || {};

        const {
            full_name,
            name,
            email,
            password: encryptedPassword,
            role,
            invitation_token,
        } = body;

        const userName = String(
            full_name || name || ""
        ).trim();

        if (!userName || !email || !encryptedPassword) {
            return res.status(400).json({
                message:
                    "Name, email and password are required.",
            });
        }

        const cleanEmail = String(email)
            .trim()
            .toLowerCase();

        // ====================================================
        // VALIDATE ROLE
        // ====================================================

        const userRole = String(
            role || "Developer"
        ).trim();

        if (!ALLOWED_ROLES.includes(userRole)) {
            return res.status(400).json({
                message:
                    "Invalid role. Role must be either Project Manager or Developer.",
            });
        }

        // ====================================================
        // DECRYPT PASSWORD
        // ====================================================

        let decryptedPassword;

        try {
            decryptedPassword =
                decryptPassword(encryptedPassword);
        } catch (error) {
            console.error(
                "Signup password decryption failed:",
                error.message
            );

            return res.status(400).json({
                message:
                    "Invalid encrypted password.",
            });
        }

        if (
            !decryptedPassword ||
            decryptedPassword.length < 6
        ) {
            return res.status(400).json({
                message:
                    "Password must be at least 6 characters long.",
            });
        }

        // ====================================================
        // START TRANSACTION
        // ====================================================

        await client.query("BEGIN");

        // ====================================================
        // CHECK EXISTING USER
        // ====================================================

        const userExists = await client.query(
            `
            SELECT id
            FROM users
            WHERE LOWER(TRIM(email)) = $1
            `,
            [cleanEmail]
        );

        if (userExists.rows.length > 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                message:
                    "Email already registered.",
            });
        }

        // ====================================================
        // CHECK INVITATION
        // ====================================================

        let invitation = null;

        if (invitation_token) {
            const invitationResult =
                await client.query(
                    `
                    SELECT
                        id,
                        project_id,
                        email,
                        token,
                        invited_by,
                        status,
                        expires_at
                    FROM project_invitations
                    WHERE token = $1
                    LIMIT 1
                    `,
                    [invitation_token]
                );

            if (
                invitationResult.rows.length === 0
            ) {
                await client.query("ROLLBACK");

                return res.status(400).json({
                    message:
                        "Invalid project invitation.",
                });
            }

            invitation =
                invitationResult.rows[0];

            // =================================================
            // CHECK INVITATION STATUS
            // =================================================

            if (invitation.status !== "pending") {
                await client.query("ROLLBACK");

                return res.status(400).json({
                    message:
                        "This project invitation has already been used or is no longer pending.",
                });
            }

            // =================================================
            // CHECK INVITATION EXPIRATION
            // =================================================

            if (
                new Date(invitation.expires_at) <=
                new Date()
            ) {
                await client.query("ROLLBACK");

                return res.status(400).json({
                    message:
                        "This project invitation has expired.",
                });
            }

            // =================================================
            // CHECK EMAIL
            // =================================================

            const invitationEmail =
                String(invitation.email)
                    .trim()
                    .toLowerCase();

            if (
                invitationEmail !==
                cleanEmail
            ) {
                await client.query("ROLLBACK");

                return res.status(400).json({
                    message:
                        "This invitation was sent to a different email address.",
                });
            }
        }

        // ====================================================
        // HASH PASSWORD
        // ====================================================

        const hashedPassword =
            await bcrypt.hash(
                decryptedPassword,
                10
            );

        // ====================================================
        // EMAIL VERIFICATION TOKEN
        // ====================================================

        const verificationToken = uuidv4();

        // ====================================================
        // CREATE USER
        // ====================================================

        const newUserResult =
            await client.query(
                `
                INSERT INTO users
                (
                    name,
                    email,
                    password_hash,
                    verification_token,
                    is_verified,
                    role
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    FALSE,
                    $5
                )
                RETURNING
                    id,
                    name,
                    email,
                    role,
                    is_verified,
                    created_at
                `,
                [
                    userName,
                    cleanEmail,
                    hashedPassword,
                    verificationToken,
                    userRole,
                ]
            );

        const newUser =
            newUserResult.rows[0];

        // ====================================================
        // ACCEPT PROJECT INVITATION
        // ====================================================

        if (invitation) {
            // =================================================
            // CHECK WHETHER USER IS ALREADY A MEMBER
            // =================================================

            const existingMembership =
                await client.query(
                    `
                    SELECT id
                    FROM project_members
                    WHERE project_id = $1
                    AND user_id = $2
                    `,
                    [
                        invitation.project_id,
                        newUser.id,
                    ]
                );

            if (
                existingMembership.rows.length === 0
            ) {
                await client.query(
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
                        invitation.project_id,
                        newUser.id,
                    ]
                );
            }

            // =================================================
            // MARK INVITATION AS ACCEPTED
            // =================================================

            await client.query(
                `
                UPDATE project_invitations
                SET status = 'accepted'
                WHERE id = $1
                `,
                [invitation.id]
            );
        }

        // ====================================================
        // COMMIT DATABASE CHANGES
        // ====================================================

        await client.query("COMMIT");

        // ====================================================
        // FRONTEND VERIFICATION URL
        // ====================================================

        const frontendUrl = (
            process.env.CLIENT_URL ||
            "http://localhost:5173"
        ).replace(/\/$/, "");

        const verificationLink =
            `${frontendUrl}/verify-email?token=${verificationToken}`;

        // ====================================================
        // SEND VERIFICATION EMAIL
        // ====================================================

        try {
            await sendEmail(
                cleanEmail,
                "Verify Your Email - CollabFlow AI",
                `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 30px;
                    color: #1e293b;
                    background: #ffffff;
                ">

                    <div style="
                        background: #0f766e;
                        color: white;
                        padding: 18px 22px;
                        border-radius: 10px;
                        margin-bottom: 25px;
                    ">
                        <h2 style="margin: 0;">
                            CollabFlow AI
                        </h2>
                    </div>

                    <h2>
                        Verify your email
                    </h2>

                    <p>
                        Hello ${userName},
                    </p>

                    <p>
                        Your CollabFlow AI account has been
                        created successfully.
                    </p>

                    <p>
                        Your account role is:
                        <strong>${userRole}</strong>
                    </p>

                    ${
                        invitation
                            ? `
                            <p>
                                You have also been added
                                automatically to the project
                                associated with your invitation.
                            </p>
                            `
                            : ""
                    }

                    <p>
                        Please verify your email address
                        before logging in.
                    </p>

                    <div style="margin: 30px 0;">

                        <a
                            href="${verificationLink}"
                            style="
                                display: inline-block;
                                padding: 13px 22px;
                                background: #0f766e;
                                color: #ffffff;
                                text-decoration: none;
                                border-radius: 8px;
                                font-weight: bold;
                            "
                        >
                            Verify Email
                        </a>

                    </div>

                    <p style="
                        color: #64748b;
                        font-size: 14px;
                    ">
                        After verification, you can log in
                        to your account.
                    </p>

                </div>
                `
            );

            console.log(
                `📧 Verification email sent to ${cleanEmail}`
            );
        } catch (emailError) {
            console.error(
                "❌ Verification email failed:",
                emailError.message
            );

            return res.status(500).json({
                message:
                    "Account was created, but the verification email could not be sent. Please contact support or request another verification email.",
            });
        }

        // ====================================================
        // SUCCESS RESPONSE
        // ====================================================

        return res.status(201).json({
            message:
                invitation
                    ? "Account created successfully and you have been added to the invited project. Please check your email to verify your account."
                    : "Account created successfully. Please check your email to verify your account.",

            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
            },

            invitation: invitation
                ? {
                      accepted: true,
                      project_id:
                          invitation.project_id,
                  }
                : null,
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
            "Signup Error:",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error.",
        });
    } finally {
        client.release();
    }
};

// ============================================================
// VERIFY EMAIL
// ============================================================

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                success: false,
                message:
                    "Verification token is missing.",
            });
        }

        const result = await pool.query(
            `
            SELECT
                id,
                email,
                is_verified
            FROM users
            WHERE verification_token = $1
            `,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid or expired verification link.",
            });
        }

        const user = result.rows[0];

        if (user.is_verified) {
            return res.status(200).json({
                success: true,
                message:
                    "Email is already verified.",
            });
        }

        await pool.query(
            `
            UPDATE users
            SET
                is_verified = TRUE,
                verification_token = NULL
            WHERE id = $1
            `,
            [user.id]
        );

        console.log(
            `✅ Email verified: ${user.email}`
        );

        return res.status(200).json({
            success: true,
            message:
                "Email verified successfully. You can now login.",
        });

    } catch (error) {
        console.error(
            "Verify Email Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Internal server error while verifying email.",
        });
    }
};

// ============================================================
// LOGIN
// ============================================================

const login = async (req, res) => {
    try {
        const body = req.body || {};

        const {
            email,
            password: encryptedPassword,
        } = body;

        if (!email || !encryptedPassword) {
            return res.status(400).json({
                message:
                    "Email and password are required.",
            });
        }

        const cleanEmail =
            String(email)
                .trim()
                .toLowerCase();

        let decryptedPassword;

        try {
            decryptedPassword =
                decryptPassword(
                    encryptedPassword
                );
        } catch (error) {
            console.error(
                "Login password decryption failed:",
                error.message
            );

            return res.status(400).json({
                message:
                    "Invalid encrypted password.",
            });
        }

        const result = await pool.query(
            `
            SELECT
                id,
                name,
                email,
                password_hash,
                role,
                is_verified
            FROM users
            WHERE LOWER(TRIM(email)) = $1
            `,
            [cleanEmail]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                message:
                    "Invalid email or password.",
            });
        }

        const user = result.rows[0];

        if (!user.is_verified) {
            return res.status(401).json({
                message:
                    "Please verify your email before logging in.",
            });
        }

        const isMatch =
            await bcrypt.compare(
                decryptedPassword,
                user.password_hash
            );

        if (!isMatch) {
            return res.status(400).json({
                message:
                    "Invalid email or password.",
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error(
                "JWT_SECRET is missing from environment variables."
            );

            return res.status(500).json({
                message:
                    "Server authentication configuration is missing.",
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d",
            }
        );

        return res.status(200).json({
            message: "Login Successful",

            token,

            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });

    } catch (error) {
        console.error(
            "Login Error:",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error.",
        });
    }
};

// ============================================================
// GOOGLE LOGIN
// ============================================================

const googleLogin = async (req, res) => {
    try {
        const body = req.body || {};

        const { credential } = body;

        if (!credential) {
            return res.status(400).json({
                message:
                    "Google credential is required.",
            });
        }

        const ticket =
            await googleClient.verifyIdToken({
                idToken: credential,
                audience:
                    process.env.GOOGLE_CLIENT_ID,
            });

        const payload =
            ticket.getPayload();

        const googleId =
            payload.sub;

        const email =
            payload.email;

        const name =
            payload.name;

        const emailVerified =
            payload.email_verified;

        if (!googleId || !email) {
            return res.status(400).json({
                message:
                    "Invalid Google account information.",
            });
        }

        if (!emailVerified) {
            return res.status(401).json({
                message:
                    "Google email is not verified.",
            });
        }

        const cleanEmail =
            String(email)
                .trim()
                .toLowerCase();

        const existingUser =
            await pool.query(
                `
                SELECT
                    id,
                    name,
                    email,
                    role,
                    is_verified,
                    google_id
                FROM users
                WHERE LOWER(TRIM(email)) = $1
                   OR google_id = $2
                LIMIT 1
                `,
                [
                    cleanEmail,
                    googleId,
                ]
            );

        let user;

        if (existingUser.rows.length > 0) {
            user =
                existingUser.rows[0];

            await pool.query(
                `
                UPDATE users
                SET
                    google_id = $1,
                    is_verified = TRUE
                WHERE id = $2
                `,
                [
                    googleId,
                    user.id,
                ]
            );

            user.google_id =
                googleId;

            user.is_verified =
                true;

        } else {
            const newUser =
                await pool.query(
                    `
                    INSERT INTO users
                    (
                        name,
                        email,
                        google_id,
                        is_verified,
                        role
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        TRUE,
                        $4
                    )
                    RETURNING
                        id,
                        name,
                        email,
                        role,
                        is_verified,
                        google_id
                    `,
                    [
                        name ||
                            "Google User",
                        cleanEmail,
                        googleId,
                        "Developer",
                    ]
                );

            user =
                newUser.rows[0];
        }

        if (!process.env.JWT_SECRET) {
            console.error(
                "JWT_SECRET is missing from environment variables."
            );

            return res.status(500).json({
                message:
                    "Server authentication configuration is missing.",
            });
        }

        const token =
            jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "1d",
                }
            );

        return res.status(200).json({
            message:
                "Google Login Successful",

            token,

            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });

    } catch (error) {
        console.error(
            "Google Login Error:",
            error
        );

        return res.status(401).json({
            message:
                "Google authentication failed.",
        });
    }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    signup,
    login,
    googleLogin,
    verifyEmail,
    getPublicKey,
};