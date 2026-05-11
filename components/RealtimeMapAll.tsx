import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import * as L from "leaflet";
import { useEffect, useRef } from "react";

function createBubbleIcon(id: string, isActive: boolean) {
  const color = isActive ? "#2563eb" : "#60a5fa";
  const size = isActive ? 56 : 48;
  const html = `
    <div style="
      background: ${color};
      color: white;
      border-radius: 50%;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      font-family: sans-serif;
      box-shadow: ${isActive ? "0 0 0 4px rgba(37,99,235,0.3), 0 2px 8px rgba(0,0,0,0.4)" : "0 2px 6px rgba(0,0,0,0.35)"};
      border: 2px solid white;
      text-align: center;
      word-break: break-all;
      padding: 2px;
      line-height: 1.2;
    ">${id}</div>
  `;
  return L.divIcon({
    html,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -32],
  });
}

/* ---------------------------------------------
   AUTO FLY
--------------------------------------------- */
function FlyToActive({
  devices,
  activeId,
}: {
  devices: Record<string, any>;
  activeId?: string | null;
}) {
  const map = useMap();
  const prevIdRef = useRef<string | null>(null);

  useEffect(() => {
    console.log("[FlyToActive] activeId:", activeId);
    console.log("[FlyToActive] device:", activeId ? devices[activeId] : null);

    if (!activeId) return;

    const device = devices[activeId];

    // ✅ Try both lat/lon and latitude/longitude field names
    const lat = device?.lat ?? device?.latitude;
    const lon = device?.lon ?? device?.longitude ?? device?.lng;

    console.log("[FlyToActive] lat/lon:", lat, lon);

    if (!lat || !lon) return;

    if (prevIdRef.current !== activeId) {
      prevIdRef.current = activeId;
      console.log("[FlyToActive] Flying to:", lat, lon);
      map.stop();
      map.flyTo([lat, lon], 14, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  }, [activeId]); // ✅ only activeId as dep — avoids re-running on every devices update

  return null;
}

interface Props {
  devices: Record<string, any>;
  activeId?: string | null;
  onMarkerClick?: (id: string) => void;
}

export default function RealtimeMapAll({ devices, activeId, onMarkerClick }: Props) {
  const deviceList = Object.values(devices);

  // ✅ Debug: log what activeId and devices look like
  console.log("[RealtimeMapAll] activeId:", activeId, "| deviceKeys:", Object.keys(devices));

  if (deviceList.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">No Devices</div>
    );
  }

  return (
    <MapContainer
      center={[20, 78]}
      zoom={5}
      className="z-0"
      style={{ height: "100%", width: "100%", zIndex: 0 }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <FlyToActive devices={devices} activeId={activeId} />

      {deviceList.map((d: any) => {
        if (!d?.lat || !d?.lon) return null;
        const isActive = d.id === activeId;

        return (
          <Marker
            key={d.id}
            position={[d.lat, d.lon]}
            icon={createBubbleIcon(d.id, isActive)}
            eventHandlers={{
              click: () => onMarkerClick?.(d.id),
            }}
          >
            <Popup>{d.id}</Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}