import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

// GET /api/teams/[id] - Get a single team
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const team = await queryOne<any>(`
      SELECT 
        id,
        name,
        status,
        created_at
      FROM teams
      WHERE id = ?
    `, [params.id]);

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ team });
  } catch (error: any) {
    console.error('Error fetching team:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team', message: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/teams/[id] - Update a team
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, status } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    await query(`
      UPDATE teams
      SET name = ?, status = ?
      WHERE id = ?
    `, [name, status || 'active', params.id]);

    const updatedTeam = await queryOne<any>(`
      SELECT 
        id,
        name,
        status,
        created_at
      FROM teams
      WHERE id = ?
    `, [params.id]);

    return NextResponse.json({ team: updatedTeam });
  } catch (error: any) {
    console.error('Error updating team:', error);
    return NextResponse.json(
      { error: 'Failed to update team', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id] - Delete a team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await query(`DELETE FROM teams WHERE id = ?`, [params.id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Failed to delete team', message: error.message },
      { status: 500 }
    );
  }
}

