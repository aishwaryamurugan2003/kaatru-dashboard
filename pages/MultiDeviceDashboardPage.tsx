import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiService, Endpoint } from "../services/api";
import { RenderChart, ChartConfig } from "../components/RenderChart";
import { ArrowLeftOutlined } from "@ant-design/icons";

// Cache to avoid refetch
const deviceCache: Record<string, string[]> = {};

const MultiDeviceDashboardPage: React.FC = () => {
  const { groupId, dashboardType } = useParams<{
    groupId: string;
    dashboardType: string;
  }>();

  const navigate = useNavigate();

  const type =
    dashboardType?.includes("stationary") ? "stationary" : "mobile";

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

        if (deviceCache[groupId]) {
          allDeviceIds = deviceCache[groupId];
        } else {
          const res = await apiService.get(Endpoint.GROUP_DEVICES, {
            id: groupId,
          });

          allDeviceIds = res?.data?.devices || [];
          deviceCache[groupId] = allDeviceIds;
        }

        // ✅ Stationary = ALL your device types
        let filteredDevices: string[] = [];

        if (type === "stationary") {
          filteredDevices = allDeviceIds;
        } else {
          filteredDevices = allDeviceIds.filter((id: string) =>
            id.toUpperCase().startsWith("MOB")
          );
        }

        console.log("ALL DEVICES:", allDeviceIds);
        console.log("FILTERED DEVICES:", filteredDevices);

        const limitedDevices = filteredDevices.slice(0, 10);

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
  }, [groupId, type]);

  const PARAMETERS = [
    { key: "sPM2", label: "PM2.5" },
    { key: "sPM10", label: "PM10" },
    { key: "temp", label: "Temperature" },
    { key: "rh", label: "Humidity (RH)" },
    { key: "spm1", label: "PM1" },
    // { key: "aTd0", label: "Visibility" },
    // { key: "aTd2", label: "UV" },
    // { key: "vocl", label: "VOCL" },
  ];

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
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <ArrowLeftOutlined />
        </button>

        <div>
          <h1 className="text-2xl font-bold">{pageTitle}</h1>
          <p className="text-sm text-blue-600">{groupId}</p>
        </div>
      </div>

      {/* CARD */}
      <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-lg font-semibold mb-2">
          PM 2.5 Time Series
        </h2>

        {loading ? (
          <div className="h-[320px] flex items-center justify-center">
            Loading devices...
          </div>
        ) : error ? (
          <div className="h-[320px] flex items-center justify-center text-red-500">
            {error}
          </div>
        ) : devices.length === 0 ? (
          <div className="h-[320px] flex items-center justify-center">
            No devices found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PARAMETERS.map((param) => (
              <div key={param.key}>
                <h2 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">
                  {param.label}
                </h2>

                <RenderChart
                  config={{
                    id: param.key,
                    type: "line",
                    xKey: "srvtime",
                    yKey: param.key,
                  }}
                  devices={devices}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiDeviceDashboardPage;