import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// POST /api/team-availability/copy-all - Copy all team availability from one date to another
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

    // Copy all team availability from source date to target date
    const result = await query<any>(`
      INSERT INTO team_availability (team_id, work_date, is_available, notes)
      SELECT team_id, ?, is_available, notes
      FROM team_availability
      WHERE work_date = ?
    `, [targetDate, sourceDate]);

    const insertedCount = (result as any).affectedRows || 0;

    return NextResponse.json({ 
      success: true,
      count: insertedCount,
      message: `คัดลอก ${insertedCount} รายการสำเร็จ`
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error copying team availability:', error);
    return NextResponse.json(
      { error: 'Failed to copy team availability', message: error.message },
      { status: 500 }
    );
  }
}

