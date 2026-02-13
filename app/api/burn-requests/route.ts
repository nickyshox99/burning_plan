import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

// GET /api/burn-requests - Get all burn requests
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    let sql = `
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
    `;

    const params: any[] = [];

    if (status) {
      sql += ` WHERE status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC`;

    const requests = await query<any>(sql, params);

    const formattedRequests = requests.map((req: any) => {
      const geojson = JSON.parse(req.boundary_geojson);
      // Convert GeoJSON coordinates to [lng, lat] format
      const coordinates = geojson.coordinates[0].map((coord: number[]) => [coord[0], coord[1]]);
      
      return {
        id: req.id,
        boundary: coordinates,
        owner_name: req.owner_name,
        area_name: req.area_name,
        area_rai: req.area_rai ? parseFloat(req.area_rai) : null,
        status: req.status,
        notes: req.notes,
        created_at: req.created_at,
        updated_at: req.updated_at,
      };
    });

    return NextResponse.json({ requests: formattedRequests });
  } catch (error: any) {
    console.error('Error fetching burn requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch burn requests', message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/burn-requests - Create a new burn request
export async function POST(request: NextRequest) {
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

    const result = await query<any>(`
      INSERT INTO burn_requests (boundary, owner_name, area_name, area_rai, status, notes)
      VALUES (ST_GeomFromText(?), ?, ?, ?, ?, ?)
    `, [
      wktPolygon,
      owner_name || null,
      area_name || null,
      area_rai || null,
      status || 'pending',
      notes || '',
    ]);

    const insertId = (result as any).insertId;

    const newRequest = await queryOne<any>(`
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
    `, [insertId]);

    if (!newRequest) {
      return NextResponse.json(
        { error: 'Failed to retrieve created burn request' },
        { status: 500 }
      );
    }

    const geojson = JSON.parse(newRequest.boundary_geojson);
    const coordinates = geojson.coordinates[0].map((coord: number[]) => [coord[0], coord[1]]);

    return NextResponse.json({
      request: {
        id: newRequest.id,
        boundary: coordinates,
        owner_name: newRequest.owner_name,
        area_name: newRequest.area_name,
        area_rai: newRequest.area_rai ? parseFloat(newRequest.area_rai) : null,
        status: newRequest.status,
        notes: newRequest.notes,
        created_at: newRequest.created_at,
        updated_at: newRequest.updated_at,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating burn request:', error);
    return NextResponse.json(
      { error: 'Failed to create burn request', message: error.message },
      { status: 500 }
    );
  }
}

