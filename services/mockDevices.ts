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
  srvtime: number;
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

/* Generate one sensor record */
function generateSensorRecord(): SensorRecord {
  return {
    sPM2: Number((20 + Math.random() * 30).toFixed(1)),
    sPM1: Number((15 + Math.random() * 25).toFixed(1)),
    sPM10: Number((25 + Math.random() * 40).toFixed(1)),
    temp: Number((25 + Math.random() * 6).toFixed(1)),
    rh: Number((45 + Math.random() * 25).toFixed(1)),
    co_ppb: null,
    so2_ppb: null,
    o3_ppb_compensated: null,
    no2_ppb: null,
    rs485_data: null,
    sVocI: null,
    k30Co2: null,
    srvtime: Date.now() - Math.floor(Math.random() * 3600000),
  };
}

/* Generate devices exactly like API */
function generateMockDevices(count: number): ApiResponse {
  const devices: DevicePacket[] = [];

  for (let i = 1; i <= count; i++) {
    const records: SensorRecord[] = [];

    const baseTime = Date.now() - 8 * 60000; // 8 minutes ago

for (let j = 0; j < 8; j++) {
  records.push({
    ...generateSensorRecord(),
    srvtime: baseTime + j * 60000, // 1-minute intervals
  });
}


    const latest = records[records.length - 1];

    devices.push({
      db: "admin",
      status: 200,
      dID: `SG${i}`,
      data: records,
      min: { ...latest },
      max: { ...latest },
    });
  }

  return {
    status: 200,
    data: devices,
  };
}

/* Final mock API response */
export const mockApiResponse = generateMockDevices(10);
export function convertToChartData(api: ApiResponse) {
  return api.data.map((device) => {
    const latest = device.data.find(
      (d) => d.sPM2 !== null
    ) || device.data[device.data.length - 1];

    return {
      device: device.dID,
      sPM2: latest?.sPM2,
      sPM1: latest?.sPM1,
      sPM10: latest?.sPM10,
      temp: latest?.temp,
      rh: latest?.rh,
      srvtime: latest?.srvtime,
    };
  });
}
