import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
    ArrowLeftOutlined,
    EnvironmentOutlined,
    CloudOutlined,
    ThunderboltOutlined,
    WifiOutlined,
    DashboardOutlined,
    LoadingOutlined,
    ExperimentOutlined,
    FireOutlined,
    AppstoreOutlined,
} from "@ant-design/icons";
import { Tooltip, Avatar, Badge, Empty, Card } from "antd";




// --- Rules Configuration (can be moved to a JSON file later) ---
const RULES_CONFIG = [
    {
        id: "pm",
        label: "PM",
        icon: "CloudOutlined",
        fields: ["sPM2", "sPM4", "sPM10"],
        type: "pm_continuity",
        minPackets: 5,
    },
    {
        id: "temp_hum",
        label: "Env",
        icon: "ExperimentOutlined",
        pairs: [["temp", "rh"], ["sTemp", "sRh"]],
        type: "pair_check",
    },
    {
        id: "gps",
        label: "GPS",
        icon: "EnvironmentOutlined",
        fields: ["lat", "long"],
        type: "non_zero",
    },
    // {
    //     id: "power",
    //     label: "Sys",
    //     icon: "ThunderboltOutlined",
    //     fields: ["rHeap"],
    //     threshold: 100000,
    //     type: "threshold",
    // },
    {
        id: "voc",
        label: "VOC",
        icon: "FireOutlined",
        fields: ["sVocI"],
        type: "non_null",
    },
    {
        id: "wifi",
        label: "Net",
        icon: "WifiOutlined",
        type: "always_green", // Mock for now
    }
];

// --- Types ---
interface DeviceData {
    pID: number;
    dID: string;
    rHeap: number;
    lHeap: number;
    dTS: number;
    dUT: number;
    lat: number;
    long: number;
    temp: number;
    rh: number;
    sPM2: number;
    sPM4: number;
    sPM10: number;
    sTemp: number;
    sRh: number;
    sVocI: number;
    sNoxI: number;
    [key: string]: any;
}

const getIcon = (iconName: string) => {
    switch (iconName) {
        case "CloudOutlined": return <CloudOutlined />;
        case "ExperimentOutlined": return <ExperimentOutlined />;
        case "EnvironmentOutlined": return <EnvironmentOutlined />;
        case "ThunderboltOutlined": return <ThunderboltOutlined />;
        case "FireOutlined": return <FireOutlined />;
        case "WifiOutlined": return <WifiOutlined />;
        default: return <AppstoreOutlined />;
    }
};

const validateRule = (rule: any, data: DeviceData, history: DeviceData[]) => {
    switch (rule.type) {
        case "pm_continuity": {
            const currentValues = rule.fields.map((f: string) => data[f]);
            const allZero = currentValues.every((v: any) => !v || v === 0);
            if (allZero) return { status: "error", message: "All PM sensors reporting 0 or null" };

            if (history.length >= rule.minPackets) {
                const lastN = history.slice(-rule.minPackets);
                const isConstant = rule.fields.every((f: string) => {
                    const vals = lastN.map(h => h[f]);
                    return vals.every(v => v === vals[0]);
                });
                if (isConstant) return { status: "error", message: `Values constant for ${rule.minPackets} packets` };
            }
            return { status: "success", message: "PM Sensors Normal" };
        }

        case "pair_check": {
            const hasValidPair = rule.pairs.some((pair: string[]) => {
                return pair.every(field => data[field] !== null && data[field] !== undefined && data[field] !== 0);
            });
            if (!hasValidPair) return { status: "error", message: "No valid Temp/RH pair available" };
            return { status: "success", message: "Environmental Sensors Normal" };
        }

        case "non_zero": {
            const allValid = rule.fields.every((f: string) => data[f] && data[f] !== 0);
            if (!allValid) return { status: "error", message: `Missing or zero values for ${rule.fields.join(", ")}` };
            return { status: "success", message: "GPS Location Valid" };
        }

        case "threshold": {
            const val = data[rule.fields[0]];
            if (val < rule.threshold) return { status: "warning", message: `Value below threshold ${rule.threshold}` };
            return { status: "success", message: "System checks passed" };
        }

        case "non_null": {
            const val = data[rule.fields[0]];
            if (val === null || val === undefined) return { status: "error", message: "Sensor data missing" };
            return { status: "success", message: "Data available" };
        }

        case "always_green":
            return { status: "success", message: "Operational" };

        default:
            return { status: "success", message: "Checked" };
    }
};

