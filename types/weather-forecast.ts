export interface WeatherForecast {
  id?: number;
  boundary: number[][]; // [[lng, lat], [lng, lat], ...]
  forecast_date: string; // YYYY-MM-DD
  is_burnable: boolean;
  wind_speed?: number;
  humidity?: number;
  temperature?: number;
  risk_index?: number;
}

