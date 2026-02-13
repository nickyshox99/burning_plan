import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export interface Zone {
  id?: number;
  name: string;
  province?: string;
  boundary: number[][]; // [[lng, lat], [lng, lat], ...]
  area_rai?: number;
}

// GET /api/zones - Get all zones
export async function GET() {
  try {
    const zones = await query<any>(`
      SELECT 
        id,
        name,
        province,
        ST_AsGeoJSON(boundary) as boundary_geojson,
        area_rai,
        created_at
      FROM zones
      ORDER BY created_at DESC
    `);

    const formattedZones = zones.map((zone: any) => {
      const geojson = JSON.parse(zone.boundary_geojson);
      // Convert GeoJSON coordinates to [lng, lat] format
      const coordinates = geojson.coordinates[0].map((coord: number[]) => [coord[0], coord[1]]);
      
      return {
        id: zone.id,
        name: zone.name,
        province: zone.province,
        boundary: coordinates,
        area_rai: zone.area_rai ? parseFloat(zone.area_rai) : null,
        created_at: zone.created_at,
      };
    });

    return NextResponse.json({ zones: formattedZones });
  } catch (error: any) {
    console.error('Error fetching zones:', error);
    return NextResponse.json(
      { error: 'Failed to fetch zones', message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/zones - Create a new zone
export async function POST(request: NextRequest) {
  try {
    const body: Zone = await request.json();
    const { name, province, boundary, area_rai } = body;

    if (!name || !boundary || boundary.length < 3) {
      return NextResponse.json(
        { error: 'Name and boundary (at least 3 points) are required' },
        { status: 400 }
      );
    }

    // Close the polygon if not already closed
    const closedBoundary = 
      boundary[0][0] === boundary[boundary.length - 1][0] &&
      boundary[0][1] === boundary[boundary.length - 1][1]
        ? boundary
        : [...boundary, boundary[0]];

    // Convert to WKT POLYGON format: POLYGON((lng lat, lng lat, ...))
    const wktPolygon = `POLYGON((${closedBoundary.map(coord => `${coord[0]} ${coord[1]}`).join(', ')}))`;

    const result = await query<any>(`
      INSERT INTO zones (name, province, boundary, area_rai)
      VALUES (?, ?, ST_GeomFromText(?), ?)
    `, [name, province || null, wktPolygon, area_rai || null]);

    const insertId = (result as any).insertId;

    const newZone = await queryOne<any>(`
      SELECT 
        id,
        name,
        province,
        ST_AsGeoJSON(boundary) as boundary_geojson,
        area_rai,
        created_at
      FROM zones
      WHERE id = ?
    `, [insertId]);

    if (!newZone) {
      return NextResponse.json(
        { error: 'Failed to retrieve created zone' },
        { status: 500 }
      );
    }

    const geojson = JSON.parse(newZone.boundary_geojson);
    const coordinates = geojson.coordinates[0].map((coord: number[]) => [coord[0], coord[1]]);

    return NextResponse.json({
      zone: {
        id: newZone.id,
        name: newZone.name,
        province: newZone.province,
        boundary: coordinates,
        area_rai: newZone.area_rai ? parseFloat(newZone.area_rai) : null,
        created_at: newZone.created_at,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating zone:', error);
    return NextResponse.json(
      { error: 'Failed to create zone', message: error.message },
      { status: 500 }
    );
  }
}

