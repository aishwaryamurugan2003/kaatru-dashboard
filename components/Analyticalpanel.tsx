import React, { useMemo } from "react";
import Plot from "react-plotly.js";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface TimeSeriesEntry {
    srvtime: number;
    value: number;
    device: string;
}

interface RawDeviceData {
    dID: string;
    status: number;
    data: Array<{
        srvtime: number;
        data: Record<string, number | null>;
    }>;
}

interface AnalyticsPanelsProps {
    // Raw API response from fetchSensorData (the full object with .data array)
    rawApiResponse: { data: RawDeviceData[] } | null;
    // All fields currently loaded (from all charts combined)
    allFieldData: Record<string, TimeSeriesEntry[]>;
    devices: Array<{ label: string; value: string }>;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

function formatTs(srvtime: number): string {
    return new Date(srvtime).toLocaleString("en-IN", {
        month: "short", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false,
    });
}

/* ─── AnalyticsPanels ────────────────────────────────────────────────────── */
export default function AnalyticsPanels({
    rawApiResponse,
    allFieldData,
    devices,
}: AnalyticsPanelsProps) {

    /* ── 1. Packet counts per device ─────────────────────────────────────── */
    const packetCounts = useMemo(() => {
        if (!rawApiResponse?.data) return [];
        return rawApiResponse.data
            .filter((d) => d.status === 200)
            .map((d) => ({ device: d.dID, count: d.data?.length ?? 0 }))
            .sort((a, b) => b.count - a.count);
    }, [rawApiResponse]);

    const maxCount = Math.max(...packetCounts.map((p) => p.count), 1);
    const totalPackets = packetCounts.reduce((s, p) => s + p.count, 0);
    const avgPackets = packetCounts.length ? Math.round(totalPackets / packetCounts.length) : 0;

    /* ── 2. Zero / null readings ─────────────────────────────────────────── */
    const zeroReadings = useMemo(() => {
        if (!rawApiResponse?.data) return [];
        const result: Array<{ ts: number; device: string; field: string; value: number }> = [];

        rawApiResponse.data
            .filter((d) => d.status === 200)
            .forEach((d) => {
                d.data?.forEach((entry) => {
                    Object.entries(entry.data ?? {}).forEach(([field, val]) => {
                        if (val === 0 || val === null) {
                            result.push({ ts: entry.srvtime, device: d.dID, field, value: val ?? 0 });
                        }
                    });
                });
            });

        // Group by device+field and count
        const grouped: Record<string, { ts: number; device: string; field: string; count: number }> = {};
        result.forEach((r) => {
            const key = `${r.device}__${r.field}`;
            if (!grouped[key]) {
                grouped[key] = { ts: r.ts, device: r.device, field: r.field, count: 0 };
            }
            grouped[key].count++;
        });

        return Object.values(grouped)
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    }, [rawApiResponse]);

    const totalZeroRows = zeroReadings.reduce((s, r) => s + r.count, 0);

    /* ── 3. Average packet delay (ms between consecutive readings) ────────── */
    const avgDelays = useMemo(() => {
        if (!rawApiResponse?.data) return [];
        return rawApiResponse.data
            .filter((d) => d.status === 200 && (d.data?.length ?? 0) > 1)
            .map((d) => {
                const sorted = [...d.data].sort((a, b) => a.srvtime - b.srvtime);
                let totalDiff = 0;
                for (let i = 1; i < sorted.length; i++) {
                    totalDiff += sorted[i].srvtime - sorted[i - 1].srvtime;
                }
                const avgMs = totalDiff / (sorted.length - 1);
                return { device: d.dID, avgDelayS: parseFloat((avgMs / 1000).toFixed(2)) };
            });
    }, [rawApiResponse]);

    /* ── 4. Poor GPS accuracy (entries where gps_accuracy or hdop > 5) ───── */
    const gpsAccuracyData = useMemo(() => {
        if (!rawApiResponse?.data) return [];
        const GPS_FIELDS = ["hdop", "gps_accuracy", "accuracy", "pdop"];
        const GPS_THRESHOLD = 5;

        const byMinute: Record<string, { ts: number; count: number; device: string }> = {};

        rawApiResponse.data
            .filter((d) => d.status === 200)
            .forEach((d) => {
                d.data?.forEach((entry) => {
                    const hasPoorGps = GPS_FIELDS.some((f) => {
                        const v = entry.data?.[f];
                        return v != null && v > GPS_THRESHOLD;
                    });
                    if (!hasPoorGps) return;

                    // Round to minute bucket
                    const bucket = Math.floor(entry.srvtime / 60000) * 60000;
                    const key = `${d.dID}__${bucket}`;
                    if (!byMinute[key]) {
                        byMinute[key] = { ts: bucket, count: 0, device: d.dID };
                    }
                    byMinute[key].count++;
                });
            });

        return Object.values(byMinute).sort((a, b) => a.ts - b.ts);
    }, [rawApiResponse]);

    const totalPoorGps = gpsAccuracyData.reduce((s, r) => s + r.count, 0);

    /* ── 5. Least packet counts table ────────────────────────────────────── */
    const leastCounts = useMemo(
        () => [...packetCounts].sort((a, b) => a.count - b.count).slice(0, 8),
        [packetCounts],
    );

    const medianCount = useMemo(() => {
        if (!packetCounts.length) return 0;
        const sorted = [...packetCounts].map((p) => p.count).sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
    }, [packetCounts]);

    /* ── Early return if no data yet ─────────────────────────────────────── */
    if (!rawApiResponse || packetCounts.length === 0) {
        return (
            <div className="mt-4 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-400 text-sm">
                Analytics panels will appear once data loads.
            </div>
        );
    }

    /* ── Radar chart data ─────────────────────────────────────────────────── */
    const radarLabels = avgDelays.map((d) => d.device);
    const radarValues = avgDelays.map((d) => d.avgDelayS);

    /* ── GPS line chart data ──────────────────────────────────────────────── */
    const uniqueGpsDevices = [...new Set(gpsAccuracyData.map((d) => d.device))];
    const gpsTraces: Plotly.Data[] = uniqueGpsDevices.map((dev, i) => {
        const devPoints = gpsAccuracyData.filter((d) => d.device === dev);
        return {
            x: devPoints.map((d) => new Date(d.ts)),
            y: devPoints.map((d) => d.count),
            type: "scatter" as const,
            mode: "lines+markers" as const,
            name: dev,
            line: { color: COLORS[i % COLORS.length], width: 1.5 },
            marker: { size: 4, color: COLORS[i % COLORS.length] },
            hovertemplate: `<b>${dev}</b><br>%{x|%H:%M}<br>%{y} events<extra></extra>`,
        };
    });

    const commonAxis = {
        showgrid: true,
        gridcolor: "#f3f4f6",
        tickfont: { color: "#6b7280", size: 11 },
        linecolor: "#e5e7eb",
    };

    return (
        <div className="flex flex-col gap-4 mt-4">

            {/* ── SUMMARY METRICS ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Total devices", value: packetCounts.length, color: "text-blue-600" },
                    { label: "Avg packet count", value: avgPackets.toLocaleString(), color: "text-emerald-600" },
                    { label: "Zero reading rows", value: totalZeroRows.toLocaleString(), color: "text-amber-600" },
                    { label: "Poor GPS events", value: totalPoorGps.toLocaleString(), color: "text-red-500" },
                ].map((m) => (
                    <div
                        key={m.label}
                        className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-600"
                    >
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{m.label}</p>
                        <p className={`text-2xl font-medium ${m.color}`}>{m.value}</p>
                    </div>
                ))}
            </div>

            {/* ── PACKET COUNTS + HORIZONTAL BAR ───────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Pictograph */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                        Number of packet counts for devices
                    </p>
                    <div className="flex flex-col gap-2">
                        {packetCounts.map((p, i) => {
                            const icons = Math.max(1, Math.round((p.count / maxCount) * 20));
                            return (
                                <div key={p.device} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right shrink-0">
                                        {p.device}
                                    </span>
                                    <div className="flex flex-wrap gap-0.5 flex-1">
                                        {Array.from({ length: icons }).map((_, j) => (
                                            <span
                                                key={j}
                                                className="inline-block w-4 h-4 rounded-full"
                                                style={{ backgroundColor: COLORS[i % COLORS.length] + "99" }}
                                                title={`${p.device}: ${p.count} packets`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-10 text-right shrink-0">
                                        {p.count.toLocaleString()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Horizontal bar chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                        Packet count — bar
                    </p>
                    <div className="flex flex-col gap-2">
                        {packetCounts.map((p, i) => {
                            const pct = ((p.count / maxCount) * 100).toFixed(1);
                            return (
                                <div key={p.device} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right shrink-0">
                                        {p.device}
                                    </span>
                                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-sm h-4 overflow-hidden">
                                        <div
                                            className="h-full rounded-sm transition-all duration-500"
                                            style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-10 text-right shrink-0">
                                        {p.count.toLocaleString()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── RADAR + GPS LINE ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Radar — avg packet delay */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Average packet delay per device (s)
                    </p>
                    {avgDelays.length >= 3 ? (
                        <div style={{ height: 260 }}>
                            <Plot
                                data={[{
                                    type: "scatterpolar" as const,
                                    r: [...radarValues, radarValues[0]],
                                    theta: [...radarLabels, radarLabels[0]],
                                    fill: "toself" as const,
                                    fillcolor: "rgba(59,130,246,0.15)",
                                    name: "Avg delay",
                                    line: { color: "#3b82f6", width: 2 },
                                    marker: { color: "#3b82f6", size: 5 },
                                }]}
                                layout={{
                                    margin: { t: 20, r: 40, b: 20, l: 40 },
                                    paper_bgcolor: "transparent",
                                    plot_bgcolor: "transparent",
                                    showlegend: false,
                                    polar: {
                                        bgcolor: "transparent",
                                        radialaxis: {
                                            visible: true,
                                            color: "#9ca3af",
                                            gridcolor: "#f3f4f6",
                                            tickfont: { size: 10, color: "#6b7280" },
                                        },
                                        angularaxis: {
                                            tickfont: { size: 11, color: "#374151" },
                                            gridcolor: "#f3f4f6",
                                            linecolor: "#e5e7eb",
                                        },
                                    },
                                }}
                                useResizeHandler
                                style={{ width: "100%", height: "100%" }}
                                config={{ displayModeBar: false, responsive: true }}
                            />
                        </div>
                    ) : (
                        <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">
                            Need ≥ 3 devices for radar chart
                        </div>
                    )}
                </div>

                {/* Poor GPS accuracy line chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Poor GPS accuracy over time
                    </p>
                    {gpsTraces.length > 0 ? (
                        <div style={{ height: 260 }}>
                            <Plot
                                data={gpsTraces}
                                layout={{
                                    margin: { t: 10, r: 16, b: 40, l: 40 },
                                    paper_bgcolor: "transparent",
                                    plot_bgcolor: "transparent",
                                    showlegend: gpsTraces.length > 1,
                                    legend: { orientation: "h", y: -0.2, font: { size: 11 } },
                                    xaxis: { ...commonAxis, type: "date" },
                                    yaxis: { ...commonAxis, title: { text: "events", font: { size: 11, color: "#6b7280" } } },
                                }}
                                useResizeHandler
                                style={{ width: "100%", height: "100%" }}
                                config={{ displayModeBar: false, responsive: true }}
                            />
                        </div>
                    ) : (
                        <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">
                            No poor GPS accuracy events in this time window
                        </div>
                    )}
                </div>
            </div>

            {/* ── ZERO READINGS TABLE + LEAST COUNTS TABLE ─────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Zero readings */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                        Sensor readings with zero / null values
                    </p>
                    {zeroReadings.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Timestamp</th>
                                        <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Device</th>
                                        <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Field</th>
                                        <th className="text-right py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {zeroReadings.map((r, i) => (
                                        <tr
                                            key={i}
                                            className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                        >
                                            <td className="py-2 px-2 text-gray-500 dark:text-gray-400 font-mono">
                                                {formatTs(r.ts)}
                                            </td>
                                            <td className="py-2 px-2">
                                                <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                                                    {r.device}
                                                </span>
                                            </td>
                                            <td className="py-2 px-2 text-gray-600 dark:text-gray-300">{r.field}</td>
                                            <td className="py-2 px-2 text-right font-medium text-gray-700 dark:text-gray-200 tabular-nums">
                                                {r.count.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t border-gray-200 dark:border-gray-600">
                                        <td colSpan={3} className="py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Total</td>
                                        <td className="py-2 px-2 text-right font-medium text-gray-700 dark:text-gray-200 tabular-nums">
                                            {totalZeroRows.toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
                            No zero readings detected
                        </div>
                    )}
                </div>

                {/* Least packet counts */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                        Devices with least packet counts
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Device ID</th>
                                    <th className="text-right py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Packets</th>
                                    <th className="text-center py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leastCounts.map((p, i) => {
                                    const isLow = p.count < medianCount * 0.7;
                                    return (
                                        <tr
                                            key={p.device}
                                            className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                        >
                                            <td className="py-2 px-2">
                                                <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                                                    {p.device}
                                                </span>
                                            </td>
                                            <td className="py-2 px-2 text-right font-medium text-gray-700 dark:text-gray-200 tabular-nums">
                                                {p.count.toLocaleString()}
                                            </td>
                                            <td className="py-2 px-2 text-center">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${isLow
                                                            ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300"
                                                            : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                                        }`}
                                                >
                                                    {isLow ? "Low" : "Normal"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    );
}