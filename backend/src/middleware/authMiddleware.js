// ==========================================
// BACKEND: Express JWT Authentication Middleware
// ==========================================

const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {
        // 1. Extract the 'authorization' header sent from the client/frontend
        const authHeader = req.headers.authorization;

        // 2. Return 401 Unauthorized if no header was provided
        if (!authHeader) {
            console.log("❌ Auth Failed: Authorization header missing");
            return res.status(401).json({
                message: "Authorization token missing"
            });
        }

        // 3. Clean up the token string (handles 'Bearer <token>' or just '<token>')
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.replace("Bearer ", "").trim()
            : authHeader.trim();

        // 4. Verify the JWT using your environment secret key (process.env.JWT_SECRET)
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // 5. Attach decoded payload (id, user_id, email, full_name) to req.user for downstream routes
        req.user = decoded;

        // 6. Pass control to the next middleware or route handler
        next();

    } catch (error) {
        // 7. Handle verification failures (expired token, invalid signature, or malformed JWT)
        console.error("❌ Auth Failed: Token Verification Error ->", error.message);

        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

module.exports = authMiddleware;