const GroupRealtimeDetail: React.FC = () => {
    const { groupId } = useParams<{ groupId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const groupName = location.state?.groupName || groupId;

    const [allDeviceIds, setAllDeviceIds] = useState<string[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

    useEffect(() => {
        const fetchGroupDevices = async () => {
            try {
                const response = await fetch(`https://bw04.kaatru.org/group?id=${groupId}`);
                const data = await response.json();
                if (data.devices) {
                    setAllDeviceIds(data.devices);
                }
            } catch (error) {
                console.error("Error fetching group devices:", error);
            }
        };
        fetchGroupDevices();
    }, [groupId]);

    const [devices, setDevices] = useState<Record<string, DeviceData>>({});
    const [deviceHistory, setDeviceHistory] = useState<Record<string, DeviceData[]>>({});
    const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
    const [lastMessageTime, setLastMessageTime] = useState<number>(0);

    useEffect(() => {
        let ws: WebSocket | null = null;
        let reconnectTimeout: any = null;

        const connect = () => {
            const token = localStorage.getItem("token");
            const baseUrl = import.meta.env.VITE_REALTIME_WEBSOCKET || "ws://localhost:8000";
            const wsUrl = `${baseUrl}/stream/group/${groupId}?token=${encodeURIComponent(token)}`;

            ws = new WebSocket(wsUrl);
            setWsStatus("connecting");

            ws.onopen = () => {
                setWsStatus("connected");
                console.log("WS Connected for group:", groupId);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const dID = data.dID;
                    if (!dID) return;

                    setLastMessageTime(Date.now());
                    setDevices(prev => ({ ...prev, [dID]: data }));
                    setDeviceHistory(prev => {
                        const h = prev[dID] || [];
                        return {
                            ...prev,
                            [dID]: [...h, data].slice(-10)
                        };
                    });
                } catch (e) {
                    console.error("WS Parse error", e);
                }
            };

            ws.onclose = () => {
                setWsStatus("disconnected");
                reconnectTimeout = setTimeout(connect, 5000);
            };

            ws.onerror = () => setWsStatus("disconnected");
        };

        connect();

        return () => {
            if (ws) ws.close();
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
        };
    }, [groupId]);

    const displayedDevices = useMemo(() => {
        const activeIds = Object.keys(devices);
        const inactiveIds = allDeviceIds.filter(id => !activeIds.includes(id));

        const activeList = Object.values(devices).map(d => ({ ...d, isInactive: false }));
        const inactiveList = inactiveIds.map(id => ({
            dID: id,
            isInactive: true,
            dTS: 0,
            rHeap: 0,
            dUT: 0
        })) as any[];

        return [...activeList, ...inactiveList].sort((a, b) => a.dID.localeCompare(b.dID));
    }, [devices, allDeviceIds]);

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
            {/* Main Content */}
            <div className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 transition-all duration-300`}>
                {/* Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div
                            onClick={() => navigate(-1)}
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                        >
                            <ArrowLeftOutlined className="text-gray-600 dark:text-gray-300" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100 tracking-tight">
                                {wsStatus === "connected" ? "Live: " : ""}{groupName}
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge status={wsStatus === "connected" ? "processing" : "default"} color={wsStatus === "connected" ? "#10b981" : "#ef4444"} />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                    {wsStatus} {lastMessageTime > 0 && `• Last update: ${new Date(lastMessageTime).toLocaleTimeString()}`}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden sm:block text-right">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Units</div>
                            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{displayedDevices.length}</div>
                        </div>
                        <div className="hidden sm:block text-right border-l pl-6 border-gray-100 dark:border-gray-700">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active</div>
                            <div className="text-2xl font-black text-green-500">{Object.keys(devices).length}</div>
                        </div>
                    </div>
                </div>

                {/* Grid of Device Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-10">
                    {displayedDevices.length === 0 ? (
                        <div className="col-span-full h-64 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                            <Empty description={<span className="text-gray-400 font-medium">Waiting for data stream...</span>} />
                            {wsStatus === "connecting" && <LoadingOutlined className="mt-4 text-blue-500 text-xl" />}
                        </div>
                    ) : (
                        displayedDevices.map(device => (
                            <DeviceCard
                                key={device.dID}
                                device={device}
                                history={deviceHistory[device.dID] || []}
                                isSelected={selectedDeviceId === device.dID}
                                onSelect={() => setSelectedDeviceId(device.dID === selectedDeviceId ? null : device.dID)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Sidebar for Live JSON */}
            {selectedDeviceId && (
                <div className="w-[400px] border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Live Device Data</h2>
                        <span className="text-[10px] font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                            {selectedDeviceId}
                        </span>
                    </div>
                    <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-900/50">
                    <div className="p-0 w-[100%] flex justify-end border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <button
                            onClick={() => setSelectedDeviceId(null)}
                            className="w-[30%] py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-bold text-xs rounded-xl transition-all"
                        >
                            CLOSE SIDEBAR
                        </button>
                    </div>
                        {devices[selectedDeviceId] ? (
                            <pre className="text-[11px] font-mono text-gray-700 dark:text-gray-300 leading-relaxed">
                                {JSON.stringify(devices[selectedDeviceId], null, 2)}
                            </pre>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6">
                                <Empty description={<span className="text-gray-400">No live data yet for this device.</span>} />
                            </div>
                        )}
                    </div>
                    
                </div>
            )}
        </div>
    );
};

const DeviceCard: React.FC<{
    device: any;
    history: DeviceData[];
    isSelected: boolean;
    onSelect: () => void;
}> = ({ device, history, isSelected, onSelect }) => {
    const isInactive = device.isInactive;

    return (
        <Card
            onClick={onSelect}
            className={`rounded-2xl border-2 transition-all group overflow-hidden cursor-pointer ${isSelected
                ? "border-blue-500 shadow-lg ring-4 ring-blue-500/10 scale-[1.02]"
                : "border-transparent shadow-sm hover:shadow-md bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
                } ${isInactive ? "opacity-80 grayscale-[0.5]" : ""}`}
            bodyStyle={{ padding: "20px" }}
        >
            <div className="flex items-start gap-4">
                {/* Avatar Area */}
                <Avatar
                    size={56}
                    className="flex-shrink-0 font-bold border-2 border-white dark:border-gray-700 shadow-sm transition-transform group-hover:scale-105"
                    style={{
                        backgroundColor: isInactive ? "#fee2e2" : "#ebf5ff",
                        color: isInactive ? "#ff3030ff" : "#2563eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    {device.dID.substring(0, 2).toUpperCase()}
                </Avatar>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col truncate">
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-black text-gray-800 dark:text-gray-100 truncate leading-tight">
                                    {device.dID}
                                </span>
                                {isInactive && (
                                    <Badge count="Inactive" style={{ backgroundColor: '#ff3939ff', fontSize: '10px', fontWeight: 'bold' }} />
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded uppercase">
                                    Mac ID
                                </span>
                                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 truncate">
                                    {device.dMID}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Status Row */}
                    <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-50 dark:border-gray-700/50">
                        <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600 uppercase">Sensors</span>
                        <div className="flex items-center gap-2.5">
                            {isInactive ? (
                                <span className="text-[10px] text-red-400 font-bold italic">Waiting for signal...</span>
                            ) : (
                                RULES_CONFIG.map(rule => {
                                    const result = validateRule(rule, device, history);
                                    return (
                                        <Tooltip key={rule.id} title={`${rule.label}: ${result.message}`}>
                                            <div
                                                className={`text-lg transition-all duration-300 transform hover:scale-120 ${result.status === "success"
                                                    ? "text-green-500"
                                                    : result.status === "warning"
                                                        ? "text-orange-400"
                                                        : "text-red-500"
                                                    }`}
                                            >
                                                {getIcon(rule.icon)}
                                            </div>
                                        </Tooltip>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Footer */}
            <div className="mt-5 pt-3 flex items-center justify-between text-[10px] font-bold text-gray-400 dark:text-gray-600 border-t border-gray-50 dark:border-gray-700/50 uppercase tracking-tighter">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <DashboardOutlined className="text-[12px]" />
                        <span>Packet No: {device.pId > 1000 ? `${(device.pID / 1024).toFixed(0)}K` : device.pID || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <ThunderboltOutlined className="text-[12px]" />
                        <span>Uptime: {device.dUT || 0} mins</span>
                    </div>
                </div>
                <div className="text-gray-300 dark:text-gray-700">
                    {device.dTS ? new Date(device.dTS * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "--:--:--"}
                </div>
            </div>
        </Card>
    );
};


export default GroupRealtimeDetail;
