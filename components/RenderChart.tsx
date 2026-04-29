import React, { useEffect, useState } from "react";
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
import { fetchSensorData, convertToTimeSeries } from "../services/api";

function formatTime(value: any) {
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

export function RenderChart({
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
          fields: yKey.toLowerCase(), // ✅ FIX
        });

        const allData = convertToTimeSeries(apiResponse, yKey);

        console.log("FINAL CHART DATA:", allData);
        setData(allData);
      } catch (e) {
        console.error("CRITICAL API ERROR", e);
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
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
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
                  value: d.value,
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
                value: d.value,
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
