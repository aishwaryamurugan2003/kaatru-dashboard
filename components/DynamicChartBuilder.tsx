import React, { useState, useEffect, useCallback, useRef } from "react";
import { RenderChart, ChartConfig } from "./RenderChart";
import AnalyticsPanels from "./Analyticalpanel";
import { fetchSensorData } from "../services/api";

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

interface TimeSeriesEntry {
    srvtime: number;
    value: number;
    device: string;
}

interface DynamicChartBuilderProps {
    devices: any[];
    storageKeyPattern: string;
    headerNode?: React.ReactNode;
    defaultChartType?: "line" | "bar" | "pie" | "scatter" | "composed" | "radar";
    measurement?: string;
    timeFilter?: string;
    isCustomFolder?: boolean;
    folderId?: number;
}

export default function DynamicChartBuilder({
    devices,
    storageKeyPattern,
    headerNode,
    defaultChartType = "line",
    measurement = "gurprod",
    timeFilter,
}: DynamicChartBuilderProps) {
    const STORAGE_KEY = `charts_${window.location.pathname}_${storageKeyPattern}`;

    const [charts, setCharts] = useState<ChartConfig[]>([]);
    const [showAdd, setShowAdd] = useState(false);

    const [type, setType] = useState(defaultChartType);
    const [xKey, setXKey] = useState("srvtime");
    const [yKey, setYKey] = useState("sPM2");

    // ── Analytics state ──────────────────────────────────────────────────────
    const [rawApiResponse, setRawApiResponse] = useState<{ data: any[] } | null>(null);
    const [pageLoading, setPageLoading] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);
    const analyticsLoadedRef = useRef(false);

    // ── Load charts from localStorage ───────────────────────────────────────
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            let parsed = saved ? JSON.parse(saved) : [];

            if (parsed.length === 0) {
                parsed = ["sPM2", "sPM10", "temp", "rh", "sPM1"].map((param) => ({
                    id: param,
                    type: defaultChartType,
                    xKey: defaultChartType === "scatter" ? "rh" : "srvtime",
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
            if (charts.length > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
            }
        } catch (err) {
            console.error("Failed to save charts to localStorage", err);
        }
    }, [charts, STORAGE_KEY]);

    // ── Fetch ALL fields in one go for efficiency ───────────────────────────
    useEffect(() => {
        if (!devices.length) {
            setRawApiResponse(null);
            return;
        }

        async function loadAllData() {
            setPageLoading(true);
            setPageError(null);
            try {
                const deviceIds = devices.map((d: any) => d.value);
                const allFields = fields.join(",");
                
                const response = await fetchSensorData({
                    deviceIds,
                    fields: allFields,
                    measurement,
                    timeFilter,
                });
                setRawApiResponse(response);
            } catch (e: any) {
                console.error("Dashboard data fetch error", e);
                setPageError(e.message || "Failed to load dashboard data");
            } finally {
                setPageLoading(false);
            }
        }

        loadAllData();
    }, [devices.map((d) => d.value).join(","), measurement, timeFilter]);

    // ── Chart management ─────────────────────────────────────────────────────
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

            {/* ── HEADER & ADD CHART BUTTONS ─────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                    {headerNode && headerNode}
                </div>

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

            {/* ── INLINE ADD CHART PANEL ──────────────────────────────────────── */}
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

            {/* ── CHARTS GRID ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full relative">
                {pageLoading && (
                    <div className="absolute inset-x-0 -top-4 flex justify-center z-50">
                        <div className="bg-blue-600 text-white px-4 py-1 rounded-full text-xs animate-bounce shadow-lg">
                            Refreshing Data...
                        </div>
                    </div>
                )}

                {pageError && (
                    <div className="col-span-full bg-red-50 border border-red-200 p-4 rounded-xl flex justify-between items-center mb-4">
                        <span className="text-red-600 font-medium">Error: {pageError}</span>
                        <button 
                            onClick={() => window.location.reload()}
                            className="bg-red-600 text-white px-4 py-1 rounded-lg text-sm hover:bg-red-700"
                        >
                            Retry
                        </button>
                    </div>
                )}

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
                        <RenderChart
                            config={chart}
                            devices={devices}
                            measurement={measurement}
                            timeFilter={timeFilter}
                            fullData={rawApiResponse?.data}
                        />
                    </div>
                ))}
                {charts.length === 0 && (
                    <div className="col-span-full h-40 flex items-center justify-center text-gray-500">
                        No charts added. Click "+ Add Chart" to create one.
                    </div>
                )}
            </div>

            {/* ── ANALYTICS PANELS ─────────────────────────────────────────────
                Sits below the charts grid. Receives the raw API response so it
                can derive packet counts, zero readings, delays, and GPS events
                without making additional API calls.
            ─────────────────────────────────────────────────────────────────── */}
            <AnalyticsPanels
                rawApiResponse={rawApiResponse}
                devices={devices}
            />
        </div>
    );
}