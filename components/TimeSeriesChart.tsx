import React from "react";
import Plot from "react-plotly.js";
import { ChartSeries } from "../types";
import { commonPlotlyConfig, customColorButton } from "../utils/plotlyConfig";

interface TimeSeriesChartProps {
  data: ChartSeries[];
  loading: boolean;
}

const COLORS = ["#3b82f6", "#16a34a", "#f97316", "#ef4444", "#8b5cf6"];

const ChartSkeleton: React.FC = () => (
  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md"></div>
);

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ data, loading }) => {
  if (loading) {
    return <ChartSkeleton />;
  }

  if (!data || data.length === 0 || data.every((series) => series.data.length === 0)) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>No data to display. Please select a device.</p>
      </div>
    );
  }

  const traces: Plotly.Data[] = data.map((series, index) => ({
    x: series.data.map((d: any) => d.dTS),
    y: series.data.map((d: any) => d.sPM2),
    type: "scatter" as const,
    mode: "lines" as const,
    name: series.deviceId,
    line: { color: COLORS[index % COLORS.length], width: 2 },
    hovertemplate: `<b>${series.deviceId}</b><br>%{x|%Y-%m-%d %H:%M:%S}<br>PM2.5: %{y:.2f}<extra></extra>`,
  }));

  return (
    <Plot
      data={traces}
      layout={{
        margin: { t: 10, r: 20, b: 60, l: 60 },
        xaxis: {
          type: "date",
          autorange: true,
          tickformat: "%H:%M",
          showgrid: true,
          gridcolor: "rgba(0,0,0,0.1)",
          tickfont: { color: "currentColor", size: 12 },
          rangeslider: { visible: true, thickness: 0.08 },
        },
        yaxis: {
          title: { text: "PM2.5" },
          showgrid: true,
          gridcolor: "rgba(0,0,0,0.1)",
          tickfont: { color: "currentColor", size: 12 },
        },
        showlegend: true,
        legend: { orientation: "h", y: -0.25 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        hoverlabel: {
          bgcolor: "rgba(31,41,55,0.8)",
          bordercolor: "rgba(75,85,99,0.8)",
          font: { color: "#fff" },
        },
        dragmode: "zoom",
      }}
      useResizeHandler
      style={{ width: "100%", height: "100%" }}
      config={{ 
        ...commonPlotlyConfig, 
        modeBarButtonsToAdd: [customColorButton],
        responsive: true 
      }}
    />
  );
};

export default TimeSeriesChart;
