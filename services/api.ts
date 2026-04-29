/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { type AxiosResponse } from "axios";

/* ------------------------------------------------------------
   ENDPOINT CONSTANTS
------------------------------------------------------------ */
export const Endpoint = {
  FETCH_DATA_ANALYSIS: "/spatio-temporal/raw",
  KEYCLOAK_USERS: "https://caas.kaatru.org/keycloak/users",
  GROUP_ALL: "https://bw04.kaatru.org/group/all",
  GROUP_DEVICES: "https://bw04.kaatru.org/group",
  ACCESS_MANAGEMENT: "https://caas.kaatru.org/admin/access-management",
  ACCESS_MANAGEMENT_SYNC: "https://caas.kaatru.org/admin/access-management/sync",
  DATA_DOWNLOAD: "http://bw02.kaatru.org/job/data/download",


  // ✅ OTA ENDPOINTS
  OTA_UPLOAD_FIRMWARE: "/user/upload",
  OTA_USER_RUNNING_VERSION: "/user/running-version",
  OTA_DEVICE_RUNNING_VERSION: "/device/running-version",
  OTA_DEVICE_FIRMWARE_FILE: "/device/file",
  OTA_DEVICE_UPDATE_AFTER: "/device/update-running-version-after-ota",
} as const;

/* ------------------------------------------------------------
   JWT UTILITY
------------------------------------------------------------ */
export function isTokenAlive(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------
   BASE CLASS
------------------------------------------------------------ */
abstract class ApiService {
  abstract isLoggedIn(): Promise<boolean>;
  abstract login(user: string, pwd: string): Promise<AxiosResponse | any>;
  abstract setKeycloakToken(token: string): void;
  abstract clearToken(): void;

  abstract get(endpoint: string, payload?: Record<string, any>): Promise<any>;
  abstract post(endpoint: string, payload: any): Promise<any>;
  abstract put(endpoint: string, payload: any): Promise<any>;
  abstract patch(endpoint: string, payload: any): Promise<any>;
  abstract getRamanAnalysis(endpoint: string, payload?: Record<string, any>): Promise<any>;

  abstract getUserFullAccess(userId: string): Promise<any[]>;
  abstract syncUserAccess(userId: string, access: any[]): Promise<any>;



  // ✅ OTA METHODS
  abstract uploadFirmware(deviceId: string, deviceGroup: string, file: File): Promise<any>;
  abstract setRunningVersion(deviceId: string, versionNumber: string): Promise<any>;
  abstract getRunningVersion(deviceId: string): Promise<any>;
  abstract getFirmwareFile(deviceId: string, version: string): Promise<any>;
  abstract updateRunningVersionAfterOTA(deviceId: string): Promise<any>;

  abstract fetchDevices(): Promise<any[]>;

  abstract connectDeviceWebSocket(
    deviceId: string,
    mqttTopic: string,
    onMessage: (data: any) => void
  ): void;

  abstract disconnectAllWebSockets(): void;
  abstract downloadData(payload: {
    startTime: string;
    endTime: string;
    device: string;
    email: string;
  }): Promise<any>;
}

/* ------------------------------------------------------------
   PRODUCTION IMPLEMENTATION
------------------------------------------------------------ */
class Production extends ApiService {
  #host: string;
  #wsChannels: Record<string, WebSocket> = {};

  constructor() {
    super();
    this.#host =
      import.meta.env.VITE_APP_API_URL_PREFIX || "http://localhost:8000/v1";
    console.log("🌍 API HOST:", this.#host);
  }

  setKeycloakToken(_: string) { }

  clearToken() {
    localStorage.removeItem("token");
  }

  #getHeaders() {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  #buildUrl(endpoint: string) {
    if (!endpoint) throw new Error("Endpoint is undefined");
    return endpoint.startsWith("http")
      ? endpoint
      : `${this.#host}${endpoint}`;
  }

  async login(user: string, pwd: string) {
    const url = this.#buildUrl("/login");
    const res = await axios.post(url, {
      username: user,
      password: pwd,
    });
    localStorage.setItem("token", res.data.access_token);
    return res;
  }
  async isLoggedIn() {
    const token = localStorage.getItem("token");
    return isTokenAlive(token);
  }


  async get(endpoint: string, payload?: any) {
    const url = this.#buildUrl(endpoint);
    return axios.get(url, {
      params: payload,
      headers: this.#getHeaders(),
    });
  }

  async post(endpoint: string, payload: any) {
    const url = this.#buildUrl(endpoint);
    return axios.post(url, payload, {
      headers: this.#getHeaders(),
    });
  }

  async put(endpoint: string, payload: any) {
    const url = this.#buildUrl(endpoint);
    return axios.put(url, payload, {
      headers: this.#getHeaders(),
    });
  }

  async patch(endpoint: string, payload: any) {
    const url = this.#buildUrl(endpoint);
    return axios.patch(url, payload, {
      headers: this.#getHeaders(),
    });
  }

  async getRamanAnalysis(endpoint: string, payload?: any) {
    return this.get(endpoint, payload);
  }



  /* ------------------------------------------------------------
     ✅ OTA API
  ------------------------------------------------------------ */
  async uploadFirmware(deviceId: string, deviceGroup: string, file: File) {
    const url = this.#buildUrl(`${Endpoint.OTA_UPLOAD_FIRMWARE}/${deviceId}`);
    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post(url, formData, {
      params: { device_group: deviceGroup },
      headers: {
        ...this.#getHeaders(),
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  }

  async setRunningVersion(deviceId: string, versionNumber: string) {
    const url = this.#buildUrl(`${Endpoint.OTA_USER_RUNNING_VERSION}/${deviceId}`);
    const res = await axios.post(url, null, {
      params: { version_number: versionNumber },
      headers: this.#getHeaders(),
    });
    return res.data;
  }

  async getRunningVersion(deviceId: string) {
    const url = this.#buildUrl(`${Endpoint.OTA_DEVICE_RUNNING_VERSION}/${deviceId}`);
    const res = await axios.get(url, { headers: this.#getHeaders() });
    return res.data;
  }

  async getFirmwareFile(deviceId: string, version: string) {
    const url = this.#buildUrl(`${Endpoint.OTA_DEVICE_FIRMWARE_FILE}/${deviceId}/${version}`);
    const res = await axios.get(url, {
      headers: this.#getHeaders(),
      responseType: "blob"
    });
    return res.data;
  }

  async updateRunningVersionAfterOTA(deviceId: string) {
    const url = this.#buildUrl(Endpoint.OTA_DEVICE_UPDATE_AFTER);
    const res = await axios.post(url, null, {
      params: { device_id: deviceId },
      headers: this.#getHeaders(),
    });
    return res.data;
  }

  async fetchDevices(): Promise<any[]> {
    const res = await axios.get(Endpoint.GROUP_DEVICES, {
      headers: this.#getHeaders(),
    });

    // 🔥 IMPORTANT: adjust based on response
    return res.data || [];
  }

  /* ------------------------------------------------------------
     FETCH USER ACCESS
  ------------------------------------------------------------ */
  async getUserFullAccess(userId: string): Promise<any[]> {
    const res = await this.get(Endpoint.ACCESS_MANAGEMENT);
    const users = res?.data;

    if (!Array.isArray(users)) return [];

    const user = users.find((u: any) => u.user_id === userId);
    return user?.access || [];
  }

  async syncUserAccess(userId: string, access: any[]): Promise<any> {
    return this.put(Endpoint.ACCESS_MANAGEMENT_SYNC, {
      user_id: userId,
      access,
    });
  }

  /* ------------------------------------------------------------
     REALTIME DEVICE WEBSOCKET
  ------------------------------------------------------------ */
  connectDeviceWebSocket(
    deviceId: string,
    mqttTopic: string,
    onMessage: (data: any) => void
  ) {
    if (this.#wsChannels[deviceId]) return;

    const topic = mqttTopic.replace("+", deviceId);
    const url = `wss://bw06.kaatru.org/stream/${topic}`;

    const ws = new WebSocket(url);
    this.#wsChannels[deviceId] = ws;

    ws.onmessage = (event) => {
      try {
        const json = JSON.parse(event.data);
        if (!json?.data?.length) return;

        const payload = json.data[0];
        const v = payload.value;

        onMessage({
          id: deviceId,
          lat: Number(v.lat ?? 0),
          lon: Number(v.lon ?? v.long ?? 0),
          sPM2: Number(v.sPM2 ?? 0),
          sPM10: Number(v.sPM10 ?? 0),
          temp: Number(v.temp ?? 0),
          rh: Number(v.rh ?? 0),
          srvtime: Number(payload.srvtime ?? Date.now()),
        });
      } catch (e) {
        console.error("WS PARSE ERROR", e);
      }
    };

    ws.onclose = () => delete this.#wsChannels[deviceId];
  }

  disconnectAllWebSockets() {
    Object.values(this.#wsChannels).forEach((ws) => ws.close());
    this.#wsChannels = {};
  }
  async downloadData(payload: {
    startTime: string;
    endTime: string;
    device: string;
    email: string;
  }) {
    const url = this.#buildUrl(Endpoint.DATA_DOWNLOAD);

    // ✅ Convert to timestamps
    const st = new Date(payload.startTime).getTime();
    const et = new Date(payload.endTime).getTime();

    const res = await axios.post(
      url,
      {
        st,
        et,
        cols: payload.device, // 🔥 IMPORTANT rename
        email: payload.email,
      },
      {
        headers: this.#getHeaders(),
      }
    );

    return res.data;
  }
}

/* ------------------------------------------------------------
   MOCK API
------------------------------------------------------------ */
class Mock extends ApiService {
  clearToken() { }
  setKeycloakToken() { }
  async isLoggedIn() {
    return true;
  }
  async login() {
    return {};
  }

  async get() {
    return {};
  }
  async post() {
    return {};
  }
  async put() {
    return {};
  }
  async patch() {
    return {};
  }
  async getRamanAnalysis() {
    return {};
  }



  async uploadFirmware() { return {}; }
  async setRunningVersion() { return {}; }
  async getRunningVersion() { return { running_version: "1.0.0" }; }
  async getFirmwareFile() { return new Blob(["mock firmware"]); }
  async updateRunningVersionAfterOTA() { return {}; }

  async getUserFullAccess() {
    return [];
  }
  async syncUserAccess() {
    return {};
  }
  async fetchDevices() {
    return [];
  }
  async downloadData() {
    return { message: "Mock download success" };
  }

  connectDeviceWebSocket() { }
  disconnectAllWebSockets() { }
}

/* ------------------------------------------------------------
   EXPORT
------------------------------------------------------------ */
export const apiService: ApiService =
  import.meta.env.VITE_APP_STATE === "PRODUCTION"
    ? new Production()
    : new Mock();
/* ------------------------------------------------------------
   🔥 NEW BACKEND API FUNCTIONS
------------------------------------------------------------ */
export async function fetchSensorData({
  deviceIds,
  fields = "temp,rh,sPM2",
  start = "-12h",
  stop = "now()",
  interval = "5m",
}: {
  deviceIds: string[];
  fields?: string;
  start?: string;
  stop?: string;
  interval?: string;
}) {
  const params = new URLSearchParams({
    device_id: deviceIds.join(","),
    measurement: "gurprod",
    start,
    stop,
    interval,
    fields,
    timestamp_representation: "start",
  });

  const res = await fetch(
    `http://127.0.0.1:8001/v1/data?${params.toString()}`
  );

  return res.json();
}

export async function fetchFields() {
  const res = await fetch("http://127.0.0.1:8001/v1/fields");
  return res.json();
}

export async function checkHealth() {
  const res = await fetch("http://127.0.0.1:8001/v1/health");
  return res.json();
}

/* ------------------------------------------------------------
   🔥 CONVERT API → CHART DATA
------------------------------------------------------------ */
export function convertToTimeSeries(apiResponse: any, field: string) {
  const result: any[] = [];

  if (!apiResponse || !apiResponse.data) return result;

  apiResponse.data.forEach((device: any) => {
    if (device.status !== 200) return;

    if (Array.isArray(device.data)) {
      device.data.forEach((entry: any) => {
        result.push({
          srvtime: entry.srvtime,
          value: entry.data?.[field] ?? 0,
          device: device.dID,
        });
      });
    }
  });

  return result.sort((a, b) => a.srvtime - b.srvtime);
}
