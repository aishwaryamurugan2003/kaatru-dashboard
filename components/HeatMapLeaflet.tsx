
// import React, { useEffect, useMemo, useRef } from 'react';
// import { MapContainer, TileLayer, useMap } from 'react-leaflet';
// import "leaflet.heat";
// // FIX: Corrected the leaflet import. Types like LatLngBounds are not named exports but properties of the L namespace. This resolves the module augmentation error.
// import L from 'leaflet';
// import { MapPoint } from '../types';

// // The leaflet-heat plugin extends Leaflet's L namespace. This module augmentation
// // adds the necessary types for the plugin.
// // FIX: Changed from `declare module 'leaflet'` to `declare global` to correctly augment the global L namespace.
// // This is necessary because the leaflet-heat plugin is likely loaded via a script tag and attaches itself to the global `window.L` object.
// // This resolves the module augmentation errors and allows TypeScript to find the LatLng and LatLngTuple types.
// declare global {
//   namespace L {
//     type HeatLatLngTuple = [number, number, number];

//     interface HeatLayerOptions {
//       minOpacity?: number;
//       maxZoom?: number;
//       max?: number;
//       radius?: number;
//       blur?: number;
//       gradient?: { [key: number]: string };
//     }

//     function heatLayer(latlngs: (import('leaflet').LatLng | import('leaflet').LatLngTuple | HeatLatLngTuple)[], options?: HeatLayerOptions): any;
//   }
// }

// interface HeatMapLeafletProps {
//   data: MapPoint[];
//   loading: boolean;
// }

// const MapSkeleton: React.FC = () => (
//   <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md"></div>
// );

// interface ChangeViewProps {
//   // FIX: LatLngBounds is a property of the L namespace.
//   bounds: L.LatLngBounds;
// }

// const ChangeView: React.FC<ChangeViewProps> = ({ bounds }) => {
//   const map = useMap();
//   useEffect(() => {
//     if (bounds.isValid()) {
//       map.fitBounds(bounds, { padding: [50, 50] });
//     }
//   }, [map, bounds]);
//   return null;
// };


// interface HeatmapLayerProps {
//   points: MapPoint[];
// }

// const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ points }) => {
//   const map = useMap();
//   const heatLayerRef = useRef<any>(null);

//   useEffect(() => {
//     // Clean up previous layer
//     if (heatLayerRef.current) {
//       map.removeLayer(heatLayerRef.current);
//     }

//     if (points && points.length > 0) {
//       const heatPoints: L.HeatLatLngTuple[] = points.map(p => [
//         p.lat,
//         p.lng,     // FIXED
//         p.sPM2
//       ]);


//       // Use the global L object from window, which is patched by the leaflet-heat script.
//       const GlobalL = (window as any).L;

//       if (GlobalL && GlobalL.heatLayer) {
//         heatLayerRef.current = GlobalL.heatLayer(heatPoints, {
//           radius: 35,
//           blur: 25,
//           maxZoom: 17,
//           max: 100, // Max expected PM2.5 value for intensity scaling
//           gradient: {
//             0.4: 'blue',
//             0.6: 'cyan',
//             0.7: 'lime',
//             0.8: 'yellow',
//             1.0: 'red'
//           }
//         }).addTo(map);
//       } else {
//         console.error("Leaflet or Leaflet-Heat plugin not loaded correctly.");
//       }
//     }

//     return () => {
//       if (heatLayerRef.current) {
//         map.removeLayer(heatLayerRef.current);
//       }
//     };
//   }, [map, points]);

//   return null; // This component manages the layer, doesn't render JSX
// };


// const HeatMapLeaflet: React.FC<HeatMapLeafletProps> = ({ data, loading }) => {
//   const bounds = useMemo(() => {
//     if (!data || data.length === 0) {
//       // FIX: LatLngBounds is a property of the L namespace.
//       return new L.LatLngBounds([12.9716, 77.5946], [13.0827, 80.2707]); // Default to a region in India
//     }
//     const lats = data.map(p => p.lat);
//     const longs = data.map(p => p.lng);

//     // FIX: LatLngBounds is a property of the L namespace.
//     return new L.LatLngBounds(
//       [Math.min(...lats), Math.min(...longs)],
//       [Math.max(...lats), Math.max(...longs)]
//     );

//   }, [data]);

//   if (loading) {
//     return <MapSkeleton />;
//   }
//   console.log(data)
//   if (!data || data.length === 0) {
//     return (
//       <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
//         <p>No map data to display. Please select a device.</p>
//       </div>
//     );
//   }

//   return (
//     <MapContainer center={[13.0, 80.2]} zoom={10} scrollWheelZoom={true} style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}>
//       <TileLayer
//         attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//         url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//       />

//       <HeatmapLayer points={data} />

//       <ChangeView bounds={bounds} />
//     </MapContainer>
//   );
// };

// export default HeatMapLeaflet;


import React, { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPoint } from "../types";

const getPM25Color = (pm25: number) => {
  if (pm25 <= 30) return "#00e400";  
  if (pm25 <= 60) return "#9cff9c";  
  if (pm25 <= 90) return "#ffff00";  
  if (pm25 <= 120) return "#ff7e00"; 
  if (pm25 <= 250) return "#ff0000"; 
  return "#7e0023";                  
};

const CircleMarkersLayer: React.FC<{ points: MapPoint[] }> = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    map.eachLayer((layer: any) => {
      if (layer.options && layer.options.className === "pm25-circle") {
        map.removeLayer(layer);
      }
    });

    points.forEach((p) => {
      L.circle([p.lat, p.lng], {
        radius: 50, // 500 meters
        color: getPM25Color(p.sPM2),
        weight: 1,
        fillColor: getPM25Color(p.sPM2),
        fillOpacity: 0.6,
        className: "pm25-circle"
      })
        .bindPopup(`PM2.5: ${p.sPM2}`)
        .addTo(map);
    });

  }, [points, map]);

  return null;
};

const HeatMapLeaflet: React.FC<{ data: MapPoint[]; loading: boolean }> = ({
  data,
  loading,
}) => {
  const bounds = useMemo(() => {
    if (!data || data.length === 0) {
      return new L.LatLngBounds([12.97, 77.59], [13.08, 80.27]);
    }
    return new L.LatLngBounds(
      [Math.min(...data.map((p) => p.lat)), Math.min(...data.map((p) => p.lng))],
      [Math.max(...data.map((p) => p.lat)), Math.max(...data.map((p) => p.lng))]
    );
  }, [data]);

  if (loading) return <p>Loading...</p>;

  return (
    <MapContainer
      center={[13.0, 80.2]}
      zoom={12}
      scrollWheelZoom
      style={{ height: "100%", width: "100%", borderRadius: "8px" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <CircleMarkersLayer points={data} />
    </MapContainer>
  );
};

export default HeatMapLeaflet;
