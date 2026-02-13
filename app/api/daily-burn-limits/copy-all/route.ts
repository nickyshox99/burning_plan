import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// POST /api/daily-burn-limits/copy-all - Copy all daily burn limits from one date to another
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

    // Copy all daily burn limits from source date to target date
    const result = await query<any>(`
      INSERT INTO daily_burn_limits (boundary, limit_on_date, max_area_rai)
      SELECT boundary, ?, max_area_rai
      FROM daily_burn_limits
      WHERE limit_on_date = ?
    `, [targetDate, sourceDate]);

    const insertedCount = (result as any).affectedRows || 0;

    return NextResponse.json({ 
      success: true,
      count: insertedCount,
      message: `คัดลอก ${insertedCount} รายการสำเร็จ`
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error copying daily burn limits:', error);
    return NextResponse.json(
      { error: 'Failed to copy daily burn limits', message: error.message },
      { status: 500 }
    );
  }
}

