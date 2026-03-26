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
import { mockApiResponse, convertToDeviceSummary, convertToTimeSeries } from "../services/mockDevices";
import { apiService, convertHistoryToTimeSeries } from "@/services/api";
function formatTime(value: any) {
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
  "device",
  "srvtime",
  "sPM2",
  "sPM1",
  "sPM10",
  "temp",
  "rh",
  "co_ppb",
  "so2_ppb",
  "o3_ppb_compensated",
  "no2_ppb",
  "rs485_data",
  "sVocI",
  "k30Co2",
];

/* ---------------- CHART RENDERER ---------------- */
// function RenderChart({ config }: { config: ChartConfig }) {
//   const { type, xKey, yKey } = config;
//   const isTime = xKey === "srvtime";

//   /* ✅ DEFINE DATA HERE */
// const [data, setData] = useState<any[]>([]);

// const [loading, setLoading] = useState(false);

// useEffect(() => {
//   async function load() {
//     if (!yKey || yKey === "device") return;

//     setLoading(true);

//     try {
//       const api = await apiService.fetchSensorHistory("SG36", "15M");
//       const result = convertHistoryToTimeSeries(api, yKey);
//       setData(result);
//     } catch (e) {
//       console.error("API ERROR", e);
//     }

//     setLoading(false);
//   }

//   load();
// }, [yKey]);

// if (!data.length) {
//   return (
//     <div className="flex items-center justify-center h-[300px] text-gray-500">
//       No data available
//     </div>
//   );
// }

//   return (
//     <div className="bg-white rounded-xl shadow p-4 h-[320px]">
//       <ResponsiveContainer width="100%" height={300}>
//         <>

//           {type === "line" && (
//             // <LineChart data={data}>
//             //   <CartesianGrid strokeDasharray="3 3" />
//             //   <XAxis
//             //     dataKey={xKey}
//             //     type={isTime ? "number" : "category"}
//             //     domain={isTime ? ["auto", "auto"] : undefined}
//             //     tickFormatter={(value) =>
//             //       isTime ? formatTime(value) : value
//             //     }
//             //   />
//             //   <YAxis />
//             //   <Tooltip />
//             //   <Legend />
//             //   <Line
//             //     type="monotone"
//             //     dataKey={yKey}
//             //     stroke="#3b82f6"
//             //     strokeWidth={3}
//             //     dot={false}
//             //   />
//             // </LineChart>
//             <LineChart data={data}>
//   <CartesianGrid strokeDasharray="3 3" />

//   <XAxis
//     dataKey="srvtime"
//     type="number"
//     domain={["auto", "auto"]}
//     tickFormatter={(value) => formatTime(value)}
//   />

//   <YAxis />

//   {/* ✅ ADD TOOLTIP HERE */}
//   <Tooltip
//     labelFormatter={(value) => formatTime(value)}
//     formatter={(value: number) => value.toFixed(2)}
//   />

//   <Legend />

//   <Line
//     type="monotone"
//     dataKey={yKey}
//     stroke="#3b82f6"
//     strokeWidth={3}
//     dot={false}
//   />
// </LineChart>
//           )}

//           {type === "bar" && (
//             <BarChart data={data}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey={xKey} />
//               <YAxis />
//               <Tooltip />
//               <Legend />
//               <Bar dataKey={yKey} fill="#10b981" />
//             </BarChart>
//           )}

//           {type === "pie" && (
//             <PieChart>
//               <Tooltip />
//               <Legend verticalAlign="bottom" />
//               <Pie
//                 data={data}
//                 dataKey={yKey}
//                 nameKey={xKey}
//                 cx="50%"
//                 cy="50%"
//                 outerRadius={100}
//               >
//                 {data.map((_, i) => (
//                   <Cell key={i} fill={COLORS[i % COLORS.length]} />
//                 ))}
//               </Pie>
//             </PieChart>
//           )}

//           {type === "scatter" && (
//             <ScatterChart>
//               <CartesianGrid />
//               <XAxis
//                 dataKey={xKey}
//                 type={isTime ? "number" : "category"}
//                 tickFormatter={(value) =>
//                   isTime ? formatTime(value) : value
//                 }
//               />
//               <YAxis dataKey={yKey} />
//               <Tooltip />
//               <Scatter data={data} fill="#f59e0b" />
//             </ScatterChart>
//           )}

//           {type === "composed" && (
//             <ComposedChart data={data}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey={xKey} />
//               <YAxis />
//               <Tooltip />
//               <Legend />
//               <Bar dataKey={yKey} fill="#10b981" />
//               <Line dataKey={yKey} stroke="#3b82f6" />
//             </ComposedChart>
//           )}

//           {type === "radar" && (
//             <RadarChart data={data}>
//               <PolarGrid />
//               <PolarAngleAxis dataKey={xKey} />
//               <PolarRadiusAxis />
//               <Radar dataKey={yKey} fill="#3b82f6" fillOpacity={0.5} />
//               <Legend />
//             </RadarChart>
//           )}

