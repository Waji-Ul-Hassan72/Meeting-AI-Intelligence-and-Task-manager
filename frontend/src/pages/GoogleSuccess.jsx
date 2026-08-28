import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function GoogleSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      // 1. Save the token
      localStorage.setItem("token", token);

      // 2. Decode the JWT payload to save user details
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );

        const userData = JSON.parse(jsonPayload);

        // Save user object so ProtectedRoute is satisfied
        localStorage.setItem("user", JSON.stringify(userData));
      } catch (error) {
        console.error("Failed to decode token:", error);
      }

      // 3. Small timeout ensures localStorage finishes writing before ProtectedRoute checks it
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 100);
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center max-w-sm w-full flex flex-col items-center">
        {/* Loading Spinner */}
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0d9488] rounded-full animate-spin mb-4"></div>

        <h2 className="text-slate-900 text-lg font-bold m-0">
          Logging in with Google...
        </h2>
        <p className="text-slate-500 text-xs mt-1.5 m-0">
          Please wait while we redirect you to your dashboard.
        </p>
      </div>
    </div>
  );
}

export default GoogleSuccess;