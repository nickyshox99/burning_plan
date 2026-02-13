import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

// GET /api/daily-burn-limits?date=YYYY-MM-DD - Get daily burn limits for a specific date
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');

    let sql = `
      SELECT 
        id,
        ST_AsGeoJSON(boundary) as boundary_geojson,
        limit_on_date,
        max_area_rai,
        created_at
      FROM daily_burn_limits
    `;

    const params: any[] = [];

    if (date) {
      sql += ` WHERE limit_on_date = ?`;
      params.push(date);
    }

    sql += ` ORDER BY limit_on_date DESC, created_at DESC`;

    const limits = await query<any>(sql, params);

    const formattedLimits = limits.map((limit: any) => {
      const geojson = JSON.parse(limit.boundary_geojson);
      // Convert GeoJSON coordinates to [lng, lat] format
      const coordinates = geojson.coordinates[0].map((coord: number[]) => [coord[0], coord[1]]);
      
      return {
        id: limit.id,
        boundary: coordinates,
        limit_on_date: limit.limit_on_date,
        max_area_rai: limit.max_area_rai ? parseFloat(limit.max_area_rai) : null,
        created_at: limit.created_at,
      };
    });

    return NextResponse.json({ limits: formattedLimits });
  } catch (error: any) {
    console.error('Error fetching daily burn limits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily burn limits', message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/daily-burn-limits - Create a new daily burn limit
export async function POST(request: NextRequest) {
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

    const result = await query<any>(`
      INSERT INTO daily_burn_limits (boundary, limit_on_date, max_area_rai)
      VALUES (ST_GeomFromText(?), ?, ?)
    `, [
      wktPolygon,
      limit_on_date,
      max_area_rai,
    ]);

    const insertId = (result as any).insertId;

    const newLimit = await queryOne<any>(`
      SELECT 
        id,
        ST_AsGeoJSON(boundary) as boundary_geojson,
        limit_on_date,
        max_area_rai,
        created_at
      FROM daily_burn_limits
      WHERE id = ?
    `, [insertId]);

    if (!newLimit) {
      return NextResponse.json(
        { error: 'Failed to retrieve created daily burn limit' },
        { status: 500 }
      );
    }

    const geojson = JSON.parse(newLimit.boundary_geojson);
    const coordinates = geojson.coordinates[0].map((coord: number[]) => [coord[0], coord[1]]);

    return NextResponse.json({
      limit: {
        id: newLimit.id,
        boundary: coordinates,
        limit_on_date: newLimit.limit_on_date,
        max_area_rai: newLimit.max_area_rai ? parseFloat(newLimit.max_area_rai) : null,
        created_at: newLimit.created_at,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating daily burn limit:', error);
    return NextResponse.json(
      { error: 'Failed to create daily burn limit', message: error.message },
      { status: 500 }
    );
  }
}

