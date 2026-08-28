import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const AuthContext = createContext(null);

// ==========================================
// AUTH PROVIDER
// ==========================================

export const AuthProvider = ({ children }) => {
  // ==========================================
  // LOAD USER FROM LOCAL STORAGE
  // ==========================================

  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        return null;
      }

      return JSON.parse(storedUser);
    } catch (error) {
      console.error("❌ Failed to load user from localStorage:", error);

      localStorage.removeItem("user");

      return null;
    }
  });

  // ==========================================
  // LOAD TOKEN FROM LOCAL STORAGE
  // ==========================================

  const [token, setToken] = useState(() => {
    return localStorage.getItem("token");
  });

  // ==========================================
  // LOGIN
  // ==========================================

  const login = (userData, jwtToken) => {
    try {
      if (!userData || !jwtToken) {
        console.error("❌ Login failed: user data or token is missing.");
        return false;
      }

      // Save to localStorage
      localStorage.setItem(
        "user",
        JSON.stringify(userData)
      );

      localStorage.setItem(
        "token",
        jwtToken
      );

      // Update React state immediately
      setUser(userData);
      setToken(jwtToken);

      console.log("✅ AuthContext login successful");
      console.log("User:", userData);
      console.log("Role:", userData.role);

      return true;

    } catch (error) {
      console.error("❌ AuthContext login error:", error);

      return false;
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = () => {
    // Remove authentication information
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    // Clear React state
    setUser(null);
    setToken(null);

    console.log("✅ User logged out.");
  };

  // ==========================================
  // CHECK AUTHENTICATION
  // ==========================================

  const isAuthenticated = Boolean(
    token && user
  );

  // ==========================================
  // DEBUG AUTH STATE
  // ==========================================

  useEffect(() => {
    console.log("=================================");
    console.log("AUTH STATE");
    console.log("=================================");
    console.log("Authenticated:", isAuthenticated);
    console.log("User:", user);
    console.log("Token exists:", !!token);

    if (user) {
      console.log("User role:", user.role);
    }

    console.log("=================================");
  }, [user, token, isAuthenticated]);

  // ==========================================
  // AUTH CONTEXT
  // ==========================================

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ==========================================
// USE AUTH HOOK
// ==========================================

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider"
    );
  }

  return context;
};