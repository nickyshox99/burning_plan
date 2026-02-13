import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface OptimizationRequest {
  start_date: string;
  end_date: string;
}

interface BurnRequest {
  id: number;
  boundary: string; // WKT format
  area_rai: number;
  area_name?: string;
  owner_name?: string;
}

interface DailyBurnLimit {
  id: number;
  boundary: string; // WKT format
  limit_on_date: string;
  max_area_rai: number;
}

interface WeatherForecast {
  id: number;
  boundary: string; // WKT format
  forecast_date: string;
  is_burnable: boolean;
}

interface TeamAvailability {
  team_id: number;
  team_name: string;
  work_date: string;
  is_available: boolean;
}

interface Zone {
  id: number;
  name: string;
  boundary: string; // WKT format
}

// POST /api/optimize - Optimize burn plan using MIP algorithm
export async function POST(request: NextRequest) {
  try {
    const body: OptimizationRequest = await request.json();
    const { start_date, end_date } = body;

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: 'start_date and end_date are required' },
        { status: 400 }
      );
    }

    // Generate date range
    const dates: string[] = [];
    const start = new Date(start_date);
    const end = new Date(end_date);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }

    // Fetch all burn requests (ไม่สนใจ status เพราะจะ approve หลังวางแผนเสร็จ)
    const burnRequests = await query<any>(`
      SELECT 
        id,
        ST_AsText(boundary) as boundary_wkt,
        area_rai,
        owner_name,
        area_name,
        status
      FROM burn_requests
      WHERE boundary IS NOT NULL
      ORDER BY id
    `);

    if (burnRequests.length === 0) {
      return NextResponse.json({
        plan: [],
        total_area: 0,
        total_requests: 0,
        summary: [],
        message: 'ไม่มีคำขอที่สามารถใช้ได้ (ต้องมีคำขอที่มี boundary)',
      });
    }

    // Filter out requests with invalid boundary_wkt
    const validRequests = burnRequests.filter((r: any) => r.boundary_wkt && r.boundary_wkt.trim().length > 0);
    
    if (validRequests.length === 0) {
      return NextResponse.json({
        plan: [],
        total_area: 0,
        total_requests: 0,
        summary: [],
        message: 'ไม่มีคำขอที่มี boundary ที่ถูกต้อง',
      });
    }

    console.log(`[Optimize] Found ${validRequests.length} valid burn requests`);

    // Fetch zones
    const zones = await query<any>(`
      SELECT 
        id,
        name,
        ST_AsText(boundary) as boundary_wkt
      FROM zones
      WHERE boundary IS NOT NULL
      ORDER BY id
    `);

    console.log(`[Optimize] Found ${zones.length} zones`);

    // Fetch daily burn limits for all dates
    // Use DATE() function to handle datetime comparison correctly
    const dailyLimits = await query<any>(`
      SELECT 
        id,
        ST_AsText(boundary) as boundary_wkt,
        DATE(limit_on_date) as limit_on_date,
        max_area_rai
      FROM daily_burn_limits
      WHERE DATE(limit_on_date) >= ? AND DATE(limit_on_date) <= ?
        AND boundary IS NOT NULL
      ORDER BY limit_on_date, id
    `, [start_date, end_date]);
    
    // Normalize daily limits dates for logging
    const normalizeDateForLog = (dateValue: any): string => {
      if (!dateValue) return '';
      if (dateValue instanceof Date) {
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return String(dateValue).split('T')[0].split(' ')[0];
    };
    
    console.log(`[Optimize] Daily limits by date:`, dailyLimits.reduce((acc: any, l: any) => {
      const date = normalizeDateForLog(l.limit_on_date);
      if (!acc[date]) acc[date] = 0;
      acc[date]++;
      return acc;
    }, {}));

    // Fetch weather forecasts for all dates
    const weatherForecasts = await query<any>(`
      SELECT 
        id,
        ST_AsText(boundary) as boundary_wkt,
        forecast_date,
        is_burnable
      FROM weather_forecast
      WHERE forecast_date >= ? AND forecast_date <= ?
      ORDER BY forecast_date, id
    `, [start_date, end_date]);

    // Fetch team availability for all dates
    // Use DATE() function to handle datetime comparison correctly
    const teamAvailabilities = await query<any>(`
      SELECT 
        ta.team_id,
        t.name as team_name,
        DATE(ta.work_date) as work_date,
        ta.is_available
      FROM team_availability ta
      JOIN teams t ON t.id = ta.team_id
      WHERE DATE(ta.work_date) >= ? AND DATE(ta.work_date) <= ?
        AND ta.is_available = TRUE
        AND t.status = 'active'
      ORDER BY ta.work_date, ta.team_id
    `, [start_date, end_date]);
    
    console.log(`[Optimize] Team availabilities raw:`, teamAvailabilities.map((ta: any) => `${ta.work_date}: team ${ta.team_id} (${ta.team_name})`).join(', '));

    console.log(`[Optimize] Found ${validRequests.length} burn requests, ${zones.length} zones, ${dailyLimits.length} daily limits, ${weatherForecasts.length} weather forecasts, ${teamAvailabilities.length} team availabilities`);

    // Build spatial index maps using batch queries for better performance
    // For each burn request, find which zones it intersects with
    const requestZoneMap = new Map<number, number[]>(); // request_id -> zone_ids[]
    let totalZoneIntersections = 0;
    
    for (const req of validRequests) {
      try {
        const zoneIds: number[] = [];
        // Use batch query to check all zones at once
        const zoneIntersects = await query<any>(`
          SELECT z.id
          FROM zones z
          WHERE z.boundary IS NOT NULL
            AND ST_Intersects(
              ST_GeomFromText(?, 4326),
              z.boundary
            ) = 1
        `, [req.boundary_wkt]);
        
        zoneIds.push(...zoneIntersects.map((z: any) => z.id));
        requestZoneMap.set(req.id, zoneIds);
        totalZoneIntersections += zoneIds.length;
      } catch (err: any) {
        console.error(`[Optimize] Error checking zones for request ${req.id}:`, err.message);
        requestZoneMap.set(req.id, []);
      }
    }
    console.log(`[Optimize] Total zone intersections found: ${totalZoneIntersections}`);

    // Normalize date helper function
    const normalizeDateForComparison = (dateValue: any): string => {
      if (!dateValue) return '';
      if (dateValue instanceof Date) {
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return String(dateValue).split('T')[0].split(' ')[0];
    };

    // For each burn request and date, find which daily limits it intersects with
    const requestLimitMap = new Map<string, number[]>(); // "request_id-date" -> limit_ids[]
    let totalLimitIntersections = 0;
    
    for (const req of validRequests) {
      for (const date of dates) {
        try {
          const limitIds: number[] = [];
          const dateLimits = dailyLimits.filter((l: any) => normalizeDateForComparison(l.limit_on_date) === date && l.boundary_wkt);
          
          if (dateLimits.length > 0) {
            // Batch query for all limits on this date using DATE() function
            const limitIntersects = await query<any>(`
              SELECT dbl.id
              FROM daily_burn_limits dbl
              WHERE DATE(dbl.limit_on_date) = ?
                AND dbl.boundary IS NOT NULL
                AND ST_Intersects(
                  ST_GeomFromText(?, 4326),
                  dbl.boundary
                ) = 1
            `, [date, req.boundary_wkt]);
            
            limitIds.push(...limitIntersects.map((l: any) => l.id));
            totalLimitIntersections += limitIds.length;
          }
          requestLimitMap.set(`${req.id}-${date}`, limitIds);
        } catch (err: any) {
          console.error(`[Optimize] Error checking limits for request ${req.id} on ${date}:`, err.message);
          requestLimitMap.set(`${req.id}-${date}`, []);
        }
      }
    }
    console.log(`[Optimize] Total limit intersections found: ${totalLimitIntersections}`);

    // For each burn request and date, find which weather forecasts it intersects with
    const requestWeatherMap = new Map<string, number[]>(); // "request_id-date" -> forecast_ids[]
    let totalWeatherIntersections = 0;
    
    for (const req of validRequests) {
      for (const date of dates) {
        try {
          const forecastIds: number[] = [];
          const dateForecasts = weatherForecasts.filter((f: any) => normalizeDateForComparison(f.forecast_date) === date && f.is_burnable && f.boundary_wkt);
          
          if (dateForecasts.length > 0) {
            // Batch query for all forecasts on this date using DATE() function
            const forecastIntersects = await query<any>(`
              SELECT wf.id
              FROM weather_forecast wf
              WHERE DATE(wf.forecast_date) = ?
                AND wf.is_burnable = TRUE
                AND wf.boundary IS NOT NULL
                AND ST_Intersects(
                  ST_GeomFromText(?, 4326),
                  wf.boundary
                ) = 1
            `, [date, req.boundary_wkt]);
            
            forecastIds.push(...forecastIntersects.map((f: any) => f.id));
            totalWeatherIntersections += forecastIds.length;
          }
          requestWeatherMap.set(`${req.id}-${date}`, forecastIds);
        } catch (err: any) {
          console.error(`[Optimize] Error checking weather for request ${req.id} on ${date}:`, err.message);
          requestWeatherMap.set(`${req.id}-${date}`, []);
        }
      }
    }
    console.log(`[Optimize] Total weather intersections found: ${totalWeatherIntersections}`);

    // Group team availability by date
    const teamsByDate = new Map<string, TeamAvailability[]>();
    for (const ta of teamAvailabilities) {
      let dateStr: string;
      
      if (ta.work_date instanceof Date) {
        // Handle Date object - use local date to avoid timezone issues
        const year = ta.work_date.getFullYear();
        const month = String(ta.work_date.getMonth() + 1).padStart(2, '0');
        const day = String(ta.work_date.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      } else {
        // Handle string - extract date part only
        const dateValue = String(ta.work_date);
        // Handle both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:mm:ss.sssZ' formats
        dateStr = dateValue.split('T')[0].split(' ')[0];
      }
      
      if (!teamsByDate.has(dateStr)) {
        teamsByDate.set(dateStr, []);
      }
      teamsByDate.get(dateStr)!.push({
        team_id: ta.team_id,
        team_name: ta.team_name,
        work_date: dateStr,
        is_available: ta.is_available,
      });
    }
    
    console.log(`[Optimize] Team availability by date:`, Array.from(teamsByDate.entries()).map(([date, teams]) => `${date}: ${teams.length} teams`).join(', '));
    console.log(`[Optimize] Dates to process:`, dates.join(', '));
    console.log(`[Optimize] TeamsByDate keys:`, Array.from(teamsByDate.keys()).join(', '));

    // MIP Optimization using greedy approach (simplified)
    // Decision variables: assign(request_id, date, zone_id, team_id) ∈ {0,1}
    // Objective: Maximize Σ area_rai
    
    const assignments: {
      date: string;
      assignments: {
        request_id: number;
        area_name?: string;
        owner_name?: string;
        area_rai: number;
        zone_id: number;
        zone_name: string;
        team_id: number;
        team_name: string;
        limit_id: number;
        weather_forecast_id: number;
      }[];
    }[] = [];

    // Track which zone each team is assigned to per date
    // Key: "date-team_id", Value: zone_id (only one zone per team per day)
    const teamZoneByDate = new Map<string, number>(); // "date-team_id" -> zone_id
    
    // Track area used per limit per date
    const areaUsedByLimit = new Map<number, number>(); // limit_id -> area_rai

    // Sort requests by area (largest first) for greedy approach
    const sortedRequests = [...validRequests].sort((a, b) => {
      const areaA = parseFloat(String(a.area_rai || 0)) || 0;
      const areaB = parseFloat(String(b.area_rai || 0)) || 0;
      return areaB - areaA;
    });

    for (const date of dates) {
      const dayAssignments: typeof assignments[0]['assignments'] = [];
      const availableTeams = teamsByDate.get(date) || [];
      
      // Normalize date format for comparison (handle both Date objects and strings with timezone)
      const normalizeDate = (dateValue: any): string => {
        if (!dateValue) return '';
        if (dateValue instanceof Date) {
          // Use local date methods to avoid timezone issues
          const year = dateValue.getFullYear();
          const month = String(dateValue.getMonth() + 1).padStart(2, '0');
          const day = String(dateValue.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        const dateStr = String(dateValue);
        // Handle both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:mm:ss.sssZ' formats
        return dateStr.split('T')[0].split(' ')[0];
      };
      
      const dateLimits = dailyLimits.filter((l: any) => normalizeDate(l.limit_on_date) === date);      
      const dateForecasts = weatherForecasts.filter((f: any) => normalizeDate(f.forecast_date) === date && f.is_burnable);
      
      console.log(`[Optimize] Date ${date}: ${dateLimits.length} limits, ${dateForecasts.length} forecasts, ${availableTeams.length} teams`);
      
      if (dateLimits.length === 0 || dateForecasts.length === 0 || availableTeams.length === 0) {
        continue;
      }
      
      // Reset area used for this date
      areaUsedByLimit.clear();

      // Skip if no resources available for this date
      if (availableTeams.length === 0) {
        console.log(`[Optimize] Skipping ${date}: No available teams`);
        continue;
      }
      
      if (dateLimits.length === 0) {
        console.log(`[Optimize] Skipping ${date}: No daily burn limits`);
        continue;
      }
      
      if (dateForecasts.length === 0) {
        console.log(`[Optimize] Skipping ${date}: No burnable weather forecasts`);
        continue;
      }

      let assignedCount = 0;
      let skippedCount = 0;
      const skipReasons: { [key: string]: number } = {};
      
      for (const req of sortedRequests) {
        // Check if request can be assigned on this date
        
        // 1. Check weather forecast
        const weatherKey = `${req.id}-${date}`;
        const forecastIds = requestWeatherMap.get(weatherKey) || [];
        if (forecastIds.length === 0) {
          skipReasons['no_weather'] = (skipReasons['no_weather'] || 0) + 1;
          continue; // No burnable weather forecast for this request on this date
        }

        // 2. Find zones for this request
        const zoneIds = requestZoneMap.get(req.id) || [];
        if (zoneIds.length === 0) {
          skipReasons['no_zone'] = (skipReasons['no_zone'] || 0) + 1;
          continue; // Request doesn't intersect with any zone
        }

        // 3. Find limits for this request
        const limitKey = `${req.id}-${date}`;
        const limitIds = requestLimitMap.get(limitKey) || [];
        if (limitIds.length === 0) {
          skipReasons['no_limit'] = (skipReasons['no_limit'] || 0) + 1;
          continue; // Request doesn't intersect with any limit
        }

        // 4. Check if limit constraints are satisfied
        let canAssign = false;
        let selectedLimitId = 0;
        let selectedZoneId = 0;
        let selectedTeamId = 0;
        let selectedTeamName = '';

        for (const limitId of limitIds) {
          const limit = dateLimits.find((l: any) => l.id === limitId);
          if (!limit) continue;

          const currentUsed = areaUsedByLimit.get(limitId) || 0;
          const reqArea = parseFloat(String(req.area_rai || 0)) || 0;
          const limitMax = parseFloat(String(limit.max_area_rai || 0)) || 0;
          const newUsed = currentUsed + reqArea;

          if (newUsed <= limitMax) {
            // Check if we can assign a team to a zone
            // Constraint: 1 team can only manage 1 zone per day
            for (const zoneId of zoneIds) {
              // Find available team that is not yet assigned to any zone on this date
              const availableTeam = availableTeams.find((t) => {
                const teamKey = `${date}-${t.team_id}`;
                const assignedZone = teamZoneByDate.get(teamKey);
                // Team is available if not assigned to any zone yet, or already assigned to this same zone
                return assignedZone === undefined || assignedZone === zoneId;
              });

              if (availableTeam) {
                canAssign = true;
                selectedLimitId = limitId;
                selectedZoneId = zoneId;
                selectedTeamId = availableTeam.team_id;
                selectedTeamName = availableTeam.team_name;
                break;
              }
            }
            
            if (canAssign) break;
          }
        }

        if (canAssign) {
          // Assign request
          const zone = zones.find((z: any) => z.id === selectedZoneId);
          const forecastId = forecastIds[0]; // Use first matching forecast

          dayAssignments.push({
            request_id: req.id,
            area_name: req.area_name,
            owner_name: req.owner_name,
            area_rai: parseFloat(String(req.area_rai || 0)) || 0,
            zone_id: selectedZoneId,
            zone_name: zone?.name || `Zone ${selectedZoneId}`,
            team_id: selectedTeamId,
            team_name: selectedTeamName,
            limit_id: selectedLimitId,
            weather_forecast_id: forecastId,
          });

          // Update tracking: mark that this team is assigned to this zone on this date
          const teamKey = `${date}-${selectedTeamId}`;
          teamZoneByDate.set(teamKey, selectedZoneId);

          const currentUsed = areaUsedByLimit.get(selectedLimitId) || 0;
          const reqArea = parseFloat(String(req.area_rai || 0)) || 0;
          areaUsedByLimit.set(selectedLimitId, currentUsed + reqArea);
          
          assignedCount++;
        } else {
          skipReasons['no_team_or_limit_full'] = (skipReasons['no_team_or_limit_full'] || 0) + 1;
        }
      }
      
      console.log(`[Optimize] Date ${date} assignment results: ${assignedCount} assigned, ${Object.keys(skipReasons).map(k => `${k}:${skipReasons[k]}`).join(', ')}`);

      if (dayAssignments.length > 0) {
        assignments.push({
          date,
          assignments: dayAssignments,
        });
      }
    }

    // Calculate summary
    const total_area = assignments.reduce(
      (sum, day) => sum + day.assignments.reduce((s, a) => s + parseFloat(String(a.area_rai || 0)) || 0, 0),
      0
    );
    const total_requests = assignments.reduce((sum, day) => sum + day.assignments.length, 0);

    const summary = assignments.map((day) => ({
      date: day.date,
      total_area: day.assignments.reduce((sum, a) => sum + parseFloat(String(a.area_rai || 0)) || 0, 0),
      request_count: day.assignments.length,
      team_count: new Set(day.assignments.map((a) => a.team_id)).size,
    }));

    console.log(`[Optimize] Completed: ${assignments.length} days with assignments, total area: ${total_area}, total requests: ${total_requests}`);

    if (assignments.length === 0) {
      // ตรวจสอบว่าขาดข้อมูลอะไรบ้าง
      const missingData: string[] = [];
      
      if (validRequests.length === 0) {
        missingData.push('ไม่มีคำขอเผา (burn_requests)');
      }
      
      if (zones.length === 0) {
        missingData.push('ไม่มีเขตพื้นที่ (zones)');
      }
      
      if (dailyLimits.length === 0) {
        missingData.push('ไม่มีข้อจำกัดการเผารายวัน (daily_burn_limits) ในช่วงวันที่เลือก');
      }
      
      if (weatherForecasts.length === 0) {
        missingData.push('ไม่มีพยากรณ์อากาศ (weather_forecast) ในช่วงวันที่เลือก');
      } else {
        const burnableForecasts = weatherForecasts.filter((f: any) => f.is_burnable);
        if (burnableForecasts.length === 0) {
          missingData.push('ไม่มีพยากรณ์อากาศที่เผาได้ (is_burnable = true) ในช่วงวันที่เลือก');
        }
      }
      
      if (teamAvailabilities.length === 0) {
        missingData.push('ไม่มีทีมที่พร้อมทำงาน (team_availability) ในช่วงวันที่เลือก');
      } else {
        // ตรวจสอบว่ามีทีมในวันที่เลือกหรือไม่
        const datesWithTeams = dates.filter(date => {
          const teams = teamsByDate.get(date) || [];
          return teams.length > 0;
        });
        if (datesWithTeams.length === 0) {
          const teamDates = Array.from(teamsByDate.keys());
          missingData.push(`มีทีม ${teamAvailabilities.length} รายการ แต่ไม่มีทีมในวันที่เลือก (${dates.join(', ')}). วันที่ที่มีทีม: ${teamDates.length > 0 ? teamDates.join(', ') : 'ไม่มี'}`);
        }
      }
      
      // ตรวจสอบ spatial relationships
      let hasSpatialMatches = false;
      for (const req of validRequests) {
        const zoneIds = requestZoneMap.get(req.id) || [];
        if (zoneIds.length > 0) {
          hasSpatialMatches = true;
          break;
        }
      }
      
      if (!hasSpatialMatches && validRequests.length > 0 && zones.length > 0) {
        missingData.push('คำขอเผาไม่ intersect กับเขตพื้นที่ใดๆ');
      }
      
      const message = missingData.length > 0 
        ? `ไม่สามารถสร้างแผนได้ เนื่องจาก:\n${missingData.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}`
        : 'ไม่สามารถสร้างแผนได้ เนื่องจากไม่มีข้อมูลที่เพียงพอ';
      
      return NextResponse.json({
        plan: [],
        total_area: 0,
        total_requests: 0,
        summary: [],
        message: message,
        missing_data: missingData,
      });
    }

    return NextResponse.json({
      plan: assignments,
      total_area,
      total_requests,
      summary,
    });
  } catch (error: any) {
    console.error('Error optimizing plan:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Return more detailed error information
    return NextResponse.json(
      { 
        error: 'Failed to optimize plan', 
        message: error.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

