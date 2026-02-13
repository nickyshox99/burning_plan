import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

// GET /api/burn-requests/[id] - Get a single burn request
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const req = await queryOne<any>(`
      SELECT 
        id,
        ST_AsGeoJSON(boundary) as boundary_geojson,
        owner_name,
        area_name,
        area_rai,
        status,
        notes,
        created_at,
        updated_at
      FROM burn_requests
      WHERE id = ?
    `, [params.id]);

    if (!req) {
      return NextResponse.json(
        { error: 'Burn request not found' },
        { status: 404 }
      );
    }

    const geojson = JSON.parse(req.boundary_geojson);
    const coordinates = geojson.coordinates[0].map((coord: number[]) => [coord[0], coord[1]]);

    return NextResponse.json({
      request: {
        id: req.id,
        boundary: coordinates,
        owner_name: req.owner_name,
        area_name: req.area_name,
        area_rai: req.area_rai ? parseFloat(req.area_rai) : null,
        status: req.status,
        notes: req.notes,
        created_at: req.created_at,
        updated_at: req.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error fetching burn request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch burn request', message: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/burn-requests/[id] - Update a burn request
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { boundary, owner_name, area_name, area_rai, status, notes } = body;

    if (!boundary || !Array.isArray(boundary) || boundary.length < 3) {
      return NextResponse.json(
        { error: 'Boundary (at least 3 points) is required' },
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
      UPDATE burn_requests
      SET boundary = ST_GeomFromText(?), owner_name = ?, area_name = ?, area_rai = ?, status = ?, notes = ?
      WHERE id = ?
    `, [wktPolygon, owner_name || null, area_name || null, area_rai || null, status || 'pending', notes || '', params.id]);

    const updatedRequest = await queryOne<any>(`
      SELECT 
        id,
        ST_AsGeoJSON(boundary) as boundary_geojson,
        owner_name,
        area_name,
        area_rai,
        status,
        notes,
        created_at,
        updated_at
      FROM burn_requests
      WHERE id = ?
    `, [params.id]);

    if (!updatedRequest) {
      return NextResponse.json(
        { error: 'Burn request not found' },
        { status: 404 }
      );
    }

    const geojson = JSON.parse(updatedRequest.boundary_geojson);
    const coordinates = geojson.coordinates[0].map((coord: number[]) => [coord[0], coord[1]]);

    return NextResponse.json({
      request: {
        id: updatedRequest.id,
        boundary: coordinates,
        owner_name: updatedRequest.owner_name,
        area_name: updatedRequest.area_name,
        area_rai: updatedRequest.area_rai ? parseFloat(updatedRequest.area_rai) : null,
        status: updatedRequest.status,
        notes: updatedRequest.notes,
        created_at: updatedRequest.created_at,
        updated_at: updatedRequest.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error updating burn request:', error);
    return NextResponse.json(
      { error: 'Failed to update burn request', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/burn-requests/[id] - Delete a burn request
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await query(`DELETE FROM burn_requests WHERE id = ?`, [params.id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting burn request:', error);
    return NextResponse.json(
      { error: 'Failed to delete burn request', message: error.message },
      { status: 500 }
    );
  }
}

