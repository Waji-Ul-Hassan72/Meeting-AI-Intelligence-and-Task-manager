const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
// Fixed: Import 'pool' directly to match the rest of the file
const pool = require("./db");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: `${BACKEND_URL}/auth/google/callback`
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                console.log("========== GOOGLE CALLBACK STARTED ==========");
                
                const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
                const fullName = profile.displayName;
                const googleId = profile.id;
                const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

                if (!email) {
                    return done(new Error("No email returned from Google profile."), null);
                }

                // 1. Check if user exists by email
                const existingUserResult = await pool.query(
                    "SELECT * FROM users WHERE email = $1",
                    [email]
                );

                let user;

                if (existingUserResult.rows.length > 0) {
                    console.log("User already exists in database.");
                    user = existingUserResult.rows[0];

                    // 2. Link Google account & update verified status
                    const updatedUserResult = await pool.query(
                        `UPDATE users
                         SET is_verified = TRUE,
                             verification_token = NULL,
                             google_id = COALESCE(google_id, $1),
                             avatar_url = COALESCE(avatar_url, $2)
                         WHERE id = $3
                         RETURNING *`,
                        [googleId, avatarUrl, user.id]
                    );

                    user = updatedUserResult.rows[0];
                } else {
                    console.log("Creating new Google user...");

                    // 3. Register new OAuth user
                    const newUserResult = await pool.query(
                        `INSERT INTO users
                         (
                             full_name,
                             email,
                             google_id,
                             avatar_url,
                             is_verified,
                             verification_token
                         )
                         VALUES ($1, $2, $3, $4, TRUE, NULL)
                         RETURNING *`,
                        [fullName, email, googleId, avatarUrl]
                    );

                    user = newUserResult.rows[0];
                    console.log("New Google user created successfully.");
                }

                return done(null, user);
            } catch (error) {
                console.error("========== PASSPORT GOOGLE STRATEGY ERROR ==========");
                console.error(error.message);
                return done(error, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
        done(null, result.rows[0]);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;