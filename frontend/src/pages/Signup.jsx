import { useState } from "react";
import {
    Link,
    useNavigate,
    useSearchParams,
} from "react-router-dom";
import JSEncrypt from "jsencrypt";

const API_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:3000";

function Signup() {
    const [fullName, setFullName] =
        useState("");

    const [email, setEmail] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [errorMessage, setErrorMessage] =
        useState("");

    const navigate = useNavigate();

    const [searchParams] =
        useSearchParams();

    // ==========================================
    // INVITATION TOKEN
    // ==========================================

    const invitationToken =
        searchParams.get("invitation");

    // ==========================================
    // SIGNUP
    // ==========================================

    const handleSignup = async (e) => {
        e.preventDefault();

        setErrorMessage("");

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

                email: email
                    .trim()
                    .toLowerCase(),

                password:
                    encryptedPassword,
            };

            // ==========================================
            // IF INVITATION SIGNUP
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

                        body: JSON.stringify(
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

            // ==========================================
            // ERROR
            // ==========================================

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

            // ==========================================
            // SEND USER TO LOGIN
            //
            // Preserve invitation token.
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
    // GOOGLE
    // ==========================================

    const handleGoogleSignup = () => {
        window.location.href =
            `${API_URL}/api/auth/google`;
    };

    // ==========================================
    // UI
    // ==========================================

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#e0e5ec] p-3 font-sans">

            <div className="relative p-3 sm:p-5 rounded-full bg-[#e0e5ec] shadow-[15px_15px_40px_#bebebe,-15px_-15px_40px_#ffffff] flex items-center justify-center">

                <div className="w-[310px] sm:w-[380px] h-[480px] sm:h-[530px] rounded-full bg-[#e0e5ec] shadow-[inset_8px_8px_16px_#bebebe,inset_-8px_-8px_16px_#ffffff] flex flex-col items-center justify-center px-6 sm:px-10 text-gray-700">

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
                        onSubmit={
                            handleSignup
                        }
                        className="w-full space-y-2.5"
                    >

                        {/* NAME */}

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
                                    loading
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
                                    loading
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
                                    loading
                                }
                                autoComplete="new-password"
                                className="w-full px-3 py-2 bg-[#e0e5ec] text-xs font-medium text-gray-700 outline-none rounded-xl border border-red-300/40 shadow-[inset_3px_3px_6px_#babecc,inset_-3px_-3px_6px_#ffffff] disabled:opacity-50"
                            />

                        </div>

                        {/* BUTTON */}

                        <button
                            type="submit"
                            disabled={
                                loading
                            }
                            className="w-full py-2.5 mt-1 bg-[#e0e5ec] text-xs font-bold text-gray-600 tracking-wider uppercase rounded-xl shadow-[5px_5px_10px_#babecc,-5px_-5px_10px_#ffffff] disabled:opacity-50"
                        >
                            {loading
                                ? "Creating..."
                                : invitationToken
                                ? "Create Account"
                                : "Sign Up"}
                        </button>

                    </form>

                    <div className="flex items-center my-2.5 w-full text-[10px] text-gray-400">

                        <div className="flex-1 border-t border-gray-300/60" />

                        <span className="px-2">
                            or continue with
                        </span>

                        <div className="flex-1 border-t border-gray-300/60" />

                    </div>

                    <button
                        type="button"
                        onClick={
                            handleGoogleSignup
                        }
                        disabled={
                            loading
                        }
                        className="w-full py-2 bg-[#e0e5ec] text-xs font-semibold text-gray-600 rounded-xl shadow-[3px_3px_6px_#babecc,-3px_-3px_6px_#ffffff] disabled:opacity-50"
                    >
                        Google
                    </button>

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