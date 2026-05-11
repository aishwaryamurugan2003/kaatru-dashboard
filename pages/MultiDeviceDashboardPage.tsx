import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { apiService, Endpoint } from "../services/api";
import DynamicChartBuilder from "../components/DynamicChartBuilder";
import RealTimeDashboardView from "../components/dashboards/RealTimeDashboardView";
import SingleDeviceDashboardView from "../components/dashboards/SingleDeviceDashboardView";
import { ArrowLeftOutlined, FolderOpenOutlined } from "@ant-design/icons";
import Select from "react-select";

// Cache to avoid refetch
const deviceCache: Record<string, string[]> = {};
const measurementCache: Record<string, string> = {};

const INVALID_DB_VALUES = new Set([
  "string", "null", "NULL", "", "admin", "NR1", "NR2",
]);

function isMobileDevice(id: string): boolean {
  const upper = id.toUpperCase();
  return upper.startsWith("MOB") || upper.startsWith("MG");
}

function isStationaryDevice(id: string): boolean {
  return !isMobileDevice(id);
}

function resolveMeasurement(groupInfo: any): string {
  if (!groupInfo) return "sendata";
  const primary = groupInfo.primarydb?.toLowerCase();
  if (primary && primary !== "string") return primary;
  return "sendata";
}

