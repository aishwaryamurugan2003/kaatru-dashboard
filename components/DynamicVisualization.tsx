import React, { useState } from "react";
import {
  LineChart, Line,
  BarChart, Bar,
  ComposedChart,
  PieChart, Pie, Cell,
  RadarChart, Radar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer
} from "recharts";

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
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  }

  function selectAll() {
    setYAxes(fields.map((f) => f.value));
  }

  function clearAll() {
    setYAxes([]);
  }

  // Pie data per device
  const pieData =
    chartType === "pie" && selectedDevice
      ? fields.map((f) => {
          const device = data.find((d) => d.device === selectedDevice);
          return {
            name: f.label,
            value: device?.[f.value] || 0,
          };
        })
      : data;

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

        {/* Select All / Clear */}
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
        <ResponsiveContainer>
          <>
            {/* LINE */}
            {chartType === "line" && (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="device" />
                <YAxis />
                <Tooltip />
                <Legend />
                {yAxes.map((axis, i) => (
                  <Line
                    key={axis}
                    type="monotone"
                    dataKey={axis}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    isAnimationActive
                  />
                ))}
              </LineChart>
            )}

            {/* BAR */}
            {chartType === "bar" && (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="device" />
                <YAxis />
                <Tooltip />
                <Legend />
                {yAxes.map((axis, i) => (
                  <Bar
                    key={axis}
                    dataKey={axis}
                    fill={COLORS[i % COLORS.length]}
                    isAnimationActive
                  />
                ))}
              </BarChart>
            )}

            {/* COMPOSED */}
            {chartType === "composed" && (
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="device" />
                <YAxis />
                <Tooltip />
                <Legend />
                {yAxes.map((axis, i) => (
                  <Line
                    key={axis}
                    type="monotone"
                    dataKey={axis}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    isAnimationActive
                  />
                ))}
              </ComposedChart>
            )}

            {/* PIE (device → metrics donut) */}
            {chartType === "pie" && selectedDevice && (
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}   // donut effect
                  outerRadius={110}
                  label
                  isAnimationActive
                >
                  {pieData.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            )}

            {/* RADAR */}
            {chartType === "radar" && (
              <RadarChart data={data}>
                <PolarGrid />
                <PolarAngleAxis dataKey="device" />
                <PolarRadiusAxis />
                {yAxes.map((axis, i) => (
                  <Radar
                    key={axis}
                    dataKey={axis}
                    stroke={COLORS[i % COLORS.length]}
                    fill={COLORS[i % COLORS.length]}
                    fillOpacity={0.4}
                    isAnimationActive
                  />
                ))}
                <Legend />
              </RadarChart>
            )}
          </>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
