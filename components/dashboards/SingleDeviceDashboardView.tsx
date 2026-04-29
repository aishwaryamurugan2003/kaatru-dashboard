import React, { useEffect, useState, useMemo } from "react";
import { apiService } from "../../services/api";
import {
  PieChart, Pie, Cell,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";

interface SingleDeviceDashboardViewProps {
  groupId: string;
  devices: string[];
  headerNode?: React.ReactNode;
}

/* ---------------- GAUGE ---------------- */
const RechartsGauge = ({
  value,
  min = 0,
  max = 100,
  color = "#22c55e",
  label = "",
  unit = ""
}: {
  value: number;
  min?: number;
  max?: number;
  color?: string;
  label?: string;
  unit?: string;
}) => {
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);

  const data = [
    { name: "value", value: percentage },
    { name: "rest", value: 1 - percentage }
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full relative p-4">

      {/* TITLE */}
      <div className="absolute top-4 left-4">
        <h3 className="text-sm font-medium text-gray-500">{label}</h3>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="70%"
            startAngle={180}
            endAngle={0}
            innerRadius="60%"
            outerRadius="80%"
            dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="#e5e7eb" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* VALUE */}
      <div className="absolute text-center mt-8">
        <span className="text-4xl font-semibold text-gray-800">{value}</span>
        {unit && <span className="text-gray-500 ml-1">{unit}</span>}
      </div>
    </div>
  );
};

export default function SingleDeviceDashboardView({
  groupId,
  devices,
  headerNode,
}: SingleDeviceDashboardViewProps) {

  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const deviceId = devices.length > 0 ? devices[0] : null;

  useEffect(() => {
    async function loadHistory() {
      if (!deviceId) return;

      try {
        setLoading(true);
        const res = await apiService.get("/device-history", {
          id: deviceId,
        });

        const data = Array.isArray(res?.data)
          ? res.data
          : (res?.data?.data || []);

        setHistory(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [deviceId]);

  /* ---------------- CALCULATIONS ---------------- */
  const {
    packetsTable,
    missingPackets,
    restarts,
    intervalCounts,
    latestTemp,
  } = useMemo(() => {

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

        const diff =
          (curr.packetId || curr.pid || 0) -
          (prev.packetId || prev.pid || 0);

        if (diff > 1) missing += diff - 1;
        if (diff < -100) rst += 1;

        const t =
          Math.abs(
            new Date(curr.srvtime).getTime() -
            new Date(prev.srvtime).getTime()
          ) / 1000;

        const rounded = Math.round(t);

        if (rounded > 0 && rounded < 300) {
          intervalMap[rounded] = (intervalMap[rounded] || 0) + 1;
        }

        packets.push({
          timestamp: curr.srvtime,
          packetId: curr.packetId || curr.pid || i,
          interval: rounded
        });
      }
    }

    return {
      packetsTable: packets.reverse(),
      missingPackets: missing,
      restarts: rst,
      intervalCounts: Object.keys(intervalMap).map((k) => ({
        interval: k,
        count: intervalMap[Number(k)]
      })),
      latestTemp: temp
    };

  }, [history]);

  if (!deviceId) {
    return (
      <div className="p-6 bg-white rounded-xl border">
        <span className="text-gray-500">
          Please select a device
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* HEADER */}
      {headerNode}

      {loading && (
        <div className="text-center text-blue-500">
          Loading...
        </div>
      )}

      {/* GRID */}
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
                  <th className="text-left text-gray-500 pb-2">
                    Timestamp {deviceId}
                  </th>
                  <th className="text-right text-gray-500 pb-2">
                    Packet ID
                  </th>
                  <th className="text-right text-gray-500 pb-2">
                    Interval
                  </th>
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

          <div className="text-sm text-gray-500 mt-2">
            Count: {packetsTable.length}
          </div>
        </div>

        {/* GAUGES */}
        <div className="bg-white border rounded-xl h-[300px]">
          <RechartsGauge value={missingPackets} label="Number of missing packets" />
        </div>

        <div className="bg-white border rounded-xl h-[300px]">
          <RechartsGauge value={restarts} label="Number of restarts" />
        </div>

        {/* BAR */}
        <div className="bg-white border rounded-xl p-4 h-[300px]">
          <h2 className="text-sm font-medium text-gray-500 mb-3">
            Number of packets in each interval
          </h2>

          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={intervalCounts}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="interval" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* TEMP */}
        <div className="bg-white border rounded-xl h-[300px]">
          <RechartsGauge value={latestTemp} label="Temperature" unit="°C" />
        </div>

        {/* LINE */}
        <div className="bg-white border rounded-xl p-4 h-[300px]">
          <h2 className="text-sm font-medium text-gray-500 mb-3">
            sPM2
          </h2>

          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="srvtime" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sPM2" stroke="#3b82f6" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}