import Plot from "react-plotly.js";
import { DeviceData } from "../types/device";
import { commonPlotlyConfig } from "../utils/plotlyConfig";

export default function LiveChart({ history }: { history: DeviceData[] }) {
  const times = history.map((d) => d.srvtime);

  return (
    <Plot
      data={[
        {
          x: times,
          y: history.map((d) => (d as any).sPM2),
          type: "scatter",
          mode: "lines",
          name: "sPM2",
          line: { color: "#00ff00" },
          hovertemplate: "<b>sPM2</b><br>%{x}<br>%{y:.2f}<extra></extra>",
        },
        {
          x: times,
          y: history.map((d) => (d as any).temp),
          type: "scatter",
          mode: "lines",
          name: "temp",
          line: { color: "#ff0000" },
          hovertemplate: "<b>Temp</b><br>%{x}<br>%{y:.2f}<extra></extra>",
        },
      ]}
      layout={{
        margin: { t: 10, r: 10, b: 40, l: 40 },
        xaxis: { title: { text: "Time" } as any },
        yaxis: { title: { text: "Value" } as any },
        showlegend: true,
        dragmode: "zoom",
      }}
      useResizeHandler
      style={{ width: "100%", height: "250px" }}
      config={{ ...commonPlotlyConfig, responsive: true }}
    />
  );
}
