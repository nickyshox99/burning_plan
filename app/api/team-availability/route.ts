import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

// GET /api/team-availability?date=YYYY-MM-DD - Get team availability for a specific date
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

    const availabilities = await query<any>(`
      SELECT 
        ta.id,
        ta.team_id,
        ta.work_date,
        ta.is_available,
        ta.notes,
        ta.created_at,
        t.name as team_name
      FROM team_availability ta
      INNER JOIN teams t ON ta.team_id = t.id
      WHERE ta.work_date = ?
      ORDER BY t.name
    `, [date]);

    return NextResponse.json({ availabilities });
  } catch (error: any) {
    console.error('Error fetching team availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team availability', message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/team-availability - Create or update team availability
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { team_id, work_date, is_available, notes } = body;

    if (!team_id || !work_date) {
      return NextResponse.json(
        { error: 'team_id and work_date are required' },
        { status: 400 }
      );
    }

    // Check if availability already exists
    const existing = await queryOne<any>(`
      SELECT id FROM team_availability
      WHERE team_id = ? AND work_date = ?
    `, [team_id, work_date]);

    if (existing) {
      // Update existing
      await query(`
        UPDATE team_availability
        SET is_available = ?, notes = ?
        WHERE id = ?
      `, [is_available ? 1 : 0, notes || '', existing.id]);

      const updated = await queryOne<any>(`
        SELECT 
          ta.id,
          ta.team_id,
          ta.work_date,
          ta.is_available,
          ta.notes,
          ta.created_at,
          t.name as team_name
        FROM team_availability ta
        INNER JOIN teams t ON ta.team_id = t.id
        WHERE ta.id = ?
      `, [existing.id]);

      return NextResponse.json({ availability: updated });
    } else {
      // Create new
    const result = await query<any>(`
      INSERT INTO team_availability (team_id, work_date, is_available, notes)
      VALUES (?, ?, ?, ?)
    `, [team_id, work_date, is_available ? 1 : 0, notes || '']);

      const insertId = (result as any).insertId;

      const newAvailability = await queryOne<any>(`
        SELECT 
          ta.id,
          ta.team_id,
          ta.work_date,
          ta.is_available,
          ta.notes,
          ta.created_at,
          t.name as team_name
        FROM team_availability ta
        INNER JOIN teams t ON ta.team_id = t.id
        WHERE ta.id = ?
      `, [insertId]);

      return NextResponse.json({
        availability: newAvailability,
      }, { status: 201 });
    }
  } catch (error: any) {
    console.error('Error creating/updating team availability:', error);
    return NextResponse.json(
      { error: 'Failed to save team availability', message: error.message },
      { status: 500 }
    );
  }
}

