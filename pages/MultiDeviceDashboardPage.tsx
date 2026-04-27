import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiService, Endpoint } from "../services/api";
import { RenderChart, ChartConfig } from "../components/RenderChart";
import Loading from "../components/Loading";
import { ArrowLeftOutlined } from "@ant-design/icons";

interface Props {
  type: "stationary" | "mobile";
}

// Cache to avoid refetch
const deviceCache: Record<string, string[]> = {};

const MultiDeviceDashboardPage: React.FC<Props> = ({ type }) => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDevices() {
      if (!groupId) return;

      try {
        setLoading(true);
        setError(null);

        let allDeviceIds: string[] = [];

        // ✅ Use cache if available
        if (deviceCache[groupId]) {
          allDeviceIds = deviceCache[groupId];
        } else {
          const res = await apiService.get(Endpoint.GROUP_DEVICES, { id: groupId });
          allDeviceIds = res?.data?.devices || [];
          deviceCache[groupId] = allDeviceIds;
        }

        // ✅ FIX: Remove SG/MG filtering (works for all groups)
        const limitedDevices = allDeviceIds.slice(0, 10);

        // ✅ Format for chart
        const formatted = limitedDevices.map((id: string) => ({
          label: id,
          value: id,
        }));

        setDevices(formatted);
      } catch (err) {
        console.error("Failed to fetch devices", err);
        setError("Failed to load devices");
      } finally {
        setLoading(false);
      }
    }

    loadDevices();
  }, [groupId]);

  const config: ChartConfig = {
    id: "multi-device-dashboard",
    type: "line",
    xKey: "srvtime",
    yKey: "sPM2",
  };

  const pageTitle =
    type === "stationary"
      ? "Multi Device Dashboard - Stationary"
      : "Multi Device Dashboard - Mobile";

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">

      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
        >
          <ArrowLeftOutlined />
        </button>

        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {pageTitle}
          </h1>
          <p className="text-sm text-blue-600 font-semibold capitalize mt-1">
            {groupId}
          </p>
        </div>
      </div>

      {/* CARD */}
      <div className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            PM 2.5 Time Series
          </h2>
          <p className="text-sm text-gray-500">
            Showing latest PM 2.5 values for devices inside {groupId}.
          </p>
        </div>

        {/* STATES */}
        {loading ? (
          <div className="h-[320px] flex items-center justify-center text-gray-500 animate-pulse bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100">
            Loading devices...
          </div>
        ) : error ? (
          <div className="flex h-[320px] items-center justify-center text-red-500 font-semibold text-lg bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100">
            {error}
          </div>
        ) : devices.length === 0 ? (
          <div className="h-[320px] flex flex-col items-center justify-center text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 p-6 text-center">
            <div className="text-xl mb-2 text-gray-400">No Data</div>
            <p>No devices available for the group "{groupId}".</p>
          </div>
        ) : (
          <RenderChart config={config} devices={devices} />
        )}
      </div>
    </div>
  );
};

export default MultiDeviceDashboardPage;