//         </>
//       </ResponsiveContainer>
//     </div>
//   );
// }
function RenderChart({ config }: { config: ChartConfig }) {
  const { type, xKey, yKey } = config;

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!yKey || yKey === "device") return;

      setLoading(true);

      try {
        const api = await apiService.fetchSensorHistory("SG36", "15M");
        const result = convertHistoryToTimeSeries(api, yKey);
        setData(result);
      } catch (e) {
        console.error("API ERROR", e);
      }

      setLoading(false);
    }

    load();
  }, [yKey]);

  /* ✅ FIX 1: LOADING FIRST */
  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  /* ✅ FIX 2: NO DATA AFTER LOADING */
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 h-[320px]">
      <ResponsiveContainer width="100%" height={300}>
        <>
          {/* ---------------- LINE CHART ---------------- */}
          {type === "line" && (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="srvtime"
                type="number"
                domain={["auto", "auto"]}
                tickFormatter={(value) => formatTime(value)}
              />

              <YAxis />

              <Tooltip
                labelFormatter={(value) => formatTime(value)}
                formatter={(value: number) => value.toFixed(2)}
              />

              <Legend />

              <Line
                type="monotone"
                dataKey={yKey}
                stroke="#3b82f6"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          )}

          {/* ---------------- BAR CHART ---------------- */}
          {type === "bar" && (
  <BarChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />

    <XAxis
      dataKey="srvtime"
      type="number"
      domain={["auto", "auto"]}
      tickFormatter={(value) => formatTime(value)}
    />

    <YAxis />

    <Tooltip
      labelFormatter={(value) => formatTime(value)}
      formatter={(value: number) => value.toFixed(2)}
    />

    <Legend />

    <Bar dataKey={yKey} fill="#10b981" />
  </BarChart>
)}

          {/* ---------------- PIE CHART ---------------- */}
         {type === "pie" && (
  <PieChart>
    <Tooltip
      formatter={(value: number) => value.toFixed(2)}
    />

    <Legend verticalAlign="bottom" />

    <Pie
      data={data.map((d, i) => ({
        name: formatTime(d.srvtime),
        value: d[yKey],
      }))}
      dataKey="value"
      nameKey="name"
      cx="50%"
      cy="50%"
      outerRadius={100}
    >
      {data.map((_, i) => (
        <Cell key={i} fill={COLORS[i % COLORS.length]} />
      ))}
    </Pie>
  </PieChart>
)}

          {/* ---------------- SCATTER ---------------- */}
        {type === "scatter" && (
  <ScatterChart>
    <CartesianGrid />

    <XAxis
      dataKey="srvtime"
      type="number"
      tickFormatter={(value) => formatTime(value)}
    />

    <YAxis dataKey={yKey} />

    <Tooltip
      labelFormatter={(value) => formatTime(value)}
      formatter={(value: number) => value.toFixed(2)}
    />

    <Scatter data={data} fill="#f59e0b" />
  </ScatterChart>
)}

          {/* ---------------- COMPOSED ---------------- */}
         {type === "composed" && (
  <ComposedChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />

    <XAxis
      dataKey="srvtime"
      type="number"
      tickFormatter={(value) => formatTime(value)}
    />

    <YAxis />

    <Tooltip
      labelFormatter={(value) => formatTime(value)}
      formatter={(value: number) => value.toFixed(2)}
    />

    <Legend />

    <Bar dataKey={yKey} fill="#10b981" />
    <Line dataKey={yKey} stroke="#3b82f6" />
  </ComposedChart>
)}

          {/* ---------------- RADAR ---------------- */}
          {type === "radar" && (
  <RadarChart
    data={data.map((d) => ({
      time: formatTime(d.srvtime),
      value: d[yKey],
    }))}
  >
    <PolarGrid />
    <PolarAngleAxis dataKey="time" />
    <PolarRadiusAxis />

    <Tooltip
      formatter={(value: number) => value.toFixed(2)}
    />

    <Radar dataKey="value" fill="#3b82f6" fillOpacity={0.5} />
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
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState("line");
  const [xKey, setXKey] = useState("");
  const [yKey, setYKey] = useState("");

  /* Load charts from localStorage */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCharts(JSON.parse(saved));
    } catch (err) {
      console.error("Failed to load charts", err);
    }
  }, []);

  /* Save charts to localStorage */
  const STORAGE_KEY = "customCharts";

/* Load charts from localStorage on first render */
const [charts, setCharts] = useState<ChartConfig[]>(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
});

/* Save charts whenever they change */
useEffect(() => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
  } catch (err) {
    console.error("Failed to save charts", err);
  }
}, [charts]);

function addChart() {
  if (!xKey || !yKey) {
    alert("Please select both X-axis and Y-axis");
    return;
  }

  if (type === "pie" && xKey !== "device") {
    alert("Pie chart requires 'device' as X-axis");
    return;
  }

  if (type === "scatter" && xKey === "device") {
    alert("Scatter chart requires numeric X-axis");
    return;
  }

  const newChart: ChartConfig = {
    id: Date.now().toString(),
    type,
    xKey,
    yKey,
    x: 0,        // column position
    y: Infinity, // place at bottom automatically
    w: 6,        // width (columns)
    h: 6,        // height (rows)
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
      <div className="flex gap-3">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          onClick={() => setShowAdd(true)}
        >
          + Add Chart
        </button>

        <button
          className="bg-gray-500 text-white px-4 py-2 rounded-lg"
          onClick={resetCharts}
        >
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
            {fields.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select value={yKey} onChange={(e) => setYKey(e.target.value)}>
            <option value="">Y-axis</option>
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
