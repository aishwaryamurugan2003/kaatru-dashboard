import * as Plotly from "plotly.js";

// Reusable config options applied to all Plotly charts
export const commonPlotlyConfig: Partial<Plotly.Config> = {
  scrollZoom: true,
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: ["lasso2d", "select2d"],
  toImageButtonOptions: {
    format: "svg",
    filename: "chart_export",
    height: 500,
    width: 700,
    scale: 1,
  },
};

// Advanced custom mode bar button to randomize colors (useful for customizable charts)
export const customColorButton: Plotly.ModeBarButton = {
  name: "Randomize Colors",
  title: "Randomize Colors",
  icon: {
    width: 500, height: 500,
    path: "M439,368.5 l-88-88 c-5,-5 -12,-7 -18,-5 l-28,14 l-35,-35 c26,-49 61,-130 65,-139 c3,-9 0,-18 -6,-25 l-94,-94 c-9,-10 -27,-10 -36,0 l-188,188 c-10,10 -10,26 0,36 l94,94 c6,6 15,9 25,6 c9,-4 90,-39 139,-65 l35,35 l-14,28 c-2,6 0,13 5,18 l88,88 c8,7 23,7 30,0 c15,-15 32,-32 46,-46 c5,-7 5,-20 -28,-50 Z m-233,-128 l-78,-78 l104,-104 l78,78 l-104,104 Z m90,111 l-18,-18 l37,-37 l18,18 l-37,37 Z"
  },
  click: function(gd: any) {
    const randomColor = () => `#${Math.floor(Math.random()*16777215).toString(16)}`;
    if ((window as any).Plotly) {
       (window as any).Plotly.restyle(gd, 'line.color', randomColor());
       (window as any).Plotly.restyle(gd, 'marker.color', randomColor());
    }
  }
};
