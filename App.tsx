import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import DataAnalysisPage from "./pages/DataAnalysisPage";
import LoginPage from "./pages/LoginPage";
import DeviceAdministrationPage from "./pages/DeviceAdministrationPage";
// import DataVisualizationPage from "./pages/DataVisualizationPage";
import RealtimeDashboardPage from "./pages/RealtimeDashboardPage";
import ChartCustomizationPage from "./pages/ChartCustomizationPage"; // ✅ NEW
import DashboardExplorerPage from "./pages/DashboardExplorerPage"; // ✅ NEW
import GroupDashboardPage from "./pages/GroupDashboardPage"; // ✅ NEW
import DataDownloader from "./pages/DataDownloaderPage"; // adjust path
import OTAPage from "./pages/OTAPage";
import MultiDeviceDashboardPage from "./pages/MultiDeviceDashboardPage";
import { isTokenAlive } from "./utils/token";
import { apiService, Endpoint } from "./services/api";
import ProtectedRoute from "./routes/ProtectedRoute";
import DashboardRealtimeDebugPage from "./pages/DashboardRealtimeDebug";
import GroupRealtimeDetail from "./pages/GroupRealtimeDetail";
import DeviceManagementPage from "./pages/DeviceManagementPage";
import GroupManagementPage from "./pages/GroupManagementPage";
import SensorConfigPage from "./pages/SensorConfigPage";
import InfrastructurePage from "./pages/InfrastructurePage";
import { setCache } from "./services/cache";

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

    // Prefetch groups for performance optimization
    apiService.get(Endpoint.GROUP_ALL)
      .then(res => {
        setCache('groups', Array.isArray(res?.data) ? res.data : []);
      })
      .catch(err => console.error("Failed to prefetch groups", err));
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
                <DashboardExplorerPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/realtime/health"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardRealtimeDebugPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/realtime/health/:groupId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <GroupRealtimeDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/:groupId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <GroupDashboardPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Catch-all dynamic dashboard view placeholder for future */}
        <Route
          path="/dashboard/:groupId/:dashboardType"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <MultiDeviceDashboardPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/data-analysis"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DataAnalysisPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/data-downloader"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DataDownloader />
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

        {/* ---------- NEW OTA UPDATE PAGE ---------- */}
        <Route
          path="/ota"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <OTAPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ---------- DEVICE MANAGEMENT ---------- */}
        <Route
          path="/devices"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DeviceManagementPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ---------- GROUP MANAGEMENT ---------- */}
        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <GroupManagementPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ---------- SENSOR CONFIGURATION ---------- */}
        <Route
          path="/sensors"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SensorConfigPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ---------- INFRASTRUCTURE MANAGEMENT ---------- */}
        <Route
          path="/infrastructure"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <InfrastructurePage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
