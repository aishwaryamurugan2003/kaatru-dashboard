import React, { useState, useEffect } from "react";
import { RenderChart, ChartConfig } from "./RenderChart";

const fields = [
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

interface DynamicChartBuilderProps {
    devices: any[];
    storageKeyPattern: string; // E.g. "dashboard_stationary" so they are isolated per dashboard
    headerNode?: React.ReactNode; // Content to display on the left side of the top bar
    defaultChartType?: "line" | "bar" | "pie" | "scatter" | "composed" | "radar";
}

export default function DynamicChartBuilder({ devices, storageKeyPattern, headerNode, defaultChartType = "line" }: DynamicChartBuilderProps) {
    const STORAGE_KEY = `charts_${window.location.pathname}_${storageKeyPattern}`;

    const [charts, setCharts] = useState<ChartConfig[]>([]);
    const [showAdd, setShowAdd] = useState(false);

    const [type, setType] = useState(defaultChartType);
    const [xKey, setXKey] = useState("srvtime");
    const [yKey, setYKey] = useState("sPM2");

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            let parsed = saved ? JSON.parse(saved) : [];
            
            if (parsed.length === 0) {
                // DEFAULT MULTIPLE CHARTS
                parsed = [
                    "sPM2",
                    "sPM10",
                    "temp",
                    "rh",
                    "sPM1"
                ].map((param) => ({
                    id: param,
                    type: defaultChartType,
                    xKey: defaultChartType === "scatter" ? "rh" : "srvtime", // scatter typically needs two numeric bounds, fallback to rh 
                    yKey: param,
                    x: 0,
                    y: 0,
                    w: 6,
                    h: 6,
                }));
            }
            setCharts(parsed);
        } catch (err) {
            console.error("Failed to load charts from localStorage", err);
        }
    }, [STORAGE_KEY, defaultChartType]);

    useEffect(() => {
        try {
            // Only save if we actually have charts, unless we explicitly cleared them
            if (charts.length > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
            }
        } catch (err) {
            console.error("Failed to save charts to localStorage", err);
        }
    }, [charts, STORAGE_KEY]);

    function addChart() {
        if (!xKey || !yKey) {
            alert("Select X and Y");
            return;
        }

        const newChart: ChartConfig = {
            id: Date.now().toString(),
            type,
            xKey,
            yKey,
            x: 0,
            y: Infinity,
            w: 6,
            h: 6,
        };

        setCharts((prev) => [...prev, newChart]);
        setShowAdd(false);
    }

    function removeChart(id: string) {
        setCharts((prev) => {
            const newCharts = prev.filter((c) => c.id !== id);
            if (newCharts.length === 0) {
                localStorage.removeItem(STORAGE_KEY);
            } else {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newCharts));
            }
            return newCharts;
        });
    }

    function resetCharts() {
        if (window.confirm("Are you sure you want to reset all charts to default?")) {
            localStorage.removeItem(STORAGE_KEY);
            window.location.reload();
        }
    }

    return (
        <div className="flex flex-col gap-6 w-full h-full">
            {/* ---------------- HEADER & ADD CHART BUTTONS ---------------- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                
                {/* 1. Left side: Passed from Parent (Title, etc) */}
                <div className="flex-1">
                    {headerNode && headerNode}
                </div>

                {/* 2. Right side: "+ Add Chart" / "Reset Charts" */}
                <div className="flex gap-3 shrink-0">
                    <button
                        className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-4 py-2 rounded-lg font-medium shadow-sm"
                        onClick={() => setShowAdd(!showAdd)}
                    >
                        + Add Chart
                    </button>

                    <button
                        className="bg-gray-500 hover:bg-gray-600 transition-colors text-white px-4 py-2 rounded-lg font-medium shadow-sm whitespace-nowrap"
                        onClick={resetCharts}
                    >
                        Reset Charts
                    </button>
                </div>
            </div>

            {/* ---------------- INLINE ADD CHART PANEL ---------------- */}
            {showAdd && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 items-center self-end">
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value as any)}
                        className="border dark:border-gray-600 dark:bg-gray-700 rounded-md p-2 bg-gray-50"
                    >
                        <option value="line">Line</option>
                        <option value="bar">Bar</option>
                        <option value="pie">Pie</option>
                        <option value="scatter">Scatter</option>
                        <option value="composed">Composed</option>
                        <option value="radar">Radar</option>
                    </select>

                    <select
                        value={xKey}
                        onChange={(e) => setXKey(e.target.value)}
                        className="border dark:border-gray-600 dark:bg-gray-700 rounded-md p-2 bg-gray-50"
                    >
                        {fields.map((f) => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>

                    <select
                        value={yKey}
                        onChange={(e) => setYKey(e.target.value)}
                        className="border dark:border-gray-600 dark:bg-gray-700 rounded-md p-2 bg-gray-50"
                    >
                        {fields.map((f) => (
                            <option key={f} value={f} disabled={f === xKey}>
                                {f}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={addChart}
                        className="bg-green-600 hover:bg-green-700 transition-colors text-white px-6 py-2 rounded-md font-medium shadow-sm"
                    >
                        Add
                    </button>
                </div>
            )}

            {/* ---------------- CHARTS GRID ---------------- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {charts.map((chart) => (
                    <div
                        key={chart.id}
                        className="relative bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
                    >
                        <button
                            onClick={() => removeChart(chart.id)}
                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 transition-colors text-white px-2 py-1 text-xs rounded z-20"
                        >
                            ✕
                        </button>
                        <h2 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200 uppercase">
                            {chart.yKey}
                        </h2>
                        <RenderChart config={chart} devices={devices} />
                    </div>
                ))}
                {charts.length === 0 && (
                    <div className="col-span-full h-40 flex items-center justify-center text-gray-500">
                        No charts added. Click "+ Add Chart" to create one.
                    </div>
                )}
            </div>
        </div>
    );
}
