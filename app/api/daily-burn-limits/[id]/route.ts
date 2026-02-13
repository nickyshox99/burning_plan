import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

// GET /api/daily-burn-limits/[id] - Get a single daily burn limit
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const limit = await queryOne<any>(`
      SELECT 
        id,
        ST_AsGeoJSON(boundary) as boundary_geojson,
        limit_on_date,
        max_area_rai,
        created_at
      FROM daily_burn_limits
      WHERE id = ?
    `, [params.id]);

    if (!limit) {
      return NextResponse.json(
        { error: 'Daily burn limit not found' },
        { status: 404 }
      );
    }

    const geojson = JSON.parse(limit.boundary_geojson);
    const coordinates = geojson.coordinates[0].map((coord: number[]) => [coord[0], coord[1]]);

    return NextResponse.json({
      limit: {
        id: limit.id,
        boundary: coordinates,
        limit_on_date: limit.limit_on_date,
        max_area_rai: limit.max_area_rai ? parseFloat(limit.max_area_rai) : null,
        created_at: limit.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error fetching daily burn limit:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily burn limit', message: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/daily-burn-limits/[id] - Update a daily burn limit
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { boundary, limit_on_date, max_area_rai } = body;

    if (!boundary || !Array.isArray(boundary) || boundary.length < 3) {
      return NextResponse.json(
        { error: 'Boundary (at least 3 points) is required' },
        { status: 400 }
      );
    }

    if (!limit_on_date) {
      return NextResponse.json(
        { error: 'limit_on_date is required' },
        { status: 400 }
      );
    }

    if (!max_area_rai || max_area_rai <= 0) {
      return NextResponse.json(
        { error: 'max_area_rai must be greater than 0' },
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

    // Close the polygon if not already closed
    const firstPoint = validBoundary[0];
    const lastPoint = validBoundary[validBoundary.length - 1];
    const isClosed = 
      Math.abs(firstPoint[0] - lastPoint[0]) < 0.000001 &&
      Math.abs(firstPoint[1] - lastPoint[1]) < 0.000001;
    
    const closedBoundary = isClosed ? validBoundary : [...validBoundary, firstPoint];

    // Convert to WKT POLYGON format
    const coordsString = closedBoundary.map(coord => `${coord[0]} ${coord[1]}`).join(', ');
    const wktPolygon = `POLYGON((${coordsString}))`;

    await query(`
      UPDATE daily_burn_limits
      SET boundary = ST_GeomFromText(?), limit_on_date = ?, max_area_rai = ?
      WHERE id = ?
    `, [wktPolygon, limit_on_date, max_area_rai, params.id]);

    const updatedLimit = await queryOne<any>(`
      SELECT 
        id,
        ST_AsGeoJSON(boundary) as boundary_geojson,
        limit_on_date,
        max_area_rai,
        created_at
      FROM daily_burn_limits
      WHERE id = ?
    `, [params.id]);

    if (!updatedLimit) {
      return NextResponse.json(
        { error: 'Daily burn limit not found' },
        { status: 404 }
      );
    }

    const geojson = JSON.parse(updatedLimit.boundary_geojson);
    const coordinates = geojson.coordinates[0].map((coord: number[]) => [coord[0], coord[1]]);

    return NextResponse.json({
      limit: {
        id: updatedLimit.id,
        boundary: coordinates,
        limit_on_date: updatedLimit.limit_on_date,
        max_area_rai: updatedLimit.max_area_rai ? parseFloat(updatedLimit.max_area_rai) : null,
        created_at: updatedLimit.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error updating daily burn limit:', error);
    return NextResponse.json(
      { error: 'Failed to update daily burn limit', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/daily-burn-limits/[id] - Delete a daily burn limit
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await query(`DELETE FROM daily_burn_limits WHERE id = ?`, [params.id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting daily burn limit:', error);
    return NextResponse.json(
      { error: 'Failed to delete daily burn limit', message: error.message },
      { status: 500 }
    );
  }
}

