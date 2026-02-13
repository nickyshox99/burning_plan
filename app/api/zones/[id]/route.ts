import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export interface Zone {
  id?: number;
  name: string;
  province?: string;
  boundary: number[][];
  area_rai?: number;
}

// GET /api/zones/[id] - Get a single zone
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const zone = await queryOne<any>(`
      SELECT 
        id,
        name,
        province,
        ST_AsGeoJSON(boundary) as boundary_geojson,
        area_rai,
        created_at
      FROM zones
      WHERE id = ?
    `, [params.id]);

    if (!zone) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      );
    }

    const geojson = JSON.parse(zone.boundary_geojson);
    const coordinates = geojson.coordinates[0].map((coord: number[]) => [coord[0], coord[1]]);

    return NextResponse.json({
      zone: {
        id: zone.id,
        name: zone.name,
        province: zone.province,
        boundary: coordinates,
        area_rai: zone.area_rai ? parseFloat(zone.area_rai) : null,
        created_at: zone.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error fetching zone:', error);
    return NextResponse.json(
      { error: 'Failed to fetch zone', message: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/zones/[id] - Update a zone
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Convert to WKT POLYGON format
    const wktPolygon = `POLYGON((${closedBoundary.map(coord => `${coord[0]} ${coord[1]}`).join(', ')}))`;

    await query(`
      UPDATE zones
      SET name = ?, province = ?, boundary = ST_GeomFromText(?), area_rai = ?
      WHERE id = ?
    `, [name, province || null, wktPolygon, area_rai || null, params.id]);

    const updatedZone = await queryOne<any>(`
      SELECT 
        id,
        name,
        province,
        ST_AsGeoJSON(boundary) as boundary_geojson,
        area_rai,
        created_at
      FROM zones
      WHERE id = ?
    `, [params.id]);

    if (!updatedZone) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      );
    }

    const geojson = JSON.parse(updatedZone.boundary_geojson);
    const coordinates = geojson.coordinates[0].map((coord: number[]) => [coord[0], coord[1]]);

    return NextResponse.json({
      zone: {
        id: updatedZone.id,
        name: updatedZone.name,
        province: updatedZone.province,
        boundary: coordinates,
        area_rai: updatedZone.area_rai ? parseFloat(updatedZone.area_rai) : null,
        created_at: updatedZone.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error updating zone:', error);
    return NextResponse.json(
      { error: 'Failed to update zone', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/zones/[id] - Delete a zone
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query(`
      DELETE FROM zones
      WHERE id = ?
    `, [params.id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting zone:', error);
    return NextResponse.json(
      { error: 'Failed to delete zone', message: error.message },
      { status: 500 }
    );
  }
}

