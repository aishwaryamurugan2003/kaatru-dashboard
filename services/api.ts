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

  // ✅ NEW
  SENSOR_HISTORY: "https://bw06.kaatru.org/stale/filter",
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

  // ✅ NEW
  abstract fetchSensorHistory(
    deviceId: string,
    filter: string
  ): Promise<any>;

  abstract connectDeviceWebSocket(
    deviceId: string,
    mqttTopic: string,
    onMessage: (data: any) => void
  ): void;

  abstract disconnectAllWebSockets(): void;
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

  setKeycloakToken(_: string) {}

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
     ✅ SENSOR HISTORY API (YOUR REQUEST)
  ------------------------------------------------------------ */
  async fetchSensorHistory(deviceId: string, filter: string) {
    const encodedId = encodeURIComponent(deviceId);

    const res = await axios.get(Endpoint.SENSOR_HISTORY, {
      params: {
        devices: encodedId,
        filter,
      },
      headers: this.#getHeaders(),
    });

    return res.data;
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
}

/* ------------------------------------------------------------
   MOCK API
------------------------------------------------------------ */
class Mock extends ApiService {
  clearToken() {}
  setKeycloakToken() {}
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

  async fetchSensorHistory() {
    return {};
  }

  async getUserFullAccess() {
    return [];
  }
  async syncUserAccess() {
    return {};
  }

  connectDeviceWebSocket() {}
  disconnectAllWebSockets() {}
}

/* ------------------------------------------------------------
   EXPORT
------------------------------------------------------------ */
export const apiService: ApiService =
  import.meta.env.VITE_APP_STATE === "PRODUCTION"
    ? new Production()
    : new Mock();
/* ------------------------------------------------------------
   🔥 CONVERT API → CHART DATA
------------------------------------------------------------ */
export function convertHistoryToTimeSeries(api: any, field: string) {
  if (!api || !api.data) {
    console.error("❌ Invalid API response");
    return [];
  }

  const rawData = api.data?.[0]?.data || [];

  if (!rawData.length) {
    console.warn("⚠️ No data received from API");
    return [];
  }

  return rawData
    .filter((entry: any) => typeof entry[field] === "number" && entry.srvtime)
    .map((entry: any) => ({
      srvtime: entry.srvtime,
      [field]: entry[field] === 0 ? 0.01 : entry[field],
    }))
    .sort((a: any, b: any) => a.srvtime - b.srvtime);
}