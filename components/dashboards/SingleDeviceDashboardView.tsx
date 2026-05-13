import React, { useEffect, useState, useMemo } from "react";
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

/* ─── Helpers ─── */
function getMaxIntervalSeconds(timeFilter?: string): number {
  switch (timeFilter) {
    case "5M": return 60;
    case "15M": return 120;
    case "1H": return 600;
    case "3H": return 3600 * 4;
    case "5H": return 3600 * 6;
    case "1D": return 3600 * 24;
    default: return 3600 * 24;
  }
}

function formatSeconds(sec: number): string {
  // FIX: guard NaN/Infinity — was showing "NaNs" in interval column
  if (!isFinite(sec) || isNaN(sec)) return "—";
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return `${sec}s`;
}

function extractRecords(res: any, deviceId: string): any[] {
  if (!res) return [];

  const dataArray = Array.isArray(res.data) ? res.data : [];

  if (dataArray.length === 0) {
    console.warn(`[SDD] Empty data array for ${deviceId}`);
    return [];
  }

  // Try to find entry matching deviceId
  let deviceEntry = dataArray.find(
    (entry: any) =>
      entry.dID?.toLowerCase() === deviceId.toLowerCase() ||
      entry.device_id?.toLowerCase() === deviceId.toLowerCase()
  );

  // Fallback to first entry
  if (!deviceEntry) {
    console.warn(
      `[SDD] No dID match for "${deviceId}". ` +
      `Available: [${dataArray.map((e: any) => e.dID).join(", ")}]. ` +
      `Using first entry.`
    );
    deviceEntry = dataArray[0];
  }

  if (deviceEntry?.status !== 200) {
    console.warn(`[SDD] Status ${deviceEntry?.status} for ${deviceId} — skipping`);
    return [];
  }

  const records = Array.isArray(deviceEntry?.data) ? deviceEntry.data : [];
  console.log(`[SDD] ${deviceId}: ${records.length} records loaded`);

  // DEBUG: reveals the real packet-ID field name in your API response
  if (records.length > 0) {
    console.log("[SDD] First record keys:", Object.keys(records[0]));
    console.log("[SDD] First record sample:", records[0]);
  }

  return records;
}

