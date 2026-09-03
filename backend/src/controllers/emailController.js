
// ============================================================
// AI SERVICE URL
// ============================================================

const AI_SERVICE_URL =
    process.env.AI_SERVICE_URL ||
    "http://localhost:8000";


// ============================================================
// HELPER - CALL AI SERVICE
// ============================================================

const callAIService = async (
    endpoint,
    options = {}
) => {

    try {

        const response = await fetch(
            `${AI_SERVICE_URL}${endpoint}`,
            options
        );

        // ----------------------------------------------------
        // GET RESPONSE DATA
        // ----------------------------------------------------

        let data;

        try {

            data = await response.json();

        } catch (error) {

            data = {
                detail:
                    "AI service returned an invalid response."
            };
        }

        // ----------------------------------------------------
        // CHECK RESPONSE
        // ----------------------------------------------------

        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.message ||
                "AI service request failed."
            );
        }

        return data;

    } catch (error) {

        console.error(
            "❌ AI service error:",
            error
        );

        throw error;
    }
};


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
        req.user?.user_role ||
        req.user?.role_name ||
        ""
    )
        .trim()
        .toLowerCase();
};


// ============================================================
// CHECK MANAGER
// ============================================================

const isProjectManager = (req) => {

    const role = getUserRole(req);

    return (
        role === "project manager" ||
        role === "manager"
    );
};


// ============================================================
// CREATE EMAIL DRAFT
// ============================================================
//
// POST /api/email/draft
//
// Request body:
//
// {
//     "recipientName": "John",
//     "recipientEmail": "john@gmail.com",
//     "subject": "Task Assignment",
//     "body": "You have been assigned a new task."
// }
//
// ============================================================

const createEmailDraft = async (
    req,
    res
) => {

    try {

        console.log(
            "\n=========================================="
        );

        console.log(
            "CREATE EMAIL DRAFT"
        );

        console.log(
            "=========================================="
        );


        // ----------------------------------------------------
        // CHECK AUTHENTICATION
        // ----------------------------------------------------

        const user_id = getUserId(req);

        if (!user_id) {

            return res.status(401).json({

                success: false,

                error:
                    "User authentication missing or invalid token.",

            });
        }


        // ----------------------------------------------------
        // CHECK ROLE
        // ----------------------------------------------------

        if (!isProjectManager(req)) {

            return res.status(403).json({

                success: false,

                error:
                    "Only Project Managers can send emails.",

            });
        }


        // ----------------------------------------------------
        // GET REQUEST DATA
        // ----------------------------------------------------

        const {
            recipientName,
            recipientEmail,
            subject,
            body,
        } = req.body;


        // ----------------------------------------------------
        // VALIDATE RECIPIENT EMAIL
        // ----------------------------------------------------

        if (!recipientEmail) {

            return res.status(400).json({

                success: false,

                error:
                    "Recipient email is required.",

            });
        }


        // ----------------------------------------------------
        // VALIDATE SUBJECT
        // ----------------------------------------------------

        if (!subject) {

            return res.status(400).json({

                success: false,

                error:
                    "Email subject is required.",

            });
        }


        // ----------------------------------------------------
        // VALIDATE BODY
        // ----------------------------------------------------

        if (!body) {

            return res.status(400).json({

                success: false,

                error:
                    "Email body is required.",

            });
        }


        console.log(
            "Recipient:",
            recipientEmail
        );

        console.log(
            "Subject:",
            subject
        );


        // ----------------------------------------------------
        // CALL PYTHON AI SERVICE
        // ----------------------------------------------------

        const result = await callAIService(
            "/email/draft",
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                },

                body: JSON.stringify({

                    recipient_name:
                        recipientName || "",

                    recipient_email:
                        recipientEmail,

                    subject,

                    body,

                }),
            }
        );


        // ----------------------------------------------------
        // RETURN DRAFT
        // ----------------------------------------------------

        return res.status(200).json({

            success: true,

            message:
                "Email draft created successfully.",

            draft:
                result.draft,

        });

    } catch (error) {

        console.error(
            "❌ Error creating email draft:",
            error
        );

        return res.status(500).json({

            success: false,

            error:
                error.message ||
                "Failed to create email draft.",

        });
    }
};


// ============================================================
// UPDATE EMAIL DRAFT
// ============================================================

