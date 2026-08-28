const fs = require("fs");
const FormData = require("form-data");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

// ==========================================
// PROCESS MEETING AUDIO THROUGH AI PIPELINE
// ==========================================
const processMeetingAudio = async (req, res) => {
  let filePath = null;

  try {
    // Check uploaded audio
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Meeting audio file is required.",
      });
    }

    filePath = req.file.path;

    console.log("====================================");
    console.log("Meeting audio received");
    console.log("Filename:", req.file.originalname);
    console.log("Temporary path:", filePath);
    console.log("Sending audio to AI pipeline...");
    console.log("====================================");

    // Create multipart form
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    // Send audio to FastAPI
    const response = await fetch(`${AI_SERVICE_URL}/meeting-pipeline`, {
      method: "POST",
      headers: {
        ...formData.getHeaders(),
      },
      body: formData,
    });

    // Read FastAPI response
    const responseText = await response.text();
    console.log("AI service status:", response.status);
    console.log("AI service response:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { error: responseText };
    }

    // AI service returned an error
    if (!response.ok) {
      return res.status(500).json({
        success: false,
        error: data.error || data.detail || "AI meeting processing failed.",
      });
    }

    // Successful AI processing
    return res.status(200).json({
      success: true,
      message: "Meeting processed successfully.",
      segments: data.segments || [],
      transcript: data.transcript || "",
    });
    
  } catch (error) {
    console.error("❌ AI pipeline error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "AI meeting processing failed.",
    });
    
  } finally {
    // Delete temporary uploaded audio
    if (filePath) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("Temporary meeting audio deleted.");
        }
      } catch (deleteError) {
        console.error("Failed to delete temporary audio:", deleteError.message);
      }
    }
  }
};

module.exports = {
  processMeetingAudio,
};