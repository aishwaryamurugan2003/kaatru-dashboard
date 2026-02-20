export type SensorRecord = {
  sPM2: number | null;
  sPM1: number | null;
  sPM10: number | null;
  temp: number | null;
  rh: number | null;
  co_ppb?: number | null;
  so2_ppb?: number | null;
  o3_ppb_compensated?: number | null;
  no2_ppb?: number | null;
  rs485_data?: number | null;
  sVocI?: number | null;
  k30Co2?: number | null;
  srvtime?: number;
};

export type DevicePacket = {
  db: string;
  status: number;
  dID: string;
  data: SensorRecord[];
  min: Partial<SensorRecord>;
  max: Partial<SensorRecord>;
};

export type ApiResponse = {
  status: number;
  data: DevicePacket[];
};

/* ---------------- MOCK GENERATORS ---------------- */

function generateValidRecord(time: number): SensorRecord {
  return {
    sPM2: Number((20 + Math.random() * 30).toFixed(1)),
    sPM1: Number((15 + Math.random() * 25).toFixed(1)),
    sPM10: Number((25 + Math.random() * 40).toFixed(1)),
    rh: Number((45 + Math.random() * 25).toFixed(1)),
    temp: Number((22 + Math.random() * 10).toFixed(1)),
    co_ppb: null,
    so2_ppb: null,
    o3_ppb_compensated: null,
    no2_ppb: null,
    rs485_data: null,
    sVocI: null,
    k30Co2: null,
    srvtime: time,
  };
}


function generateNullRecord(): SensorRecord {
  return {
    sPM2: null,
    sPM1: null,
    sPM10: null,
    rh: null,
    temp: null,
    co_ppb: null,
    so2_ppb: null,
    o3_ppb_compensated: null,
    no2_ppb: null,
    rs485_data: null,
    sVocI: null,
    k30Co2: null,
  };
}

function generateMockDevices(count: number): ApiResponse {
  const devices: DevicePacket[] = [];

  for (let i = 1; i <= count; i++) {
    const baseTime = Date.now() - 30 * 60 * 1000;
    const records: SensorRecord[] = [];

  for (let j = 0; j < 20; j++) {
  records.push(generateValidRecord(baseTime + j * 60000));
}

    const lastValid =
      records
        .slice()
        .reverse()
        .find((r) => r.sPM2 !== null) || generateValidRecord(baseTime);

    devices.push({
      db: "admin",
      status: 200,
      dID: `SG${i}`,
      data: records,
      min: { ...lastValid },
      max: { ...lastValid },
    });
  }

  return {
    status: 200,
    data: devices,
  };
}

export const mockApiResponse = generateMockDevices(12);

/* ---------------- CONVERTERS FOR CHARTS ---------------- */

/* 1️⃣ Time Series (For Line / Area Charts) */
export type TimeSeriesPoint = {
  srvtime: number;
  sPM2: number;
};

export function convertToTimeSeries(
  api: ApiResponse,
  field: keyof SensorRecord
) {
  const map: Record<number, number[]> = {};

  api.data.forEach((device) => {
    device.data.forEach((record) => {
      const value = record[field];

      if (record.srvtime && typeof value === "number") {
        if (!map[record.srvtime]) {
          map[record.srvtime] = [];
        }
        map[record.srvtime].push(value);
      }
    });
  });

  return Object.entries(map)
    .map(([time, values]) => ({
      srvtime: Number(time),
      [field]:
        values.reduce((sum, v) => sum + v, 0) / values.length,
    }))
    .sort((a, b) => a.srvtime - b.srvtime);
}

/* 2️⃣ Device Summary (For Pie / Radar Charts) */
export type DeviceSummary = {
  device: string;
  sPM2: number;
};

export function convertToDeviceSummary(
  api: ApiResponse,
  field: keyof SensorRecord
) {
  return api.data.map((device) => {
    const valid = device.data.filter(
      (record) => typeof record[field] === "number"
    );

    const avg =
      valid.reduce(
        (sum, record) => sum + (record[field] as number),
        0
      ) / (valid.length || 1);

    return {
      device: device.dID,
      [field]: avg,
    };
  });
}