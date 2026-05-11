// import axios, { type AxiosResponse } from "axios";

// /* ------------------------------------------------------------
//    ENDPOINT CONSTANTS
// ------------------------------------------------------------ */
// export const Endpoint = {
//   FETCH_DATA_ANALYSIS: "/spatio-temporal/raw",
//   KEYCLOAK_USERS: "https://caas.kaatru.org/keycloak/users",
//   GROUP_ALL: "https://bw04.kaatru.org/group/all",
//   GROUP_DEVICES: "https://bw04.kaatru.org/group",
//   ACCESS_MANAGEMENT: "https://caas.kaatru.org/admin/access-management",
//   ACCESS_MANAGEMENT_SYNC:
//     "https://caas.kaatru.org/admin/access-management/sync",
//   DATA_DOWNLOAD: "https://bw02.kaatru.org/job/data/download",

//   SENSOR_HISTORY: "https://bw06.kaatru.org/stale/filter",

//   // ✅ OTA ENDPOINTS
//   OTA_UPLOAD_FIRMWARE: "/user/upload",
//   OTA_USER_RUNNING_VERSION: "/user/running-version",
//   OTA_DEVICE_RUNNING_VERSION: "/device/running-version",
//   OTA_DEVICE_FIRMWARE_FILE: "/device/file",
//   OTA_DEVICE_UPDATE_AFTER: "/device/update-running-version-after-ota",
// } as const;

// /* ------------------------------------------------------------
//    SENSOR API BASE URL
//    Set VITE_APP_SENSOR_API_URL in your .env file:
//      VITE_APP_SENSOR_API_URL=http://127.0.0.1:8001/v1   (local)
//      VITE_APP_SENSOR_API_URL=https://your-prod-api/v1   (prod)
// ------------------------------------------------------------ */
// const SENSOR_API_BASE =
//   import.meta.env.VITE_APP_SENSOR_API_URL || "http://127.0.0.1:8001/v1";

// /* ------------------------------------------------------------
//    JWT UTILITY
// ------------------------------------------------------------ */
// export function isTokenAlive(token: string | null): boolean {
//   if (!token) return false;
//   try {
//     const payload = JSON.parse(atob(token.split(".")[1]));
//     return payload.exp > Math.floor(Date.now() / 1000);
//   } catch {
//     return false;
//   }
// }

// /* ------------------------------------------------------------
//    BASE CLASS
// ------------------------------------------------------------ */
// abstract class ApiService {
//   abstract isLoggedIn(): Promise<boolean>;
//   abstract login(user: string, pwd: string): Promise<AxiosResponse | any>;
//   abstract setKeycloakToken(token: string): void;
//   abstract clearToken(): void;

//   abstract get(endpoint: string, payload?: Record<string, any>): Promise<any>;
//   abstract post(endpoint: string, payload: any): Promise<any>;
//   abstract put(endpoint: string, payload: any): Promise<any>;
//   abstract patch(endpoint: string, payload: any): Promise<any>;
//   abstract getRamanAnalysis(
//     endpoint: string,
//     payload?: Record<string, any>,
//   ): Promise<any>;

//   abstract getUserFullAccess(userId: string): Promise<any[]>;
//   abstract syncUserAccess(userId: string, access: any[]): Promise<any>;

//   // ✅ OTA METHODS
//   abstract uploadFirmware(
//     deviceId: string,
//     deviceGroup: string,
//     file: File,
//   ): Promise<any>;
//   abstract setRunningVersion(
//     deviceId: string,
//     versionNumber: string,
//   ): Promise<any>;
//   abstract getRunningVersion(deviceId: string): Promise<any>;
//   abstract getFirmwareFile(deviceId: string, version: string): Promise<any>;
//   abstract updateRunningVersionAfterOTA(deviceId: string): Promise<any>;

//   abstract fetchSensorHistory(
//     deviceId: string,
//     filter: string
//   ): Promise<any>;
//   abstract fetchDevices(): Promise<any[]>;

//   abstract connectDeviceWebSocket(
//     deviceId: string,
//     mqttTopic: string,
//     onMessage: (data: any) => void,
//   ): void;

//   abstract disconnectAllWebSockets(): void;
//   abstract downloadData(payload: {
//     startTime: string;
//     endTime: string;
//     device: string;
//     email: string;
//   }): Promise<any>;
// }

