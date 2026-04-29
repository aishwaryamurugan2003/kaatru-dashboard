
export interface DeviceDataPoint {
  sPM2: number;
  lat: number;
  long: number;
  dTS: number;
  lng: number;
}

export interface ChartSeries {
  deviceId: string;
  data: { dTS: number; sPM2: number }[];
}

export interface MapPoint extends DeviceDataPoint {}
