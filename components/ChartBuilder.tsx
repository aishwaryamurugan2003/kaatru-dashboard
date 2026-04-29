// import React, { useState, useEffect } from "react";
// import { RenderChart, ChartConfig } from "./RenderChart";

// const STORAGE_KEY = `charts_${window.location.pathname}`;

// const fields = [
//     "srvtime",
//     "sPM2",
//     "sPM1",
//     "sPM10",
//     "temp",
//     "rh",
//     "co_ppb",
// ];

// export default function ChartBuilder({ devices }: { devices: any[] }) {
//     const [charts, setCharts] = useState<ChartConfig[]>([]);
//     const [showAdd, setShowAdd] = useState(false);

//     const [type, setType] = useState("line");
//     const [xKey, setXKey] = useState("srvtime");
//     const [yKey, setYKey] = useState("sPM2");

//     /* ------------------------------------------------------------
//        LOAD DEFAULT MULTI PARAM CHARTS
//     ------------------------------------------------------------ */
//     useEffect(() => {
//         const saved = localStorage.getItem(STORAGE_KEY);

//         if (saved) {
//             setCharts(JSON.parse(saved));
//         } else {
//             // ✅ DEFAULT MULTIPLE CHARTS
//             const defaultCharts: ChartConfig[] = [
//                 "sPM2",
//                 "sPM1",
//                 "sPM10",
//                 "temp",
//                 "rh",
//             ].map((param) => ({
//                 id: param,
//                 type: "line",
//                 xKey: "srvtime",
//                 yKey: param,
//                 x: 0,
//                 y: 0,
//                 w: 6,
//                 h: 6,
//             }));

//             setCharts(defaultCharts);
//         }
//     }, []);

//     /* SAVE */
//     useEffect(() => {
//         localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
//     }, [charts]);

//     /* ADD CHART */
//     function addChart() {
//         if (!xKey || !yKey) {
//             alert("Select X and Y");
//             return;
//         }

//         const newChart: ChartConfig = {
//             id: Date.now().toString(),
//             type,
//             xKey,
//             yKey,
//             x: 0,
//             y: Infinity,
//             w: 6,
//             h: 6,
//         };

//         setCharts((prev) => [...prev, newChart]);
//         setShowAdd(false);
//     }

//     /* REMOVE */
//     function removeChart(id: string) {
//         setCharts((prev) => prev.filter((c) => c.id !== id));
//     }

//     return (
//         <div className="space-y-4">

//             {/* ---------------- CONTROLS ---------------- */}
//             <div className="flex justify-end items-center gap-3 flex-wrap">

//                 <button
//                     onClick={() => setShowAdd(!showAdd)}
//                     className="bg-blue-600 text-white px-4 py-2 rounded"
//                 >
//                     + Add Chart
//                 </button>

//                 {showAdd && (
//                     <>
//                         <select
//                             value={type}
//                             onChange={(e) => setType(e.target.value)}
//                             className="border px-2 py-1 rounded"
//                         >
//                             <option value="line">Line</option>
//                             <option value="bar">Bar</option>
//                             <option value="pie">Pie</option>
//                             <option value="scatter">Scatter</option>
//                             <option value="composed">Composed</option>
//                         </select>

//                         <select
//                             value={xKey}
//                             onChange={(e) => setXKey(e.target.value)}
//                             className="border px-2 py-1 rounded"
//                         >
//                             {fields.map((f) => (
//                                 <option key={f} value={f}>{f}</option>
//                             ))}
//                         </select>

//                         <select
//                             value={yKey}
//                             onChange={(e) => setYKey(e.target.value)}
//                             className="border px-2 py-1 rounded"
//                         >
//                             {fields.map((f) => (
//                                 <option key={f} value={f} disabled={f === xKey}>
//                                     {f}
//                                 </option>
//                             ))}
//                         </select>

//                         <button
//                             onClick={addChart}
//                             className="bg-green-600 text-white px-3 py-1 rounded"
//                         >
//                             Add
//                         </button>
//                     </>
//                 )}
//             </div>

//             {/* ---------------- CHARTS ---------------- */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 {charts.map((chart) => (
//                     <div
//                         key={chart.id}
//                         className="relative bg-white p-4 rounded-xl shadow-sm border"
//                     >
//                         {/* ❌ REMOVE BUTTON */}
//                         <button
//                             onClick={() => removeChart(chart.id)}
//                             className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 text-xs rounded"
//                         >
//                             ✕
//                         </button>

//                         {/* ✅ PARAMETER TITLE */}
//                         <h2 className="text-md font-semibold mb-2 text-gray-700">
//                             {chart.yKey.toUpperCase()}
//                         </h2>

//                         {/* ✅ CHART */}
//                         <RenderChart config={chart} devices={devices} />
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// }

import React from "react";
import { RenderChart, ChartConfig } from "./RenderChart";

const PARAMETERS = [
    { key: "sPM2", label: "PM2.5" },
    { key: "sPM1", label: "PM1" },
    { key: "sPM10", label: "PM10" },
    { key: "temp", label: "Temperature" },
    { key: "rh", label: "Humidity (RH)" },
];

export default function ChartBuilder({ devices }: { devices: any[] }) {

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {PARAMETERS.map((param) => (
                <div
                    key={param.key}
                    className="bg-white p-4 rounded-xl shadow-sm border"
                >
                    {/* ✅ PARAMETER TITLE */}
                    <h2 className="text-md font-semibold mb-2 text-gray-700">
                        {param.label}
                    </h2>

                    {/* ✅ LINE CHART */}
                    <RenderChart
                        config={{
                            id: param.key,
                            type: "line",
                            xKey: "srvtime",
                            yKey: param.key,
                        }}
                        devices={devices}
                    />
                </div>
            ))}

        </div>
    );
}