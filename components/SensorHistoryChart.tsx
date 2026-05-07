import Plot from "react-plotly.js";
import { useEffect, useState } from "react";
import { fetchSensorData } from "../services/api";
import { parseSensorHistory } from "../utils/parseSensorHistory";
import Loading from "../components/Loading";
import { commonPlotlyConfig } from "../utils/plotlyConfig";

const FILTERS = [
  { label: "5M", value: "5M" },
  { label: "15M", value: "15M" },
  { label: "3H", value: "3H" },
  { label: "5H", value: "5H" },
  { label: "1D", value: "1D" },
];

const SERIES_CONFIG = [
  { key: "pm25",     label: "PM2.5",    color: "#2563eb" },
  { key: "pm10",     label: "PM10",     color: "#16a34a" },
  { key: "temp",     label: "Temp",     color: "#f97316" },
  { key: "humidity", label: "Humidity", color: "#06b6d4" },
] as const;

export default function SensorHistoryChart({ deviceId }: { deviceId?: string }) {
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

        const merged = parsed.pm25.map((_: any, i: number) => ({
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

  const times = data.map((d) => {
    const dt = new Date(d.time);
    return isNaN(dt.getTime()) ? d.time : dt;
  });

  const traces: Plotly.Data[] = SERIES_CONFIG
    .filter((s) => enabled[s.key])
    .map((s) => ({
      x: times,
      y: data.map((d) => d[s.key]),
      type: "scatter" as const,
      mode: "lines" as const,
      name: s.label,
      line: { color: s.color, width: 2 },
      hovertemplate: `<b>${s.label}</b>: %{y:.2f}<br>%{x}<extra></extra>`,
    }));

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
              className={`px-2 py-1 text-xs rounded ${
                filter === f.value
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
        {SERIES_CONFIG.map((s) => (
          <label key={s.key} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={enabled[s.key]}
              onChange={() =>
                setEnabled((p) => ({ ...p, [s.key]: !p[s.key] }))
              }
            />
            {s.key.toUpperCase()}
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
          <Plot
            data={traces}
            layout={{
              margin: { t: 10, r: 10, b: 50, l: 50 },
              xaxis: {
                type: "date",
                tickformat: "%H:%M",
                hoverformat: "%Y-%m-%d %H:%M",
                showgrid: true,
                gridcolor: "#f3f4f6",
                tickfont: { color: "#6b7280", size: 12 },
              },
              yaxis: {
                showgrid: true,
                gridcolor: "#f3f4f6",
                tickfont: { color: "#6b7280", size: 12 },
              },
              showlegend: true,
              legend: { orientation: "h", y: -0.15 },
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              dragmode: "zoom",
            }}
            useResizeHandler
            style={{ width: "100%", height: "100%" }}
            config={{ ...commonPlotlyConfig, responsive: true }}
          />
        )}
      </div>
    </div>
  );
}
