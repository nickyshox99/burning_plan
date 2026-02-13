import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export interface WeatherForecast {
  id?: number;
  boundary: number[][];
  forecast_date: string;
  is_burnable: boolean;
  wind_speed?: number;
  humidity?: number;
  temperature?: number;
  risk_index?: number;
}

// GET /api/weather-forecast/[id] - Get a single forecast
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const forecast = await queryOne<any>(`
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
    `, [params.id]);

    if (!forecast) {
      return NextResponse.json(
        { error: 'Forecast not found' },
        { status: 404 }
      );
    }

    const geojson = JSON.parse(forecast.boundary_geojson);
    const coordinates = geojson.coordinates[0].map((coord: number[]) => [coord[0], coord[1]]);

    return NextResponse.json({
      forecast: {
        id: forecast.id,
        boundary: coordinates,
        forecast_date: forecast.forecast_date,
        is_burnable: Boolean(forecast.is_burnable),
        wind_speed: forecast.wind_speed ? parseFloat(forecast.wind_speed) : null,
        humidity: forecast.humidity ? parseFloat(forecast.humidity) : null,
        temperature: forecast.temperature ? parseFloat(forecast.temperature) : null,
        risk_index: forecast.risk_index ? parseFloat(forecast.risk_index) : null,
        created_at: forecast.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error fetching forecast:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forecast', message: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/weather-forecast/[id] - Update a forecast
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: WeatherForecast = await request.json();
    const { boundary, forecast_date, is_burnable, wind_speed, humidity, temperature, risk_index } = body;

    if (!boundary || !Array.isArray(boundary) || boundary.length < 3 || !forecast_date) {
      return NextResponse.json(
        { error: 'Boundary (at least 3 points) and forecast_date are required' },
        { status: 400 }
      );
    }

    // Validate boundary coordinates
    const validBoundary = boundary.filter(coord => 
      Array.isArray(coord) && 
      coord.length >= 2 && 
      typeof coord[0] === 'number' && 
      typeof coord[1] === 'number' &&
      !isNaN(coord[0]) && 
      !isNaN(coord[1])
    );

    if (validBoundary.length < 3) {
      return NextResponse.json(
        { error: 'Boundary must have at least 3 valid coordinate points' },
        { status: 400 }
      );
    }

    // Close the polygon if not already closed
    const firstPoint = validBoundary[0];
    const lastPoint = validBoundary[validBoundary.length - 1];
    const isClosed = 
      Math.abs(firstPoint[0] - lastPoint[0]) < 0.000001 &&
      Math.abs(firstPoint[1] - lastPoint[1]) < 0.000001;
    
    const closedBoundary = isClosed ? validBoundary : [...validBoundary, firstPoint];

    // Convert to WKT POLYGON format - ensure proper format
    const coordsString = closedBoundary.map(coord => `${coord[0]} ${coord[1]}`).join(', ');
    const wktPolygon = `POLYGON((${coordsString}))`;

    await query(`
      UPDATE weather_forecast
      SET boundary = ST_GeomFromText(?), forecast_date = ?, is_burnable = ?, wind_speed = ?, humidity = ?, temperature = ?, risk_index = ?
      WHERE id = ?
    `, [
      wktPolygon,
      forecast_date,
      is_burnable ? 1 : 0,
      wind_speed || null,
      humidity || null,
      temperature || null,
      risk_index || null,
      params.id,
    ]);

    const updatedForecast = await queryOne<any>(`
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
    `, [params.id]);

    if (!updatedForecast) {
      return NextResponse.json(
        { error: 'Forecast not found' },
        { status: 404 }
      );
    }

    const geojson = JSON.parse(updatedForecast.boundary_geojson);
    const coordinates = geojson.coordinates[0].map((coord: number[]) => [coord[0], coord[1]]);

    return NextResponse.json({
      forecast: {
        id: updatedForecast.id,
        boundary: coordinates,
        forecast_date: updatedForecast.forecast_date,
        is_burnable: Boolean(updatedForecast.is_burnable),
        wind_speed: updatedForecast.wind_speed ? parseFloat(updatedForecast.wind_speed) : null,
        humidity: updatedForecast.humidity ? parseFloat(updatedForecast.humidity) : null,
        temperature: updatedForecast.temperature ? parseFloat(updatedForecast.temperature) : null,
        risk_index: updatedForecast.risk_index ? parseFloat(updatedForecast.risk_index) : null,
        created_at: updatedForecast.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error updating forecast:', error);
    return NextResponse.json(
      { error: 'Failed to update forecast', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/weather-forecast/[id] - Delete a forecast
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await query(`
      DELETE FROM weather_forecast
      WHERE id = ?
    `, [params.id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting forecast:', error);
    return NextResponse.json(
      { error: 'Failed to delete forecast', message: error.message },
      { status: 500 }
    );
  }
}

