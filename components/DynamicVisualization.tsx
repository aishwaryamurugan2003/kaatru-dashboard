import React, { useState } from "react";
import Plot from "react-plotly.js";
import { commonPlotlyConfig } from "../utils/plotlyConfig";

type Props = {
  data: any[];
};

const fields = [
  { label: "PM2.5", value: "sPM2" },
  { label: "PM10", value: "sPM10" },
  { label: "Temperature", value: "temp" },
  { label: "Humidity", value: "rh" },
  { label: "Vcol", value: "vcol" },
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function DynamicVisualization({ data }: Props) {
  const [chartType, setChartType] = useState("line");
  const [yAxes, setYAxes] = useState<string[]>(["sPM2"]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");

  function toggleField(value: string) {
    setYAxes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function selectAll() {
    setYAxes(fields.map((f) => f.value));
  }

  function clearAll() {
    setYAxes([]);
  }

  const devices = data.map((d) => d.device);

  // ---- Build Plotly traces based on chartType ----
  let traces: Plotly.Data[] = [];
  let layout: Partial<Plotly.Layout> = {
    margin: { t: 20, r: 20, b: 60, l: 50 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    showlegend: true,
    legend: { orientation: "h", y: -0.2 },
    xaxis: { showgrid: true, gridcolor: "#f3f4f6" },
    yaxis: { showgrid: true, gridcolor: "#f3f4f6" },
    dragmode: "zoom",
  };

  if (chartType === "line") {
    traces = yAxes.map((axis, i) => ({
      x: devices,
      y: data.map((d) => d[axis] ?? null),
      type: "scatter" as const,
      mode: "lines+markers" as const,
      name: fields.find((f) => f.value === axis)?.label ?? axis,
      line: { color: COLORS[i % COLORS.length], width: 2 },
      marker: { color: COLORS[i % COLORS.length] },
    }));
    layout = { ...layout, xaxis: { ...layout.xaxis, title: { text: "Device" } } };
  }

  if (chartType === "bar") {
    traces = yAxes.map((axis, i) => ({
      x: devices,
      y: data.map((d) => d[axis] ?? null),
      type: "bar" as const,
      name: fields.find((f) => f.value === axis)?.label ?? axis,
      marker: { color: COLORS[i % COLORS.length] },
    }));
    layout = { ...layout, barmode: "group" as const };
  }

  if (chartType === "composed") {
    // composed: first half bars, rest lines
    traces = yAxes.map((axis, i) => {
      const label = fields.find((f) => f.value === axis)?.label ?? axis;
      const color = COLORS[i % COLORS.length];
      if (i % 2 === 0) {
        return {
          x: devices,
          y: data.map((d) => d[axis] ?? null),
          type: "bar" as const,
          name: label,
          marker: { color },
        };
      }
      return {
        x: devices,
        y: data.map((d) => d[axis] ?? null),
        type: "scatter" as const,
        mode: "lines+markers" as const,
        name: label,
        line: { color, width: 2 },
      };
    });
    layout = { ...layout, barmode: "group" as const };
  }

  if (chartType === "pie") {
    const device = data.find((d) => d.device === selectedDevice);
    const pieValues = device
      ? fields.map((f) => ({ name: f.label, value: device[f.value] ?? 0 }))
      : [];
    traces = [
      {
        labels: pieValues.map((p) => p.name),
        values: pieValues.map((p) => p.value),
        type: "pie" as const,
        hole: 0.45,
        marker: { colors: COLORS },
        textinfo: "label+percent",
        hovertemplate: "<b>%{label}</b><br>Value: %{value:.2f}<br>%{percent}<extra></extra>",
      },
    ];
    layout = { ...layout, showlegend: true };
  }

  if (chartType === "radar") {
    traces = yAxes.map((axis, i) => ({
      type: "scatterpolar" as const,
      r: data.map((d) => d[axis] ?? 0),
      theta: devices,
      fill: "toself" as const,
      name: fields.find((f) => f.value === axis)?.label ?? axis,
      line: { color: COLORS[i % COLORS.length] },
      fillcolor: COLORS[i % COLORS.length] + "55",
    }));
    layout = {
      ...layout,
      polar: {
        radialaxis: { visible: true, color: "#6b7280" },
        angularaxis: { color: "#6b7280" },
      },
    };
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow space-y-4">

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">

        {/* Chart type */}
        <select
          className="border p-2 rounded"
          value={chartType}
          onChange={(e) => setChartType(e.target.value)}
        >
          <option value="line">Line Chart</option>
          <option value="bar">Bar Chart</option>
          <option value="composed">Composed Chart</option>
          <option value="pie">Pie Chart</option>
          <option value="radar">Radar Chart</option>
        </select>

        <button
          className="px-3 py-1 bg-blue-500 text-white rounded"
          onClick={selectAll}
        >
          Select All
        </button>

        <button
          className="px-3 py-1 bg-gray-400 text-white rounded"
          onClick={clearAll}
        >
          Clear
        </button>

        {/* Device selector for pie */}
        {chartType === "pie" && (
          <select
            className="border p-2 rounded"
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
          >
            <option value="">Select Device</option>
            {data.map((d) => (
              <option key={d.device} value={d.device}>
                {d.device}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Multi-select checkboxes */}
      {chartType !== "pie" && (
        <div className="flex flex-wrap gap-4">
          {fields.map((f) => (
            <label key={f.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={yAxes.includes(f.value)}
                onChange={() => toggleField(f.value)}
              />
              {f.label}
            </label>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="w-full h-[340px]">
        <Plot
          data={traces}
          layout={layout}
          useResizeHandler
          style={{ width: "100%", height: "100%" }}
          config={{ ...commonPlotlyConfig, responsive: true }}
        />
      </div>
    </div>
  );
}