// /* ------------------------------------------------------------
//    PRODUCTION IMPLEMENTATION
// ------------------------------------------------------------ */
// class Production extends ApiService {
//   #host: string;
//   #wsChannels: Record<string, WebSocket> = {};

//   constructor() {
//     super();
//     this.#host =
//       import.meta.env.VITE_APP_API_URL_PREFIX || "http://localhost:8000/v1";
//     console.log("🌍 API HOST:", this.#host);
//   }

//   setKeycloakToken(_: string) { }

//   clearToken() {
//     localStorage.removeItem("token");
//   }

//   #getHeaders() {
//     const token = localStorage.getItem("token");
//     return token ? { Authorization: `Bearer ${token}` } : {};
//   }

//   #buildUrl(endpoint: string) {
//     if (!endpoint) throw new Error("Endpoint is undefined");
//     return endpoint.startsWith("http") ? endpoint : `${this.#host}${endpoint}`;
//   }

//   async login(user: string, pwd: string) {
//     const url = this.#buildUrl("/login");
//     const res = await axios.post(url, {
//       username: user,
//       password: pwd,
//     });
//     localStorage.setItem("token", res.data.access_token);
//     return res;
//   }

//   async isLoggedIn() {
//     const token = localStorage.getItem("token");
//     return isTokenAlive(token);
//   }

//   async get(endpoint: string, payload?: any) {
//     const url = this.#buildUrl(endpoint);
//     return axios.get(url, {
//       params: payload,
//       headers: this.#getHeaders(),
//     });
//   }

//   async post(endpoint: string, payload: any) {
//     const url = this.#buildUrl(endpoint);
//     return axios.post(url, payload, {
//       headers: this.#getHeaders(),
//     });
//   }

//   async put(endpoint: string, payload: any) {
//     const url = this.#buildUrl(endpoint);
//     return axios.put(url, payload, {
//       headers: this.#getHeaders(),
//     });
//   }

//   async patch(endpoint: string, payload: any) {
//     const url = this.#buildUrl(endpoint);
//     return axios.patch(url, payload, {
//       headers: this.#getHeaders(),
//     });
//   }

//   async getRamanAnalysis(endpoint: string, payload?: any) {
//     return this.get(endpoint, payload);
//   }

//   async fetchSensorHistory(deviceId: string, filter: string) {
//     // ✅ FIX: Don't manually encode — axios handles param encoding automatically
//     const res = await axios.get(Endpoint.SENSOR_HISTORY, {
//       params: {
//         devices: deviceId,
//         filter,
//       },
//       headers: this.#getHeaders(),
//     });

//     return res.data;
//   }

//   /* ------------------------------------------------------------
//      ✅ OTA API
//   ------------------------------------------------------------ */
//   async uploadFirmware(deviceId: string, deviceGroup: string, file: File) {
//     const url = this.#buildUrl(`${Endpoint.OTA_UPLOAD_FIRMWARE}/${deviceId}`);
//     const formData = new FormData();
//     formData.append("file", file);

//     const res = await axios.post(url, formData, {
//       params: { device_group: deviceGroup },
//       headers: {
//         ...this.#getHeaders(),
//         "Content-Type": "multipart/form-data",
//       },
//     });
//     return res.data;
//   }

//   async setRunningVersion(deviceId: string, versionNumber: string) {
//     const url = this.#buildUrl(
//       `${Endpoint.OTA_USER_RUNNING_VERSION}/${deviceId}`,
//     );
//     const res = await axios.post(url, null, {
//       params: { version_number: versionNumber },
//       headers: this.#getHeaders(),
//     });
//     return res.data;
//   }

//   async getRunningVersion(deviceId: string) {
//     const url = this.#buildUrl(
//       `${Endpoint.OTA_DEVICE_RUNNING_VERSION}/${deviceId}`,
//     );
//     const res = await axios.get(url, { headers: this.#getHeaders() });
//     return res.data;
//   }

//   async getFirmwareFile(deviceId: string, version: string) {
//     const url = this.#buildUrl(
//       `${Endpoint.OTA_DEVICE_FIRMWARE_FILE}/${deviceId}/${version}`,
//     );
//     const res = await axios.get(url, {
//       headers: this.#getHeaders(),
//       responseType: "blob",
//     });
//     return res.data;
//   }

