import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  allowedRoles = [],
}) {
  const location = useLocation();

  const { user: contextUser, isAuthenticated } = useAuth();

  // ==========================================
  // GET AUTH DATA
  // ==========================================

  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");

  let localUser = null;

  try {
    localUser = storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.error("Failed to parse stored user:", error);
    localUser = null;
  }

  // Prefer AuthContext user, otherwise use localStorage user
  const user = contextUser || localUser;

  // ==========================================
  // CHECK AUTHENTICATION
  // ==========================================

  const authenticated =
    isAuthenticated === true ||
    (!!token && !!localUser);

  if (!authenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // ==========================================
  // CHECK ROLE
  // ==========================================

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user?.role)
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  // ==========================================
  // USER IS AUTHENTICATED
  // ==========================================

  return children;
}