import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

// POST /api/weather-forecast/copy - Copy forecast to another date
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, targetDate } = body;

    if (!sourceId || !targetDate) {
      return NextResponse.json(
        { error: 'sourceId and targetDate are required' },
        { status: 400 }
      );
    }

    // Get source forecast
    const sourceForecast = await queryOne<any>(`
      SELECT 
        boundary,
        is_burnable,
        wind_speed,
        humidity,
        temperature,
        risk_index
      FROM weather_forecast
      WHERE id = ?
    `, [sourceId]);

    if (!sourceForecast) {
      return NextResponse.json(
        { error: 'Source forecast not found' },
        { status: 404 }
      );
    }

    // Insert new forecast with new date (copy boundary directly using SELECT)
    const result = await query<any>(`
      INSERT INTO weather_forecast (boundary, forecast_date, is_burnable, wind_speed, humidity, temperature, risk_index)
      SELECT boundary, ?, is_burnable, wind_speed, humidity, temperature, risk_index
      FROM weather_forecast
      WHERE id = ?
    `, [targetDate, sourceId]);

    return NextResponse.json({ 
      success: true,
      id: (result as any).insertId 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error copying weather forecast:', error);
    return NextResponse.json(
      { error: 'Failed to copy weather forecast', message: error.message },
      { status: 500 }
    );
  }
}

