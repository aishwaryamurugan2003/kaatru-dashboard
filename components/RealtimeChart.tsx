import Plot from "react-plotly.js";
import { useEffect, useState } from "react";
import { commonPlotlyConfig } from "../utils/plotlyConfig";

export default function RealtimeChart({ value }: { value?: number }) {
  const [data, setData] = useState<{ time: string; value: number }[]>([]);

  useEffect(() => {
    if (value === undefined || isNaN(value)) return;

    setData((prev) => {
      const newData = [...prev, { time: new Date().toLocaleTimeString(), value }];
      return newData.slice(-60); // last 60 points
    });
  }, [value]);

  return (
    <Plot
      data={[
        {
          x: data.map((d) => d.time),
          y: data.map((d) => d.value),
          type: "scatter",
          mode: "lines",
          line: { color: "#2563eb" },
          hovertemplate: "%{x}<br>%{y:.2f}<extra></extra>",
        },
      ]}
      layout={{
        margin: { t: 10, r: 10, b: 30, l: 40 },
        xaxis: { showticklabels: false, showgrid: false },
        yaxis: { showgrid: true, gridcolor: "#f3f4f6" },
        showlegend: false,
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        dragmode: "zoom",
      }}
      useResizeHandler
      style={{ width: "100%", height: "100%" }}
      config={{ ...commonPlotlyConfig, responsive: true }}
    />
  );
}