const updateEmailDraft = async (
    req,
    res
) => {

    try {

        console.log(
            "\n=========================================="
        );

        console.log(
            "UPDATE EMAIL DRAFT"
        );

        console.log(
            "=========================================="
        );


        // ----------------------------------------------------
        // CHECK AUTHENTICATION
        // ----------------------------------------------------

        const user_id = getUserId(req);

        if (!user_id) {

            return res.status(401).json({

                success: false,

                error:
                    "User authentication missing or invalid token.",

            });
        }


        // ----------------------------------------------------
        // CHECK ROLE
        // ----------------------------------------------------

        if (!isProjectManager(req)) {

            return res.status(403).json({

                success: false,

                error:
                    "Only Project Managers can edit email drafts.",

            });
        }


        // ----------------------------------------------------
        // GET REQUEST DATA
        // ----------------------------------------------------

        const {
            draft,
            recipientName,
            recipientEmail,
            subject,
            body,
        } = req.body;


        if (
            !draft ||
            typeof draft !== "object"
        ) {

            return res.status(400).json({

                success: false,

                error:
                    "Email draft is required.",

            });
        }


        // ----------------------------------------------------
        // CALL PYTHON AI SERVICE
        // ----------------------------------------------------

        const result = await callAIService(
            "/email/draft",
            {

                method: "PUT",

                headers: {

                    "Content-Type":
                        "application/json",

                },

                body: JSON.stringify({

                    draft,

                    recipient_name:
                        recipientName ??
                        null,

                    recipient_email:
                        recipientEmail ??
                        null,

                    subject:
                        subject ??
                        null,

                    body:
                        body ??
                        null,

                }),
            }
        );


        // ----------------------------------------------------
        // RETURN UPDATED DRAFT
        // ----------------------------------------------------

        return res.status(200).json({

            success: true,

            message:
                "Email draft updated successfully.",

            draft:
                result.draft,

        });

    } catch (error) {

        console.error(
            "❌ Error updating email draft:",
            error
        );

        return res.status(500).json({

            success: false,

            error:
                error.message ||
                "Failed to update email draft.",

        });
    }
};


// ============================================================
// APPROVE EMAIL DRAFT
// ============================================================

const approveEmailDraft = async (
    req,
    res
) => {

    try {

        console.log(
            "\n=========================================="
        );

        console.log(
            "APPROVE EMAIL DRAFT"
        );

        console.log(
            "=========================================="
        );


        // ----------------------------------------------------
        // CHECK AUTHENTICATION
        // ----------------------------------------------------

        const user_id = getUserId(req);

        if (!user_id) {

            return res.status(401).json({

                success: false,

                error:
                    "User authentication missing or invalid token.",

            });
        }


        // ----------------------------------------------------
        // CHECK ROLE
        // ----------------------------------------------------

        if (!isProjectManager(req)) {

            return res.status(403).json({

                success: false,

                error:
                    "Only Project Managers can approve emails.",

            });
        }


        // ----------------------------------------------------
        // GET DRAFT
        // ----------------------------------------------------

        const {
            draft,
        } = req.body;


        if (
            !draft ||
            typeof draft !== "object"
        ) {

            return res.status(400).json({

                success: false,

                error:
                    "Email draft is required.",

            });
        }


        console.log(
            "Draft ID:",
            draft.draft_id
        );

        console.log(
            "Current status:",
            draft.status
        );


        // ----------------------------------------------------
        // CALL PYTHON AI SERVICE
        // ----------------------------------------------------

        const result = await callAIService(
            "/email/draft/approve",
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                },

                body: JSON.stringify({

                    draft,

                }),
            }
        );


        // ----------------------------------------------------
        // RETURN APPROVED DRAFT
        // ----------------------------------------------------

        return res.status(200).json({

            success: true,

            message:
                "Email draft approved successfully.",

            draft:
                result.draft,

        });

    } catch (error) {

        console.error(
            "❌ Error approving email draft:",
            error
        );

        return res.status(500).json({

            success: false,

            error:
                error.message ||
                "Failed to approve email draft.",

        });
    }
};


// ============================================================
// SEND APPROVED EMAIL
// ============================================================


const sendEmail = async (
    req,
    res
) => {

    try {

        console.log(
            "\n=========================================="
        );

        console.log(
            "SEND APPROVED EMAIL"
        );

        console.log(
            "=========================================="
        );


        // ----------------------------------------------------
        // CHECK AUTHENTICATION
        // ----------------------------------------------------

        const user_id = getUserId(req);

        if (!user_id) {

            return res.status(401).json({

                success: false,

                error:
                    "User authentication missing or invalid token.",

            });
        }


        // ----------------------------------------------------
        // CHECK ROLE
        // ----------------------------------------------------

        if (!isProjectManager(req)) {

            return res.status(403).json({

                success: false,

                error:
                    "Only Project Managers can send emails.",

            });
        }


        // ----------------------------------------------------
        // GET DRAFT
        // ----------------------------------------------------

        const {
            draft,
        } = req.body;


        

        if (
            !draft ||
            typeof draft !== "object"
        ) {

            return res.status(400).json({

                success: false,

                error:
                    "Email draft is required.",

            });
        }


        if (
            draft.status !==
            "approved"
        ) {

            return res.status(400).json({

                success: false,

                error:
                    "Email must be approved before it can be sent.",

            });
        }


        console.log(
            "Draft ID:",
            draft.draft_id
        );

        console.log(
            "Status:",
            draft.status
        );

        console.log(
            "Recipient:",
            draft?.to?.email
        );


        // ----------------------------------------------------
        // CALL PYTHON AI SERVICE
        // ----------------------------------------------------

        const result = await callAIService(
            "/email/send",
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                },

                body: JSON.stringify({

                    draft,

                }),
            }
        );


        return res.status(200).json({

            success: true,

            message:
                "Email sent successfully.",

            result:
                result.result,

        });

    } catch (error) {

        console.error(
            "❌ Error sending email:",
            error
        );

        return res.status(500).json({

            success: false,

            error:
                error.message ||
                "Failed to send email.",

        });
    }
};

module.exports = {

    createEmailDraft,

    updateEmailDraft,

    approveEmailDraft,

    sendEmail,

};
