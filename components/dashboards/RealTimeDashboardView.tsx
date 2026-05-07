import React, { useMemo } from "react";
import Plot from "react-plotly.js";
import RealtimeMapAll from "../RealtimeMapAll";
import HeatMapLeaflet from "../HeatMapLeaflet";
import { useRealtimeDevices } from "../../hooks/useRealtimeDevices";
import { commonPlotlyConfig } from "../../utils/plotlyConfig";

interface RealTimeDashboardViewProps {
  groupId: string;
  devices: string[];
  headerNode?: React.ReactNode;
  timeFilter?: string;
}

/* ─── HALF-GAUGE via Plotly pie ─── */
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

  const traces: Plotly.Data[] = [
    {
      type: "pie",
      values: [percentage, 1 - percentage],
      labels: ["Active", ""],
      marker: { colors: ["#22c55e", "#e5e7eb"] },
      hole: 0.6,
      rotation: 90,
      direction: "clockwise",
      showlegend: false,
      textinfo: "none",
      hoverinfo: "skip",
    },
  ];

  return (
    <div className="bg-white border rounded-xl p-4 h-[220px] relative">
      {/* TITLE */}
      <h3 className="text-sm font-medium text-gray-500 absolute top-3 left-4">{label}</h3>

      <Plot
        data={traces}
        layout={{
          margin: { t: 30, r: 0, b: 0, l: 0 },
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          showlegend: false,
        }}
        useResizeHandler
        style={{ width: "100%", height: "100%" }}
        config={{ ...commonPlotlyConfig, displayModeBar: false, staticPlot: true }}
      />

      {/* VALUE overlay */}
      <div className="absolute inset-0 flex items-center justify-center mt-6 pointer-events-none">
        <span className="text-4xl font-semibold text-green-500">{value}</span>
      </div>
    </div>
  );
};

/* ─── Main View ─── */
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
      if (!d) { inactive[id] = null; return; }
      const lastSeen = Number(d.srvtime || 0);
      if (now - lastSeen <= ACTIVE_THRESHOLD) { active[id] = d; }
      else { inactive[id] = d; }
    });

    return { activeMap: active, inactiveMap: inactive };
  }, [devices, selectedDevices]);

  const activeCount = Object.keys(activeMap).length;
  const inactiveCount = Object.keys(inactiveMap).length;

  const heatmapData = useMemo(() =>
    Object.values(filteredDevices)
      .filter((d: any) => d?.lat && d?.lon && d?.sPM2 !== undefined)
      .map((d: any) => ({
        lat: d.lat,
        long: d.lon,
        lng: d.lon,
        dTS: Date.now(),
        sPM2: Number(d.sPM2) || 0,
        device: d.id,
      })),
  [filteredDevices]);

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      {headerNode}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">

        {/* MAP */}
        <div className="bg-white border rounded-xl p-4 h-[500px] flex flex-col">
          <h2 className="text-sm font-medium text-gray-500 mb-2">Coordinates of the devices</h2>
          <div className="flex-1 rounded overflow-hidden">
            <RealtimeMapAll devices={filteredDevices} />
          </div>
        </div>

        {/* HEATMAP */}
        <div className="bg-white border rounded-xl p-4 h-[500px] flex flex-col">
          <h2 className="text-sm font-medium text-gray-500 mb-2">Heatmap of PM2.5</h2>
          <div className="flex-1 rounded overflow-hidden">
            <HeatMapLeaflet data={heatmapData} loading={false} />
          </div>
        </div>

        {/* ACTIVE */}
        <div className="flex flex-col gap-4">
          <HalfGauge
            value={activeCount}
            max={selectedDevices.length || 10}
            label="Number of active devices"
          />
          <div className="bg-white border rounded-xl p-4 flex-1 overflow-auto max-h-[352px]">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Table of active devices</h3>
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-gray-500 pb-2">dID</th></tr></thead>
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

        {/* INACTIVE */}
        <div className="flex flex-col gap-4">
          <HalfGauge
            value={inactiveCount}
            max={selectedDevices.length || 10}
            label="Number of inactive devices"
          />
          <div className="bg-white border rounded-xl p-4 flex-1 overflow-auto max-h-[352px]">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Table of inactive devices</h3>
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-gray-500 pb-2">dID</th></tr></thead>
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