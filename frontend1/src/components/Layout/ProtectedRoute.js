import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({
  children,
  requiredPermissions = [],
  allowEmployeeRole = false,
  roles, // optional role gating
}) => {
  // Get token and user
  const token =
    sessionStorage.getItem("token");
  const user = JSON.parse(
    sessionStorage.getItem("user")
  );

  // If not logged in, redirect
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Admins, Directors, and General Managers bypass for critical management only; otherwise respect permissions
  if (user.role === "admin" || user.role === "director" || user.role === "manager") {
    return children;
  }

  // If roles are specified, enforce role gating (admin already handled)
  if (Array.isArray(roles) && roles.length > 0) {
    if (!roles.includes(user.role)) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="text-6xl text-gray-300 mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  // Check required permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const userPermissions = user.permissions || [];

    // Switch to .every() to ensure all hierarchical permissions are met
    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissions.includes(perm)
    );

    // Deny if missing ANY of the required permissions
    if (!hasAllPermissions) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="text-6xl text-gray-300 mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  // Otherwise, allow access
  return children;
};

export default ProtectedRoute;