/* ─── Main View ─── */
export default function SingleDeviceDashboardView({
  groupId,
  devices,
  headerNode,
  timeFilter,
}: SingleDeviceDashboardViewProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const deviceId = devices.length > 0 ? devices[0] : null;

  useEffect(() => {
    async function loadHistory() {
      if (!deviceId) return;

      setError(null);
      setDebugInfo(null);
      setHistory([]);

      try {
        setLoading(true);
        const res = await apiService.fetchSensorHistory(deviceId, timeFilter || "15M");

        // Capture debug info to show in UI if data is empty
        const dataArray = Array.isArray(res?.data) ? res.data : [];
        const availableDevices = dataArray.map((e: any) => e.dID || e.device_id || "unknown").join(", ");
        const availableStatuses = dataArray.map((e: any) => `${e.dID}:${e.status}`).join(", ");

        setDebugInfo(
          `Response devices: [${availableDevices}] | Statuses: [${availableStatuses}]`
        );

        const records = extractRecords(res, deviceId);
        records.sort((a: any, b: any) => a.srvtime - b.srvtime);
        setHistory(records);

        if (records.length === 0) {
          setError(
            `No data for "${deviceId}" in the selected time range. ` +
            `API returned devices: [${availableDevices}]`
          );
        }
      } catch (err: any) {
        console.error("[SDD] FETCH ERROR:", err);
        setError(`Failed to load "${deviceId}": ${err?.message || "Unknown error"}`);
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
    const maxIntervalSec = getMaxIntervalSeconds(timeFilter);

    if (history.length > 0) {
      temp = history[history.length - 1]?.temp || 0;

      for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1];
        const curr = history[i];

        // FIX: try all common field names — check console "[SDD] First record keys"
        // to find your API's real field name and add it here if missing
        const prevPid =
          prev.packetId ?? prev.pid ?? prev.pktId ?? prev.packet_id ??
          prev.seq ?? prev.seqNum ?? prev.sequence ?? null;
        const currPid =
          curr.packetId ?? curr.pid ?? curr.pktId ?? curr.packet_id ??
          curr.seq ?? curr.seqNum ?? curr.sequence ?? null;

        if (prevPid !== null && currPid !== null) {
          const diff = currPid - prevPid;
          if (diff > 1) missing += diff - 1;
          if (diff < -100) rst += 1;
        }

        // srvtime is in milliseconds — divide by 1000 to get seconds for interval
        const t = Math.abs(curr.srvtime - prev.srvtime) / 1000;

        const rounded = Math.round(t);

        if (rounded > 0 && rounded <= maxIntervalSec) {
          intervalMap[rounded] = (intervalMap[rounded] || 0) + 1;
        }

        packets.push({
          timestamp: curr.srvtime,
          packetId: currPid ?? i,
          intervalRaw: rounded,
        });
      }
    }

    const intervalCounts = Object.keys(intervalMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map((k) => ({ interval: formatSeconds(k), count: intervalMap[k] }));

    return {
      packetsTable: packets.reverse(),
      missingPackets: missing,
      restarts: rst,
      intervalCounts,
      latestTemp: temp,
    };
  }, [history, timeFilter]);

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

      {loading && (
        <div className="text-center text-blue-500 py-4">
          Loading data for {deviceId}...
        </div>
      )}

      {!loading && error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800 text-sm space-y-1">
          <div className="font-medium">{error}</div>
          {debugInfo && (
            <div className="text-xs text-yellow-600 font-mono">{debugInfo}</div>
          )}
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── 1. TABLE ── */}
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
                  {packetsTable.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center text-gray-400 py-6">
                        No records to display
                      </td>
                    </tr>
                  ) : (
                    packetsTable.map((row, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td>{new Date(row.timestamp).toLocaleString()}</td>
                        <td className="text-right">{row.packetId}</td>
                        <td className="text-right">{formatSeconds(row.intervalRaw)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="text-sm text-gray-500 mt-2">Count: {packetsTable.length}</div>
          </div>

          {/* ── 2. MISSING PACKETS GAUGE ── */}
          <div className="bg-white border rounded-xl h-[300px]">
            <PlotlyGauge value={missingPackets} label="Number of missing packets" />
          </div>

          {/* ── 3. RESTARTS GAUGE ── */}
          <div className="bg-white border rounded-xl h-[300px]">
            <PlotlyGauge value={restarts} label="Number of restarts" />
          </div>

          {/* ── 4. BAR — number of packets in each interval ── */}
          <div className="bg-white border rounded-xl p-4 h-[300px]">
            <h2 className="text-sm font-medium text-gray-500 mb-3">
              Number of packets in each interval
            </h2>
            {intervalCounts.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No interval data available
              </div>
            ) : (
              <Plot
                data={[
                  {
                    x: intervalCounts.map((d) => d.interval),
                    y: intervalCounts.map((d) => d.count),
                    type: "bar",
                    marker: { color: "#3b82f6" },
                    hovertemplate: "Interval %{x}<br>Count: %{y}<extra></extra>",
                  },
                ]}
                layout={{
                  margin: { t: 10, r: 10, b: 40, l: 40 },
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                  xaxis: { showgrid: false, tickfont: { size: 12 }, type: "category" },
                  yaxis: { showgrid: true, gridcolor: "#f3f4f6" },
                  showlegend: false,
                  dragmode: "zoom",
                }}
                useResizeHandler
                style={{ width: "100%", height: "calc(100% - 32px)" }}
                config={{ ...commonPlotlyConfig, responsive: true }}
              />
            )}
          </div>

          {/* ── 5. TEMPERATURE GAUGE ── */}
          <div className="bg-white border rounded-xl h-[300px]">
            <PlotlyGauge
              value={Math.round(latestTemp * 100) / 100}
              min={0}
              max={60}
              label="Temperature"
              unit="°C"
              color="#f97316"
            />
          </div>

          {/* ── 6. LINE — sPM2 ── */}
          <div className="bg-white border rounded-xl p-4 h-[300px]">
            <h2 className="text-sm font-medium text-gray-500 mb-3">sPM2</h2>
            {history.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No data available
              </div>
            ) : (
              <Plot
                data={[
                  {
                    // FIX: filter null srvtime to prevent toISOString() crash
                    x: history.filter((d) => d.srvtime != null).map((d) => new Date(d.srvtime).toISOString()),
                    y: history.filter((d) => d.srvtime != null).map((d) => d.sPM2),
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
                  xaxis: { showgrid: true, gridcolor: "#f3f4f6", type: "date" },
                  yaxis: { showgrid: true, gridcolor: "#f3f4f6" },
                  showlegend: false,
                  dragmode: "zoom",
                }}
                useResizeHandler
                style={{ width: "100%", height: "calc(100% - 32px)" }}
                config={{ ...commonPlotlyConfig, responsive: true }}
              />
            )}
          </div>

        </div>
      )}
    </div>
  );
}