const MultiDeviceDashboardPage: React.FC = () => {
  const { groupId, dashboardType } = useParams<{
    groupId: string;
    dashboardType: string;
  }>();

  const navigate = useNavigate();
  const location = useLocation();

  // ── Detect if this is a custom folder route ───────────────────────────────
  const isCustomFolder =
    location.state?.isCustomFolder === true ||
    dashboardType?.startsWith("custom-folder-");

  const folderName: string = location.state?.folderName || "My Folder";

  // ── Resolve the actual dashboard type for custom folders ─────────────────
  // Custom folders always behave like multi-device-dashboard-stationary-device
  // (all devices, line chart) unless you want to store a type per folder.
  const effectiveDashboardType = isCustomFolder
    ? "multi-device-dashboard-stationary-device"
    : dashboardType;

  const [allDevicesList, setAllDevicesList] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [measurement, setMeasurement] = useState<string>("sendata");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState("3H");

  const timeFilterOptions = [
    { label: "5M", value: "5M" },
    { label: "15M", value: "15M" },
    { label: "1H", value: "1H" },
    { label: "3H", value: "3H" },
    { label: "5H", value: "5H" },
    { label: "1D", value: "1D" },
  ];

  useEffect(() => {
    async function loadDevices() {
      if (!groupId) return;

      try {
        setLoading(true);
        setError(null);

        let allDeviceIds: string[] = [];
        let resolvedMeasurement = "sendata";

        if (deviceCache[groupId]) {
          allDeviceIds = deviceCache[groupId];
          resolvedMeasurement = measurementCache[groupId] ?? "sendata";
        } else {
          const res = await apiService.get(Endpoint.GROUP_DEVICES, { id: groupId });
          allDeviceIds = res?.data?.devices || [];
          deviceCache[groupId] = allDeviceIds;

          const groupInfo = res?.data?.group?.[0];
          resolvedMeasurement = resolveMeasurement(groupInfo);
          measurementCache[groupId] = resolvedMeasurement;

          console.log(
            `📦 Group "${groupId}" | primarydb="${groupInfo?.primarydb}" | ✅ resolved="${resolvedMeasurement}"`
          );
        }

        setMeasurement(resolvedMeasurement);

        // ── Filter by effective dashboard type ────────────────────────────
        let initialFilter = allDeviceIds;
        if (effectiveDashboardType?.includes("mobile")) {
          initialFilter = allDeviceIds.filter(isMobileDevice);
        } else if (effectiveDashboardType?.includes("stationary")) {
          initialFilter = allDeviceIds.filter(isStationaryDevice);
        }

        // For custom folders: show ALL devices (user picks)
        if (isCustomFolder) initialFilter = allDeviceIds;

        setAllDevicesList(initialFilter);

        let initialSelection = initialFilter.slice(0, 10);
        if (effectiveDashboardType?.includes("single-device")) {
          initialSelection = initialFilter.length > 0 ? [initialFilter[0]] : [];
        }
        setSelectedDevices(initialSelection);
      } catch (err) {
        console.error("Failed to fetch devices", err);
        setError("Failed to load devices");
      } finally {
        setLoading(false);
      }
    }

    loadDevices();
  }, [groupId, effectiveDashboardType, isCustomFolder]);

  // ── Page title ────────────────────────────────────────────────────────────
  const pageTitle = isCustomFolder
    ? folderName
    : dashboardType
      ? dashboardType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Dashboard";

  const isSingleDevice = effectiveDashboardType?.includes("single-device");

  const deviceOptions = useMemo(() => {
    const opts = allDevicesList.map((id) => ({ label: id, value: id }));
    if (!isSingleDevice && opts.length > 0) {
      return [{ label: "Select All", value: "SELECT_ALL" }, ...opts];
    }
    return opts;
  }, [allDevicesList, isSingleDevice]);

  const handleDeviceSelect = (opts: any) => {
    if (isSingleDevice) {
      setSelectedDevices(opts ? [opts.value] : []);
    } else {
      if (opts && opts.some((o: any) => o.value === "SELECT_ALL")) {
        setSelectedDevices(allDevicesList);
      } else {
        setSelectedDevices(opts ? opts.map((opt: any) => opt.value) : []);
      }
    }
  };

  // ── Header node ───────────────────────────────────────────────────────────
  const headerNode = (
    <div className="flex items-center gap-4">
      <button
        onClick={() => navigate(-1)}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 shadow-sm border dark:border-gray-700"
      >
        <ArrowLeftOutlined />
      </button>
      <div>
        <div className="flex items-center gap-2">
          {isCustomFolder && (
            <FolderOpenOutlined className="text-blue-500 text-lg" />
          )}
          <h1 className="text-2xl font-bold dark:text-white">{pageTitle}</h1>
        </div>
        <p className="text-sm text-blue-600">{groupId}</p>
      </div>
    </div>
  );

  const devicesForChart = selectedDevices.map((id) => ({ label: id, value: id }));

  // ── Render dashboard view ─────────────────────────────────────────────────
  const renderDashboardView = () => {
    // Custom folders always use DynamicChartBuilder (line charts, all devices)
    if (isCustomFolder) {
      return (
        <DynamicChartBuilder
          devices={devicesForChart}
          storageKeyPattern={dashboardType || "custom-folder"}
          headerNode={headerNode}
          defaultChartType="line"
          measurement={measurement}
          timeFilter={selectedFilter}
          isCustomFolder={true}
          folderId={location.state?.folderId as number | undefined}
        />
      );
    }

    switch (dashboardType) {
      case "real-time-dashboard":
        return (
          <RealTimeDashboardView
            groupId={groupId!}
            devices={selectedDevices}
            headerNode={headerNode}
            timeFilter={selectedFilter}
          />
        );

      case "single-device-dashboard":
      case "single-device-dashboard-v2":
        return (
          <SingleDeviceDashboardView
            groupId={groupId!}
            devices={selectedDevices}
            headerNode={headerNode}
            timeFilter={selectedFilter}
          />
        );

      case "other-plots":
        return (
          <DynamicChartBuilder
            devices={devicesForChart}
            storageKeyPattern={dashboardType}
            headerNode={headerNode}
            defaultChartType="scatter"
            measurement={measurement}
            timeFilter={selectedFilter}
          />
        );

      case "multi-device-dashboard-mobile-device":
      case "multi-device-dashboard-stationary-device":
      default:
        return (
          <DynamicChartBuilder
            devices={devicesForChart}
            storageKeyPattern={dashboardType || "unknown"}
            headerNode={headerNode}
            defaultChartType="line"
            measurement={measurement}
            timeFilter={selectedFilter}
          />
        );
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
      <div className="flex-1">
        {loading ? (
          <div className="h-[320px] flex items-center justify-center bg-white p-6 rounded-xl shadow-sm border">
            Loading devices...
          </div>
        ) : error ? (
          <div className="h-[320px] flex items-center justify-center text-red-500 bg-white p-6 rounded-xl shadow-sm border">
            {error}
          </div>
        ) : allDevicesList.length === 0 ? (
          <div className="h-[320px] flex items-center justify-center bg-white p-6 rounded-xl shadow-sm border">
            No devices found in this group.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* DEVICE SELECTOR + TIME FILTER */}
            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow border dark:border-gray-700 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <span className="font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap pl-2">
                  Select Devices
                </span>
                <div className="w-full md:w-80">
                  <Select
                    isMulti={!isSingleDevice}
                    options={deviceOptions}
                    isSearchable
                    value={
                      isSingleDevice
                        ? deviceOptions.find((d) => selectedDevices[0] === d.value)
                        : deviceOptions.filter((d) => selectedDevices.includes(d.value))
                    }
                    onChange={handleDeviceSelect}
                    placeholder="Select Device(s)..."
                    className="text-sm"
                    hideSelectedOptions={false}
                    components={
                      !isSingleDevice
                        ? {
                          MultiValue: () => null,
                          ValueContainer: (props) => {
                            const { children } = props;
                            const count = selectedDevices.length;
                            const text =
                              count === allDevicesList.length && count > 0
                                ? "All Devices Selected"
                                : count > 0
                                  ? `${count} Device(s) Selected`
                                  : "";
                            return (
                              <div className="flex items-center px-2 text-gray-700 dark:text-gray-200 w-full">
                                {text && <span className="mr-2 font-medium">{text}</span>}
                                <div className="flex-1">{children}</div>
                              </div>
                            );
                          },
                        }
                        : undefined
                    }
                  />
                </div>
              </div>

              <div className="w-full md:w-40 mr-2">
                <Select
                  options={timeFilterOptions}
                  value={timeFilterOptions.find((o) => o.value === selectedFilter)}
                  onChange={(opt) => setSelectedFilter(opt?.value || "15M")}
                  className="text-sm"
                  isSearchable={false}
                />
              </div>
            </div>

            {renderDashboardView()}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiDeviceDashboardPage;
