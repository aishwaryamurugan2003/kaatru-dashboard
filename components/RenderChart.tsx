import React, { useEffect, useState, useCallback } from "react";
import Plot from "react-plotly.js";
import { fetchSensorData, convertToTimeSeries } from "../services/api";
import { commonPlotlyConfig, customColorButton } from "../utils/plotlyConfig";

function formatTime(value: any): string {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleTimeString();
}

export type ChartConfig = {
  id: string;
  type: string;
  xKey: string;
  yKey: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

/* ─────────────────────────────────────────────────────── */

export function RenderChart({
  config,
  devices,
  measurement = "gurprod",
  timeFilter,
}: {
  config: ChartConfig;
  devices: any[];
  measurement?: string;
  timeFilter?: string;
}) {
  const { type, yKey } = config;

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Legend isolation: map of trace name → true means HIDDEN
  const [hiddenTraces, setHiddenTraces] = useState<Record<string, boolean>>({});
  // Zoom range (undefined = autorange)
  const [xRange, setXRange] = useState<[any, any] | undefined>(undefined);
  const isZoomed = xRange !== undefined;

  const deviceKey = devices.map((d) => d.value).join(",");

  useEffect(() => {
    async function load() {
      if (!yKey || yKey === "device" || devices.length === 0) return;

      setLoading(true);
      try {
        const deviceIds = devices.map((d: any) => d.value);
        const apiResponse = await fetchSensorData({ deviceIds, fields: yKey, measurement, timeFilter });
        const allData = convertToTimeSeries(apiResponse, yKey);
        console.log(`CHART [${yKey}] measurement=${measurement} filter=${timeFilter} → ${allData.length} points`);
        setData(allData);
      } catch (e) {
        console.error("CRITICAL API ERROR", e);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yKey, deviceKey, measurement, timeFilter]);

  const handleRelayout = useCallback((event: any) => {
    if (event["xaxis.range[0]"] !== undefined && event["xaxis.range[1]"] !== undefined) {
      setXRange([event["xaxis.range[0]"], event["xaxis.range[1]"]]);
    } else if (event["xaxis.autorange"] === true) {
      setXRange(undefined);
    }
  }, []);

  const handleLegendClick = useCallback((event: any) => {
    const name: string = event.data[event.curveNumber]?.name ?? "";
    setHiddenTraces((prev) => {
      const alreadyIsolated = Object.values(prev).some(Boolean) && !prev[name];
      if (alreadyIsolated) {
        // second click: un-isolate all
        return {};
      }
      // isolate this trace (hide all others)
      const next: Record<string, boolean> = {};
      devices.forEach((d) => {
        next[d.label] = d.label !== name;
      });
      return next;
    });
    return false; // prevent default Plotly toggle
  }, [devices]);

  /* ── Empty / Loading states ── */
  if (!devices.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        Select device(s)
      </div>
    );
  }
  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 animate-pulse">
        Loading...
      </div>
    );
  }
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        No data available
      </div>
    );
  }

  /* ── Build traces per type ── */
  let traces: Plotly.Data[] = [];
  let extraLayout: Partial<Plotly.Layout> = {};

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

  if (type === "line") {
    traces = devices.map((d, index) => {
      const color = COLORS[index % COLORS.length];
      const deviceData = data.filter((entry) => entry.device === d.value);
      return {
        x: deviceData.map((e) => new Date(e.srvtime)),
        y: deviceData.map((e) => e.value),
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
    traces = devices.map((d, index) => {
      const color = COLORS[index % COLORS.length];
      const deviceData = data.filter((entry) => entry.device === d.value);
      return {
        x: deviceData.map((e) => new Date(e.srvtime)),
        y: deviceData.map((e) => e.value),
        type: "bar" as const,
        name: d.label,
        marker: { color, opacity: 0.85 },
        visible: hiddenTraces[d.label] ? "legendonly" : true as any,
        hovertemplate: `<b>${d.label}</b><br>%{x|%H:%M:%S}<br>%{y:.2f}<extra></extra>`,
      };
    });
    extraLayout = { xaxis: commonXLayout, yaxis: commonYLayout, barmode: "group" };
  }

  if (type === "pie") {
    const pieData = data.map((d) => ({
      name: formatTime(d.srvtime),
      value: typeof d.value === "number" ? d.value : 0,
    }));
    traces = [
      {
        labels: pieData.map((d) => d.name),
        values: pieData.map((d) => d.value),
        type: "pie" as const,
        hole: 0.4,
        marker: { colors: COLORS },
        hovertemplate: "<b>%{label}</b><br>%{value:.2f}<br>%{percent}<extra></extra>",
        textinfo: "label+percent",
      },
    ];
  }

  if (type === "scatter") {
    traces = devices.map((d, index) => {
      const color = COLORS[index % COLORS.length];
      const deviceData = data.filter((entry) => entry.device === d.value);
      return {
        x: deviceData.map((e) => new Date(e.srvtime)),
        y: deviceData.map((e) => e.value),
        type: "scatter" as const,
        mode: "markers" as const,
        name: d.label,
        marker: { color, size: 6 },
        visible: hiddenTraces[d.label] ? "legendonly" : true as any,
        hovertemplate: `<b>${d.label}</b><br>%{x|%H:%M:%S}<br>%{y:.2f}<extra></extra>`,
      };
    });
    extraLayout = { xaxis: commonXLayout, yaxis: commonYLayout };
  }

  if (type === "composed") {
    const allX = data.map((e) => new Date(e.srvtime));
    const allY = data.map((e) => e.value ?? 0);
    traces = [
      {
        x: allX,
        y: allY,
        type: "bar" as const,
        name: yKey + " (bar)",
        marker: { color: "#10b981", opacity: 0.7 },
        hovertemplate: `%{x|%H:%M:%S}<br>%{y:.2f}<extra>bar</extra>`,
      },
      {
        x: allX,
        y: allY,
        type: "scatter" as const,
        mode: "lines" as const,
        name: yKey + " (line)",
        line: { color: "#3b82f6", width: 2.5 },
        hovertemplate: `%{x|%H:%M:%S}<br>%{y:.2f}<extra>line</extra>`,
      },
    ];
    extraLayout = { xaxis: commonXLayout, yaxis: commonYLayout };
  }

  if (type === "radar") {
    const radarData = data.map((d) => ({
      time: formatTime(d.srvtime),
      value: typeof d.value === "number" ? d.value : 0,
    }));
    traces = [
      {
        type: "scatterpolar" as const,
        r: radarData.map((d) => d.value),
        theta: radarData.map((d) => d.time),
        fill: "toself" as const,
        fillcolor: "#3b82f655",
        name: yKey,
        line: { color: "#3b82f6", width: 2 },
      },
    ];
    extraLayout = { polar: { radialaxis: { visible: true, color: "#6b7280" } } };
  }

  const layout: Partial<Plotly.Layout> = {
    margin: { t: 20, r: 20, b: 40, l: 50 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    showlegend: true,
    legend: {
      orientation: "h",
      y: -0.18,
      font: { size: 12 },
    },
    dragmode: "zoom",
    ...extraLayout,
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 h-[320px] relative transition-all duration-200 hover:shadow-md">
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
          modeBarButtonsToAdd: [customColorButton],
          responsive: true 
        }}
      />
    </div>
  );
}
