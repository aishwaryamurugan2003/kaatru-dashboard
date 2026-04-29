import React, { useEffect, useState } from "react";
import Select from "react-select";
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  RadarChart, Radar,
  ComposedChart,
  ScatterChart, Scatter,
  AreaChart, Area, ReferenceArea,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer
} from "recharts";
import { apiService, fetchSensorData, convertToTimeSeries, Endpoint } from "@/services/api";
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
// 
function RenderChart({
  config,
  devices,
}: {
  config: ChartConfig;
  devices: any[];
}) {
  const { type, xKey, yKey } = config;

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Legend isolation state
  const [isolatedDevice, setIsolatedDevice] = useState<string | null>(null);

  const handleLegendClick = (e: any) => {
    const clickedItem = e.value;
    setIsolatedDevice((prev) => (prev === clickedItem ? null : clickedItem));
  };

  // Zoom specific state
  const [refAreaLeft, setRefAreaLeft] = useState<string | number | undefined>(undefined);
  const [refAreaRight, setRefAreaRight] = useState<string | number | undefined>(undefined);
  const [zoomLeft, setZoomLeft] = useState<string | number>("dataMin");
  const [zoomRight, setZoomRight] = useState<string | number>("dataMax");

  const handleMouseDown = (e: any) => {
    if (e && e.activeLabel) setRefAreaLeft(e.activeLabel);
  };
  const handleMouseMove = (e: any) => {
    if (refAreaLeft && e && e.activeLabel) setRefAreaRight(e.activeLabel);
  };
  const handleMouseUp = () => {
    if (refAreaLeft && refAreaRight && refAreaLeft !== refAreaRight) {
      const [min, max] = [refAreaLeft, refAreaRight].sort((a, b) => Number(a) - Number(b));
      setZoomLeft(min);
      setZoomRight(max);
    }
    setRefAreaLeft(undefined);
    setRefAreaRight(undefined);
  };
  const zoomOut = () => {
    setZoomLeft("dataMin");
    setZoomRight("dataMax");
  };
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

        const allData = convertToTimeSeries(apiResponse, yKey);

        setData(allData);
      } catch (e) {
        console.error("API ERROR", e);
      }

      setLoading(false);
    }

    load();
  }, [yKey, devices]);

  if (!devices.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        Select device(s)
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100 p-4 animate-pulse">
        Loading...
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        No data available
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-[320px] relative transition-all duration-200 hover:shadow-md">
      {zoomLeft !== "dataMin" && (
        <button
          className="absolute top-2 right-2 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 text-xs rounded border border-blue-200 transition-colors z-10 shadow-sm font-semibold"
          onClick={zoomOut}
        >
          Reset Zoom
        </button>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <>
          {type === "line" && (
            <AreaChart
              data={data}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <defs>
                {devices.map((d, index) => (
                  <linearGradient key={d.value} id={`color${d.value}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="srvtime"
                type="number"
                domain={[zoomLeft, zoomRight]}
                allowDataOverflow
                tickFormatter={(value) => formatTime(value)}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickMargin={10}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                domain={['auto', 'auto']}
                tickCount={6}
                tickFormatter={(val) => Math.round(val).toString()}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickMargin={10}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip
                labelFormatter={(value) => formatTime(value)}
                formatter={(value: number) => value.toFixed(2)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px', cursor: 'pointer' }} onClick={handleLegendClick} />
              {devices.map((d, index) => (
                <Area
                  hide={isolatedDevice !== null && isolatedDevice !== d.label}
                  key={d.value}
                  type="monotone"
                  dataKey={(entry) => entry.device === d.value ? entry.value : null}
                  stroke={COLORS[index % COLORS.length]}
                  fill={`url(#color${d.value})`}
                  strokeWidth={2.5}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  name={d.label}
                  connectNulls
                />
              ))}
              {refAreaLeft && refAreaRight ? (
                <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#3b82f6" fillOpacity={0.1} />
              ) : null}
            </AreaChart>
          )}

          {/* ---------------- BAR CHART ---------------- */}
          {type === "bar" && (
            <BarChart
              data={data}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="srvtime"
                type="number"
                domain={[zoomLeft, zoomRight]}
                allowDataOverflow
                tickFormatter={(value) => formatTime(value)}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                domain={['auto', 'auto']}
                tickCount={6}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip
                labelFormatter={(value) => formatTime(value)}
                formatter={(value: number) => value.toFixed(2)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend wrapperStyle={{ cursor: 'pointer' }} onClick={handleLegendClick} />
              {devices.length > 0 ? devices.map((d, index) => (
                <Bar
                  hide={isolatedDevice !== null && isolatedDevice !== d.label}
                  key={d.value}
                  dataKey={(entry) => entry.device === d.value ? entry.value : null}
                  fill={COLORS[index % COLORS.length]}
                  name={d.label}
                  radius={[4, 4, 0, 0]}
                />
              )) : (
                <Bar dataKey={yKey} fill="#10b981" radius={[4, 4, 0, 0]} />
              )}
              {refAreaLeft && refAreaRight ? (
                <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#3b82f6" fillOpacity={0.1} />
              ) : null}
            </BarChart>
          )}

          {/* ---------------- PIE CHART ---------------- */}
          {type === "pie" && (
            <PieChart>
              <Tooltip
                formatter={(value: number) => value.toFixed(2)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
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
                innerRadius={60}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          )}

          {/* ---------------- SCATTER ---------------- */}
          {type === "scatter" && (
            <ScatterChart
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="srvtime"
                type="number"
                domain={[zoomLeft, zoomRight]}
                allowDataOverflow
                tickFormatter={(value) => formatTime(value)}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis
                dataKey={(entry) => entry.value || 0}
                domain={['auto', 'auto']}
                tickCount={6}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <Tooltip
                labelFormatter={(value) => formatTime(value)}
                formatter={(value: number) => typeof value === 'number' ? value.toFixed(2) : value}
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend wrapperStyle={{ cursor: 'pointer' }} onClick={handleLegendClick} />
              {devices.length > 0 ? devices.map((d, index) => (
                <Scatter
                  hide={isolatedDevice !== null && isolatedDevice !== d.label}
                  key={d.value}
                  name={d.label}
                  data={data.filter(entry => entry.device === d.value)}
                  fill={COLORS[index % COLORS.length]}
                />
              )) : (
                <Scatter data={data} fill="#f59e0b" />
              )}
              {refAreaLeft && refAreaRight ? (
                <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#3b82f6" fillOpacity={0.1} />
              ) : null}
            </ScatterChart>
          )}

          {/* ---------------- COMPOSED ---------------- */}
          {type === "composed" && (
            <ComposedChart
              data={data}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="srvtime"
                type="number"
                domain={[zoomLeft, zoomRight]}
                allowDataOverflow
                tickFormatter={(value) => formatTime(value)}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis
                domain={['auto', 'auto']}
                tickCount={6}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <Tooltip
                labelFormatter={(value) => formatTime(value)}
                formatter={(value: number) => value.toFixed(2)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Bar dataKey={(entry) => entry.value || 0} fill="#10b981" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey={(entry) => entry.value || 0} stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              {refAreaLeft && refAreaRight ? (
                <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#3b82f6" fillOpacity={0.1} />
              ) : null}
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
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <PolarRadiusAxis />
              <Tooltip
                formatter={(value: number) => value.toFixed(2)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Radar dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.3} />
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

  const [deviceOptions, setDeviceOptions] = useState<any[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<any[]>([]);
  const [groupOptions, setGroupOptions] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);

  useEffect(() => {
    async function loadGroups() {
      try {
        const res = await apiService.getRamanAnalysis(
          Endpoint.GROUP_ALL
        );

        if (Array.isArray(res?.data)) {
          setGroupOptions(
            res.data.map((g: any) => ({
              label: g.name,
              value: g.id,
            }))
          );
        }
      } catch (e) {
        console.error("GROUP FETCH ERROR", e);
      }
    }

    loadGroups();
  }, []);



  /* ✅ ADD HERE */
  useEffect(() => {
    async function loadDevices() {
      if (!selectedGroup) {
        setDeviceOptions([]);
        setSelectedDevices([]);
        return;
      }

      try {
        const res = await apiService.getRamanAnalysis(
          Endpoint.GROUP_DEVICES,
          { id: selectedGroup.value }
        );

        if (res?.data?.devices) {
          const formatted = res.data.devices.map((d: string) => ({
            value: d,
            label: d,
          }));

          setDeviceOptions(formatted);
        }
      } catch (e) {
        console.error("DEVICE FETCH ERROR", e);
      }
    }

    loadDevices();
  }, [selectedGroup]);

  // useEffect(() => {
  //   async function loadDevices() {
  //     try {
  //       const devices = await apiService.fetchDevices();

  //       const formatted = devices.map((d: any) => ({
  //         value: d.dID || d.deviceId,
  //         label: d.dID || d.deviceId,
  //       }));

  //       setDeviceOptions(formatted);
  //     } catch (e) {
  //       console.error("DEVICE FETCH ERROR", e);
  //     }
  //   }

  //   loadDevices();
  // }, []);

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

      {/* ✅ GROUP DROPDOWN */}
      <Select
        options={groupOptions}
        value={selectedGroup}
        onChange={(val) => setSelectedGroup(val)}
        placeholder="Select group..."
      />

      {/* ✅ DEVICE DROPDOWN */}
      <Select
        isMulti
        options={deviceOptions}
        value={selectedDevices}
        onChange={(val) => setSelectedDevices([...(val || [])])}
        placeholder="Select devices..."
      />
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
            <RenderChart config={chart} devices={selectedDevices} />
          </div>
        ))}
      </div>
    </div>
  );
}
