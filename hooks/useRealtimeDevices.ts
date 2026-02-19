import { useEffect, useRef, useState } from "react";
import { apiService, Endpoint } from "../services/api";

export function useRealtimeDevices(groupId: string, selectedDevices: string[]) {
  const [devices, setDevices] = useState<Record<string, any>>({});
  const [mqttTopic, setMqttTopic] = useState<string>("");

  /* ------------------------------------------------------------
     RESET DEVICES WHEN GROUP OR SELECTION CHANGES
  ------------------------------------------------------------ */
  useEffect(() => {
    setDevices({});
    apiService.disconnectAllWebSockets();
  }, [groupId, selectedDevices]);

  /* ------------------------------------------------------------
     FETCH MQTT TOPIC WHEN GROUP CHANGES
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!groupId) return;

    apiService
      .get(Endpoint.GROUP_DEVICES, { id: groupId })
      .then((res: any) => {
        const topic = res.data.group?.[0]?.mqtt_topic || "";
        setMqttTopic(topic);
        console.log("MQTT TOPIC:", topic);
      })
      .catch((err) => {
        console.error("Failed to load MQTT topic", err);
      });
  }, [groupId]);

  /* ------------------------------------------------------------
     CONNECT WEBSOCKETS WHEN TOPIC + DEVICES READY
  ------------------------------------------------------------ */
useEffect(() => {
  if (!mqttTopic || selectedDevices.length === 0) return;

  apiService.disconnectAllWebSockets();

  selectedDevices.forEach((deviceId) => {
    // Replace wildcard with actual device id
    const deviceTopic = mqttTopic.replace("+", deviceId);

    console.log("Connecting:", deviceTopic);

    apiService.connectDeviceWebSocket(
      deviceId,
      deviceTopic,
      (data) => {
        setDevices((prev) => ({
          ...prev,
          [deviceId]: data,
        }));
      }
    );
  });

  return () => {
    apiService.disconnectAllWebSockets();
  };
}, [mqttTopic, selectedDevices]);


  return devices;
}