//   async updateRunningVersionAfterOTA(deviceId: string) {
//     const url = this.#buildUrl(Endpoint.OTA_DEVICE_UPDATE_AFTER);
//     const res = await axios.post(url, null, {
//       params: { device_id: deviceId },
//       headers: this.#getHeaders(),
//     });
//     return res.data;
//   }

//   async fetchDevices(): Promise<any[]> {
//     const res = await axios.get(Endpoint.GROUP_DEVICES, {
//       headers: this.#getHeaders(),
//     });
//     return res.data || [];
//   }

//   /* ------------------------------------------------------------
//      FETCH USER ACCESS
//   ------------------------------------------------------------ */
//   async getUserFullAccess(userId: string): Promise<any[]> {
//     const res = await this.get(Endpoint.ACCESS_MANAGEMENT);
//     const users = res?.data;

//     if (!Array.isArray(users)) return [];

//     const user = users.find((u: any) => u.user_id === userId);
//     return user?.access || [];
//   }

//   async syncUserAccess(userId: string, access: any[]): Promise<any> {
//     return this.put(Endpoint.ACCESS_MANAGEMENT_SYNC, {
//       user_id: userId,
//       access,
//     });
//   }

//   /* ------------------------------------------------------------
//      REALTIME DEVICE WEBSOCKET
//   ------------------------------------------------------------ */
//   connectDeviceWebSocket(
//     deviceId: string,
//     mqttTopic: string,
//     onMessage: (data: any) => void,
//   ) {
//     if (this.#wsChannels[deviceId]) return;

//     const topic = mqttTopic.replace("+", deviceId);
//     const url = `wss://bw06.kaatru.org/stream/${topic}`;

//     const ws = new WebSocket(url);
//     this.#wsChannels[deviceId] = ws;

//     ws.onmessage = (event) => {
//       try {
//         const json = JSON.parse(event.data);
//         if (!json?.data?.length) return;

//         const payload = json.data[0];
//         const v = payload.value;

//         onMessage({
//           id: deviceId,
//           lat: Number(v.lat ?? 0),
//           lon: Number(v.lon ?? v.long ?? 0),
//           sPM2: Number(v.sPM2 ?? 0),
//           sPM10: Number(v.sPM10 ?? 0),
//           temp: Number(v.temp ?? 0),
//           rh: Number(v.rh ?? 0),
//           srvtime: Number(payload.srvtime ?? Date.now()),
//         });
//       } catch (e) {
//         console.error("WS PARSE ERROR", e);
//       }
//     };

//     ws.onclose = () => delete this.#wsChannels[deviceId];
//   }

//   disconnectAllWebSockets() {
//     Object.values(this.#wsChannels).forEach((ws) => ws.close());
//     this.#wsChannels = {};
//   }

//   async downloadData(payload: {
//     startTime: string;
//     endTime: string;
//     device: string;
//     email: string;
//   }) {
//     const url = this.#buildUrl(Endpoint.DATA_DOWNLOAD);

//     const st = new Date(payload.startTime).getTime();
//     const et = new Date(payload.endTime).getTime();

//     const res = await axios.post(
//       url,
//       {
//         st,
//         et,
//         cols: payload.device,
//         email: payload.email,
//       },
//       {
//         headers: this.#getHeaders(),
//       },
//     );

//     return res.data;
//   }
// }

// /* ------------------------------------------------------------
//    MOCK API
// ------------------------------------------------------------ */
// class Mock extends ApiService {
//   getRamanAnalysis(endpoint: string, payload?: Record<string, any>): Promise<any> {
//     throw new Error("Method not implemented.");
//   }
//   clearToken() { }
//   setKeycloakToken() { }
//   async isLoggedIn() { return true; }
//   async login() { return {}; }
//   async get() { return {}; }
//   async post() { return {}; }
//   async put() { return {}; }
//   async patch() { return {}; }
//   async uploadFirmware() { return {}; }
//   async setRunningVersion() { return {}; }
//   async getRunningVersion() { return { running_version: "1.0.0" }; }
//   async getFirmwareFile() { return new Blob(["mock firmware"]); }
//   async updateRunningVersionAfterOTA() { return {}; }
//   async getUserFullAccess() { return []; }
//   async syncUserAccess() { return {}; }
//   async fetchDevices() { return []; }
//   async downloadData() { return { message: "Mock download success" }; }
//   async fetchSensorHistory() { return {}; }
//   connectDeviceWebSocket() { }
//   disconnectAllWebSockets() { }
// }

