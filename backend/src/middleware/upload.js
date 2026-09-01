const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ============================================================
// UPLOAD DIRECTORY
// ============================================================

const uploadDirectory = path.join(
    __dirname,
    "..",
    "uploads",
    "tasks"
);

// Create directory automatically if it does not exist
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {
        recursive: true,
    });
}

// ============================================================
// STORAGE CONFIGURATION
// ============================================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },

    filename: (req, file, cb) => {

        const extension = path.extname(
            file.originalname
        );

        const baseName = path
            .basename(
                file.originalname,
                extension
            )
            .replace(/[^a-zA-Z0-9-_]/g, "_");

        const uniqueName =
            `${Date.now()}-${baseName}${extension}`;

        cb(null, uniqueName);
    },
});

// ============================================================
// ALLOWED FILE TYPES
// ============================================================

const allowedMimeTypes = [

    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",

    // PDF
    "application/pdf",

    // Documents
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    // Excel
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    // Text
    "text/plain",

];

// ============================================================
// FILE FILTER
// ============================================================

const fileFilter = (req, file, cb) => {

    if (
        allowedMimeTypes.includes(
            file.mimetype
        )
    ) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "File type is not supported."
            ),
            false
        );
    }
};

// ============================================================
// MULTER CONFIGURATION
// ============================================================

const uploadTaskAttachment = multer({

    storage,

    fileFilter,

    limits: {
        fileSize: 10 * 1024 * 1024,
    },

});

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    uploadTaskAttachment,
};