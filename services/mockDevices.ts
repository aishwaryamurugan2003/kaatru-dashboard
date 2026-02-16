export type DeviceData = {
  device: string;
  sPM2: number;
  sPM1: number;
  sPM10: number;
  temp: number;
  rh: number;
};

/* Generate multiple mock devices */
function generateMockDevices(count: number): DeviceData[] {
  const devices: DeviceData[] = [];

  for (let i = 1; i <= count; i++) {
    devices.push({
      device: `SG${i}`,
      sPM2: Number((20 + Math.random() * 30).toFixed(1)),
      sPM1: Number((15 + Math.random() * 25).toFixed(1)),
      sPM10: Number((25 + Math.random() * 40).toFixed(1)),
      temp: Number((25 + Math.random() * 6).toFixed(1)),
      rh: Number((45 + Math.random() * 25).toFixed(1)),
    });
  }

  return devices;
}

/* Export mock dataset */
export const mockDevices = generateMockDevices(15);
