const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { sendEmail } = require("../config/mailer");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
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
    try {
        const {
            full_name,
            name,
            email,
            password: encryptedPassword,
            role,
        } = req.body;

        const userName = String(full_name || name || "").trim();
        const userRole = String(role || "Developer").trim();

        if (!userName || !email || !encryptedPassword) {
            return res.status(400).json({
                message: "Name, email and password are required.",
            });
        }

        const cleanEmail = String(email).trim().toLowerCase();

        // DECRYPT PASSWORD
        let decryptedPassword;

        try {
            decryptedPassword = decryptPassword(encryptedPassword);
        } catch (error) {
            console.error("Signup password decryption failed:", error.message);

            return res.status(400).json({
                message: "Invalid encrypted password.",
            });
        }

        // CHECK EXISTING USER
        const userExists = await pool.query(
            `
            SELECT id
            FROM users
            WHERE LOWER(TRIM(email)) = $1
            `,
            [cleanEmail]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({
                message: "Email already registered.",
            });
        }

        // HASH PASSWORD
        const hashedPassword = await bcrypt.hash(decryptedPassword, 10);

        // EMAIL VERIFICATION TOKEN
        const verificationToken = uuidv4();

        // CREATE USER & RETURN ID
        const newUserResult = await pool.query(
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
                $1, $2, $3, $4, FALSE, $5
            )
            RETURNING id
            `,
            [userName, cleanEmail, hashedPassword, verificationToken, userRole]
        );

        const newUserId = newUserResult.rows[0].id;

        // FRONTEND VERIFICATION URL
        const frontendUrl = (
            process.env.CLIENT_URL || "http://localhost:5173"
        ).replace(/\/$/, "");

        const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

        // SEND VERIFICATION EMAIL
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
                        <h2 style="margin: 0;">CollabFlow AI</h2>
                    </div>

                    <h2>Verify your email</h2>

                    <p>Hello ${userName},</p>

                    <p>Your CollabFlow AI account has been created successfully.</p>

                    <p>Please verify your email address before logging in.</p>

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

                    <p style="color: #64748b; font-size: 14px;">
                        After verification, you can log in to your account.
                    </p>
                </div>
                `
            );

            console.log(`📧 Verification email sent to ${cleanEmail}`);
        } catch (emailError) {
            console.error("❌ Verification email failed:", emailError.message);

            // Safely delete by primary key ID
            await pool.query(
                `
                DELETE FROM users
                WHERE id = $1
                `,
                [newUserId]
            );

            return res.status(500).json({
                message:
                    "Account could not be created because verification email could not be sent.",
            });
        }

        return res.status(201).json({
            message:
                "Account created successfully. Please check your email to verify your account.",
        });
    } catch (error) {
        console.error("Signup Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
        });
    }
};

// ============================================================
// VERIFY EMAIL API
// ============================================================

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Verification token is missing.",
            });
        }

        // FIND USER
        const result = await pool.query(
            `
            SELECT
                id,
                email
            FROM users
            WHERE verification_token = $1
            `,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired verification link.",
            });
        }

        const user = result.rows[0];

        // VERIFY USER & CLEAR TOKEN
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

        console.log(`✅ Email verified: ${user.email}`);

        return res.status(200).json({
            success: true,
            message: "Email verified successfully. You can now login.",
        });
    } catch (error) {
        console.error("Verify Email Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error while verifying email.",
        });
    }
};

// ============================================================
// LOGIN
// ============================================================

const login = async (req, res) => {
    try {
        const { email, password: encryptedPassword } = req.body;

        if (!email || !encryptedPassword) {
            return res.status(400).json({
                message: "Email and password are required.",
            });
        }

        const cleanEmail = String(email).trim().toLowerCase();

        // DECRYPT PASSWORD
        let decryptedPassword;

        try {
            decryptedPassword = decryptPassword(encryptedPassword);
        } catch (error) {
            console.error("Login password decryption failed:", error.message);

            return res.status(400).json({
                message: "Invalid encrypted password.",
            });
        }

        // FIND USER
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
                message: "Invalid email or password.",
            });
        }

        const user = result.rows[0];

        // EMAIL VERIFICATION CHECK
        if (!user.is_verified) {
            return res.status(401).json({
                message: "Please verify your email before logging in.",
            });
        }

        // PASSWORD CHECK
        const isMatch = await bcrypt.compare(
            decryptedPassword,
            user.password_hash
        );

        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid email or password.",
            });
        }

        // CREATE JWT
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
        console.error("Login Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
        });
    }
};

// ============================================================
// GOOGLE LOGIN
// ============================================================

const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                message: "Google credential is required.",
            });
        }

        // VERIFY GOOGLE ID TOKEN
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name;
        const emailVerified = payload.email_verified;

        if (!googleId || !email) {
            return res.status(400).json({
                message: "Invalid Google account information.",
            });
        }

        if (!emailVerified) {
            return res.status(401).json({
                message: "Google email is not verified.",
            });
        }

        const cleanEmail = String(email).trim().toLowerCase();

        // CHECK EXISTING USER
        const existingUser = await pool.query(
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
            [cleanEmail, googleId]
        );

        let user;

        if (existingUser.rows.length > 0) {
            user = existingUser.rows[0];

            await pool.query(
                `
                UPDATE users
                SET
                    google_id = $1,
                    is_verified = TRUE
                WHERE id = $2
                `,
                [googleId, user.id]
            );

            user.google_id = googleId;
            user.is_verified = true;
        } else {
            const newUser = await pool.query(
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
                    $1, $2, $3, TRUE, $4
                )
                RETURNING
                    id,
                    name,
                    email,
                    role,
                    is_verified,
                    google_id
                `,
                [name || "Google User", cleanEmail, googleId, "Developer"]
            );

            user = newUser.rows[0];
        }

        // CREATE JWT
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
            message: "Google Login Successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Google Login Error:", error);

        return res.status(401).json({
            message: "Google authentication failed.",
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