// /* ------------------------------------------------------------
//    EXPORT
// ------------------------------------------------------------ */
// export const apiService: ApiService =
//   import.meta.env.VITE_APP_STATE === "PRODUCTION"
//     ? new Production()
//     : new Mock();

// /* ------------------------------------------------------------
//    SENSOR DATA API FUNCTIONS
//    Uses VITE_APP_SENSOR_API_URL from .env
// ------------------------------------------------------------ */
// export async function fetchSensorData({
//   deviceIds,
//   fields = "temp,rh,sPM2",
//   start: passedStart,
//   stop = "now()",
//   interval: passedInterval,
//   measurement = "gurprod",
//   timeFilter,
// }: {
//   deviceIds: string[];
//   fields?: string;
//   start?: string;
//   stop?: string;
//   interval?: string;
//   measurement?: string;
//   timeFilter?: string;
// }) {
//   // ✅ Map timeFilter to start and interval if provided
//   let start = passedStart || "-12h";
//   let interval = passedInterval || "5m";

//   if (timeFilter) {
//     switch (timeFilter) {
//       case "5M": start = "-5m"; interval = "10s"; break;
//       case "15M": start = "-15m"; interval = "30s"; break;
//       case "1H": start = "-1h"; interval = "2m"; break;
//       case "3H": start = "-3h"; interval = "5m"; break;
//       case "5H": start = "-5h"; interval = "10m"; break;
//       case "1D": start = "-24h"; interval = "30m"; break;
//       default: break;
//     }
//   }

//   const baseParams = new URLSearchParams({
//     measurement,
//     start,
//     stop,
//     interval,
//     fields,
//     timestamp_representation: "start",
//   });

//   const deviceParam = deviceIds.join(",");
//   const queryString = `device_id=${deviceParam}&${baseParams.toString()}`;

//   const res = await fetch(`${SENSOR_API_BASE}/data?${queryString}`);
//   if (!res.ok) return { data: [] };
//   return res.json();
// }
// export async function fetchFields() {
//   const res = await fetch(`${SENSOR_API_BASE}/fields`);
//   return res.json();
// }

// export async function checkHealth() {
//   const res = await fetch(`${SENSOR_API_BASE}/health`);
//   return res.json();
// }

// /* ------------------------------------------------------------
//    CONVERT API RESPONSE → RECHARTS TIME SERIES DATA
// ------------------------------------------------------------ */
// export function convertToTimeSeries(apiResponse: any, field: string) {
//   const result: any[] = [];

//   if (!apiResponse || !Array.isArray(apiResponse.data)) return result;

//   apiResponse.data.forEach((device: any) => {
//     // ✅ FIX: Skip devices with non-200 status or empty data
//     if (device.status !== 200) {
//       console.warn(`⚠️ Device ${device.dID} returned status ${device.status} — skipping`);
//       return;
//     }

//     if (!Array.isArray(device.data) || device.data.length === 0) {
//       console.warn(`⚠️ Device ${device.dID} has no data entries — skipping`);
//       return;
//     }

//     device.data.forEach((entry: any) => {
//       const value = entry.data?.[field];

//       // ✅ FIX: Skip entries where field value is null/undefined (don't default to 0)
//       if (value == null) return;

//       result.push({
//         srvtime: entry.srvtime,
//         value: Number(value),
//         device: device.dID,
//       });
//     });
//   });

//   return result.sort((a, b) => a.srvtime - b.srvtime);
// }
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
  ACCESS_MANAGEMENT_SYNC:
    "https://caas.kaatru.org/admin/access-management/sync",
  DATA_DOWNLOAD: "https://bw02.kaatru.org/job/data/download",

  SENSOR_HISTORY: "https://bw06.kaatru.org/stale/filter",

  // ✅ OTA ENDPOINTS
  OTA_UPLOAD_FIRMWARE: "/user/upload",
  OTA_USER_RUNNING_VERSION: "/user/running-version",
  OTA_DEVICE_RUNNING_VERSION: "/device/running-version",
  OTA_DEVICE_FIRMWARE_FILE: "/device/file",
  OTA_DEVICE_UPDATE_AFTER: "/device/update-running-version-after-ota",
} as const;

