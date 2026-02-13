export interface DailyBurnLimit {
  id?: number;
  boundary: number[][]; // [[lng, lat], [lng, lat], ...]
  limit_on_date: string; // YYYY-MM-DD
  max_area_rai: number;
  created_at?: string;
}

