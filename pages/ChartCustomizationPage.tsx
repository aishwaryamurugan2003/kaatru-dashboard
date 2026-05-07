import React, { useEffect, useState, useCallback } from "react";
import Select from "react-select";
import Plot from "react-plotly.js";
import { apiService, fetchSensorData, convertToTimeSeries, Endpoint } from "@/services/api";
import { commonPlotlyConfig, customColorButton } from "@/utils/plotlyConfig";

function formatTime(value: any): string {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleTimeString();
}

type ChartConfig = {
  id: string;
  type: string;
  xKey: string;
  yKey: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

const STORAGE_KEY = "customCharts";
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const fields = [
  "device", "srvtime", "sPM2", "sPM1", "sPM10", "temp", "rh",
  "co_ppb", "so2_ppb", "o3_ppb_compensated", "no2_ppb",
  "rs485_data", "sVocI", "k30Co2",
];

/* ─────────────────────────────── CHART RENDERER ─────────────────────────────── */
function RenderChart({ config, devices }: { config: ChartConfig; devices: any[] }) {
  const { type, yKey } = config;

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hiddenTraces, setHiddenTraces] = useState<Record<string, boolean>>({});
  const [xRange, setXRange] = useState<[any, any] | undefined>(undefined);
  const isZoomed = xRange !== undefined;

  useEffect(() => {
    async function load() {
      if (!yKey || yKey === "device" || devices.length === 0) return;
      setLoading(true);
      try {
        const deviceIds = devices.map((d: any) => d.value);
        const apiResponse = await fetchSensorData({
          deviceIds,
          fields: yKey.toLowerCase(),
          interval: "15m",
        });
        setData(convertToTimeSeries(apiResponse, yKey));
      } catch (e) {
        console.error("API ERROR", e);
      }
      setLoading(false);
    }
    load();
  }, [yKey, devices]);

  const handleRelayout = useCallback((event: any) => {
    if (event["xaxis.range[0]"] !== undefined) {
      setXRange([event["xaxis.range[0]"], event["xaxis.range[1]"]]);
    } else if (event["xaxis.autorange"] === true) {
      setXRange(undefined);
    }
  }, []);

  const handleLegendClick = useCallback((event: any) => {
    const name: string = event.data[event.curveNumber]?.name ?? "";
    setHiddenTraces((prev) => {
      const someHidden = Object.values(prev).some(Boolean);
      if (someHidden && !prev[name]) return {};
      const next: Record<string, boolean> = {};
      devices.forEach((d) => { next[d.label] = d.label !== name; });
      return next;
    });
    return false;
  }, [devices]);

  if (!devices.length) return (
    <div className="h-[300px] flex items-center justify-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100 p-4">Select device(s)</div>
  );
  if (loading) return (
    <div className="h-[300px] flex items-center justify-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100 p-4 animate-pulse">Loading...</div>
  );
  if (!data.length) return (
    <div className="flex items-center justify-center h-[300px] text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100 p-4">No data available</div>
  );

  const commonXLayout: Partial<Plotly.LayoutAxis> = {
    type: "date",
    showgrid: true,
    gridcolor: "#f3f4f6",
    tickfont: { color: "#6b7280", size: 12 },
    ...(xRange ? { range: xRange } : { autorange: true }),
  };
  const commonYLayout: Partial<Plotly.LayoutAxis> = {
    autorange: true,
    showgrid: true,
    gridcolor: "#f3f4f6",
    tickfont: { color: "#6b7280", size: 12 },
  };

  let traces: Plotly.Data[] = [];
  let extraLayout: Partial<Plotly.Layout> = {};

  if (type === "line") {
    traces = devices.map((d, i) => {
      const color = COLORS[i % COLORS.length];
      const pts = data.filter((e) => e.device === d.value);
      return {
        x: pts.map((e) => new Date(e.srvtime)),
        y: pts.map((e) => e.value),
        type: "scatter" as const,
        mode: "lines" as const,
        fill: "tozeroy" as const,
        fillcolor: color + "22",
        name: d.label,
        line: { color, width: 2.5 },
        visible: hiddenTraces[d.label] ? "legendonly" : true as any,
        connectgaps: true,
        hovertemplate: `<b>${d.label}</b><br>%{x|%H:%M:%S}<br>%{y:.2f}<extra></extra>`,
      };
    });
    extraLayout = { xaxis: commonXLayout, yaxis: commonYLayout };
  }

  if (type === "bar") {
    traces = devices.map((d, i) => {
      const pts = data.filter((e) => e.device === d.value);
      return {
        x: pts.map((e) => new Date(e.srvtime)),
        y: pts.map((e) => e.value),
        type: "bar" as const,
        name: d.label,
        marker: { color: COLORS[i % COLORS.length] },
        visible: hiddenTraces[d.label] ? "legendonly" : true as any,
        hovertemplate: `<b>${d.label}</b><br>%{x|%H:%M:%S}<br>%{y:.2f}<extra></extra>`,
      };
    });
    if (!traces.length) {
      traces = [{ x: data.map((e) => new Date(e.srvtime)), y: data.map((e) => e.value), type: "bar", marker: { color: "#10b981" } }];
    }
    extraLayout = { xaxis: commonXLayout, yaxis: commonYLayout, barmode: "group" };
  }

  if (type === "pie") {
    const pieData = data.map((d) => ({ name: formatTime(d.srvtime), value: d[yKey] ?? 0 }));
    traces = [{
      labels: pieData.map((p) => p.name),
      values: pieData.map((p) => p.value),
      type: "pie" as const,
      hole: 0.4,
      marker: { colors: COLORS },
      hovertemplate: "<b>%{label}</b><br>%{value:.2f}<br>%{percent}<extra></extra>",
    }];
  }

  if (type === "scatter") {
    traces = devices.map((d, i) => {
      const pts = data.filter((e) => e.device === d.value);
      return {
        x: pts.map((e) => new Date(e.srvtime)),
        y: pts.map((e) => e.value),
        type: "scatter" as const,
        mode: "markers" as const,
        name: d.label,
        marker: { color: COLORS[i % COLORS.length], size: 6 },
        visible: hiddenTraces[d.label] ? "legendonly" : true as any,
        hovertemplate: `<b>${d.label}</b><br>%{x|%H:%M:%S}<br>%{y:.2f}<extra></extra>`,
      };
    });
    if (!traces.length) {
      traces = [{ x: data.map((e) => new Date(e.srvtime)), y: data.map((e) => e.value), type: "scatter", mode: "markers", marker: { color: "#f59e0b", size: 6 } }];
    }
    extraLayout = { xaxis: commonXLayout, yaxis: commonYLayout };
  }

  if (type === "composed") {
    const allX = data.map((e) => new Date(e.srvtime));
    const allY = data.map((e) => e.value ?? 0);
    traces = [
      { x: allX, y: allY, type: "bar" as const, name: yKey + " (bar)", marker: { color: "#10b981", opacity: 0.7 } },
      { x: allX, y: allY, type: "scatter" as const, mode: "lines" as const, name: yKey + " (line)", line: { color: "#3b82f6", width: 2.5 } },
    ];
    extraLayout = { xaxis: commonXLayout, yaxis: commonYLayout };
  }

  if (type === "radar") {
    const radarData = data.map((d) => ({ time: formatTime(d.srvtime), value: d[yKey] ?? 0 }));
    traces = [{
      type: "scatterpolar" as const,
      r: radarData.map((d) => d.value),
      theta: radarData.map((d) => d.time),
      fill: "toself" as const,
      fillcolor: "#3b82f655",
      name: yKey,
      line: { color: "#3b82f6", width: 2 },
    }];
    extraLayout = { polar: { radialaxis: { visible: true, color: "#6b7280" } } };
  }

  const layout: Partial<Plotly.Layout> = {
    margin: { t: 20, r: 20, b: 40, l: 50 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    showlegend: true,
    legend: { orientation: "h", y: -0.18, font: { size: 12 } },
    dragmode: "zoom",
    ...extraLayout,
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-[320px] relative transition-all duration-200 hover:shadow-md">
      {isZoomed && (
        <button
          className="absolute top-2 right-2 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 text-xs rounded border border-blue-200 transition-colors z-10 shadow-sm font-semibold"
          onClick={() => setXRange(undefined)}
        >
          Reset Zoom
        </button>
      )}
      <Plot
        data={traces}
        layout={layout}
        onRelayout={handleRelayout}
        onLegendClick={handleLegendClick as any}
        useResizeHandler
        style={{ width: "100%", height: "100%" }}
        config={{ 
          ...commonPlotlyConfig, 
          editable: true,
          modeBarButtonsToAdd: [customColorButton],
          responsive: true 
        }}
      />
    </div>
  );
}

/* ─────────────────────────────── MAIN PAGE ─────────────────────────────── */
export default function ChartCustomizationPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState("line");
  const [xKey, setXKey] = useState("");
  const [yKey, setYKey] = useState("");

  const [deviceOptions, setDeviceOptions] = useState<any[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<any[]>([]);
  const [groupOptions, setGroupOptions] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);

  useEffect(() => {
    async function loadGroups() {
      try {
        const res = await apiService.getRamanAnalysis(Endpoint.GROUP_ALL);
        if (Array.isArray(res?.data)) {
          setGroupOptions(res.data.map((g: any) => ({ label: g.name, value: g.id })));
        }
      } catch (e) {
        console.error("GROUP FETCH ERROR", e);
      }
    }
    loadGroups();
  }, []);

  useEffect(() => {
    async function loadDevices() {
      if (!selectedGroup) { setDeviceOptions([]); setSelectedDevices([]); return; }
      try {
        const res = await apiService.getRamanAnalysis(Endpoint.GROUP_DEVICES, { id: selectedGroup.value });
        if (res?.data?.devices) {
          setDeviceOptions(res.data.devices.map((d: string) => ({ value: d, label: d })));
        }
      } catch (e) {
        console.error("DEVICE FETCH ERROR", e);
      }
    }
    loadDevices();
  }, [selectedGroup]);

  /* Load charts from localStorage on first render */
  const [charts, setCharts] = useState<ChartConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(charts)); }
    catch (err) { console.error("Failed to save charts", err); }
  }, [charts]);

  function addChart() {
    if (!xKey || !yKey) { alert("Please select both X-axis and Y-axis"); return; }
    if (type === "pie" && xKey !== "device") { alert("Pie chart requires 'device' as X-axis"); return; }
    if (type === "scatter" && xKey === "device") { alert("Scatter chart requires numeric X-axis"); return; }

    const newChart: ChartConfig = {
      id: Date.now().toString(),
      type, xKey, yKey, x: 0, y: Infinity, w: 6, h: 6,
    };
    setCharts((prev) => [...prev, newChart]);
    setShowAdd(false);
    setXKey("");
    setYKey("");
  }

  function removeChart(id: string) {
    setCharts((prev) => prev.filter((c) => c.id !== id));
  }

  function resetCharts() {
    localStorage.removeItem(STORAGE_KEY);
    setCharts([]);
  }

  return (
    <div className="p-6 space-y-6">

      {/* GROUP DROPDOWN */}
      <Select
        options={groupOptions}
        value={selectedGroup}
        onChange={(val) => setSelectedGroup(val)}
        placeholder="Select group..."
      />

      {/* DEVICE DROPDOWN */}
      <Select
        isMulti
        options={deviceOptions}
        value={selectedDevices}
        onChange={(val) => setSelectedDevices([...(val || [])])}
        placeholder="Select devices..."
      />

      <div className="flex gap-3">
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg" onClick={() => setShowAdd(true)}>
          + Add Chart
        </button>
        <button className="bg-gray-500 text-white px-4 py-2 rounded-lg" onClick={resetCharts}>
          Reset Charts
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-4 rounded-xl shadow flex gap-4 items-center">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="line">Line</option>
            <option value="bar">Bar</option>
            <option value="pie">Pie</option>
            <option value="scatter">Scatter</option>
            <option value="composed">Composed</option>
            <option value="radar">Radar</option>
          </select>
          <select value={xKey} onChange={(e) => setXKey(e.target.value)}>
            <option value="">X-axis</option>
            {fields.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={yKey} onChange={(e) => setYKey(e.target.value)}>
            <option value="">Y-axis</option>
            {fields.map((f) => <option key={f} value={f} disabled={f === xKey}>{f}</option>)}
          </select>
          <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={addChart}>
            Add
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {charts.map((chart) => (
          <div key={chart.id} className="relative">
            <button
              onClick={() => removeChart(chart.id)}
              className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 text-xs rounded z-10"
            >
              ✕
            </button>
            <RenderChart config={chart} devices={selectedDevices} />
          </div>
        ))}
      </div>
    </div>
  );
}
