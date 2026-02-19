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

    for (let j = 0; j < 8; j++) {
      if (j % 3 === 0) {
        records.push(generateValidRecord(baseTime + j * 60000));
      } else {
        records.push(generateNullRecord());
      }
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

/* ---------------- CONVERTER FOR CHART ---------------- */

export function convertToChartData(api: ApiResponse) {
  const result: any[] = [];

  api.data.forEach((device) => {
    device.data.forEach((record) => {
      // Only include records that have time + values
      if (record.srvtime && record.sPM2 !== null) {
        result.push({
          device: device.dID,
          srvtime: record.srvtime,
          sPM2: record.sPM2,
          sPM1: record.sPM1,
          sPM10: record.sPM10,
          temp: record.temp,
          rh: record.rh,
          co_ppb: record.co_ppb,
          so2_ppb: record.so2_ppb,
          o3_ppb_compensated: record.o3_ppb_compensated,
          no2_ppb: record.no2_ppb,
          rs485_data: record.rs485_data,
          sVocI: record.sVocI,
          k30Co2: record.k30Co2,
        });
      }
    });
  });

  return result;
}
