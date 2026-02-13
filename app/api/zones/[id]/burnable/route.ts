import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

// GET /api/zones/[id]/burnable?date=YYYY-MM-DD - Check if zone is burnable on a specific date
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Check if any weather forecast boundary intersects with zone boundary on the given date
    // Use ST_Intersects to check spatial relationship
    // Try multiple approaches: ST_Intersects, ST_Contains, ST_Within
    const result = await queryOne<any>(`
      SELECT 
        wf.is_burnable,
        COUNT(*) as forecast_count
      FROM weather_forecast wf
      CROSS JOIN zones z
      WHERE z.id = ?
        AND wf.forecast_date = ?
        AND (
          ST_Intersects(z.boundary, wf.boundary) = 1
          OR ST_Contains(z.boundary, wf.boundary) = 1
          OR ST_Within(wf.boundary, z.boundary) = 1
        )
      GROUP BY wf.is_burnable
      ORDER BY wf.is_burnable DESC
      LIMIT 1
    `, [params.id, date]);

    if (!result) {
      return NextResponse.json({
        is_burnable: null,
        has_forecast: false,
      });
    }

    return NextResponse.json({
      is_burnable: Boolean(result.is_burnable),
      has_forecast: true,
      forecast_count: result.forecast_count,
    });
  } catch (error: any) {
    console.error('Error checking zone burnable status:', error);
    return NextResponse.json(
      { error: 'Failed to check zone burnable status', message: error.message },
      { status: 500 }
    );
  }
}

