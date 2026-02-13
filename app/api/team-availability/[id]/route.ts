import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// DELETE /api/team-availability/[id] - Delete team availability
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await query(`DELETE FROM team_availability WHERE id = ?`, [params.id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting team availability:', error);
    return NextResponse.json(
      { error: 'Failed to delete team availability', message: error.message },
      { status: 500 }
    );
  }
}

