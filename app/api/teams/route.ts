import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

// GET /api/teams - Get all teams
export async function GET() {
  try {
    const teams = await query<any>(`
      SELECT 
        id,
        name,
        status,
        created_at
      FROM teams
      ORDER BY created_at DESC
    `);

    return NextResponse.json({ teams });
  } catch (error: any) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams', message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, status } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const result = await query<any>(`
      INSERT INTO teams (name, status)
      VALUES (?, ?)
    `, [name, status || 'active']);

    const insertId = (result as any).insertId;

    const newTeam = await queryOne<any>(`
      SELECT 
        id,
        name,
        status,
        created_at
      FROM teams
      WHERE id = ?
    `, [insertId]);

    return NextResponse.json({
      team: newTeam,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating team:', error);
    return NextResponse.json(
      { error: 'Failed to create team', message: error.message },
      { status: 500 }
    );
  }
}

