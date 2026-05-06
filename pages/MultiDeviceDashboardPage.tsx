import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiService, Endpoint } from "../services/api";
import DynamicChartBuilder from "../components/DynamicChartBuilder";
import RealTimeDashboardView from "../components/dashboards/RealTimeDashboardView";
import SingleDeviceDashboardView from "../components/dashboards/SingleDeviceDashboardView";
import { ArrowLeftOutlined } from "@ant-design/icons";
import Select from "react-select";

// Cache to avoid refetch
const deviceCache: Record<string, string[]> = {};
const measurementCache: Record<string, string> = {};

// Junk/placeholder values the API sometimes returns — treat these as "no value"
const INVALID_DB_VALUES = new Set([
  "string", "null", "NULL", "", "admin", "NR1", "NR2",
]);

// Mobile: MOB*, MG* only
// Stationary: everything else (LMG*, SG*, etc.)
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

  // ✅ TRUST ONLY primarydb (your backend truth)
  if (primary && primary !== "string") {
    return primary;
  }

  return "sendata";
}
const MultiDeviceDashboardPage: React.FC = () => {
  const { groupId, dashboardType } = useParams<{
    groupId: string;
    dashboardType: string;
  }>();

  const navigate = useNavigate();

  const [allDevicesList, setAllDevicesList] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [measurement, setMeasurement] = useState<string>("sendata");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDevices() {
      if (!groupId) return;

      try {
        setLoading(true);
        setError(null);

        let allDeviceIds: string[] = [];
        let resolvedMeasurement = "sendata";

        // ── Devices ──────────────────────────────────────────
        if (deviceCache[groupId]) {
          allDeviceIds = deviceCache[groupId];
          resolvedMeasurement = measurementCache[groupId] ?? "sendata";
        } else {
          const res = await apiService.get(Endpoint.GROUP_DEVICES, {
            id: groupId,
          });
          allDeviceIds = res?.data?.devices || [];
          deviceCache[groupId] = allDeviceIds;

          // ── Measurement: read from group info ──
          const groupInfo = res?.data?.group?.[0];
          resolvedMeasurement = resolveMeasurement(groupInfo);
          measurementCache[groupId] = resolvedMeasurement;

          console.log(
            `📦 Group "${groupId}" | db="${groupInfo?.db}" | primarydb="${groupInfo?.primarydb}" | ✅ resolved="${resolvedMeasurement}"`
          );
        }

        setMeasurement(resolvedMeasurement);

        // ── Filter by dashboard type ──────────────────────────
        let initialFilter = allDeviceIds;
        if (dashboardType?.includes("mobile")) {
          initialFilter = allDeviceIds.filter(isMobileDevice);
        } else if (dashboardType?.includes("stationary")) {
          initialFilter = allDeviceIds.filter(isStationaryDevice);
        }

        setAllDevicesList(initialFilter);

        // Default: limit to 10 so it doesn't break browser initially
        let initialSelection = initialFilter.slice(0, 10);
        if (dashboardType?.includes("single-device")) {
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
  }, [groupId, dashboardType]);

  const pageTitle = dashboardType
    ? dashboardType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Dashboard";

  const isSingleDevice = dashboardType?.includes("single-device");

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

  const headerNode = (
    <div className="flex items-center gap-4">
      <button
        onClick={() => navigate(-1)}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 shadow-sm border dark:border-gray-700"
      >
        <ArrowLeftOutlined />
      </button>
      <div>
        <h1 className="text-2xl font-bold dark:text-white">{pageTitle}</h1>
        <p className="text-sm text-blue-600">{groupId}</p>
      </div>
    </div>
  );

  const devicesForChart = selectedDevices.map((id) => ({ label: id, value: id }));

  const renderDashboardView = () => {
    switch (dashboardType) {
      case "real-time-dashboard":
        return (
          <RealTimeDashboardView
            groupId={groupId!}
            devices={selectedDevices}
            headerNode={headerNode}
          />
        );

      case "single-device-dashboard":
      case "single-device-dashboard-v2":
        return (
          <SingleDeviceDashboardView
            groupId={groupId!}
            devices={selectedDevices}
            headerNode={headerNode}
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
            {/* DEVICE SELECTOR TOP BAR */}
            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow border dark:border-gray-700 flex flex-col md:flex-row items-center gap-4">
              <span className="font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap pl-2">
                Select Devices
              </span>
              <div className="w-full md:w-80">
                <Select
                  isMulti={!isSingleDevice}
                  options={deviceOptions}
                  isSearchable={true}
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
                          const selectedCount = selectedDevices.length;
                          let text = "";

                          if (
                            selectedCount === allDevicesList.length &&
                            allDevicesList.length > 0
                          ) {
                            text = "All Devices Selected";
                          } else if (selectedCount > 0) {
                            text = `${selectedCount} Device(s) Selected`;
                          }

                          return (
                            <div className="flex items-center px-2 text-gray-700 dark:text-gray-200 w-full">
                              {text && (
                                <span className="mr-2 font-medium">{text}</span>
                              )}
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

            {renderDashboardView()}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiDeviceDashboardPage;
