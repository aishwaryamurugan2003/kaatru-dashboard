import { useEffect, useState, useMemo } from "react";
import { apiService, Endpoint } from "../services/api";
import { useRealtimeDevices } from "../hooks/useRealtimeDevices";
import RealtimeMapAll from "@/components/RealtimeMapAll";
import Loading from "../components/Loading";
import SensorHistoryChart from "@/components/SensorHistoryChart";
import ReactCardFlip from "react-card-flip";
import DynamicVisualization from "@/components/DynamicVisualization";
import Select from "react-select";
interface Option {
  label: string;
  value: string;
}
function calculateAverages(devices: Record<string, any>) {
  const list = Object.values(devices);

  const avg = (key: string, isPM = false) => {
    const vals = list
      .map((d: any) => d?.[key])
      .filter((v) => {
        if (typeof v !== "number") return false;
        if (isPM) {
          return v >= 0 && v <= 2000;
        }

        return true;
      });

    if (!vals.length) return "--";
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  };
  return {
    pm25: avg("sPM2", true),
    pm10: avg("sPM10", true),
    temp: avg("temp"),
    humidity: avg("rh"),
  };
}
const RealtimeDashboardPage: React.FC = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [groupDevices, setGroupDevices] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeTimeout, setRealtimeTimeout] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);


  // 🔥 NEW: index-based rotation
  const [activeIndex, setActiveIndex] = useState(0);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [flipped, setFlipped] = useState(false);

  const devices = useRealtimeDevices(selectedGroup, selectedDevices);

  // const filteredDevices = useMemo(() => {
  //   const result: Record<string, any> = {};

  //   for (const id of selectedDevices) {
  //     if (devices[id]) {
  //       result[id] = devices[id];
  //     }
  //   }

  //   return result;
  // }, [devices, selectedDevices.join(",")]);

  const filteredDevices = useMemo(() => {
    if (!selectedDevices.length) return devices;

    const result: Record<string, any> = {};

    Object.entries(devices).forEach(([id, data]) => {
      if (selectedDevices.includes(id)) {
        result[id] = data;
      }
    });

    return result;
  }, [devices, selectedDevices]);

  // const deviceStats = useMemo(() => {
  //   const total = selectedDevices.length;

  //   const active = selectedDevices.filter((id) => devices[id]).length;
  //   const inactive = total - active;

  //   return {
  //     total,
  //     active,
  //     inactive,
  //   };
  // }, [devices, selectedDevices]);
  const ACTIVE_THRESHOLD = 60 * 1000;

  const deviceStats = useMemo(() => {
    const total = selectedDevices.length;
    const now = Date.now();

    let active = 0;

    selectedDevices.forEach((id) => {
      const d = devices[id];

      if (!d) return;

      const lastSeen = Number(d.srvtime || 0);

      if (now - lastSeen <= ACTIVE_THRESHOLD) {
        active++;
      }
    });

    const inactive = total - active;

    return {
      total,
      active,
      inactive,
    };
  }, [devices, selectedDevices]);

  const deviceMetaMap = useMemo(() => {
    const map: Record<string, any> = {};

    groupDevices.forEach((d: any) => {
      map[d.id] = d;
    });

    return map;
  }, [groupDevices]);

  const deviceTypeStats = useMemo(() => {
    const now = Date.now();

    let mobileTotal = 0;
    let mobileActive = 0;

    let stationaryTotal = 0;
    let stationaryActive = 0;

    selectedDevices.forEach((id) => {
      const d = devices[id];

      const type =
        deviceMetaMap[id]?.type ||
        (id.toUpperCase().startsWith("M") ? "mobile" : "stationary");

      const isActive =
        d && now - Number(d.srvtime || 0) <= ACTIVE_THRESHOLD;

      if (type === "mobile") {
        mobileTotal++;
        if (isActive) mobileActive++;
      } else {
        stationaryTotal++;
        if (isActive) stationaryActive++;
      }
    });

    return {
      mobile: {
        total: mobileTotal,
        active: mobileActive,
      },
      stationary: {
        total: stationaryTotal,
        active: stationaryActive,
      },
    };
  }, [devices, selectedDevices, deviceMetaMap]);

  const isStatsLoading =
    selectedGroup &&
    selectedDevices.length > 0 &&
    Object.keys(devices).length === 0;



  const isRealtimeLoading =
    selectedGroup &&
    selectedDevices.length > 0 &&
    Object.keys(filteredDevices).length === 0;

  const activeDeviceIds = useMemo(
    () => Object.keys(filteredDevices).sort(),
    [filteredDevices]
  );

  // 🔥 derive active device from index
  const activeDeviceId = activeDeviceIds[activeIndex] ?? null;

  // reset on group change
  useEffect(() => {
    setSelectedDeviceId(null);
    setFlipped(false);
    setAutoRotate(true);
    setActiveIndex(0);
  }, [selectedGroup]);

  // 🔥 stable autoplay rotation
  useEffect(() => {
    if (!autoRotate || activeDeviceIds.length === 0) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) =>
        (prev + 1) % activeDeviceIds.length
      );
    }, 7000);


    return () => clearInterval(interval);
  }, [autoRotate, activeDeviceIds.length]);

  // reset index when device list changes
  useEffect(() => {
    setActiveIndex(0);
  }, [activeDeviceIds.length]);

  const focusedDeviceId = useMemo(() => {
    if (selectedDeviceId && devices[selectedDeviceId]) {
      return selectedDeviceId;
    }

    if (activeDeviceId && devices[activeDeviceId]) {
      return activeDeviceId;
    }

    return activeDeviceIds[0] ?? null;
  }, [selectedDeviceId, activeDeviceId, activeDeviceIds, devices]);

  const focusedDevice = focusedDeviceId
    ? filteredDevices[focusedDeviceId]
    : null;

  const aggregate = useMemo(
    () => calculateAverages(filteredDevices),
    [filteredDevices]
  );


  const chartData = useMemo(() => {
    return Object.entries(filteredDevices).map(([id, d]: any) => ({
      device: id,
      sPM2: Number(d.sPM2) || 0,
      sPM10: Number(d.sPM10) || 0,
      temp: Number(d.temp) || 0,
      rh: Number(d.rh) || 0,
      vcol: Number(d.vcol) || 0,
    }));
  }, [filteredDevices]);


  // fetch groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const res: any = await apiService.get(Endpoint.GROUP_ALL);
        setGroups(Array.isArray(res.data) ? res.data : res.data.group || []);
      } catch (err) {
        console.error("Failed to load groups", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  // timeout logic
  useEffect(() => {
    if (!selectedGroup || selectedDevices.length === 0) {
      setRealtimeTimeout(false);
      return;
    }
    setRealtimeTimeout(false);
    const timer = setTimeout(() => {
      setRealtimeTimeout(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [selectedGroup, selectedDevices]);

  // fetch devices
  useEffect(() => {
    if (!selectedGroup) return;

    const fetchDevices = async () => {
      try {
        setLoading(true);
        const res: any = await apiService.get(
          Endpoint.GROUP_DEVICES,
          { id: selectedGroup }
        );

        const devs = res.data.devices || [];
        const deviceDetails = await Promise.all(
          devs.map(async (id: string) => {
            try {
              const res = await apiService.get("/device", { id });

              const d = res.data.device?.[0];
              const typeStr = d?.deviceType || d?.device_type || d?.type;

              return {
                id,
                type: typeStr ? typeStr.toLowerCase() : (id.toUpperCase().startsWith("M") ? "mobile" : "stationary"),
              };
            } catch {
              return { id, type: id.toUpperCase().startsWith("M") ? "mobile" : "stationary" };
            }
          })
        );
        setGroupDevices(deviceDetails);
        setSelectedDevices(deviceDetails.map(d => d.id));
        setSelectedDeviceId(null);
        setAutoRotate(true);
        setFlipped(false);
        setActiveIndex(0);
      } catch (err) {
        console.error("Failed to load group devices", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDevices();
  }, [selectedGroup]);

  function toggleDevice(id: string) {
    setSelectedDevices((prev) =>
      prev.includes(id)
        ? prev.filter((d) => d !== id)
        : [...prev, id]
    );
  }

  // loading states
  if (loading) {
    return <Loading fullScreen text="Loading realtime dashboard..." />;
  }

  if (isRealtimeLoading && !realtimeTimeout) {
    return <Loading fullScreen text="Loading realtime dashboard..." />;
  }

  if (realtimeTimeout && Object.keys(filteredDevices).length === 0) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500 text-xl">
        No Data Available
      </div>
    );
  }

  // UI remains unchanged below

  return (
    <div className="p-6 space-y-4 bg-gray-50 dark:bg-gray-900">

      {/* TOP FILTER BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-white dark:bg-gray-800 p-3 rounded-xl shadow relative">
        <Select
          options={groups.map((g: any) => ({
            label: g.name,
            value: g.id,
          }))}
          value={
            groups
              .map((g: any) => ({
                label: g.name,
                value: g.id,
              }))
              .find((g) => g.value === selectedGroup) || null
          }
          onChange={(opt) =>
            setSelectedGroup((opt as Option)?.value || "")
          }
          placeholder="Select Group"
          className="w-full md:w-64"
        />
        <Select
          isMulti
          closeMenuOnSelect={false}
          hideSelectedOptions={false}
          options={groupDevices.map((d: any) => ({
            label: d.id,
            value: d.id,
          }))}
          value={selectedDevices.map((id) => ({
            label: id,
            value: id,
          }))}
          onChange={(opts) =>
            setSelectedDevices(
              (opts as Option[]).map((o) => o.value)
            )
          }
          placeholder="Select Devices"
          className="w-full md:w-64" // ✅ same width as Select Group
          styles={{
            control: (base) => ({
              ...base,
              minHeight: "38px",
              maxHeight: "38px",
              alignItems: "center",
              boxShadow: "none",
            }),

            valueContainer: (base) => ({
              ...base,
              padding: "2px 8px",
              gap: "4px",
              flexWrap: "nowrap",
              overflowX: "auto",
              scrollbarWidth: "none",
            }),

            multiValue: (base) => ({
              ...base,
              backgroundColor: "#dbeafe",
              borderRadius: "4px",
              flexShrink: 0,
            }),

            multiValueLabel: (base) => ({
              ...base,
              color: "#2563eb",
              fontWeight: 600,
              fontSize: "12px",
              padding: "2px",
            }),

            multiValueRemove: (base) => ({
              ...base,
              color: "#2563eb",
              ":hover": {
                backgroundColor: "transparent",
                color: "#1d4ed8",
              },
            }),

            indicatorSeparator: () => ({
              display: "none",
            }),

            menu: (base) => ({
              ...base,
              zIndex: 9999,
            }),
          }}

        />
        <div className="relative flex justify-end w-full md:w-auto">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-lg w-full md:w-auto"
            onClick={() => setShowAddMenu(!showAddMenu)}
          >
            Add
          </button>

          {showAddMenu && (
            <div className="absolute right-0 mt-2 bg-white shadow rounded-lg p-2 w-40 z-50">
              <button
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                onClick={() => {
                  setShowVisualization(true);
                  setShowAddMenu(false);
                }}
              >
                Visualization
              </button>
            </div>
          )}
        </div>
      </div>

      {/* STATUS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCard
          label="Total Devices"
          value={deviceStats.total}
          loading={isStatsLoading}
        />
        <StatusCard
          label="Active Devices"
          value={deviceStats.active}
          loading={isStatsLoading}
          color="green"
        />
        <StatusCard
          label="Inactive Devices"
          value={deviceStats.inactive}
          loading={isStatsLoading}
          color="red"
        />
      </div>

      {/* DEVICE TYPE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* MOBILE */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 text-center">
          <div className="text-gray-500 mb-2">Mobile Devices</div>

          {isStatsLoading ? (
            <div className="animate-pulse h-8 w-20 bg-gray-300 rounded mx-auto" />
          ) : (
            <div className="text-3xl font-bold text-blue-600">
              {deviceTypeStats.mobile.active}/{deviceTypeStats.mobile.total}
            </div>
          )}
        </div>

        {/* STATIONARY */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 text-center">
          <div className="text-gray-500 mb-2">Stationary Devices</div>

          {isStatsLoading ? (
            <div className="animate-pulse h-8 w-20 bg-gray-300 rounded mx-auto" />
          ) : (
            <div className="text-3xl font-bold text-orange-500">
              {deviceTypeStats.stationary.active}/{deviceTypeStats.stationary.total}
            </div>
          )}
        </div>

      </div>




      {/* MAIN GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-4">

        {/* LIVE MAP */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <h2 className="font-semibold mb-2">Live Map</h2>
          <div className="h-[400px] rounded overflow-hidden">
            <RealtimeMapAll
              devices={filteredDevices}
              activeId={focusedDeviceId}
              onMarkerClick={(id: string) => {
                setSelectedDeviceId(id);
                setAutoRotate(false);
                setFlipped(true);
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <ReactCardFlip isFlipped={flipped} flipDirection="horizontal">

            {/* ---------------- FRONT SIDE (CARDS) ---------------- */}
            <div className="space-y-6">

              {/* AGGREGATE */}
              <div>
                <h2 className="text-lg font-semibold mb-3 text-center">
                  AGGREGATE
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl shadow p-6 md:p-8 flex items-center justify-center text-center">
                    <div>
                      <div className="text-gray-500 text-xl">PM 2.5</div>
                      <div className="text-5xl font-bold">
                        {aggregate.pm25}
                        <span className="text-base font-normal ml-1">µg/m³</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <SensorCard label="Temperature" value={aggregate.temp} unit="°C" />
                    <SensorCard label="Humidity" value={aggregate.humidity} unit="%" />
                    <SensorCard label="PM 1" value={aggregate.pm25} unit="µg/m³" />
                    <SensorCard label="PM 10" value={aggregate.pm10} unit="µg/m³" />
                  </div>
                </div>
              </div>

              {/* DEVICE */}
              <div>
                <h2 className="text-lg font-semibold text-center mb-3">
                  {focusedDeviceId || "Device"}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <SensorCard label="PM 1" value={focusedDevice?.sPM2 ?? "--"} unit="µg/m³" />
                    <SensorCard label="PM 10" value={focusedDevice?.sPM10 ?? "--"} unit="µg/m³" />
                    <SensorCard label="Temperature" value={focusedDevice?.temp ?? "--"} unit="°C" />
                    <SensorCard label="Humidity" value={focusedDevice?.rh ?? "--"} unit="%" />
                  </div>

                  <div className="bg-white rounded-xl shadow p-8 flex items-center justify-center text-center">
                    <div>
                      <div className="text-gray-500 text-xl">PM 2.5</div>
                      <div className="text-5xl font-bold">
                        {focusedDevice?.sPM2 ?? "--"}
                        <span className="text-base font-normal ml-1">µg/m³</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* ---------------- BACK SIDE (CHART) ---------------- */}
            <div className="bg-white rounded-xl shadow p-3 h-[420px]">
              <div className="flex justify-between mb-2">
                <h2 className="font-semibold">
                  Device History ({focusedDeviceId})
                </h2>
                <button
                  className="text-blue-600 text-sm"
                  onClick={() => {
                    setFlipped(false);
                    setSelectedDeviceId(null);
                    setAutoRotate(true);
                  }}
                >
                  Back
                </button>
              </div>

              <SensorHistoryChart deviceId={focusedDeviceId} />
            </div>

          </ReactCardFlip>
        </div>


        {showVisualization && (
          <DynamicVisualization data={chartData} />
        )}


      </div>
    </div>
  );
};

const SensorCard = ({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) => (
  <div className="bg-white rounded-xl shadow p-4 text-center">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-2xl font-bold">
      {value}
      {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
    </div>
  </div>
);

const StatusCard = ({
  label,
  value,
  loading,
  color = "blue",
}: {
  label: string;
  value: number;
  loading: boolean;
  color?: "blue" | "green" | "red";
}) => {
  const colorMap = {
    blue: "text-blue-600",
    green: "text-green-600",
    red: "text-red-600",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
      <div className="text-sm text-gray-500 mb-2">{label}</div>

      {loading ? (
        <div className="animate-pulse h-8 w-16 bg-gray-300 rounded" />
      ) : (
        <div className={`text-3xl font-bold ${colorMap[color]}`}>
          {value}
        </div>
      )}
    </div>
  );
};
export default RealtimeDashboardPage;