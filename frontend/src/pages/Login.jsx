import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import JSEncrypt from "jsencrypt";
import { useAuth } from "../context/AuthContext";

const API_URL =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3000";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function Login() {
    // ==========================================
    // STATE & REFS
    // ==========================================
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const googleButtonRef = useRef(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuth();

    const invitationToken = searchParams.get("invitation");
    const verified = searchParams.get("verified");

    // Clear fields on mount to prevent stale values after logout
    useEffect(() => {
        setEmail("");
        setPassword("");
        setRememberMe(false);
    }, []);

    // ==========================================
    // GOOGLE RESPONSE HANDLER
    // ==========================================
    const handleGoogleResponse = useCallback(
        async (response) => {
            setErrorMessage("");

            if (!response?.credential) {
                setErrorMessage("Google authentication failed.");
                return;
            }

            try {
                setGoogleLoading(true);

                const googlePayload = {
                    credential: response.credential,
                };

                if (invitationToken) {
                    googlePayload.invitation_token = invitationToken;
                }

                const googleResponse = await fetch(
                    `${API_URL}/api/auth/google`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(googlePayload),
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
                        data.message || "Google login failed."
                    );
                    return;
                }

                if (!data.token || !data.user) {
                    throw new Error(
                        "Invalid Google login response from server."
                    );
                }

                login(data.user, data.token);

                if (invitationToken && data.invitation) {
                    console.log("✅ Invitation accepted:", data.invitation);
                }

                if (data.user.role === "Project Manager") {
                    navigate("/manager-dashboard", { replace: true });
                } else if (data.user.role === "Developer") {
                    navigate("/member-dashboard", { replace: true });
                } else {
                    setErrorMessage(
                        `Invalid user role: ${data.user.role || "Not assigned"}`
                    );
                }
            } catch (error) {
                console.error("Google login error:", error);
                setErrorMessage(
                    error.message || "An error occurred during Google login."
                );
            } finally {
                setGoogleLoading(false);
            }
        },
        [invitationToken, login, navigate]
    );

    // ==========================================
    // INITIALIZE GOOGLE
    // ==========================================
    const initializeGoogle = useCallback(() => {
        if (
            !GOOGLE_CLIENT_ID ||
            !window.google?.accounts?.id ||
            !googleButtonRef.current
        ) {
            return;
        }

        window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
        });

        googleButtonRef.current.innerHTML = "";

        window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: "outline",
            size: "large",
            width: googleButtonRef.current.offsetWidth || 320,
            text: "continue_with",
            shape: "rectangular",
        });
    }, [handleGoogleResponse]);

    // ==========================================
    // GOOGLE SCRIPT LOADING
    // ==========================================
    useEffect(() => {
        const existingScript = document.querySelector(
            'script[src="https://accounts.google.com/gsi/client"]'
        );

        const handleScriptLoad = () => {
            initializeGoogle();
        };

        if (existingScript) {
            if (window.google?.accounts?.id) {
                initializeGoogle();
            } else {
                existingScript.addEventListener("load", handleScriptLoad);
            }

            return () => {
                existingScript.removeEventListener("load", handleScriptLoad);
            };
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = handleScriptLoad;

        script.onerror = () => {
            console.error("Failed to load Google Identity Services.");
        };

        document.body.appendChild(script);

        return () => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, [initializeGoogle]);

    // ==========================================
    // LOGIN HANDLER
    // ==========================================
    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMessage("");

        if (!email.trim() || !password) {
            setErrorMessage("Please fill in all required fields.");
            return;
        }

        // Capture current inputs for encryption/request before clearing states
        const currentEmail = email.trim();
        const currentPassword = password;

        // Clear inputs immediately on submit for better UX
        setEmail("");
        setPassword("");
        setRememberMe(false);

        try {
            setLoading(true);

            const keyResponse = await fetch(`${API_URL}/api/auth/public-key`);

            if (!keyResponse.ok) {
                throw new Error("Unable to establish secure connection.");
            }

            const keyData = await keyResponse.json();

            if (!keyData.publicKey) {
                throw new Error("Encryption key was not received from server.");
            }

            const encryptor = new JSEncrypt();
            encryptor.setPublicKey(keyData.publicKey);

            const encryptedPassword = encryptor.encrypt(currentPassword);

            if (!encryptedPassword) {
                throw new Error("Password encryption failed.");
            }

            const loginBody = {
                email: currentEmail.toLowerCase(),
                password: encryptedPassword,
                remember_me: rememberMe,
            };

            if (invitationToken) {
                loginBody.invitation_token = invitationToken;
            }

            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(loginBody),
            });

            let data = {};
            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                setErrorMessage(
                    data.message || data.error || "Invalid email or password."
                );
                return;
            }

            if (!data.token || !data.user) {
                throw new Error("Invalid login response from server.");
            }

            login(data.user, data.token);

            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }

            if (invitationToken && data.invitation) {
                console.log("✅ Invitation accepted:", data.invitation);
            }

            if (data.user.role === "Project Manager") {
                navigate("/manager-dashboard", { replace: true });
            } else if (data.user.role === "Developer") {
                navigate("/member-dashboard", { replace: true });
            } else {
                setErrorMessage(
                    `Invalid user role: ${data.user.role || "Not assigned"}`
                );
            }
        } catch (error) {
            console.error("Login error:", error);
            setErrorMessage(
                error.message || "An error occurred during login."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#e0e5ec] p-3 font-sans selection:bg-red-500/20">
            <div className="relative p-3 sm:p-5 rounded-full bg-[#e0e5ec] shadow-[15px_15px_40px_#bebebe,-15px_-15px_40px_#ffffff] flex items-center justify-center">
                <div className="w-[310px] sm:w-[380px] h-[480px] sm:h-[530px] rounded-full bg-[#e0e5ec] shadow-[inset_8px_8px_16px_#bebebe,inset_-8px_-8px_16px_#ffffff] flex flex-col items-center justify-center px-6 sm:px-10 text-gray-700">
                    <h1 className="text-2xl font-extrabold text-gray-800 tracking-wide mb-0.5">
                        Login
                    </h1>

                    <p className="text-[11px] font-medium text-gray-400 mb-3 text-center">
                        {invitationToken
                            ? "Login to accept your project invitation"
                            : "Login to your account"}
                    </p>

                    {verified === "true" && (
                        <div className="w-full mb-2 p-1.5 text-center text-[11px] text-green-700 bg-green-100/60 rounded-xl">
                            Email verified successfully. You can now login.
                        </div>
                    )}

                    {invitationToken && (
                        <div className="w-full mb-2 p-1.5 text-center text-[11px] text-teal-700 bg-teal-100/60 rounded-xl">
                            You were invited to join a project.
                        </div>
                    )}

                    {errorMessage && (
                        <div className="w-full mb-2 p-1.5 text-center text-[11px] text-red-600 bg-red-100/50 rounded-xl">
                            {errorMessage}
                        </div>
                    )}

                    <form
                        onSubmit={handleLogin}
                        className="w-full space-y-2.5"
                        autoComplete="off"
                    >
                        {/* EMAIL */}
                        <div className="relative w-full">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg
                                    className="w-3.5 h-3.5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                                </svg>
                            </span>

                            <input
                                id="login-email"
                                name="email"
                                type="email"
                                placeholder="Username or Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading || googleLoading}
                                autoComplete="off"
                                spellCheck="false"
                                className="w-full pl-9 pr-3 py-2 bg-[#e0e5ec] text-xs font-medium text-gray-700 outline-none rounded-xl shadow-[inset_3px_3px_6px_#babecc,inset_-3px_-3px_6px_#ffffff] transition-all disabled:opacity-50"
                            />
                        </div>

                        {/* PASSWORD */}
                        <div className="relative w-full">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-600">
                                <svg
                                    className="w-3.5 h-3.5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </span>

                            <input
                                id="login-password"
                                name="password"
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading || googleLoading}
                                autoComplete="new-password"
                                className="w-full pl-9 pr-3 py-2 bg-[#e0e5ec] text-xs font-medium text-gray-700 outline-none rounded-xl border border-red-300/40 shadow-[inset_3px_3px_6px_#babecc,inset_-3px_-3px_6px_#ffffff] focus:border-red-400 transition-all disabled:opacity-50"
                            />
                        </div>

                        {/* REMEMBER ME */}
                        <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5 px-0.5">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) =>
                                        setRememberMe(e.target.checked)
                                    }
                                    disabled={loading || googleLoading}
                                    className="w-3 h-3 rounded bg-[#e0e5ec] accent-gray-700"
                                />
                                Remember me
                            </label>

                            <Link
                                to="/forgot-password"
                                className="hover:text-gray-700 transition-colors"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        {/* LOGIN BUTTON */}
                        <button
                            type="submit"
                            disabled={loading || googleLoading}
                            className="w-full py-2.5 mt-1 bg-[#e0e5ec] text-xs font-bold text-gray-600 tracking-wider uppercase rounded-xl shadow-[5px_5px_10px_#babecc,-5px_-5px_10px_#ffffff] active:shadow-[inset_3px_3px_6px_#babecc,inset_-3px_-3px_6px_#ffffff] transition-all hover:text-gray-800 disabled:opacity-50"
                        >
                            {loading
                                ? "Logging in..."
                                : invitationToken
                                ? "Login & Join Project"
                                : "Login"}
                        </button>
                    </form>

                    {/* GOOGLE DIVIDER */}
                    <div className="flex items-center my-2.5 w-full text-[10px] text-gray-400">
                        <div className="flex-1 border-t border-gray-300/60" />
                        <span className="px-2">or continue with</span>
                        <div className="flex-1 border-t border-gray-300/60" />
                    </div>

                    {/* GOOGLE BUTTON CONTAINER */}
                    <div
                        className={`relative w-full ${
                            loading || googleLoading
                                ? "opacity-50 pointer-events-none"
                                : ""
                    }`}
                    >
                        {/* Visual Neumorphic Button matching the Login style */}
                        <div className="w-full py-2.5 bg-[#e0e5ec] text-xs font-bold text-gray-600 tracking-wider uppercase rounded-xl shadow-[5px_5px_10px_#babecc,-5px_-5px_10px_#ffffff] active:shadow-[inset_3px_3px_6px_#babecc,inset_-3px_-3px_6px_#ffffff] transition-all hover:text-gray-800 flex items-center justify-center gap-2 select-none cursor-pointer">
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                            <span>Google</span>
                        </div>

                        {/* Invisible Native Google GIS Render Button Overlay */}
                        <div
                            ref={googleButtonRef}
                            className="absolute inset-0 opacity-0 overflow-hidden cursor-pointer z-10 flex justify-center [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full"
                        />
                    </div>

                    {googleLoading && (
                        <p className="text-[10px] text-gray-500 mt-1">
                            Signing in with Google...
                        </p>
                    )}

                    <p className="mt-3 text-xs text-gray-500">
                        Don't have an account?{" "}
                        <Link
                            to={
                                invitationToken
                                    ? `/signup?invitation=${invitationToken}`
                                    : "/signup"
                            }
                            className="text-red-600 font-bold hover:underline"
                        >
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;