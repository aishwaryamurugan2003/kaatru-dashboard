import React, { useMemo } from "react";
import RealtimeMapAll from "../RealtimeMapAll";
import HeatMapLeaflet from "../HeatMapLeaflet";
import { useRealtimeDevices } from "../../hooks/useRealtimeDevices";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

interface RealTimeDashboardViewProps {
  groupId: string;
  devices: string[];
  headerNode?: React.ReactNode;
}

/* ---------------- HALF GAUGE ---------------- */
const HalfGauge = ({
  value,
  max = 10,
  label,
}: {
  value: number;
  max?: number;
  label: string;
}) => {
  const percentage = Math.min(value / max, 1);

  const data = [
    { name: "value", value: percentage },
    { name: "rest", value: 1 - percentage },
  ];

  return (
    <div className="bg-white border rounded-xl p-4 h-[220px] relative">

      {/* TITLE */}
      <h3 className="text-sm font-medium text-gray-500 absolute top-3 left-4">
        {label}
      </h3>

      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            startAngle={180}
            endAngle={0}
            cx="50%"
            cy="70%"
            innerRadius="60%"
            outerRadius="85%"
            dataKey="value"
            stroke="none"
          >
            <Cell fill="#22c55e" />
            <Cell fill="#e5e7eb" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* VALUE */}
      <div className="absolute inset-0 flex items-center justify-center mt-6">
        <span className="text-4xl font-semibold text-green-500">
          {value}
        </span>
      </div>
    </div>
  );
};

export default function RealTimeDashboardView({
  groupId,
  devices: selectedDevices,
  headerNode,
}: RealTimeDashboardViewProps) {

  const devices = useRealtimeDevices(groupId, selectedDevices || []);

  const filteredDevices = useMemo(() => {
    if (!selectedDevices?.length) return devices;
    const result: Record<string, any> = {};
    Object.entries(devices).forEach(([id, data]) => {
      if (selectedDevices.includes(id)) result[id] = data;
    });
    return result;
  }, [devices, selectedDevices]);

  const ACTIVE_THRESHOLD = 60 * 1000;

  const { activeMap, inactiveMap } = useMemo(() => {
    const now = Date.now();
    const active: Record<string, any> = {};
    const inactive: Record<string, any> = {};

    selectedDevices.forEach((id) => {
      const d = devices[id];
      if (!d) {
        inactive[id] = null;
        return;
      }

      const lastSeen = Number(d.srvtime || 0);

      if (now - lastSeen <= ACTIVE_THRESHOLD) {
        active[id] = d;
      } else {
        inactive[id] = d;
      }
    });

    return { activeMap: active, inactiveMap: inactive };
  }, [devices, selectedDevices]);

  const activeCount = Object.keys(activeMap).length;
  const inactiveCount = Object.keys(inactiveMap).length;

  const heatmapData = useMemo(() => {
    return Object.values(filteredDevices)
      .filter((d: any) => d?.lat && d?.lon && d?.sPM2 !== undefined)
      .map((d: any) => ({
        lat: d.lat,
        long: d.lon,          // ✅ REQUIRED (not lng)
        lng: d.lon,           // (optional but safe)
        dTS: Date.now(),      // ✅ REQUIRED timestamp
        sPM2: Number(d.sPM2) || 0,
        device: d.id,
      }));
  }, [filteredDevices]);

  return (
    <div className="flex flex-col gap-6 w-full h-full">

      {/* HEADER */}
      {headerNode}

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">

        {/* MAP */}
        <div className="bg-white border rounded-xl p-4 h-[500px] flex flex-col">
          <h2 className="text-sm font-medium text-gray-500 mb-2">
            Coordinates of the devices
          </h2>
          <div className="flex-1 rounded overflow-hidden">
            <RealtimeMapAll devices={filteredDevices} />
          </div>
        </div>

        {/* HEATMAP */}
        <div className="bg-white border rounded-xl p-4 h-[500px] flex flex-col">
          <h2 className="text-sm font-medium text-gray-500 mb-2">
            Heatmap of PM2.5
          </h2>
          <div className="flex-1 rounded overflow-hidden">
            <HeatMapLeaflet data={heatmapData} loading={false} />
          </div>
        </div>

        {/* ACTIVE SECTION */}
        <div className="flex flex-col gap-4">

          <HalfGauge
            value={activeCount}
            max={selectedDevices.length || 10}
            label="Number of active devices"
          />

          <div className="bg-white border rounded-xl p-4 flex-1 overflow-auto max-h-[352px]">
            <h3 className="text-sm font-medium text-gray-500 mb-3">
              Table of active devices
            </h3>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-gray-500 pb-2">dID</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(activeMap).map((id) => (
                  <tr key={id} className="border-b hover:bg-gray-50">
                    <td className="py-2">{id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* INACTIVE SECTION */}
        <div className="flex flex-col gap-4">

          <HalfGauge
            value={inactiveCount}
            max={selectedDevices.length || 10}
            label="Number of inactive devices"
          />

          <div className="bg-white border rounded-xl p-4 flex-1 overflow-auto max-h-[352px]">
            <h3 className="text-sm font-medium text-gray-500 mb-3">
              Table of inactive devices
            </h3>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-gray-500 pb-2">dID</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(inactiveMap).map((id) => (
                  <tr key={id} className="border-b hover:bg-gray-50">
                    <td className="py-2">{id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}