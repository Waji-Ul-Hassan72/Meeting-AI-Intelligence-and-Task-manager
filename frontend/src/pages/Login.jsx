import { useState } from "react";
import {
    Link,
    useNavigate,
    useSearchParams,
} from "react-router-dom";
import JSEncrypt from "jsencrypt";
import { useAuth } from "../context/AuthContext";

const API_URL =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3000";

function Login() {
    // ==========================================
    // STATE
    // ==========================================

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const navigate = useNavigate();

    const [searchParams] = useSearchParams();

    // ==========================================
    // INVITATION TOKEN
    // ==========================================

    const invitationToken =
        searchParams.get("invitation");

    const verified =
        searchParams.get("verified");

    const { login } = useAuth();

    // ==========================================
    // LOGIN
    // ==========================================

    const handleLogin = async (e) => {
        e.preventDefault();

        setErrorMessage("");

        if (!email.trim() || !password) {
            setErrorMessage(
                "Please fill in all required fields."
            );

            return;
        }

        try {
            setLoading(true);

            // ==========================================
            // GET PUBLIC KEY
            // ==========================================

            const keyResponse = await fetch(
                `${API_URL}/api/auth/public-key`
            );

            if (!keyResponse.ok) {
                throw new Error(
                    "Unable to establish secure connection."
                );
            }

            const keyData =
                await keyResponse.json();

            if (!keyData.publicKey) {
                throw new Error(
                    "Encryption key was not received from server."
                );
            }

            // ==========================================
            // ENCRYPT PASSWORD
            // ==========================================

            const encryptor = new JSEncrypt();

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
            // LOGIN BODY
            // ==========================================

            const loginBody = {
                email: email
                    .trim()
                    .toLowerCase(),

                password: encryptedPassword,
            };

            // ==========================================
            // IF INVITATION LOGIN
            // SEND INVITATION TOKEN
            // ==========================================

            if (invitationToken) {
                loginBody.invitation_token =
                    invitationToken;
            }

            // ==========================================
            // LOGIN REQUEST
            // ==========================================

            const response = await fetch(
                `${API_URL}/api/auth/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify(
                        loginBody
                    ),
                }
            );

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            // ==========================================
            // LOGIN ERROR
            // ==========================================

            if (!response.ok) {
                setErrorMessage(
                    data.message ||
                        data.error ||
                        "Invalid email or password."
                );

                return;
            }

            // ==========================================
            // VALIDATE RESPONSE
            // ==========================================

            if (!data.token || !data.user) {
                throw new Error(
                    "Invalid login response from server."
                );
            }

            // ==========================================
            // SAVE AUTH
            // ==========================================

            login(
                data.user,
                data.token
            );

            // ==========================================
            // CLEAR LOGIN CREDENTIALS
            // ==========================================

            setEmail("");
            setPassword("");
            setRememberMe(false);

            // Remove focus from input
            if (
                document.activeElement instanceof
                HTMLElement
            ) {
                document.activeElement.blur();
            }

            // ==========================================
            // INVITATION LOGIN SUCCESS
            // ==========================================

            if (
                invitationToken &&
                data.invitation
            ) {
                console.log(
                    "✅ Invitation accepted:",
                    data.invitation
                );
            }

            // ==========================================
            // REDIRECT
            // ==========================================

            if (
                data.user.role ===
                "Project Manager"
            ) {
                navigate(
                    "/manager-dashboard",
                    {
                        replace: true,
                    }
                );
            } else if (
                data.user.role ===
                "Developer"
            ) {
                navigate(
                    "/member-dashboard",
                    {
                        replace: true,
                    }
                );
            } else {
                setErrorMessage(
                    `Invalid user role: ${
                        data.user.role ||
                        "Not assigned"
                    }`
                );
            }
        } catch (error) {
            console.error(
                "Login error:",
                error
            );

            setErrorMessage(
                error.message ||
                    "An error occurred during login."
            );
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // GOOGLE LOGIN
    // ==========================================

    const handleGoogleLogin = () => {
        window.location.href =
            `${API_URL}/api/auth/google`;
    };

    // ==========================================
    // UI
    // ==========================================

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
                                name="login-email"
                                type="email"
                                placeholder="Username or Email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(
                                        e.target.value
                                    )
                                }
                                disabled={loading}
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
                                name="login-password"
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(
                                        e.target.value
                                    )
                                }
                                disabled={loading}
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
                                        setRememberMe(
                                            e.target.checked
                                        )
                                    }
                                    disabled={loading}
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

                        {/* LOGIN */}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 mt-1 bg-[#e0e5ec] text-xs font-bold text-gray-600 tracking-wider uppercase rounded-xl shadow-[5px_5px_10px_#babecc,-5px_-5px_10px_#ffffff] active:shadow-[inset_3px_3px_6px_#babecc,inset_-3px_-3px_6px_#ffffff] transition-all hover:text-gray-800 disabled:opacity-50"
                        >
                            {loading
                                ? "Logging in..."
                                : invitationToken
                                ? "Login & Join Project"
                                : "Login"}
                        </button>

                    </form>

                    {/* GOOGLE */}

                    <div className="flex items-center my-2.5 w-full text-[10px] text-gray-400">

                        <div className="flex-1 border-t border-gray-300/60" />

                        <span className="px-2">
                            or continue with
                        </span>

                        <div className="flex-1 border-t border-gray-300/60" />

                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full py-2 bg-[#e0e5ec] text-xs font-semibold text-gray-600 rounded-xl shadow-[3px_3px_6px_#babecc,-3px_-3px_6px_#ffffff] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        Google
                    </button>

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