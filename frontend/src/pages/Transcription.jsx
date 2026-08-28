import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Upload,
  Mic,
  Square,
  Trash2,
  FileAudio,
  CheckCircle2,
} from "lucide-react";

// ============================================================
// API URL
// ============================================================

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

// ============================================================
// COMPONENT
// ============================================================

function Transcription() {
  const { projectId, id } = useParams();
  const navigate = useNavigate();

  // Support:
  // /projects/:projectId/transcription
  // /transcription/:projectId
  // /transcription/:id

  const currentProjectId = projectId || id;

  // ==========================================================
  // STATE
  // ==========================================================

  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);

  const [transcribing, setTranscribing] = useState(false);

  const [transcriptionError, setTranscriptionError] =
    useState("");

  const [transcription, setTranscription] =
    useState([]);

  const [plainTranscript, setPlainTranscript] =
    useState("");

  // ==========================================================
  // REFS
  // ==========================================================

  const fileInputRef = useRef(null);

  const mediaRecorderRef = useRef(null);

  const audioChunksRef = useRef([]);

  const audioRef = useRef(null);

  const recordingTimerRef = useRef(null);

  // IMPORTANT:
  // Keep the actual Blob URL inside a ref.
  // This prevents stale state values from causing
  // incorrect URL.revokeObjectURL() calls.
  const audioUrlRef = useRef("");

  // ==========================================================
  // CREATE AUDIO URL
  // ==========================================================

  const createAudioUrl = (blob) => {
    // Remove old URL if one exists
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }

    const newUrl = URL.createObjectURL(blob);

    audioUrlRef.current = newUrl;
    setAudioUrl(newUrl);

    return newUrl;
  };

  // ==========================================================
  // CLEAR AUDIO URL SAFELY
  // ==========================================================

  const clearAudioUrl = () => {
    // First stop the audio element from using the Blob URL.
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      } catch (error) {
        console.error(
          "Error clearing audio element:",
          error
        );
      }
    }

    // Now revoke the Blob URL.
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }

    setAudioUrl("");
    setIsPlaying(false);
  };

  // ==========================================================
  // CLEANUP ON COMPONENT UNMOUNT
  // ==========================================================

  useEffect(() => {
    return () => {
      // Stop recording timer
      if (recordingTimerRef.current) {
        clearInterval(
          recordingTimerRef.current
        );

        recordingTimerRef.current = null;
      }

      // Stop microphone
      if (mediaRecorderRef.current) {
        try {
          if (
            mediaRecorderRef.current.state !==
            "inactive"
          ) {
            mediaRecorderRef.current.stop();
          }
        } catch (error) {
          console.error(
            "Error stopping recorder:",
            error
          );
        }

        mediaRecorderRef.current.stream
          ?.getTracks()
          .forEach((track) => track.stop());
      }

      // Clear audio element
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.removeAttribute("src");
          audioRef.current.load();
        } catch (error) {
          console.error(
            "Error cleaning audio element:",
            error
          );
        }
      }

      // Revoke Blob URL
      if (audioUrlRef.current) {
        URL.revokeObjectURL(
          audioUrlRef.current
        );

        audioUrlRef.current = "";
      }
    };
  }, []);

  // ==========================================================
  // FORMAT TIME
  // ==========================================================

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");

    const secs = (seconds % 60)
      .toString()
      .padStart(2, "0");

    return `${mins}:${secs}`;
  };

  // ==========================================================
  // SELECT AUDIO FILE
  // ==========================================================

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    console.log(
      "Selected audio file:",
      file.name
    );

    console.log(
      "Audio MIME type:",
      file.type
    );

    console.log(
      "Audio size:",
      file.size
    );

    setTranscriptionError("");
    setTranscription([]);
    setPlainTranscript("");
    setIsPlaying(false);

    // --------------------------------------------------------
    // Validate audio
    // --------------------------------------------------------

    if (!file.type.startsWith("audio/")) {
      setTranscriptionError(
        "Please select a valid audio file."
      );

      event.target.value = "";

      return;
    }

    // --------------------------------------------------------
    // Stop old audio
    // --------------------------------------------------------

    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      } catch (error) {
        console.error(
          "Error resetting old audio:",
          error
        );
      }
    }

    // --------------------------------------------------------
    // Revoke old Blob URL
    // --------------------------------------------------------

    if (audioUrlRef.current) {
      URL.revokeObjectURL(
        audioUrlRef.current
      );

      audioUrlRef.current = "";
    }

    // --------------------------------------------------------
    // Create new Blob URL
    // --------------------------------------------------------

    const newAudioUrl =
      URL.createObjectURL(file);

    audioUrlRef.current = newAudioUrl;

    setAudioFile(file);
    setAudioUrl(newAudioUrl);

    // Reset file input
    event.target.value = "";
  };

  // ==========================================================
  // REMOVE AUDIO
  // ==========================================================

  const handleRemoveAudio = () => {
    console.log("Removing audio");

    // Stop and clear player FIRST
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      } catch (error) {
        console.error(
          "Error clearing audio:",
          error
        );
      }
    }

    // THEN revoke Blob URL
    if (audioUrlRef.current) {
      URL.revokeObjectURL(
        audioUrlRef.current
      );

      audioUrlRef.current = "";
    }

    setAudioFile(null);
    setAudioUrl("");

    setTranscription([]);
    setPlainTranscript("");
    setTranscriptionError("");

    setIsPlaying(false);
    setRecordingTime(0);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ==========================================================
  // START RECORDING
  // ==========================================================

  const startRecording = async () => {
    try {
      setTranscriptionError("");

      setTranscription([]);
      setPlainTranscript("");

      // ------------------------------------------------------
      // Browser support
      // ------------------------------------------------------

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setTranscriptionError(
          "Audio recording is not supported by this browser."
        );

        return;
      }

      // ------------------------------------------------------
      // Microphone permission
      // ------------------------------------------------------

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
          }
        );

      // ------------------------------------------------------
      // Find supported MIME type
      // ------------------------------------------------------

      let mimeType = "";

      if (
        MediaRecorder.isTypeSupported(
          "audio/webm;codecs=opus"
        )
      ) {
        mimeType =
          "audio/webm;codecs=opus";
      } else if (
        MediaRecorder.isTypeSupported(
          "audio/webm"
        )
      ) {
        mimeType = "audio/webm";
      } else if (
        MediaRecorder.isTypeSupported(
          "audio/ogg;codecs=opus"
        )
      ) {
        mimeType =
          "audio/ogg;codecs=opus";
      }

      console.log(
        "Recording MIME type:",
        mimeType || "browser default"
      );

      // ------------------------------------------------------
      // Create recorder
      // ------------------------------------------------------

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, {
            mimeType,
          })
        : new MediaRecorder(stream);

      mediaRecorderRef.current =
        mediaRecorder;

      audioChunksRef.current = [];

      // ------------------------------------------------------
      // Audio chunks
      // ------------------------------------------------------

      mediaRecorder.ondataavailable = (
        event
      ) => {
        if (
          event.data &&
          event.data.size > 0
        ) {
          audioChunksRef.current.push(
            event.data
          );
        }
      };

      // ------------------------------------------------------
      // Recording stopped
      // ------------------------------------------------------

      mediaRecorder.onstop = () => {
        try {
          console.log(
            "Recording stopped."
          );

          // Determine actual MIME type
          const actualMimeType =
            mediaRecorder.mimeType ||
            mimeType ||
            "audio/webm";

          console.log(
            "Final recording MIME:",
            actualMimeType
          );

          // --------------------------------------------------
          // Create Blob
          // --------------------------------------------------

          const audioBlob = new Blob(
            audioChunksRef.current,
            {
              type: actualMimeType,
            }
          );

          console.log(
            "Recorded blob size:",
            audioBlob.size
          );

          // --------------------------------------------------
          // Validate blob
          // --------------------------------------------------

          if (audioBlob.size === 0) {
            setTranscriptionError(
              "The recording is empty. Please record again."
            );

            stream
              .getTracks()
              .forEach((track) =>
                track.stop()
              );

            return;
          }

          // --------------------------------------------------
          // Determine extension
          // --------------------------------------------------

          let extension = "webm";

          if (
            actualMimeType.includes("ogg")
          ) {
            extension = "ogg";
          } else if (
            actualMimeType.includes("wav")
          ) {
            extension = "wav";
          }

          // --------------------------------------------------
          // Create File
          // --------------------------------------------------

          const file = new File(
            [audioBlob],
            `meeting-recording-${Date.now()}.${extension}`,
            {
              type: actualMimeType,
            }
          );

          console.log(
            "Created recording file:",
            file.name
          );

          console.log(
            "Recording file size:",
            file.size
          );

          // --------------------------------------------------
          // Stop microphone
          // --------------------------------------------------

          stream
            .getTracks()
            .forEach((track) =>
              track.stop()
            );

          // --------------------------------------------------
          // Clear old audio
          // --------------------------------------------------

          if (audioRef.current) {
            try {
              audioRef.current.pause();
              audioRef.current.removeAttribute(
                "src"
              );
              audioRef.current.load();
            } catch (error) {
              console.error(
                "Error resetting player:",
                error
              );
            }
          }

          // --------------------------------------------------
          // Revoke old URL
          // --------------------------------------------------

          if (audioUrlRef.current) {
            URL.revokeObjectURL(
              audioUrlRef.current
            );

            audioUrlRef.current = "";
          }

          // --------------------------------------------------
          // Create NEW Blob URL
          // --------------------------------------------------

          const newAudioUrl =
            URL.createObjectURL(
              audioBlob
            );

          audioUrlRef.current =
            newAudioUrl;

          // --------------------------------------------------
          // Update state
          // --------------------------------------------------

          setAudioFile(file);
          setAudioUrl(newAudioUrl);
          setIsPlaying(false);
          setRecordingTime(0);

          console.log(
            "Recording ready for playback."
          );
        } catch (error) {
          console.error(
            "Error processing recording:",
            error
          );

          setTranscriptionError(
            "The recording could not be processed."
          );
        }
      };

      // ------------------------------------------------------
      // Recorder error
      // ------------------------------------------------------

      mediaRecorder.onerror = (event) => {
        console.error(
          "MediaRecorder error:",
          event
        );

        setTranscriptionError(
          "An error occurred while recording."
        );

        stream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      };

      // ------------------------------------------------------
      // Start
      // ------------------------------------------------------

      mediaRecorder.start(1000);

      setIsRecording(true);
      setRecordingTime(0);

      // ------------------------------------------------------
      // Timer
      // ------------------------------------------------------

      if (recordingTimerRef.current) {
        clearInterval(
          recordingTimerRef.current
        );
      }

      recordingTimerRef.current =
        setInterval(() => {
          setRecordingTime(
            (previous) =>
              previous + 1
          );
        }, 1000);

      console.log(
        "Recording started."
      );
    } catch (error) {
      console.error(
        "Recording error:",
        error
      );

      setTranscriptionError(
        "Microphone permission was denied or recording could not be started."
      );
    }
  };

  // ==========================================================
  // STOP RECORDING
  // ==========================================================

  const stopRecording = () => {
    const recorder =
      mediaRecorderRef.current;

    if (!recorder) {
      return;
    }

    console.log(
      "Stopping recording..."
    );

    if (
      recorder.state !== "inactive"
    ) {
      recorder.stop();
    }

    setIsRecording(false);

    if (recordingTimerRef.current) {
      clearInterval(
        recordingTimerRef.current
      );

      recordingTimerRef.current = null;
    }
  };

  // ==========================================================
  // AUDIO PLAY / PAUSE
  // ==========================================================

  const toggleAudio = async () => {
    if (!audioRef.current) {
      return;
    }

    if (!audioUrl) {
      console.warn(
        "No audio URL available."
      );

      return;
    }

    try {
      if (audioRef.current.paused) {
        await audioRef.current.play();

        setIsPlaying(true);
      } else {
        audioRef.current.pause();

        setIsPlaying(false);
      }
    } catch (error) {
      console.error(
        "Audio playback error:",
        error
      );

      setTranscriptionError(
        "Unable to play the audio."
      );
    }
  };

  // ==========================================================
  // AUDIO ENDED
  // ==========================================================

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  // ==========================================================
  // AUDIO ERROR
  // ==========================================================

  const handleAudioError = (event) => {
    console.error(
      "HTML audio error:",
      event.currentTarget.error
    );

    // Only show this if we actually have an audio file.
    if (audioFile) {
      setTranscriptionError(
        "The audio could not be played. Please try selecting or recording it again."
      );
    }

    setIsPlaying(false);
  };

  // ==========================================================
  // TRANSCRIBE AUDIO
  // ==========================================================

  const handleTranscribe = async () => {
    if (!audioFile) {
      setTranscriptionError(
        "Please upload or record an audio file first."
      );

      return;
    }

    // --------------------------------------------------------
    // Validate file
    // --------------------------------------------------------

    if (audioFile.size === 0) {
      setTranscriptionError(
        "The audio file is empty."
      );

      return;
    }

    console.log(
      "===================================="
    );

    console.log(
      "Sending audio for transcription"
    );

    console.log(
      "File:",
      audioFile.name
    );

    console.log(
      "Type:",
      audioFile.type
    );

    console.log(
      "Size:",
      audioFile.size
    );

    console.log(
      "===================================="
    );

    // --------------------------------------------------------
    // Get JWT
    // --------------------------------------------------------

    const token =
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    if (!token) {
      navigate("/login", {
        replace: true,
      });

      return;
    }

    try {
      setTranscribing(true);

      setTranscriptionError("");

      setTranscription([]);
      setPlainTranscript("");

      // ------------------------------------------------------
      // Create FormData
      // ------------------------------------------------------

      const formData = new FormData();

      formData.append(
        "file",
        audioFile,
        audioFile.name
      );

      // ------------------------------------------------------
      // Project ID
      // ------------------------------------------------------

      if (currentProjectId) {
        formData.append(
          "project_id",
          currentProjectId
        );
      }

      console.log(
        "FormData created successfully."
      );

      // ------------------------------------------------------
      // Send request
      // ------------------------------------------------------

      const response = await fetch(
        `${API_URL}/api/transcription/transcribe`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
          },

          // IMPORTANT:
          // Do NOT manually set Content-Type.
          body: formData,
        }
      );

      // ------------------------------------------------------
      // Read response
      // ------------------------------------------------------

      const responseText =
        await response.text();

      let data = {};

      try {
        data =
          responseText.trim()
            ? JSON.parse(
                responseText
              )
            : {};
      } catch (error) {
        console.error(
          "Invalid JSON response:",
          responseText
        );

        data = {
          error: responseText,
        };
      }

      console.log(
        "Transcription API status:",
        response.status
      );

      console.log(
        "Transcription API response:",
        data
      );

      // ------------------------------------------------------
      // Unauthorized
      // ------------------------------------------------------

      if (response.status === 401) {
        localStorage.removeItem(
          "token"
        );

        localStorage.removeItem(
          "user"
        );

        sessionStorage.removeItem(
          "token"
        );

        sessionStorage.removeItem(
          "user"
        );

        navigate("/login", {
          replace: true,
        });

        return;
      }

      // ------------------------------------------------------
      // API error
      // ------------------------------------------------------

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.detail ||
            data.message ||
            "Unable to transcribe the audio."
        );
      }

      // ======================================================
      // SPEAKER SEGMENTS
      // ======================================================

      const segments =
        Array.isArray(
          data.segments
        )
          ? data.segments
          : Array.isArray(
              data.transcription
            )
          ? data.transcription
          : [];

      // ======================================================
      // NORMAL TRANSCRIPT
      // ======================================================

      const transcriptText =
        typeof data.transcript ===
        "string"
          ? data.transcript
          : typeof data.text ===
            "string"
          ? data.text
          : "";

      // ------------------------------------------------------
      // Save results
      // ------------------------------------------------------

      setTranscription(
        segments
      );

      setPlainTranscript(
        transcriptText
      );

      // ------------------------------------------------------
      // No result
      // ------------------------------------------------------

      if (
        segments.length === 0 &&
        !transcriptText.trim()
      ) {
        setTranscriptionError(
          "The audio was processed, but no transcription was returned."
        );

        return;
      }

      console.log(
        "Transcription completed successfully."
      );
    } catch (error) {
      console.error(
        "Transcription error:",
        error
      );

      setTranscriptionError(
        error.message ||
          "Unable to transcribe the audio."
      );
    } finally {
      setTranscribing(false);
    }
  };

  // ==========================================================
  // GO BACK
  // ==========================================================

  const handleBack = () => {
    if (currentProjectId) {
      navigate(
        `/projects/${currentProjectId}`
      );
    } else {
      navigate(-1);
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="h-16 flex items-center">

            <button
              onClick={handleBack}
              className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition"
            >
              <ArrowLeft size={17} />
            </button>

            <div className="ml-4">
              <h1 className="text-lg font-bold text-slate-900">
                Meeting Transcription
              </h1>

              <p className="text-xs text-slate-500 mt-0.5">
                Upload or record meeting audio
              </p>
            </div>

          </div>
        </div>
      </header>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="max-w-6xl mx-auto px-6 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ==================================================
              AUDIO SECTION
          ================================================== */}

          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">

            <div className="px-6 py-5 border-b border-slate-200">

              <h2 className="text-base font-bold">
                Meeting Audio
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Upload an existing recording or
                record a new meeting.
              </p>

            </div>

            <div className="p-6">

              {/* ==================================================
                  UPLOAD / RECORD BUTTONS
              ================================================== */}

              {!audioFile &&
                !isRecording && (

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* UPLOAD */}

                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="border border-slate-200 rounded-xl p-6 text-left hover:border-indigo-300 hover:bg-indigo-50/30 transition"
                    >

                      <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                        <Upload size={19} />
                      </div>

                      <h3 className="text-sm font-semibold">
                        Upload Audio
                      </h3>

                      <p className="text-xs text-slate-500 mt-1">
                        Select an audio file from your computer.
                      </p>

                    </button>

                    {/* RECORD */}

                    <button
                      type="button"
                      onClick={
                        startRecording
                      }
                      className="border border-slate-200 rounded-xl p-6 text-left hover:border-red-300 hover:bg-red-50/30 transition"
                    >

                      <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-4">
                        <Mic size={19} />
                      </div>

                      <h3 className="text-sm font-semibold">
                        Record Meeting
                      </h3>

                      <p className="text-xs text-slate-500 mt-1">
                        Record audio using your microphone.
                      </p>

                    </button>

                  </div>
                )}

              {/* ==================================================
                  FILE INPUT
              ================================================== */}

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={
                  handleFileSelect
                }
                className="hidden"
              />

              {/* ==================================================
                  RECORDING
              ================================================== */}

              {isRecording && (

                <div className="border border-red-200 bg-red-50/50 rounded-xl p-6 text-center">

                  <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                    <Mic size={24} />
                  </div>

                  <h3 className="mt-4 text-sm font-bold">
                    Recording meeting
                  </h3>

                  <p className="text-2xl font-mono font-bold text-red-600 mt-2">
                    {formatTime(
                      recordingTime
                    )}
                  </p>

                  <button
                    type="button"
                    onClick={
                      stopRecording
                    }
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition"
                  >
                    <Square size={14} />
                    Stop Recording
                  </button>

                </div>
              )}

              {/* ==================================================
                  AUDIO READY
              ================================================== */}

              {audioFile &&
                !isRecording && (

                  <div className="border border-slate-200 rounded-xl p-5">

                    <div className="flex items-start justify-between gap-4">

                      <div className="flex items-center gap-3 min-w-0">

                        <div className="w-10 h-10 shrink-0 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <FileAudio size={19} />
                        </div>

                        <div className="min-w-0">

                          <p className="text-sm font-semibold truncate">
                            {audioFile.name}
                          </p>

                          <p className="text-xs text-slate-500 mt-1">
                            {(
                              audioFile.size /
                              (1024 * 1024)
                            ).toFixed(2)}{" "}
                            MB
                          </p>

                        </div>

                      </div>

                      <button
                        type="button"
                        onClick={
                          handleRemoveAudio
                        }
                        className="w-8 h-8 shrink-0 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition"
                        title="Remove audio"
                      >
                        <Trash2 size={15} />
                      </button>

                    </div>

                    {/* AUDIO PLAYER */}

                    <div className="mt-5">

                      {audioUrl && (

                        <audio
                          key={audioUrl}
                          ref={audioRef}
                          src={audioUrl}
                          onEnded={
                            handleAudioEnded
                          }
                          onError={
                            handleAudioError
                          }
                          controls
                          preload="metadata"
                          className="w-full"
                        />

                      )}

                    </div>

                    {/* TRANSCRIBE */}

                    <button
                      type="button"
                      onClick={
                        handleTranscribe
                      }
                      disabled={
                        transcribing
                      }
                      className="w-full mt-5 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >

                      {transcribing ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />

                          Transcribing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />

                          Transcribe Meeting
                        </>
                      )}

                    </button>

                  </div>
                )}

              {/* ==================================================
                  ERROR
              ================================================== */}

              {transcriptionError && (

                <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
                  {transcriptionError}
                </div>

              )}

            </div>

          </section>

          {/* ==================================================
              TRANSCRIPTION RESULT
          ================================================== */}

          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">

            <div className="px-6 py-5 border-b border-slate-200">

              <h2 className="text-base font-bold">
                Transcription
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Generated meeting transcript.
              </p>

            </div>

            <div className="p-6">

              {/* ==================================================
                  SPEAKER SEGMENTS
              ================================================== */}

              {transcription.length >
              0 ? (

                <div className="space-y-4 max-h-[520px] overflow-y-auto pr-2">

                  {transcription.map(
                    (
                      segment,
                      index
                    ) => {

                      const speaker =
                        segment.speaker ||
                        segment.speaker_label ||
                        `Speaker ${
                          index + 1
                        }`;

                      const text =
                        segment.text ||
                        segment.transcript ||
                        segment.content ||
                        "";

                      const timestamp =
                        segment.start !==
                          undefined &&
                        segment.start !==
                          null
                          ? `${Number(
                              segment.start
                            ).toFixed(
                              1
                            )}s`
                          : "";

                      return (

                        <div
                          key={
                            segment.id ||
                            index
                          }
                          className="border border-slate-200 rounded-xl p-4"
                        >

                          <div className="flex items-center justify-between mb-2">

                            <span className="text-xs font-bold text-indigo-600">
                              {speaker}
                            </span>

                            {timestamp && (
                              <span className="text-[11px] text-slate-400">
                                {timestamp}
                              </span>
                            )}

                          </div>

                          <p className="text-sm leading-6 text-slate-700">
                            {text}
                          </p>

                        </div>

                      );
                    }
                  )}

                </div>

              ) : plainTranscript ? (

                /* ==================================================
                   NORMAL WHISPER TRANSCRIPT
                ================================================== */

                <div className="max-h-[520px] overflow-y-auto">

                  <div className="border border-slate-200 rounded-xl p-5">

                    <p className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">
                      {plainTranscript}
                    </p>

                  </div>

                </div>

              ) : (

                /* ==================================================
                   EMPTY STATE
                ================================================== */

                <div className="min-h-[360px] flex flex-col items-center justify-center text-center">

                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">

                    <FileAudio size={22} />

                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-slate-700">
                    No transcription yet
                  </h3>

                  <p className="max-w-xs text-xs text-slate-400 mt-1.5">
                    Upload or record a meeting and
                    click "Transcribe Meeting".
                  </p>

                </div>

              )}

            </div>

          </section>

        </div>

      </main>
    </div>
  );
}

export default Transcription;