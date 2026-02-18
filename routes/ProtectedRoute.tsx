import { Navigate } from "react-router-dom";
import React from "react";
import { isTokenAlive } from "../utils/token";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = localStorage.getItem("token");

  // If no token or expired token → redirect to login
  if (!token || !isTokenAlive(token)) {
    return <Navigate to="/" replace />;
  }

  // Otherwise allow access
  return <>{children}</>;
}
