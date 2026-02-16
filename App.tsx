import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import DataAnalysisPage from "./pages/DataAnalysisPage";
import LoginPage from "./pages/LoginPage";
import DeviceAdministrationPage from "./pages/DeviceAdministrationPage";
import DataVisualizationPage from "./pages/DataVisualizationPage";
import RealtimeDashboardPage from "./pages/RealtimeDashboardPage";
import ChartCustomizationPage from "./pages/ChartCustomizationPage"; // ✅ NEW

import { isTokenAlive } from "./utils/token";
import { apiService } from "./services/api";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token && isTokenAlive(token)) {
      apiService.setKeycloakToken(token);
      console.log("✅ Token loaded");
    } else {
      apiService.clearToken();
      console.log("❌ Token expired or missing");
    }
  }, []);

  const DashboardLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 overflow-hidden">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Header setSidebarOpen={setIsSidebarOpen} />
        <main className="p-4 sm:p-6 lg:p-8 flex-1">{children}</main>
      </div>
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        {/* ---------- LOGIN PAGE ---------- */}
        <Route path="/" element={<LoginPage />} />

        {/* ---------- PROTECTED DASHBOARD ROUTES ---------- */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DataAnalysisPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/device-admin"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DeviceAdministrationPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/data-visualization"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DataVisualizationPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/realtime-dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <RealtimeDashboardPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ---------- NEW CHART CUSTOMIZATION PAGE ---------- */}
        <Route
          path="/chart-customization"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ChartCustomizationPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
