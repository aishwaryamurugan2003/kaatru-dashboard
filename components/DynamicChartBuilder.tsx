import React, { useState, useEffect, useRef } from "react";
import { RenderChart, ChartConfig } from "./RenderChart";
import AnalyticsPanels from "./Analyticalpanel";
import {
    fetchSensorData,
    apiFetchDashboard,
    apiCreateDashboard,
    apiUpdateDashboard,
} from "../services/api";

// ── Full backend ChartConfig shape (must match dashboard_schemas.py) ──────────
interface BackendChartConfig {
    chart_id: string;
    title: string;
    chart_type: "line" | "bar" | "area" | "scatter";
    measurement: string;
    device_ids: string[];
    x_axis: { field: string; label: string; format: string };
    y_axis: { field: string; label: string; unit?: string | null; min?: number | null; max?: number | null };
    time_range: string;
    interval: string;
    show_legend: boolean;
    show_grid: boolean;
    color_scheme?: string[] | null;
    height: number;
}

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

// ── Shape adapters ────────────────────────────────────────────────────────────
//
// Backend (dashboard_schemas.py ChartConfig) requires the full nested shape.
// Frontend ChartConfig (RenderChart) is: { id, type, xKey, yKey, x, y, w, h }

const VALID_BACKEND_TYPES = ["line", "bar", "area", "scatter"] as const;
type BackendChartType = typeof VALID_BACKEND_TYPES[number];

function toBackendType(t: string): BackendChartType {
    if (VALID_BACKEND_TYPES.includes(t as BackendChartType)) return t as BackendChartType;
    return "line"; // composed/radar/pie fallback
}

function toApiChart(c: ChartConfig, measurement: string): BackendChartConfig {
    return {
        chart_id: c.id,
        title: c.yKey.toUpperCase(),
        chart_type: toBackendType(c.type),
        measurement,
        device_ids: [],           // device selection is runtime — not stored per-chart
        x_axis: { field: "timestamp", label: "Time", format: "%Y-%m-%d %H:%M" },
        y_axis: { field: c.yKey, label: c.yKey, unit: null, min: null, max: null },
        time_range: "-3h",
        interval: "5m",
        show_legend: true,
        show_grid: true,
        color_scheme: null,
        height: 300,
    };
}

function fromApiChart(bc: BackendChartConfig, index: number): ChartConfig {
    return {
        id: bc.chart_id || `chart_${index}`,
        type: (["line", "bar", "pie", "scatter", "composed", "radar"].includes(bc.chart_type)
            ? bc.chart_type
            : "line") as ChartConfig["type"],
        xKey: "srvtime",
        yKey: bc.y_axis?.field || "temp",
        x: 0,
        y: 0,
        w: 6,
        h: 6,
    };
}

// ─────────────────────────────────────────────────────────────────────────────

