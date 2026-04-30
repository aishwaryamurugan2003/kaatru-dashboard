import React, { useState } from "react";
import TimeSeriesChart from "../components/TimeSeriesChart";
import HeatMapLeaflet from "../components/HeatMapLeaflet";
import DeviceSelector from "../components/DeviceSelector";
import { apiService, Endpoint } from "../services/api";
import axios from "axios";

const ALL_DEVICES = ["MG53", "MG39", "MG57", "MG61" , "MG67" , "MG60"];

// Utility to format timestamp for datetime-local input
const formatTimestampForInput = (timestamp: number): string => {
  const date = new Date(timestamp);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - timezoneOffset);
  return localDate.toISOString().slice(0, 16);
};

const DataAnalysisPage: React.FC = () => {
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [startTime, setStartTime] = useState(Date.now() - 3600 * 1000);
  const [endTime, setEndTime] = useState(Date.now());
  const [loading, setLoading] = useState(false);

  const [chartData, setChartData] = useState<any[]>([]);
  const [mapData, setMapData] = useState<any[]>([]);

  // ⭐ TOKEN STATE
  const [tokenAlive, setTokenAlive] = useState(true);

  const handleFetchClick = async () => {
    if (selectedDevices.length === 0) {
      alert("Please select at least one device.");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.get(
        "http://127.0.0.1:9000/spatio-temporal/raw",
        {
          params: {
            devices: selectedDevices.join(","),
            param: "sPM2",
            start_time: startTime,
            end_time: endTime,
          },
        }
      );

      // ⭐ TOKEN EXPIRED → NO DATA
      if (!res) {
        setTokenAlive(false);
        setChartData([]);
        setMapData([]);
        return;
      }

      if (res.status === 200) {
        setTokenAlive(true);

        const raw = res.data || [];

        // ---------- CHART FORMAT ----------
        const chartSeries = [
          {
            deviceId: selectedDevices[0],
            data: raw.map((item: any) => ({
              dTS: item.dTS,
              sPM2: item.sPM2,
            })),
          },
        ];

        // ---------- MAP FORMAT ----------
        const mapSeries = raw
          .map((item: any) => {
            const lat = Number(item.lat ?? item.latitude);
            const lng = Number(item.long ?? item.lon ?? item.lng ?? item.longitude);
            
            return {
              lat,
              lng,
              sPM2: item.sPM2,
              dTS: item.dTS,
            };
          })
          .filter((p) => !isNaN(p.lat) && !isNaN(p.lng));

        setChartData(chartSeries);
        setMapData(mapSeries);
      } else {
        alert("Failed to fetch data.");
      }
    } catch (err) {
      console.error(err);
      alert("Error fetching data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ---------------- CONTROLS ---------------- */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="lg:col-span-2">
            <DeviceSelector
              availableDevices={ALL_DEVICES}
              selectedDevices={selectedDevices}
              onChange={setSelectedDevices}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Start Time
            </label>
            <input
              type="datetime-local"
              value={formatTimestampForInput(startTime)}
              onChange={(e) =>
                setStartTime(new Date(e.target.value).getTime())
              }
              className="w-full rounded-md p-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              End Time
            </label>
            <input
              type="datetime-local"
              value={formatTimestampForInput(endTime)}
              onChange={(e) =>
                setEndTime(new Date(e.target.value).getTime())
              }
              className="w-full rounded-md p-2 text-sm"
            />
          </div>

          <div className="md:col-start-2 lg:col-start-4">
            <button
              onClick={handleFetchClick}
              disabled={loading}
              className="w-full bg-primary-600 text-white font-bold py-2 px-4 rounded-md"
            >
              {loading ? "Loading..." : "Fetch Data"}
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- TOKEN EXPIRED MESSAGE ---------------- */}
      {!tokenAlive && (
        <div className="text-center text-gray-400 py-10">
          No data available (session expired)
        </div>
      )}

      {/* ---------------- CHARTS ---------------- */}
      {tokenAlive && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md min-h-[500px]">
            <h2 className="text-lg font-semibold mb-2">
              PM2.5 Time Series
            </h2>
            <TimeSeriesChart data={chartData} loading={loading} />
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md min-h-[500px]">
            <h2 className="text-lg font-semibold mb-2">
              Device Path on Map
            </h2>
            <HeatMapLeaflet data={mapData} loading={loading} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DataAnalysisPage;
