import React, { useEffect, useState, useMemo, useCallback } from "react";
import Plot from "react-plotly.js";
import { apiService } from "../../services/api";
import { commonPlotlyConfig } from "../../utils/plotlyConfig";

interface SingleDeviceDashboardViewProps {
  groupId: string;
  devices: string[];
  headerNode?: React.ReactNode;
  timeFilter?: string;
}

/* ─── HALF-GAUGE via Plotly ─── */
const PlotlyGauge = ({
  value,
  min = 0,
  max = 100,
  color = "#22c55e",
  label = "",
  unit = "",
}: {
  value: number;
  min?: number;
  max?: number;
  color?: string;
  label?: string;
  unit?: string;
}) => {
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);

  const traces: Plotly.Data[] = [
    {
      type: "pie",
      values: [percentage, 1 - percentage],
      labels: [label, ""],
      marker: { colors: [color, "#e5e7eb"] },
      hole: 0.6,
      rotation: 90,
      direction: "clockwise",
      showlegend: false,
      textinfo: "none",
      hoverinfo: "skip",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full relative p-4">
      <div className="absolute top-4 left-4">
        <h3 className="text-sm font-medium text-gray-500">{label}</h3>
      </div>

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

      <div className="absolute text-center mt-8 pointer-events-none">
        <span className="text-4xl font-semibold text-gray-800">{value}</span>
        {unit && <span className="text-gray-500 ml-1">{unit}</span>}
      </div>
    </div>
  );
};

/* ─── Main View ─── */
export default function SingleDeviceDashboardView({
  groupId,
  devices,
  headerNode,
  timeFilter,
}: SingleDeviceDashboardViewProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const deviceId = devices.length > 0 ? devices[0] : null;

  useEffect(() => {
    async function loadHistory() {
      if (!deviceId) return;
      try {
        setLoading(true);
        // ✅ Uses the improved fetchSensorHistory with filter support
        const res = await apiService.fetchSensorHistory(deviceId, timeFilter || "15M");
        const data = Array.isArray(res) ? res : (res?.data || []);
        setHistory(data);
      } catch (err) {
        console.error("HISTORY FETCH ERROR:", err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [deviceId, timeFilter]);

  const { packetsTable, missingPackets, restarts, intervalCounts, latestTemp } = useMemo(() => {
    let missing = 0;
    let rst = 0;
    let temp = 0;
    const packets: any[] = [];
    const intervalMap: Record<number, number> = {};

    if (history.length > 0) {
      temp = history[history.length - 1]?.temp || 0;
      for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1];
        const curr = history[i];
        const diff = (curr.packetId || curr.pid || 0) - (prev.packetId || prev.pid || 0);
        if (diff > 1) missing += diff - 1;
        if (diff < -100) rst += 1;
        const t = Math.abs(new Date(curr.srvtime).getTime() - new Date(prev.srvtime).getTime()) / 1000;
        const rounded = Math.round(t);
        if (rounded > 0 && rounded < 300) {
          intervalMap[rounded] = (intervalMap[rounded] || 0) + 1;
        }
        packets.push({ timestamp: curr.srvtime, packetId: curr.packetId || curr.pid || i, interval: rounded });
      }
    }

    return {
      packetsTable: packets.reverse(),
      missingPackets: missing,
      restarts: rst,
      intervalCounts: Object.keys(intervalMap).map((k) => ({
        interval: k,
        count: intervalMap[Number(k)],
      })),
      latestTemp: temp,
    };
  }, [history]);

  if (!deviceId) {
    return (
      <div className="p-6 bg-white rounded-xl border">
        <span className="text-gray-500">Please select a device</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {headerNode}

      {loading && <div className="text-center text-blue-500">Loading...</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* TABLE */}
        <div className="bg-white border rounded-xl p-4 h-[300px] flex flex-col">
          <h2 className="text-sm font-medium text-gray-500 mb-2">
            Table of Packet ids within each interval
          </h2>
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-gray-500 pb-2">Timestamp {deviceId}</th>
                  <th className="text-right text-gray-500 pb-2">Packet ID</th>
                  <th className="text-right text-gray-500 pb-2">Interval</th>
                </tr>
              </thead>
              <tbody>
                {packetsTable.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td>{new Date(row.timestamp).toLocaleString()}</td>
                    <td className="text-right">{row.packetId}</td>
                    <td className="text-right">{row.interval}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-sm text-gray-500 mt-2">Count: {packetsTable.length}</div>
        </div>

        {/* MISSING PACKETS GAUGE */}
        <div className="bg-white border rounded-xl h-[300px]">
          <PlotlyGauge value={missingPackets} label="Number of missing packets" />
        </div>

        {/* RESTARTS GAUGE */}
        <div className="bg-white border rounded-xl h-[300px]">
          <PlotlyGauge value={restarts} label="Number of restarts" />
        </div>

        {/* BAR — intervals */}
        <div className="bg-white border rounded-xl p-4 h-[300px]">
          <h2 className="text-sm font-medium text-gray-500 mb-3">
            Number of packets in each interval
          </h2>
          <Plot
            data={[
              {
                x: intervalCounts.map((d) => d.interval),
                y: intervalCounts.map((d) => d.count),
                type: "bar",
                marker: { color: "#3b82f6" },
                hovertemplate: "Interval %{x}s<br>Count: %{y}<extra></extra>",
              },
            ]}
            layout={{
              margin: { t: 10, r: 10, b: 40, l: 40 },
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              xaxis: { showgrid: false, tickfont: { size: 12 } },
              yaxis: { showgrid: true, gridcolor: "#f3f4f6" },
              showlegend: false,
              dragmode: "zoom",
            }}
            useResizeHandler
            style={{ width: "100%", height: "calc(100% - 32px)" }}
            config={{ ...commonPlotlyConfig, responsive: true }}
          />
        </div>

        {/* TEMP GAUGE */}
        <div className="bg-white border rounded-xl h-[300px]">
          <PlotlyGauge value={latestTemp} label="Temperature" unit="°C" color="#f97316" />
        </div>

        {/* LINE — sPM2 */}
        <div className="bg-white border rounded-xl p-4 h-[300px]">
          <h2 className="text-sm font-medium text-gray-500 mb-3">sPM2</h2>
          <Plot
            data={[
              {
                x: history.map((d) => d.srvtime),
                y: history.map((d) => d.sPM2),
                type: "scatter",
                mode: "lines",
                line: { color: "#3b82f6", width: 2 },
                hovertemplate: "%{x}<br>PM2.5: %{y:.2f}<extra></extra>",
              },
            ]}
            layout={{
              margin: { t: 10, r: 10, b: 40, l: 40 },
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              xaxis: { showgrid: true, gridcolor: "#f3f4f6" },
              yaxis: { showgrid: true, gridcolor: "#f3f4f6" },
              showlegend: false,
              dragmode: "zoom",
            }}
            useResizeHandler
            style={{ width: "100%", height: "calc(100% - 32px)" }}
            config={{ ...commonPlotlyConfig, responsive: true }}
          />
        </div>

      </div>
    </div>
  );
}