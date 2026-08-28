import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState(
    "Please wait while we verify your email address."
  );

  // Prevent React StrictMode from sending the request twice
  const verificationStarted = useRef(false);

  useEffect(() => {
    if (verificationStarted.current) {
      return;
    }

    verificationStarted.current = true;

    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Verification token is missing.");
        return;
      }

      try {
        console.log("🔐 Verifying email...");

        const response = await fetch(
          `${API_URL}/api/auth/verify-email?token=${encodeURIComponent(
            token
          )}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        let data = {};

        try {
          data = await response.json();
        } catch {
          data = {};
        }

        console.log("📩 Verification response:", data);

        if (!response.ok) {
          throw new Error(
            data?.message ||
              data?.error ||
              "Email verification failed."
          );
        }

        // Backend successfully verified the email
        setStatus("success");

        setMessage(
          data?.message ||
            "Your email has been verified successfully."
        );

        console.log("✅ Email verification successful");

      } catch (error) {
        console.error(
          "❌ Email verification error:",
          error
        );

        setStatus("error");

        setMessage(
          error?.message ||
            "Unable to verify your email."
        );
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center px-4">

      <div className="w-full max-w-md">

        <div className="bg-white border border-slate-200 rounded-3xl shadow-lg p-8 text-center">

          {/* ================================================= */}
          {/* VERIFYING */}
          {/* ================================================= */}

          {status === "loading" && (
            <>
              <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center">

                <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" />

              </div>

              <h1 className="text-2xl font-extrabold text-slate-900">
                Verifying Your Email
              </h1>

              <p className="mt-3 text-sm text-slate-500">
                Please wait while we verify your email address.
              </p>
            </>
          )}

          {/* ================================================= */}
          {/* SUCCESS */}
          {/* ================================================= */}

          {status === "success" && (
            <>
              {/* GREEN SUCCESS CIRCLE */}

              <div className="mx-auto mb-6 w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center">

                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    className="w-9 h-9"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>

                </div>

              </div>

              <h1 className="text-2xl font-extrabold text-emerald-600">
                Email Verified Successfully!
              </h1>

              <p className="mt-3 text-sm text-slate-500">
                {message}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                Your account is now ready to use.
              </p>

              <div className="mt-7">

                <Link
                  to="/login"
                  className="inline-flex items-center justify-center w-full px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition"
                >
                  Continue to Login
                </Link>

              </div>
            </>
          )}

          {/* ================================================= */}
          {/* ERROR */}
          {/* ================================================= */}

          {status === "error" && (
            <>
              <div className="mx-auto mb-6 w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">

                <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">

                  <span className="text-white text-3xl font-bold">
                    !
                  </span>

                </div>

              </div>

              <h1 className="text-2xl font-extrabold text-red-600">
                Verification Failed
              </h1>

              <p className="mt-3 text-sm text-slate-500">
                {message}
              </p>

              <div className="mt-7">

                <Link
                  to="/login"
                  className="inline-flex items-center justify-center w-full px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition"
                >
                  Go to Login
                </Link>

              </div>
            </>
          )}

        </div>

      </div>

    </div>
  );
}