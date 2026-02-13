import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

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

// GET /api/weather-forecast?date=YYYY-MM-DD - Get forecasts by date
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    const forecasts = await query<any>(`
      SELECT 
        id,
        ST_AsGeoJSON(boundary) as boundary_geojson,
        forecast_date,
        is_burnable,
        wind_speed,
        humidity,
        temperature,
        risk_index,
        created_at
      FROM weather_forecast
      WHERE forecast_date = ?
      ORDER BY created_at DESC
    `, [date]);

    const formattedForecasts = forecasts.map((forecast: any) => {
      const geojson = JSON.parse(forecast.boundary_geojson);
      const coordinates = geojson.coordinates[0].map((coord: number[]) => [coord[0], coord[1]]);
      
      return {
        id: forecast.id,
        boundary: coordinates,
        forecast_date: forecast.forecast_date,
        is_burnable: Boolean(forecast.is_burnable),
        wind_speed: forecast.wind_speed ? parseFloat(forecast.wind_speed) : null,
        humidity: forecast.humidity ? parseFloat(forecast.humidity) : null,
        temperature: forecast.temperature ? parseFloat(forecast.temperature) : null,
        risk_index: forecast.risk_index ? parseFloat(forecast.risk_index) : null,
        created_at: forecast.created_at,
      };
    });

    return NextResponse.json({ forecasts: formattedForecasts });
  } catch (error: any) {
    console.error('Error fetching weather forecasts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather forecasts', message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/weather-forecast - Create a new forecast
export async function POST(request: NextRequest) {
  try {
    const body: WeatherForecast = await request.json();
    const { boundary, forecast_date, is_burnable, wind_speed, humidity, temperature, risk_index } = body;

    if (!boundary || !Array.isArray(boundary) || boundary.length < 3 || !forecast_date) {
      return NextResponse.json(
        { error: 'Boundary (at least 3 points) and forecast_date are required' },
        { status: 400 }
      );
    }

    // Validate and filter boundary coordinates
    const validBoundary = boundary.filter(coord => 
      Array.isArray(coord) && 
      coord.length >= 2 && 
      typeof coord[0] === 'number' && 
      typeof coord[1] === 'number' &&
      !isNaN(coord[0]) && 
      !isNaN(coord[1]) &&
      isFinite(coord[0]) &&
      isFinite(coord[1])
    );

    if (validBoundary.length < 3) {
      return NextResponse.json(
        { error: 'Boundary must have at least 3 valid coordinate points' },
        { status: 400 }
      );
    }

    // Close the polygon if not already closed (use tolerance for floating point comparison)
    const firstPoint = validBoundary[0];
    const lastPoint = validBoundary[validBoundary.length - 1];
    const isClosed = 
      Math.abs(firstPoint[0] - lastPoint[0]) < 0.000001 &&
      Math.abs(firstPoint[1] - lastPoint[1]) < 0.000001;
    
    const closedBoundary = isClosed ? validBoundary : [...validBoundary, firstPoint];

    // Convert to WKT POLYGON format - ensure proper format with SRID
    const coordsString = closedBoundary.map(coord => `${coord[0]} ${coord[1]}`).join(', ');
    const wktPolygon = `POLYGON((${coordsString}))`;

    const result = await query<any>(`
      INSERT INTO weather_forecast (boundary, forecast_date, is_burnable, wind_speed, humidity, temperature, risk_index)
      VALUES (ST_GeomFromText(?), ?, ?, ?, ?, ?, ?)
    `, [
      wktPolygon,
      forecast_date,
      is_burnable ? 1 : 0,
      wind_speed || null,
      humidity || null,
      temperature || null,
      risk_index || null,
    ]);

    const insertId = (result as any).insertId;

    const newForecast = await queryOne<any>(`
      SELECT 
        id,
        ST_AsGeoJSON(boundary) as boundary_geojson,
        forecast_date,
        is_burnable,
        wind_speed,
        humidity,
        temperature,
        risk_index,
        created_at
      FROM weather_forecast
      WHERE id = ?
    `, [insertId]);

    if (!newForecast) {
      return NextResponse.json(
        { error: 'Failed to retrieve created forecast' },
        { status: 500 }
      );
    }

    const geojson = JSON.parse(newForecast.boundary_geojson);
    const coordinates = geojson.coordinates[0].map((coord: number[]) => [coord[0], coord[1]]);

    return NextResponse.json({
      forecast: {
        id: newForecast.id,
        boundary: coordinates,
        forecast_date: newForecast.forecast_date,
        is_burnable: Boolean(newForecast.is_burnable),
        wind_speed: newForecast.wind_speed ? parseFloat(newForecast.wind_speed) : null,
        humidity: newForecast.humidity ? parseFloat(newForecast.humidity) : null,
        temperature: newForecast.temperature ? parseFloat(newForecast.temperature.toString()) : null,
        risk_index: newForecast.risk_index ? parseFloat(newForecast.risk_index) : null,
        created_at: newForecast.created_at,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating weather forecast:', error);
    return NextResponse.json(
      { error: 'Failed to create weather forecast', message: error.message },
      { status: 500 }
    );
  }
}

