const express = require('express');
const app = require('./src/app'); // Ensure path to your Express app is correct
const db = require('./src/config/db');

const PORT = process.env.PORT || 3000;

// Verify Database Connection before listening
db.query("SELECT NOW()")
    .then(() => {
        console.log("✅ PostgreSQL Connected Successfully");
        app.listen(PORT, () => {
            console.log(`🚀 Server listening on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
        });
    })
    .catch((error) => {
        console.error("❌ Database Connection Error:", error.message);
        process.exit(1);
    });