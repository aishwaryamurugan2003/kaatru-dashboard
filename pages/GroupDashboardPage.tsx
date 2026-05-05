import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { apiService, Endpoint } from "../services/api";
import { DashboardOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import Loading from "../components/Loading";

const DASHBOARD_TYPES = [
  "Multi Device Dashboard Stationary Device",
  "Multi Device Dashboard Mobile Device",
  "Other Plots",
  "Real Time Dashboard",
  "Single Device Dashboard",
  "Single Device Dashboard V2"
];

const GroupDashboardPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [groupName, setGroupName] = useState<string>(
    location.state?.groupName || groupId || "Group"
  );
  const [loading, setLoading] = useState(!location.state?.groupName);

  // ✅ NEW STATE
  const [devices, setDevices] = useState<string[]>([]);

  /* ------------------------------------------------------------
     FETCH GROUP NAME (existing logic)
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!location.state?.groupName) {
      const fetchGroupInfo = async () => {
        try {
          const res = await apiService.get(Endpoint.GROUP_ALL);
          const data = Array.isArray(res.data)
            ? res.data
            : res.data?.group || [];

          const group = data.find((g: any) => g.id === groupId);
          if (group) {
            setGroupName(group.name);
          }
        } catch (err) {
          console.error("Failed to load group info", err);
        } finally {
          setLoading(false);
        }
      };

      fetchGroupInfo();
    }
  }, [groupId, location.state]);

  /* ------------------------------------------------------------
     ✅ FETCH DEVICES USING YOUR API
  ------------------------------------------------------------ */
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await apiService.get(Endpoint.GROUP_DEVICES, {
          id: groupId,
        });

        const data = res.data;

        // ✅ SAFE PARSE
        const deviceList = data?.devices || [];

        setDevices(deviceList);
      } catch (err) {
        console.error("❌ Failed to fetch devices", err);
      }
    };

    if (groupId) fetchDevices();
  }, [groupId]);

  /* ------------------------------------------------------------
     ✅ DEVICE CLASSIFICATION
  ------------------------------------------------------------ */
  const mobileDevices = devices.filter((d) =>
    d.toUpperCase().startsWith("MOB") || d.toUpperCase().startsWith("MG") || d.toUpperCase().startsWith("LMG")
  );

  const stationaryDevices = devices.filter((d) =>
    d.toUpperCase().startsWith("SG") || (!d.toUpperCase().startsWith("MOB") && !d.toUpperCase().startsWith("MG") && !d.toUpperCase().startsWith("LMG"))
  );

  /* ------------------------------------------------------------
     ✅ NAVIGATION WITH DEVICES
  ------------------------------------------------------------ */
  const handleDashboardClick = (dashboardName: string) => {
    const urlFormat = dashboardName.toLowerCase().replace(/\s+/g, "-");

    let selectedDevices: string[] = [];

    if (dashboardName.includes("Stationary")) {
      selectedDevices = stationaryDevices;
    } else if (dashboardName.includes("Mobile")) {
      selectedDevices = mobileDevices;
    }

    console.log("👉 Navigating with devices:", selectedDevices);

    navigate(`/dashboard/${groupId}/${urlFormat}`, {
      state: {
        devices: selectedDevices,
        groupName,
      },
    });
  };

  if (loading) {
    return <Loading fullScreen text="Loading group details..." />;
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
        >
          <ArrowLeftOutlined />
        </button>

        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {groupName} Dashboard
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DASHBOARD_TYPES.map((dashName, idx) => (
            <div
              key={idx}
              onClick={() => handleDashboardClick(dashName)}
              className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md cursor-pointer transition-all bg-gray-50 dark:bg-gray-750 group"
            >
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <DashboardOutlined className="text-xl" />
              </div>

              <span className="font-medium text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {dashName}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GroupDashboardPage;