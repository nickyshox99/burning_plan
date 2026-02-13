import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// POST /api/weather-forecast/copy-all - Copy all forecasts from one date to another
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceDate, targetDate } = body;

    if (!sourceDate || !targetDate) {
      return NextResponse.json(
        { error: 'sourceDate and targetDate are required' },
        { status: 400 }
      );
    }

    if (sourceDate === targetDate) {
      return NextResponse.json(
        { error: 'Source date and target date cannot be the same' },
        { status: 400 }
      );
    }

    // Copy all forecasts from source date to target date
    const result = await query<any>(`
      INSERT INTO weather_forecast (boundary, forecast_date, is_burnable, wind_speed, humidity, temperature, risk_index)
      SELECT boundary, ?, is_burnable, wind_speed, humidity, temperature, risk_index
      FROM weather_forecast
      WHERE forecast_date = ?
    `, [targetDate, sourceDate]);

    const insertedCount = (result as any).affectedRows || 0;

    return NextResponse.json({ 
      success: true,
      count: insertedCount,
      message: `คัดลอก ${insertedCount} รายการสำเร็จ`
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error copying weather forecasts:', error);
    return NextResponse.json(
      { error: 'Failed to copy weather forecasts', message: error.message },
      { status: 500 }
    );
  }
}

