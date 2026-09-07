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
  // NEW STATE
  // ==========================================================

  const [assigningTask, setAssigningTask] =
    useState(false);

  const [taskAssignmentMessage, setTaskAssignmentMessage] =
    useState("");

  // ==========================================================
  // REFS
  // ==========================================================

  const fileInputRef = useRef(null);

  const mediaRecorderRef = useRef(null);

  const audioChunksRef = useRef([]);

  const audioRef = useRef(null);

  const recordingTimerRef = useRef(null);

  const audioUrlRef = useRef("");

  // ==========================================================
  // CREATE AUDIO URL
  // ==========================================================

  const createAudioUrl = (blob) => {
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

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }

    setAudioUrl("");
    setIsPlaying(false);
  };

  // ==========================================================
  // CLEANUP
  // ==========================================================

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

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

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
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
    setTaskAssignmentMessage("");
    setTranscription([]);
    setPlainTranscript("");
    setIsPlaying(false);

    if (!file.type.startsWith("audio/")) {
      setTranscriptionError(
        "Please select a valid audio file."
      );

      event.target.value = "";

      return;
    }

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

    if (audioUrlRef.current) {
      URL.revokeObjectURL(
        audioUrlRef.current
      );

      audioUrlRef.current = "";
    }

    const newAudioUrl =
      URL.createObjectURL(file);

    audioUrlRef.current = newAudioUrl;

    setAudioFile(file);
    setAudioUrl(newAudioUrl);

    event.target.value = "";
  };

  // ==========================================================
  // REMOVE AUDIO
  // ==========================================================

  const handleRemoveAudio = () => {
    console.log("Removing audio");

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

    setTaskAssignmentMessage("");

    setIsPlaying(false);
    setRecordingTime(0);

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
      setTaskAssignmentMessage("");

      setTranscription([]);
      setPlainTranscript("");

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setTranscriptionError(
          "Audio recording is not supported by this browser."
        );

        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

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

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, {
            mimeType,
          })
        : new MediaRecorder(stream);

      mediaRecorderRef.current =
        mediaRecorder;

      audioChunksRef.current = [];

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

      mediaRecorder.onstop = () => {
        try {
          console.log(
            "Recording stopped."
          );

          const actualMimeType =
            mediaRecorder.mimeType ||
            mimeType ||
            "audio/webm";

          console.log(
            "Final recording MIME:",
            actualMimeType
          );

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

          stream
            .getTracks()
            .forEach((track) =>
              track.stop()
            );

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

          if (audioUrlRef.current) {
            URL.revokeObjectURL(
              audioUrlRef.current
            );

            audioUrlRef.current = "";
          }

          const newAudioUrl =
            URL.createObjectURL(
              audioBlob
            );

          audioUrlRef.current =
            newAudioUrl;

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

      mediaRecorder.start(1000);

      setIsRecording(true);
      setRecordingTime(0);

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

    if (audioFile) {
      setTranscriptionError(
        "The audio could not be played. Please try selecting or recording it again."
      );
    }

    setIsPlaying(false);
  };

  // ==========================================================
  // GET TRANSCRIPT TEXT
  // ==========================================================

  const getTranscriptText = (
    data,
    segments
  ) => {
    if (
      typeof data.transcript ===
      "string" &&
      data.transcript.trim()
    ) {
      return data.transcript.trim();
    }

    if (
      typeof data.text ===
      "string" &&
      data.text.trim()
    ) {
      return data.text.trim();
    }

    if (
      Array.isArray(segments) &&
      segments.length > 0
    ) {
      return segments
        .map(
          (segment) =>
            segment.text ||
            segment.transcript ||
            segment.content ||
            ""
        )
        .filter(Boolean)
        .join(" ")
        .trim();
    }

    return "";
  };

  // ==========================================================
  // CHECK WHETHER TRANSCRIPT IS TASK ASSIGNMENT
  // ==========================================================

  const isTaskAssignmentRequest = (
    text
  ) => {
    if (!text?.trim()) {
      return false;
    }

    const normalized =
      text.trim().toLowerCase();

    const assignmentPatterns = [
      /\bassign\b.*\btask\b/,
      /\bassign\b.*\bto\b/,
      /\bassign a task\b/,
      /\bassign the task\b/,
      /\bassign this task\b/,
      /\bassign\b.*\bteam member\b/,
      /\btask\b.*\bassign\b/,
    ];

    return assignmentPatterns.some(
      (pattern) =>
        pattern.test(normalized)
    );
  };

  // ==========================================================
  // NORMALIZE STATUS
  // ==========================================================

  const normalizeTaskStatus = (
    status
  ) => {
    if (!status) {
      return "To Do";
    }

    const normalized = String(status)
      .trim()
      .toLowerCase()
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ");

    if (
      normalized === "in progress" ||
      normalized === "inprogress" ||
      normalized === "progress" ||
      normalized === "working" ||
      normalized === "ongoing"
    ) {
      return "In Progress";
    }

    if (
      normalized === "completed" ||
      normalized === "complete" ||
      normalized === "done" ||
      normalized === "finished"
    ) {
      return "Completed";
    }

    if (
      normalized === "to do" ||
      normalized === "todo" ||
      normalized === "pending" ||
      normalized === "not started"
    ) {
      return "To Do";
    }

    if (
      normalized === "blocked"
    ) {
      return "Blocked";
    }

    return status;
  };

  // ==========================================================
  // ASSIGN TASK FROM TRANSCRIPT
  // ==========================================================

  const assignTaskFromTranscript = async (
    transcriptText
  ) => {
    if (!currentProjectId) {
      console.warn(
        "No project ID available for task assignment."
      );

      return;
    }

    if (!transcriptText?.trim()) {
      return;
    }

    if (
      !isTaskAssignmentRequest(
        transcriptText
      )
    ) {
      console.log(
        "Transcript is not a task assignment request."
      );

      return;
    }

    const token =
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    if (!token) {
      return;
    }

    try {
      setAssigningTask(true);
      setTaskAssignmentMessage("");

      console.log(
        "\n=========================================="
      );
      console.log(
        "VOICE TASK ASSIGNMENT DETECTED"
      );
      console.log(
        "=========================================="
      );

      console.log(
        "Transcript:",
        transcriptText
      );

      // --------------------------------------------------------
      // Ask existing AI assistant service to extract task data
      // --------------------------------------------------------

      const aiResponse =
        await fetch(
          "http://localhost:8000/assistant",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization: `Bearer ${token}`,
            },

            body: JSON.stringify({
              project_id:
                currentProjectId,

              question:
                transcriptText.trim(),
            }),
          }
        );

      let aiData = {};

      try {
        aiData =
          await aiResponse.json();
      } catch {
        aiData = {};
      }

      console.log(
        "AI assignment extraction response:",
        aiData
      );

      if (!aiResponse.ok) {
        throw new Error(
          aiData?.detail ||
            aiData?.message ||
            aiData?.error ||
            "Unable to understand the task assignment."
        );
      }

      // --------------------------------------------------------
      // Find task assignment in AI response
      // --------------------------------------------------------

      const taskData =
        aiData?.task ||
        aiData?.assign_task ||
        aiData?.assignment ||
        aiData?.data?.task ||
        aiData?.result?.task;

      const action =
        aiData?.action ||
        aiData?.intent ||
        aiData?.result?.action;

      if (
        action !==
          "assign_task" ||
        !taskData
      ) {
        console.log(
          "AI did not detect a valid task assignment."
        );

        return;
      }

      const assignedTo =
        taskData.assigned_to ||
        taskData.assignedTo ||
        taskData.member_name ||
        taskData.memberName ||
        taskData.recipientName;

      const title =
        taskData.title ||
        taskData.task_title ||
        taskData.taskTitle;

      if (!assignedTo) {
        throw new Error(
          "The voice command was detected as a task assignment, but the team member could not be determined."
        );
      }

      if (!title) {
        throw new Error(
          "The voice command was detected as a task assignment, but the task title could not be determined."
        );
      }

      // --------------------------------------------------------
      // Normalize task values
      // --------------------------------------------------------

      const priority =
        taskData.priority ||
        "Medium";

      const status =
        normalizeTaskStatus(
          taskData.status ||
            "To Do"
        );

      const dueDate =
        taskData.due_date ||
        taskData.dueDate ||
        null;

      const description =
        taskData.description ||
        "";

      console.log(
        "------------------------------------------"
      );

      console.log(
        "Task title:",
        title
      );

      console.log(
        "Assigned to:",
        assignedTo
      );

      console.log(
        "Priority:",
        priority
      );

      console.log(
        "Status:",
        status
      );

      console.log(
        "Due date:",
        dueDate
      );

      console.log(
        "------------------------------------------"
      );

      // --------------------------------------------------------
      // Call existing task assignment endpoint
      // --------------------------------------------------------

      const assignmentResponse =
        await fetch(
          `${API_URL}/api/ai-tasks/assign`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization: `Bearer ${token}`,
            },

            body: JSON.stringify({
              project_id:
                currentProjectId,

              title:
                String(title).trim(),

              description,

              assigned_to:
                String(
                  assignedTo
                ).trim(),

              priority,

              status,

              due_date:
                dueDate,
            }),
          }
        );

      let assignmentData = {};

      try {
        assignmentData =
          await assignmentResponse.json();
      } catch {
        assignmentData = {};
      }

      console.log(
        "Task assignment response:",
        assignmentData
      );

      if (
        assignmentResponse.status ===
        401
      ) {
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

      if (
        !assignmentResponse.ok
      ) {
        throw new Error(
          assignmentData?.error ||
            assignmentData?.message ||
            assignmentData?.detail ||
            "Unable to assign the task."
        );
      }

      // --------------------------------------------------------
      // SUCCESS
      // --------------------------------------------------------

      const createdTask =
        assignmentData.task;

      const assignedMember =
        assignmentData.assignedMember;

      const emailSent =
        assignmentData.emailSent;

      console.log(
        "\n=========================================="
      );

      console.log(
        "VOICE TASK ASSIGNMENT SUCCESSFUL"
      );

      console.log(
        "Task:",
        createdTask
      );

      console.log(
        "Member:",
        assignedMember
      );

      console.log(
        "Email sent:",
        emailSent
      );

      console.log(
        "=========================================="
      );

      setTaskAssignmentMessage(
        emailSent
          ? `Task "${title}" was assigned to ${assignedMember?.name || assignedTo}. An email notification was sent.`
          : `Task "${title}" was assigned to ${assignedMember?.name || assignedTo}.`
      );

      // --------------------------------------------------------
      // Notify ProjectDetails
      // --------------------------------------------------------

      window.dispatchEvent(
        new CustomEvent(
          "ai-task-created",
          {
            detail: {
              task:
                createdTask,

              assignedMember:
                assignedMember,

              emailSent:
                emailSent,
            },
          }
        )
      );
    } catch (error) {
      console.error(
        "Voice task assignment error:",
        error
      );

      setTaskAssignmentMessage(
        error.message ||
          "The task was detected but could not be assigned."
      );
    } finally {
      setAssigningTask(false);
    }
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
      setTaskAssignmentMessage("");

      setTranscription([]);
      setPlainTranscript("");

      const formData =
        new FormData();

      formData.append(
        "file",
        audioFile,
        audioFile.name
      );

      if (currentProjectId) {
        formData.append(
          "project_id",
          currentProjectId
        );
      }

      console.log(
        "FormData created successfully."
      );

      const response =
        await fetch(
          `${API_URL}/api/transcription/transcribe`,
          {
            method: "POST",

            headers: {
              Authorization: `Bearer ${token}`,
            },

            body: formData,
          }
        );

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

      if (
        response.status ===
        401
      ) {
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
        getTranscriptText(
          data,
          segments
        );

      // ------------------------------------------------------
      // SAVE RESULTS
      // ------------------------------------------------------

      setTranscription(
        segments
      );

      setPlainTranscript(
        transcriptText
      );

      // ------------------------------------------------------
      // NO RESULT
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

      // ======================================================
      // VOICE TASK ASSIGNMENT
      // ======================================================

      /*
       * The transcription is now complete.
       *
       * If the transcript contains something like:
       *
       * "Assign a task to Waji Ul Hasaan,
       *  task title is Build Website,
       *  status is in progress,
       *  priority is high,
       *  deadline is tomorrow"
       *
       * the existing AI task-assignment system is called.
       */

      await assignTaskFromTranscript(
        transcriptText
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
                        transcribing ||
                        assigningTask
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

              {/* ==================================================
                  TASK ASSIGNMENT STATUS
              ================================================== */}

              {assigningTask && (

                <div className="mt-4 px-4 py-3 rounded-lg bg-indigo-50 border border-indigo-100 text-sm text-indigo-700 flex items-center gap-2">

                  <span className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />

                  Task assignment detected in the voice transcript. Creating task and sending email...

                </div>

              )}

              {taskAssignmentMessage && (

                <div className="mt-4 px-4 py-3 rounded-lg bg-green-50 border border-green-100 text-sm text-green-700">

                  {taskAssignmentMessage}

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

              {transcription.length > 0 ? (

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

                <div className="max-h-[520px] overflow-y-auto">

                  <div className="border border-slate-200 rounded-xl p-5">

                    <p className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">
                      {plainTranscript}
                    </p>

                  </div>

                </div>

              ) : (

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

