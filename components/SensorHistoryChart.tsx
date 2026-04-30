import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useEffect, useState } from "react";
import { fetchSensorData } from "../services/api";
import { parseSensorHistory } from "../utils/parseSensorHistory";
import Loading from "../components/Loading";

const FILTERS = [
  { label: "5M", value: "5M" },
  { label: "15M", value: "15M" },
  { label: "3H", value: "3H" },
  { label: "5H", value: "5H" },
  { label: "1D", value: "1D" },
];

export default function SensorHistoryChart({
  deviceId,
}: {
  deviceId?: string;
}) {
  const [filter, setFilter] = useState("15M");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState({
    pm25: true,
    pm10: true,
    temp: false,
    humidity: false,
  });

  useEffect(() => {
    if (!deviceId) return;

    setLoading(true);

    fetchSensorData({
      deviceIds: [deviceId],
      fields: "sPM2,sPM10,temp,rh",
      start: "-14d",
      interval: "10h",
    })
      .then((res) => {
        const parsed = parseSensorHistory(res);

        const merged = parsed.pm25.map((_, i) => ({
          time: parsed.pm25[i]?.time,
          pm25: parsed.pm25[i]?.value,
          pm10: parsed.pm10[i]?.value,
          temp: parsed.temp[i]?.value,
          humidity: parsed.humidity[i]?.value,
        }));

        setData(merged);
      })
      .catch((err) => {
        console.error("Failed to fetch sensor history", err);
        setData([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [deviceId, filter]);

  return (
    <div className="h-full flex flex-col">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-semibold">Sensor History</h2>

        {/* FILTER BUTTONS */}
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-2 py-1 text-xs rounded ${filter === f.value
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700"
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* TOGGLES */}
      <div className="flex gap-3 text-xs mb-2">
        {Object.keys(enabled).map((k) => (
          <label key={k} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={(enabled as any)[k]}
              onChange={() =>
                setEnabled((p) => ({ ...p, [k]: !(p as any)[k] }))
              }
            />
            {k.toUpperCase()}
          </label>
        ))}
      </div>

      {/* CHART AREA */}
      <div className="flex-1 flex items-center justify-center">
        {loading ? (
          <Loading text="Loading chart..." />
        ) : data.length === 0 ? (
          <div className="text-gray-500">No data available</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis
                dataKey="time"
                tickFormatter={(value) => {
                  if (!value) return "";

                  const d = new Date(value);
                  if (isNaN(d.getTime())) return value;

                  return d.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                }}
              />

              <YAxis />
              <Tooltip
                labelFormatter={(value) => {
                  if (!value) return "";

                  const d = new Date(value);
                  if (isNaN(d.getTime())) return value;

                  return d.toLocaleString();
                }}
              />

              <Legend />

              {enabled.pm25 && (
                <Line dataKey="pm25" stroke="#2563eb" dot={false} />
              )}
              {enabled.pm10 && (
                <Line dataKey="pm10" stroke="#16a34a" dot={false} />
              )}
              {enabled.temp && (
                <Line dataKey="temp" stroke="#f97316" dot={false} />
              )}
              {enabled.humidity && (
                <Line dataKey="humidity" stroke="#06b6d4" dot={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