/* ------------------------------------------------------------
   SENSOR / FOLDER API BASE URL
   Set VITE_APP_SENSOR_API_URL in your .env file:
     VITE_APP_SENSOR_API_URL=http://127.0.0.1:8001/v1   (local)
     VITE_APP_SENSOR_API_URL=https://your-prod-api/v1   (prod)
------------------------------------------------------------ */
const SENSOR_API_BASE =
  import.meta.env.VITE_APP_SENSOR_API_URL || "http://127.0.0.1:8001/v1";

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
  abstract getRamanAnalysis(
    endpoint: string,
    payload?: Record<string, any>,
  ): Promise<any>;

  abstract getUserFullAccess(userId: string): Promise<any[]>;
  abstract syncUserAccess(userId: string, access: any[]): Promise<any>;

  // ✅ OTA METHODS
  abstract uploadFirmware(
    deviceId: string,
    deviceGroup: string,
    file: File,
  ): Promise<any>;
  abstract setRunningVersion(
    deviceId: string,
    versionNumber: string,
  ): Promise<any>;
  abstract getRunningVersion(deviceId: string): Promise<any>;
  abstract getFirmwareFile(deviceId: string, version: string): Promise<any>;
  abstract updateRunningVersionAfterOTA(deviceId: string): Promise<any>;

  abstract fetchSensorHistory(deviceId: string, filter: string): Promise<any>;
  abstract fetchDevices(): Promise<any[]>;

  abstract connectDeviceWebSocket(
    deviceId: string,
    mqttTopic: string,
    onMessage: (data: any) => void,
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
    return endpoint.startsWith("http") ? endpoint : `${this.#host}${endpoint}`;
  }

  async login(user: string, pwd: string) {
    const url = this.#buildUrl("/login");
    const res = await axios.post(url, { username: user, password: pwd });
    localStorage.setItem("token", res.data.access_token);
    return res;
  }

  async isLoggedIn() {
    const token = localStorage.getItem("token");
    return isTokenAlive(token);
  }

  async get(endpoint: string, payload?: any) {
    const url = this.#buildUrl(endpoint);
    return axios.get(url, { params: payload, headers: this.#getHeaders() });
  }

  async post(endpoint: string, payload: any) {
    const url = this.#buildUrl(endpoint);
    return axios.post(url, payload, { headers: this.#getHeaders() });
  }

  async put(endpoint: string, payload: any) {
    const url = this.#buildUrl(endpoint);
    return axios.put(url, payload, { headers: this.#getHeaders() });
  }

  async patch(endpoint: string, payload: any) {
    const url = this.#buildUrl(endpoint);
    return axios.patch(url, payload, { headers: this.#getHeaders() });
  }

  async getRamanAnalysis(endpoint: string, payload?: any) {
    return this.get(endpoint, payload);
  }

  async fetchSensorHistory(deviceId: string, filter: string) {
    const res = await axios.get(Endpoint.SENSOR_HISTORY, {
      params: { devices: deviceId, filter },
      headers: this.#getHeaders(),
    });
    return res.data;
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
      headers: { ...this.#getHeaders(), "Content-Type": "multipart/form-data" },
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
    const url = this.#buildUrl(
      `${Endpoint.OTA_DEVICE_FIRMWARE_FILE}/${deviceId}/${version}`,
    );
    const res = await axios.get(url, {
      headers: this.#getHeaders(),
      responseType: "blob",
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
    return this.put(Endpoint.ACCESS_MANAGEMENT_SYNC, { user_id: userId, access });
  }

  /* ------------------------------------------------------------
     REALTIME DEVICE WEBSOCKET
  ------------------------------------------------------------ */
  connectDeviceWebSocket(
    deviceId: string,
    mqttTopic: string,
    onMessage: (data: any) => void,
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
    const st = new Date(payload.startTime).getTime();
    const et = new Date(payload.endTime).getTime();
    const res = await axios.post(
      url,
      { st, et, cols: payload.device, email: payload.email },
      { headers: this.#getHeaders() },
    );
    return res.data;
  }
}

/* ------------------------------------------------------------
   MOCK API
------------------------------------------------------------ */
class Mock extends ApiService {
  getRamanAnalysis(_endpoint: string, _payload?: Record<string, any>): Promise<any> {
    return Promise.resolve({});
  }
  clearToken() { }
  setKeycloakToken() { }
  async isLoggedIn() { return true; }
  async login() { return {}; }
  async get() { return {}; }
  async post() { return {}; }
  async put() { return {}; }
  async patch() { return {}; }
  async uploadFirmware() { return {}; }
  async setRunningVersion() { return {}; }
  async getRunningVersion() { return { running_version: "1.0.0" }; }
  async getFirmwareFile() { return new Blob(["mock firmware"]); }
  async updateRunningVersionAfterOTA() { return {}; }
  async getUserFullAccess() { return []; }
  async syncUserAccess() { return {}; }
  async fetchDevices() { return []; }
  async downloadData() { return { message: "Mock download success" }; }
  async fetchSensorHistory() { return {}; }
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

/* ============================================================
   SENSOR DATA API FUNCTIONS
   Uses VITE_APP_SENSOR_API_URL from .env
============================================================ */
export async function fetchSensorData({
  deviceIds,
  fields = "temp,rh,sPM2",
  start: passedStart,
  stop = "now()",
  interval: passedInterval,
  measurement = "gurprod",
  timeFilter,
}: {
  deviceIds: string[];
  fields?: string;
  start?: string;
  stop?: string;
  interval?: string;
  measurement?: string;
  timeFilter?: string;
}) {
  let start = passedStart || "-12h";
  let interval = passedInterval || "5m";

  if (timeFilter) {
    switch (timeFilter) {
      case "5M": start = "-5m"; interval = "10s"; break;
      case "15M": start = "-15m"; interval = "30s"; break;
      case "1H": start = "-1h"; interval = "2m"; break;
      case "3H": start = "-3h"; interval = "5m"; break;
      case "5H": start = "-5h"; interval = "10m"; break;
      case "1D": start = "-24h"; interval = "30m"; break;
      default: break;
    }
  }

  const baseParams = new URLSearchParams({
    measurement,
    start,
    stop,
    interval,
    fields,
    timestamp_representation: "start",
  });

  const queryString = `device_id=${deviceIds.join(",")}&${baseParams.toString()}`;
  const res = await fetch(`${SENSOR_API_BASE}/data?${queryString}`);
  if (!res.ok) return { data: [] };
  return res.json();
}

export async function fetchFields() {
  const res = await fetch(`${SENSOR_API_BASE}/fields`);
  return res.json();
}

export async function checkHealth() {
  const res = await fetch(`${SENSOR_API_BASE}/health`);
  return res.json();
}

/* ------------------------------------------------------------
   CONVERT API RESPONSE → RECHARTS TIME SERIES DATA
------------------------------------------------------------ */
export function convertToTimeSeries(apiResponse: any, field: string) {
  const result: any[] = [];

  if (!apiResponse || !Array.isArray(apiResponse.data)) return result;

  apiResponse.data.forEach((device: any) => {
    if (device.status !== 200) {
      console.warn(`⚠️ Device ${device.dID} returned status ${device.status} — skipping`);
      return;
    }
    if (!Array.isArray(device.data) || device.data.length === 0) {
      console.warn(`⚠️ Device ${device.dID} has no data entries — skipping`);
      return;
    }
    device.data.forEach((entry: any) => {
      const value = entry.data?.[field];
      if (value == null) return;
      result.push({
        srvtime: entry.srvtime,
        value: Number(value),
        device: device.dID,
      });
    });
  });

  return result.sort((a, b) => a.srvtime - b.srvtime);
}

/* ============================================================
   FOLDER API  —  /v1/folders
   Backend: http://0.0.0.0:8001/v1  (SENSOR_API_BASE)
============================================================ */

export interface BackendFolder {
  id: number;
  user_id: string;
  group_id: string;
  folder_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * GET /v1/folders?user_id=&group_id=
 * Fetch all folders for a user + group.
 */
export async function apiFetchFolders(
  userId: string,
  groupId: string,
): Promise<BackendFolder[]> {
  const res = await fetch(
    `${SENSOR_API_BASE}/folders?user_id=${encodeURIComponent(userId)}&group_id=${encodeURIComponent(groupId)}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch folders: ${res.status}`);
  const json = await res.json();
  // Response shape: { status: 200, data: [...] }
  return Array.isArray(json.data) ? json.data : [];
}

/**
 * POST /v1/folders
 * Create a new folder.
 * Body: { user_id, group_id, folder_name }
 */
export async function apiCreateFolder(
  userId: string,
  groupId: string,
  folderName: string,
): Promise<BackendFolder> {
  const res = await fetch(`${SENSOR_API_BASE}/folders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      group_id: groupId,
      folder_name: folderName,
    }),
  });
  if (!res.ok) throw new Error(`Failed to create folder: ${res.status}`);
  const json = await res.json();
  // Response shape: { status: 201, data: { id, user_id, group_id, ... } }
  return json.data;
}

/**
 * PUT /v1/folders/:id
 * Rename an existing folder.
 * Body: { folder_name }
 */
export async function apiUpdateFolder(
  folderId: number,
  folderName: string,
): Promise<BackendFolder> {
  const res = await fetch(`${SENSOR_API_BASE}/folders/${folderId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder_name: folderName }),
  });
  if (!res.ok) throw new Error(`Failed to update folder: ${res.status}`);
  const json = await res.json();
  return json.data;
}

/**
 * DELETE /v1/folders/:id
 * Delete a folder (and its dashboards, per backend).
 */
export async function apiDeleteFolder(folderId: number): Promise<void> {
  const res = await fetch(`${SENSOR_API_BASE}/folders/${folderId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete folder: ${res.status}`);
}

/* ============================================================
   DASHBOARD API  —  /v1/dashboards
   Backend: http://0.0.0.0:8001/v1  (SENSOR_API_BASE)
============================================================ */

export interface ChartConfig {
  type: string;   // "line" | "bar" | "scatter" | ...
  field: string;  // "temp" | "rh" | "sPM2" | ...
  device: string; // device ID
}

export interface BackendDashboard {
  id: number;
  folder_id: number;
  charts: ChartConfig[];
  created_at: string;
  updated_at: string;
}

/**
 * GET /v1/dashboards/folder/:folderId
 * Fetch the dashboard config for a folder.
 */
export async function apiFetchDashboard(
  folderId: number,
): Promise<BackendDashboard | null> {
  const res = await fetch(`${SENSOR_API_BASE}/dashboards/folder/${folderId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch dashboard: ${res.status}`);
  const json = await res.json();
  return json.data ?? null;
}

/**
 * POST /v1/dashboards
 * Create a dashboard config for a folder.
 * Body: { folder_id, charts: [...] }
 */
export async function apiCreateDashboard(
  folderId: number,
  charts: ChartConfig[],
): Promise<BackendDashboard> {
  const res = await fetch(`${SENSOR_API_BASE}/dashboards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder_id: folderId, charts }),
  });
  if (!res.ok) throw new Error(`Failed to create dashboard: ${res.status}`);
  const json = await res.json();
  return json.data;
}

/**
 * PUT /v1/dashboards/:id
 * Update the chart config on an existing dashboard.
 * Body: { charts: [...] }
 */
export async function apiUpdateDashboard(
  dashboardId: number,
  charts: ChartConfig[],
): Promise<BackendDashboard> {
  const res = await fetch(`${SENSOR_API_BASE}/dashboards/${dashboardId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ charts }),
  });
  if (!res.ok) throw new Error(`Failed to update dashboard: ${res.status}`);
  const json = await res.json();
  return json.data;
}

/**
 * DELETE /v1/dashboards/:id
 * Delete a dashboard.
 */
export async function apiDeleteDashboard(dashboardId: number): Promise<void> {
  const res = await fetch(`${SENSOR_API_BASE}/dashboards/${dashboardId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete dashboard: ${res.status}`);
}

/**
 * Upsert helper: creates dashboard if it doesn't exist, updates it if it does.
 * Use this when saving chart configs from DynamicChartBuilder.
 */
export async function apiUpsertDashboard(
  folderId: number,
  charts: ChartConfig[],
): Promise<BackendDashboard> {
  const existing = await apiFetchDashboard(folderId);
  if (existing) {
    return apiUpdateDashboard(existing.id, charts);
  }
  return apiCreateDashboard(folderId, charts);
}