import { Navigate } from "react-router-dom";
import React from "react";
import { isTokenAlive } from "../utils/token";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (!isTokenAlive(token)) {
    localStorage.removeItem("token");
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
