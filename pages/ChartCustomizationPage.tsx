import React, { useEffect, useState } from "react";
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  RadarChart, Radar,
  ComposedChart,
  ScatterChart, Scatter,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer
} from "recharts";
import { mockApiResponse, convertToChartData } from "../services/mockDevices";


type ChartConfig = {
  id: string;
  type: string;
  xKey: string;
  yKey: string;
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
const mockDevices = convertToChartData(mockApiResponse);
const fields = ["device", "srvtime", "sPM2", "sPM1", "sPM10", "temp", "rh"];

/* ---------------- CHART RENDERER ---------------- */
function RenderChart({ config }: { config: ChartConfig }) {
  const { type, xKey, yKey } = config;

  const isCategory = xKey === "device";
  const isTime = xKey === "srvtime";


  return (
    <div className="bg-white rounded-xl shadow p-4 h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <>
          {type === "line" && (
            <LineChart data={mockDevices}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
  dataKey={xKey}
  type={isCategory ? "category" : "number"}
  tickFormatter={(value) =>
    isTime
      ? new Date(value).toLocaleTimeString()
      : value
  }
/>

              <YAxis />
              <Tooltip />
              <Legend />
              <Line dataKey={yKey} stroke="#3b82f6" />
            </LineChart>
          )}

          {type === "bar" && (
            <BarChart data={mockDevices}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
  dataKey={xKey}
  type={isCategory ? "category" : "number"}
  tickFormatter={(value) =>
    isTime
      ? new Date(value).toLocaleTimeString()
      : value
  }
/>

              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yKey} fill="#10b981" />
            </BarChart>
          )}

          {type === "pie" && (
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie
                data={mockDevices}
                dataKey={yKey}
                nameKey={xKey}
                outerRadius={100}
              >
                {mockDevices.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          )}

          {type === "scatter" && (
  <ScatterChart>
    <CartesianGrid />
    <XAxis
      type="number"
      dataKey={xKey}
      tickFormatter={(value) =>
        isTime
          ? new Date(value).toLocaleTimeString()
          : value
      }
    />
    <YAxis type="number" dataKey={yKey} />
    <Tooltip
      labelFormatter={(value) =>
        isTime
          ? new Date(value).toLocaleString()
          : value
      }
    />
    <Scatter data={mockDevices} fill="#f59e0b" />
  </ScatterChart>
)}


          {type === "composed" && (
            <ComposedChart data={mockDevices}>
              <CartesianGrid strokeDasharray="3 3" />
             <XAxis
  dataKey={xKey}
  type={isCategory ? "category" : "number"}
  tickFormatter={(value) =>
    isTime
      ? new Date(value).toLocaleTimeString()
      : value
  }
/>

              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yKey} fill="#10b981" />
              <Line dataKey={yKey} stroke="#ef4444" />
            </ComposedChart>
          )}

          {type === "radar" && (
            <RadarChart data={mockDevices}>
              <PolarGrid />
              <PolarAngleAxis dataKey={xKey} />
              <PolarRadiusAxis />
              <Radar dataKey={yKey} fill="#3b82f6" fillOpacity={0.5} />
              <Legend />
            </RadarChart>
          )}
        </>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------- MAIN PAGE ---------------- */
export default function ChartCustomizationPage() {
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState("line");
  const [xKey, setXKey] = useState("device");
  const [yKey, setYKey] = useState("sPM2");

  /* Load from localStorage */
  useEffect(() => {
    const saved = localStorage.getItem("customCharts");
    if (saved) setCharts(JSON.parse(saved));
  }, []);

  /* Save to localStorage */
  useEffect(() => {
    localStorage.setItem("customCharts", JSON.stringify(charts));
  }, [charts]);

function addChart() {
  // Pie chart must use category
  if (type === "pie" && xKey !== "device") {
    alert("Pie chart requires 'device' as X-axis");
    return;
  }

  // Scatter requires numeric X-axis
  if (type === "scatter" && xKey === "device") {
    alert("Scatter chart requires numeric X-axis");
    return;
  }

  const newChart: ChartConfig = {
    id: Date.now().toString(),
    type,
    xKey,
    yKey,
  };

  setCharts((prev) => [...prev, newChart]);
  setShowAdd(false);
}



  function removeChart(id: string) {
    setCharts((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="p-6 space-y-6">

      {/* Add button */}
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        onClick={() => setShowAdd(true)}
      >
        + Add Chart
      </button>

      {/* Add chart panel */}
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

          {/* X Axis selector */}
          <select value={xKey} onChange={(e) => setXKey(e.target.value)}>
            {fields.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          {/* Y Axis selector */}
          <select value={yKey} onChange={(e) => setYKey(e.target.value)}>
            {fields.map((f) => (
              <option key={f} value={f} disabled={f === xKey}>
                {f}
              </option>
            ))}
          </select>

          <button
            className="bg-green-600 text-white px-3 py-1 rounded"
            onClick={addChart}
          >
            Add
          </button>
        </div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {charts.map((chart) => (
          <div key={chart.id} className="relative">
            <button
              onClick={() => removeChart(chart.id)}
              className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 text-xs rounded"
            >
              ✕
            </button>
            <RenderChart config={chart} />
          </div>
        ))}
      </div>
    </div>
  );
}