interface DynamicChartBuilderProps {
    devices: { label: string; value: string }[];
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
    isCustomFolder = false,
    folderId,
}: DynamicChartBuilderProps) {
    const STORAGE_KEY = `charts_${window.location.pathname}_${storageKeyPattern}`;

    const [charts, setCharts] = useState<ChartConfig[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [type, setType] = useState(defaultChartType);
    const [xKey, setXKey] = useState("srvtime");
    const [yKey, setYKey] = useState("sPM2");

    // ── Backend sync state ───────────────────────────────────────────────────
    const [dashboardId, setDashboardId] = useState<number | null>(null);
    const [syncStatus, setSyncStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");

    // Guards: prevent the persist effect from firing during the initial load
    const initialLoadDone = useRef(false);
    // Prevent double-fetch in React strict-mode double-mount
    const fetchStarted = useRef(false);

    // ── Analytics / sensor data state ────────────────────────────────────────
    const [rawApiResponse, setRawApiResponse] = useState<{ data: any[] } | null>(null);
    const [pageLoading, setPageLoading] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);

    // ── 1. Load charts on mount ───────────────────────────────────────────────
    useEffect(() => {
        if (isCustomFolder && folderId != null) {
            // ── Custom folder: fetch saved charts from backend ─────────────
            if (fetchStarted.current) return;
            fetchStarted.current = true;

            setSyncStatus("loading");
            apiFetchDashboard(folderId)
                .then((dashboard) => {
                    if (dashboard && Array.isArray(dashboard.charts) && dashboard.charts.length > 0) {
                        setDashboardId(dashboard.id);
                        // Mark done BEFORE setCharts so the persist effect skips
                        // this state update (it's a restore, not a user change).
                        initialLoadDone.current = true;
                        setCharts((dashboard.charts as unknown as BackendChartConfig[]).map(fromApiChart));
                    } else {
                        // No dashboard yet — stay empty; persist effect must NOT
                        // fire here either (nothing to save until user adds a chart).
                        initialLoadDone.current = true;
                        setCharts([]);
                    }
                    setSyncStatus("idle");
                })
                .catch((err) => {
                    console.error("Failed to load dashboard from backend:", err);
                    initialLoadDone.current = true;
                    setSyncStatus("error");
                    setCharts([]);
                });
        } else {
            // ── Non-custom folder: restore from localStorage ───────────────
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                let parsed: ChartConfig[] = saved ? JSON.parse(saved) : [];

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
            initialLoadDone.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);   // run once on mount

    // ── 2. Persist charts whenever they change (after initial load) ───────────
    useEffect(() => {
        if (!initialLoadDone.current) return;   // still in initial load — skip

        if (isCustomFolder && folderId != null) {
            const idSnapshot = dashboardId;

            // Don't POST an empty array — wait until the user adds at least one chart.
            // If a dashboard already exists and user cleared all charts, still PUT.
            if (charts.length === 0 && idSnapshot === null) return;

            const apiCharts: BackendChartConfig[] = charts.map((c) => toApiChart(c, measurement));
            setSyncStatus("saving");

            const savePromise = idSnapshot !== null
                ? apiUpdateDashboard(idSnapshot, apiCharts as any)
                : apiCreateDashboard(folderId, apiCharts as any).then((created) => {
                    setDashboardId(created.id);
                    return created;
                });

            savePromise
                .then(() => setSyncStatus("saved"))
                .catch((err) => {
                    console.error("Failed to sync dashboard to backend:", err);
                    setSyncStatus("error");
                });
        } else {
            // ── Non-custom folder: persist to localStorage ─────────────────
            try {
                if (charts.length > 0) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
                }
            } catch (err) {
                console.error("Failed to save charts to localStorage", err);
            }
        }
        // dashboardId is intentionally omitted — it's read as a snapshot inside the effect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [charts]);

    // ── 3. Fetch sensor data for chart rendering ──────────────────────────────
    useEffect(() => {
        if (!devices.length) { setRawApiResponse(null); return; }

        async function loadAllData() {
            setPageLoading(true);
            setPageError(null);
            try {
                const response = await fetchSensorData({
                    deviceIds: devices.map((d) => d.value),
                    fields: fields.join(","),
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [devices.map((d) => d.value).join(","), measurement, timeFilter]);

    // ── Chart management ──────────────────────────────────────────────────────
    function addChart() {
        if (!xKey || !yKey) { alert("Select X and Y"); return; }
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
            const next = prev.filter((c) => c.id !== id);
            if (!isCustomFolder && next.length === 0) localStorage.removeItem(STORAGE_KEY);
            return next;
        });
    }

    function resetCharts() {
        if (!window.confirm("Reset all charts to default?")) return;
        if (!isCustomFolder) localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
    }

    // ── Sync status badge ─────────────────────────────────────────────────────
    const SyncBadge = () => {
        if (!isCustomFolder) return null;
        if (syncStatus === "loading") return (
            <span className="text-xs text-blue-500 animate-pulse flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                Loading…
            </span>
        );
        if (syncStatus === "saving") return (
            <span className="text-xs text-blue-400 animate-pulse flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block animate-bounce" />
                Saving…
            </span>
        );
        if (syncStatus === "saved") return (
            <span className="text-xs text-green-500 flex items-center gap-1">✓ Saved</span>
        );
        if (syncStatus === "error") return (
            <span className="text-xs text-red-500 flex items-center gap-1" title="Backend sync failed">
                ⚠ Sync error
            </span>
        );
        return null;
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-6 w-full h-full">

            {/* HEADER & BUTTONS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">{headerNode}</div>
                <div className="flex gap-3 shrink-0 items-center">
                    <SyncBadge />
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

            {/* ADD CHART PANEL */}
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
                        {fields.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select
                        value={yKey}
                        onChange={(e) => setYKey(e.target.value)}
                        className="border dark:border-gray-600 dark:bg-gray-700 rounded-md p-2 bg-gray-50"
                    >
                        {fields.map((f) => (
                            <option key={f} value={f} disabled={f === xKey}>{f}</option>
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

            {/* CHARTS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full relative">
                {(pageLoading || syncStatus === "loading") && (
                    <div className="absolute inset-x-0 -top-4 flex justify-center z-50">
                        <div className="bg-blue-600 text-white px-4 py-1 rounded-full text-xs animate-bounce shadow-lg">
                            {syncStatus === "loading" ? "Loading saved charts…" : "Refreshing Data..."}
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

                {syncStatus !== "loading" && charts.length === 0 && (
                    <div className="col-span-full h-40 flex items-center justify-center text-gray-500">
                        No charts added. Click "+ Add Chart" to create one.
                    </div>
                )}
            </div>

            {/* ANALYTICS PANELS */}
            <AnalyticsPanels rawApiResponse={rawApiResponse} devices={devices} />
        </div>
    );
}