export interface Zone {
  id?: number;
  name: string;
  province?: string;
  boundary: number[][]; // [[lng, lat], [lng, lat], ...]
  area_rai?: number;
}

