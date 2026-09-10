import { useEffect, useState, useRef } from "react";
import {
    Link,
    useNavigate,
    useSearchParams,
} from "react-router-dom";
import JSEncrypt from "jsencrypt";

const API_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:3000";

const GOOGLE_CLIENT_ID =
    import.meta.env.VITE_GOOGLE_CLIENT_ID;

function Signup() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("Developer");

    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // ==========================================
    // REFS FOR GOOGLE INITIALIZATION & CALLBACK
    // ==========================================

    const googleInitializedRef = useRef(false);
    const handleGoogleResponseRef = useRef();

    // ==========================================
    // INVITATION TOKEN
    // ==========================================

    const invitationToken = searchParams.get("invitation");

    // ==========================================
    // GOOGLE RESPONSE
    // ==========================================

    const handleGoogleResponse = async (response) => {
        if (!response?.credential) {
            setErrorMessage("Google authentication failed.");
            return;
        }

        try {
            setGoogleLoading(true);
            setErrorMessage("");

            const requestBody = {
                credential: response.credential,
            };

            if (invitationToken) {
                requestBody.invitation_token = invitationToken;
            }

            const googleResponse = await fetch(
                `${API_URL}/api/auth/google`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                }
            );

            let data = {};

            try {
                data = await googleResponse.json();
            } catch {
                data = {};
            }

            if (!googleResponse.ok) {
                setErrorMessage(
                    data.message ||
                        data.error ||
                        "Google signup failed. Please try again."
                );
                return;
            }

            if (!data.token || !data.user) {
                throw new Error(
                    "Invalid response from server."
                );
            }

            // ==========================================
            // GOOGLE SIGNUP SUCCESS
            // ==========================================

            localStorage.setItem(
                "token",
                data.token
            );

            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );

            // ==========================================
            // REDIRECT BASED ON ROLE
            // ==========================================

            if (data.user.role === "Project Manager") {
                navigate(
                    "/manager-dashboard",
                    { replace: true }
                );
            } else {
                navigate(
                    "/member-dashboard",
                    { replace: true }
                );
            }

        } catch (error) {
            console.error(
                "Google signup error:",
                error
            );

            setErrorMessage(
                error.message ||
                    "An error occurred during Google signup."
            );

        } finally {
            setGoogleLoading(false);
        }
    };

    // Update ref to ensure latest function reference
    handleGoogleResponseRef.current =
        handleGoogleResponse;

    // ==========================================
    // GOOGLE INITIALIZATION
    // ==========================================

    useEffect(() => {
        const initializeGoogle = () => {
            if (
                !GOOGLE_CLIENT_ID ||
                !window.google ||
                !window.google.accounts ||
                googleInitializedRef.current
            ) {
                return;
            }

            const googleButton =
                document.getElementById(
                    "google-button"
                );

            if (!googleButton) {
                return;
            }

            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,

                callback: (response) =>
                    handleGoogleResponseRef.current?.(
                        response
                    ),

                auto_select: false,
                cancel_on_tap_outside: true,
            });

            googleButton.innerHTML = "";

            window.google.accounts.id.renderButton(
                googleButton,
                {
                    theme: "outline",
                    size: "large",
                    width: 320,
                    text: "continue_with",
                    shape: "rectangular",
                }
            );

            googleInitializedRef.current = true;
        };

        const existingScript =
            document.querySelector(
                'script[src="https://accounts.google.com/gsi/client"]'
            );

        if (existingScript) {
            if (
                window.google &&
                window.google.accounts
            ) {
                initializeGoogle();
            } else {
                existingScript.addEventListener(
                    "load",
                    initializeGoogle
                );
            }
        } else {
            const script =
                document.createElement(
                    "script"
                );

            script.src =
                "https://accounts.google.com/gsi/client";

            script.async = true;
            script.defer = true;

            script.onload =
                initializeGoogle;

            document.body.appendChild(
                script
            );
        }

        return () => {
            if (existingScript) {
                existingScript.removeEventListener(
                    "load",
                    initializeGoogle
                );
            }
        };
    }, []);

    // ==========================================
    // STANDARD SIGNUP
    // ==========================================

    const handleSignup = async (e) => {
        e.preventDefault();

        setErrorMessage("");

        // ==========================================
        // BASIC VALIDATION
        // ==========================================

        if (
            !fullName.trim() ||
            !email.trim() ||
            !password
        ) {
            setErrorMessage(
                "Please fill in all required fields."
            );
            return;
        }

        if (!role) {
            setErrorMessage(
                "Please select your role."
            );
            return;
        }

        if (password.length < 6) {
            setErrorMessage(
                "Password must be at least 6 characters long."
            );
            return;
        }

        try {
            setLoading(true);

            // ==========================================
            // GET PUBLIC KEY
            // ==========================================

            const keyResponse =
                await fetch(
                    `${API_URL}/api/auth/public-key`
                );

            if (!keyResponse.ok) {
                throw new Error(
                    "Unable to fetch encryption key."
                );
            }

            const keyData =
                await keyResponse.json();

            if (!keyData?.publicKey) {
                throw new Error(
                    "Invalid public key received from server."
                );
            }

            // ==========================================
            // ENCRYPT PASSWORD
            // ==========================================

            const encryptor =
                new JSEncrypt();

            encryptor.setPublicKey(
                keyData.publicKey
            );

            const encryptedPassword =
                encryptor.encrypt(password);

            if (!encryptedPassword) {
                throw new Error(
                    "Password encryption failed."
                );
            }

            // ==========================================
            // REQUEST BODY
            // ==========================================

            const signupBody = {
                full_name:
                    fullName.trim(),

                email:
                    email.trim().toLowerCase(),

                password:
                    encryptedPassword,

                role:
                    role,
            };

            // ==========================================
            // INVITATION TOKEN
            // ==========================================

            if (invitationToken) {
                signupBody.invitation_token =
                    invitationToken;
            }

            // ==========================================
            // SIGNUP REQUEST
            // ==========================================

            const response =
                await fetch(
                    `${API_URL}/api/auth/signup`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify(
                                signupBody
                            ),
                    }
                );

            let data = {};

            try {
                data =
                    await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                setErrorMessage(
                    data.message ||
                        data.error ||
                        "Signup failed. Please try again."
                );

                return;
            }

            // ==========================================
            // SUCCESS
            // ==========================================

            setFullName("");
            setEmail("");
            setPassword("");
            setRole("Developer");

            // ==========================================
            // REDIRECT
            // ==========================================

            if (invitationToken) {
                navigate(
                    `/login?invitation=${encodeURIComponent(
                        invitationToken
                    )}&signup=success`,
                    {
                        replace: true,
                    }
                );
            } else {
                navigate(
                    "/login?signup=success",
                    {
                        replace: true,
                    }
                );
            }

        } catch (error) {
            console.error(
                "Signup error:",
                error
            );

            setErrorMessage(
                error.message ||
                    "An error occurred during signup."
            );

        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // UI
    // ==========================================

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#e0e5ec] p-3 font-sans">

            <div className="relative p-3 sm:p-5 rounded-full bg-[#e0e5ec] shadow-[15px_15px_40px_#bebebe,-15px_-15px_40px_#ffffff] flex items-center justify-center">

                <div className="w-[310px] sm:w-[380px] min-h-[520px] sm:min-h-[570px] rounded-full bg-[#e0e5ec] shadow-[inset_8px_8px_16px_#bebebe,inset_-8px_-8px_16px_#ffffff] flex flex-col items-center justify-center px-6 sm:px-10 py-8 text-gray-700">

                    <h1 className="text-2xl font-extrabold text-gray-800 tracking-wide mb-0.5">
                        Sign Up
                    </h1>

                    <p className="text-[11px] font-medium text-gray-400 mb-3 text-center">
                        {invitationToken
                            ? "Create your account to join the project"
                            : "Create your account to get started"}
                    </p>

                    {invitationToken && (
                        <div className="w-full mb-2 p-1.5 text-center text-[11px] text-teal-700 bg-teal-100/60 rounded-xl">
                            You are signing up through a project invitation.
                        </div>
                    )}

                    {errorMessage && (
                        <div className="w-full mb-2 p-1.5 text-center text-[11px] text-red-600 bg-red-100/50 rounded-xl">
                            {errorMessage}
                        </div>
                    )}

                    <form
                        onSubmit={handleSignup}
                        className="w-full space-y-2.5"
                    >

                        {/* FULL NAME */}

                        <div className="relative w-full">
                            <input
                                id="fullName"
                                type="text"
                                placeholder="Full Name"
                                value={fullName}
                                onChange={(e) =>
                                    setFullName(
                                        e.target.value
                                    )
                                }
                                disabled={
                                    loading ||
                                    googleLoading
                                }
                                autoComplete="name"
                                className="w-full px-3 py-2 bg-[#e0e5ec] text-xs font-medium text-gray-700 outline-none rounded-xl shadow-[inset_3px_3px_6px_#babecc,inset_-3px_-3px_6px_#ffffff] disabled:opacity-50"
                            />
                        </div>

                        {/* EMAIL */}

                        <div className="relative w-full">
                            <input
                                id="email"
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) =>
                                    setEmail(
                                        e.target.value
                                    )
                                }
                                disabled={
                                    loading ||
                                    googleLoading
                                }
                                autoComplete="email"
                                className="w-full px-3 py-2 bg-[#e0e5ec] text-xs font-medium text-gray-700 outline-none rounded-xl shadow-[inset_3px_3px_6px_#babecc,inset_-3px_-3px_6px_#ffffff] disabled:opacity-50"
                            />
                        </div>

                        {/* PASSWORD */}

                        <div className="relative w-full">
                            <input
                                id="password"
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(
                                        e.target.value
                                    )
                                }
                                disabled={
                                    loading ||
                                    googleLoading
                                }
                                autoComplete="new-password"
                                className="w-full px-3 py-2 bg-[#e0e5ec] text-xs font-medium text-gray-700 outline-none rounded-xl shadow-[inset_3px_3px_6px_#babecc,inset_-3px_-3px_6px_#ffffff] disabled:opacity-50"
                            />
                        </div>

                        {/* ROLE */}

                        <div className="relative w-full">
                            <select
                                id="role"
                                value={role}
                                onChange={(e) =>
                                    setRole(
                                        e.target.value
                                    )
                                }
                                disabled={
                                    loading ||
                                    googleLoading
                                }
                                className="w-full px-3 py-2 bg-[#e0e5ec] text-xs font-medium text-gray-700 outline-none rounded-xl shadow-[inset_3px_3px_6px_#babecc,inset_-3px_-3px_6px_#ffffff] disabled:opacity-50 appearance-none cursor-pointer"
                            >
                                <option value="Developer">
                                    Developer
                                </option>

                                <option value="Project Manager">
                                    Project Manager
                                </option>
                            </select>

                            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                                ▼
                            </div>
                        </div>

                        {/* SIGNUP BUTTON */}

                        <button
                            type="submit"
                            disabled={
                                loading ||
                                googleLoading
                            }
                            className="w-full py-2.5 mt-1 bg-[#e0e5ec] text-xs font-bold text-gray-600 tracking-wider uppercase rounded-xl shadow-[5px_5px_10px_#babecc,-5px_-5px_10px_#ffffff] active:shadow-[inset_3px_3px_6px_#babecc,inset_-3px_-3px_6px_#ffffff] transition-all disabled:opacity-50"
                        >
                            {loading
                                ? "Creating..."
                                : invitationToken
                                ? "Create Account"
                                : "Sign Up"}
                        </button>

                    </form>

                    {/* DIVIDER */}

                    <div className="flex items-center my-2.5 w-full text-[10px] text-gray-400">

                        <div className="flex-1 border-t border-gray-300/60" />

                        <span className="px-2">
                            or continue with
                        </span>

                        <div className="flex-1 border-t border-gray-300/60" />

                    </div>

                    {/* GOOGLE BUTTON */}

                    <div className="relative w-full">

                        <button
                            type="button"
                            disabled={
                                loading ||
                                googleLoading
                            }
                            className="w-full py-2.5 bg-[#e0e5ec] text-xs font-bold text-gray-600 tracking-wider uppercase rounded-xl shadow-[5px_5px_10px_#babecc,-5px_-5px_10px_#ffffff] active:shadow-[inset_3px_3px_6px_#babecc,inset_-3px_-3px_6px_#ffffff] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >

                            <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />

                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />

                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                />

                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                />
                            </svg>

                            <span>
                                Google
                            </span>

                        </button>

                        {/* Invisible Google iframe trigger */}

                        <div
                            id="google-button"
                            className="absolute inset-0 opacity-0 overflow-hidden cursor-pointer flex justify-center items-center scale-110"
                        />

                    </div>

                    {googleLoading && (
                        <p className="mt-1 text-[10px] text-gray-400">
                            Signing up with Google...
                        </p>
                    )}

                    {/* LOGIN */}

                    <p className="mt-3 text-xs text-gray-500">

                        Already have an account?{" "}

                        <Link
                            to={
                                invitationToken
                                    ? `/login?invitation=${encodeURIComponent(
                                          invitationToken
                                      )}`
                                    : "/login"
                            }
                            className="text-red-600 font-bold hover:underline"
                        >
                            Login
                        </Link>

                    </p>

                </div>
            </div>
        </div>
    );
}

export default Signup;

