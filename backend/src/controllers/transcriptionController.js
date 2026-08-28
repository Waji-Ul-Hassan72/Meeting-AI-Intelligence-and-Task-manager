
const fs = require("fs");
const FormData = require("form-data");
const axios = require("axios");

const FASTAPI_URL =
  process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

// ============================================================
// TRANSCRIBE MEETING AUDIO
// ============================================================

const transcribeMeetingAudio = async (req, res) => {
  let filePath = null;

  try {
    // ========================================================
    // CHECK FILE
    // ========================================================

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Audio file is required.",
      });
    }

    filePath = req.file.path;

    console.log("\n====================================");
    console.log("Audio received");
    console.log("Original name:", req.file.originalname);
    console.log("MIME type:", req.file.mimetype);
    console.log("Field name:", req.file.fieldname);
    console.log("File path:", filePath);
    console.log("====================================");

    // ========================================================
    // CREATE FORM DATA
    // ========================================================

    const formData = new FormData();

    formData.append(
      "file",
      fs.createReadStream(filePath),
      {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      }
    );

    console.log("Sending audio to FastAPI...");
    console.log("====================================");
    console.log(
      "➡️ Sending request to:",
      `${FASTAPI_URL}/process-meeting`
    );
    console.log("====================================");

    // ========================================================
    // SEND AUDIO TO FASTAPI
    // ========================================================

    const response = await axios.post(
      `${FASTAPI_URL}/process-meeting`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },

        // Allow large audio files
        maxContentLength: Infinity,
        maxBodyLength: Infinity,

        // Wait up to 10 minutes
        timeout: 600000,
      }
    );

    // ========================================================
    // FASTAPI RESPONSE
    // ========================================================

    console.log("FastAPI status:", response.status);

    console.log(
      "FastAPI response:",
      JSON.stringify(response.data, null, 2)
    );

    const data = response.data;

    // ========================================================
    // FASTAPI RETURNED ERROR
    // ========================================================

    if (!data.success) {
      return res.status(500).json({
        success: false,
        error:
          data.error ||
          "Meeting transcription failed.",
      });
    }

    // ========================================================
    // SUCCESS
    // ========================================================

    return res.status(200).json({
      success: true,
      message:
        data.message ||
        "Meeting processed successfully.",

      segments:
        Array.isArray(data.segments)
          ? data.segments
          : [],
    });

  } catch (error) {

    console.error("\n====================================");
    console.error("❌ TRANSCRIPTION ERROR");
    console.error("====================================");

    // Axios error from FastAPI
    if (error.response) {

      console.error(
        "FastAPI status:",
        error.response.status
      );

      console.error(
        "FastAPI response:",
        error.response.data
      );

      return res.status(500).json({
        success: false,
        error:
          error.response.data?.detail ||
          error.response.data?.error ||
          "FastAPI transcription failed.",
      });
    }

    // Network error
    if (error.request) {

      console.error(
        "FastAPI could not be reached."
      );

      return res.status(500).json({
        success: false,
        error:
          "Could not connect to the AI service. Make sure FastAPI is running on port 8000.",
      });
    }

    // Other error
    console.error(
      "Error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Transcription failed.",
    });

  } finally {

    // ========================================================
    // DELETE TEMPORARY EXPRESS FILE
    // ========================================================

    if (filePath) {

      try {

        if (fs.existsSync(filePath)) {

          fs.unlinkSync(filePath);

          console.log(
            "🗑️ Temporary audio file deleted."
          );
        }

      } catch (deleteError) {

        console.error(
          "Failed to delete temporary audio file:",
          deleteError.message
        );
      }
    }
  }
};

module.exports = {
  transcribeMeetingAudio,
};

