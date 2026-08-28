import { useEffect, useState } from "react";
import {
    useNavigate,
    useParams,
} from "react-router-dom";

const API_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:3000";

function AcceptInvitation() {
    const { token } = useParams();

    const navigate = useNavigate();

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    useEffect(() => {
        const checkInvitation = async () => {
            try {
                if (!token) {
                    setError(
                        "Invitation token is missing."
                    );

                    setLoading(false);

                    return;
                }

                // ==========================================
                // Store token temporarily
                // ==========================================

                sessionStorage.setItem(
                    "project_invitation_token",
                    token
                );

                // ==========================================
                // We don't authenticate here.
                //
                // User must either:
                // Login
                // OR
                // Signup
                // ==========================================

                navigate(
                    `/login?invitation=${encodeURIComponent(
                        token
                    )}`,
                    {
                        replace: true,
                    }
                );
            } catch (error) {
                console.error(
                    error
                );

                setError(
                    "Unable to process invitation."
                );

                setLoading(false);
            }
        };

        checkInvitation();
    }, [token, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#e0e5ec]">

                <div className="text-center">

                    <div className="text-lg font-bold text-gray-700">
                        Checking invitation...
                    </div>

                    <p className="text-sm text-gray-500 mt-2">
                        Please wait.
                    </p>

                </div>

            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#e0e5ec]">

            <div className="text-center text-red-600">
                {error}
            </div>

        </div>
    );
}

export default AcceptInvitation;