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

// Assignment represents a single assignment of a request to a date/zone/team
interface Assignment {
  request_id: number;
  date: string;
  zone_id: number;
  team_id: number;
  limit_id: number;
  weather_forecast_id: number;
}

// Solution represents a complete assignment plan
interface Solution {
  assignments: Assignment[];
  fitness: number; // Total area assigned
}

// POST /api/optimize-genetic - Optimize burn plan using Genetic Algorithm
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

    // Fetch all data (same as MIP)
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

    const zones = await query<any>(`
      SELECT 
        id,
        name,
        ST_AsText(boundary) as boundary_wkt
      FROM zones
      WHERE boundary IS NOT NULL
      ORDER BY id
    `);

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

    // Build spatial index maps (same as MIP)
    const requestZoneMap = new Map<number, number[]>();
    for (const req of validRequests) {
      try {
        const zoneIntersects = await query<any>(`
          SELECT z.id
          FROM zones z
          WHERE z.boundary IS NOT NULL
            AND ST_Intersects(
              ST_GeomFromText(?, 4326),
              z.boundary
            ) = 1
        `, [req.boundary_wkt]);
        requestZoneMap.set(req.id, zoneIntersects.map((z: any) => z.id));
      } catch (err) {
        requestZoneMap.set(req.id, []);
      }
    }

    const normalizeDate = (dateValue: any): string => {
      if (!dateValue) return '';
      if (dateValue instanceof Date) {
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return String(dateValue).split('T')[0].split(' ')[0];
    };

    const requestLimitMap = new Map<string, number[]>();
    for (const req of validRequests) {
      for (const date of dates) {
        try {
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
          requestLimitMap.set(`${req.id}-${date}`, limitIntersects.map((l: any) => l.id));
        } catch (err) {
          requestLimitMap.set(`${req.id}-${date}`, []);
        }
      }
    }

    const requestWeatherMap = new Map<string, number[]>();
    for (const req of validRequests) {
      for (const date of dates) {
        try {
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
          requestWeatherMap.set(`${req.id}-${date}`, forecastIntersects.map((f: any) => f.id));
        } catch (err) {
          requestWeatherMap.set(`${req.id}-${date}`, []);
        }
      }
    }

    const teamsByDate = new Map<string, TeamAvailability[]>();
    for (const ta of teamAvailabilities) {
      const dateStr = normalizeDate(ta.work_date);
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

    // Genetic Algorithm parameters
    const POPULATION_SIZE = 50;
    const MAX_GENERATIONS = 100;
    const MUTATION_RATE = 0.1;
    const CROSSOVER_RATE = 0.8;
    const TOURNAMENT_SIZE = 3;

    // Helper function to check if assignment is valid
    const isValidAssignment = (
      req: any,
      date: string,
      zoneId: number,
      teamId: number,
      limitId: number,
      areaUsedByLimit: Map<number, number>,
      teamZoneByDate: Map<string, number>,
      dateLimits: any[],
      limitIds: number[]
    ): boolean => {
      // Check weather
      const weatherKey = `${req.id}-${date}`;
      const forecastIds = requestWeatherMap.get(weatherKey) || [];
      if (forecastIds.length === 0) return false;

      // Check limit capacity
      const limit = dateLimits.find((l: any) => l.id === limitId);
      if (!limit) return false;
      const currentUsed = areaUsedByLimit.get(limitId) || 0;
      const reqArea = parseFloat(String(req.area_rai || 0)) || 0;
      const limitMax = parseFloat(String(limit.max_area_rai || 0)) || 0;
      if (currentUsed + reqArea > limitMax) return false;

      // Check team-zone constraint
      const teamKey = `${date}-${teamId}`;
      const assignedZone = teamZoneByDate.get(teamKey);
      if (assignedZone !== undefined && assignedZone !== zoneId) return false;

      return true;
    };

    // Generate a random solution
    const generateRandomSolution = (): Solution => {
      const assignments: Assignment[] = [];
      const areaUsedByLimit = new Map<number, number>();
      const teamZoneByDate = new Map<string, number>();

      // Shuffle requests for randomness
      const shuffledRequests = [...validRequests].sort(() => Math.random() - 0.5);

      for (const req of shuffledRequests) {
        let assigned = false;
        // Shuffle dates for randomness
        const shuffledDates = [...dates].sort(() => Math.random() - 0.5);

        for (const date of shuffledDates) {
          if (assigned) break;
          
          const weatherKey = `${req.id}-${date}`;
          const forecastIds = requestWeatherMap.get(weatherKey) || [];
          if (forecastIds.length === 0) continue;

          const zoneIds = requestZoneMap.get(req.id) || [];
          if (zoneIds.length === 0) continue;

          const limitKey = `${req.id}-${date}`;
          const limitIds = requestLimitMap.get(limitKey) || [];
          if (limitIds.length === 0) continue;

          const dateLimits = dailyLimits.filter((l: any) => normalizeDate(l.limit_on_date) === date);
          const availableTeams = teamsByDate.get(date) || [];
          if (availableTeams.length === 0) continue;

          // Try to assign
          const shuffledLimitIds = [...limitIds].sort(() => Math.random() - 0.5);
          const shuffledZoneIds = [...zoneIds].sort(() => Math.random() - 0.5);
          const shuffledTeams = [...availableTeams].sort(() => Math.random() - 0.5);

          for (const limitId of shuffledLimitIds) {
            if (assigned) break;
            for (const zoneId of shuffledZoneIds) {
              if (assigned) break;
              for (const team of shuffledTeams) {
                if (isValidAssignment(
                  req, date, zoneId, team.team_id, limitId,
                  areaUsedByLimit, teamZoneByDate, dateLimits, limitIds
                )) {
                  assignments.push({
                    request_id: req.id,
                    date,
                    zone_id: zoneId,
                    team_id: team.team_id,
                    limit_id: limitId,
                    weather_forecast_id: forecastIds[0],
                  });

                  // Update tracking
                  const teamKey = `${date}-${team.team_id}`;
                  teamZoneByDate.set(teamKey, zoneId);
                  const currentUsed = areaUsedByLimit.get(limitId) || 0;
                  const reqArea = parseFloat(String(req.area_rai || 0)) || 0;
                  areaUsedByLimit.set(limitId, currentUsed + reqArea);
                  
                  assigned = true;
                  break;
                }
              }
            }
          }
        }
      }

      // Calculate fitness
      const fitness = assignments.reduce((sum, a) => {
        const req = validRequests.find((r: any) => r.id === a.request_id);
        return sum + (parseFloat(String(req?.area_rai || 0)) || 0);
      }, 0);

      return { assignments, fitness };
    };

    // Calculate fitness for a solution
    const calculateFitness = (assignments: Assignment[]): number => {
      return assignments.reduce((sum, a) => {
        const req = validRequests.find((r: any) => r.id === a.request_id);
        return sum + (parseFloat(String(req?.area_rai || 0)) || 0);
      }, 0);
    };

    // Tournament selection
    const tournamentSelection = (population: Solution[]): Solution => {
      const tournament = [];
      for (let i = 0; i < TOURNAMENT_SIZE; i++) {
        tournament.push(population[Math.floor(Math.random() * population.length)]);
      }
      return tournament.reduce((best, current) => 
        current.fitness > best.fitness ? current : best
      );
    };

    // Crossover: combine two parent solutions
    const crossover = (parent1: Solution, parent2: Solution): Solution => {
      if (Math.random() > CROSSOVER_RATE) {
        return Math.random() > 0.5 ? parent1 : parent2;
      }

      const childAssignments: Assignment[] = [];
      const areaUsedByLimit = new Map<number, number>();
      const teamZoneByDate = new Map<string, number>();

      // Combine assignments from both parents
      const allAssignments = [...parent1.assignments, ...parent2.assignments];
      const shuffled = allAssignments.sort(() => Math.random() - 0.5);

      for (const assignment of shuffled) {
        const req = validRequests.find((r: any) => r.id === assignment.request_id);
        if (!req) continue;

        const dateLimits = dailyLimits.filter((l: any) => normalizeDate(l.limit_on_date) === assignment.date);
        const limitIds = requestLimitMap.get(`${req.id}-${assignment.date}`) || [];

        if (isValidAssignment(
          req, assignment.date, assignment.zone_id, assignment.team_id, assignment.limit_id,
          areaUsedByLimit, teamZoneByDate, dateLimits, limitIds
        )) {
          childAssignments.push(assignment);

          // Update tracking
          const teamKey = `${assignment.date}-${assignment.team_id}`;
          teamZoneByDate.set(teamKey, assignment.zone_id);
          const currentUsed = areaUsedByLimit.get(assignment.limit_id) || 0;
          const reqArea = parseFloat(String(req.area_rai || 0)) || 0;
          areaUsedByLimit.set(assignment.limit_id, currentUsed + reqArea);
        }
      }

      return {
        assignments: childAssignments,
        fitness: calculateFitness(childAssignments),
      };
    };

    // Mutation: randomly change some assignments
    const mutate = (solution: Solution): Solution => {
      if (Math.random() > MUTATION_RATE) {
        return solution;
      }

      const mutatedAssignments: Assignment[] = [];
      const areaUsedByLimit = new Map<number, number>();
      const teamZoneByDate = new Map<string, number>();

      // Keep some assignments, randomly reassign others
      for (const assignment of solution.assignments) {
        if (Math.random() < 0.5) {
          // Keep this assignment
          mutatedAssignments.push(assignment);
          const req = validRequests.find((r: any) => r.id === assignment.request_id);
          if (req) {
            const teamKey = `${assignment.date}-${assignment.team_id}`;
            teamZoneByDate.set(teamKey, assignment.zone_id);
            const currentUsed = areaUsedByLimit.get(assignment.limit_id) || 0;
            const reqArea = parseFloat(String(req.area_rai || 0)) || 0;
            areaUsedByLimit.set(assignment.limit_id, currentUsed + reqArea);
          }
        }
      }

      // Try to add new random assignments
      const shuffledRequests = [...validRequests].sort(() => Math.random() - 0.5);
      for (const req of shuffledRequests) {
        // Skip if already assigned
        if (mutatedAssignments.some(a => a.request_id === req.id)) continue;

        let assigned = false;
        const shuffledDates = [...dates].sort(() => Math.random() - 0.5);
        for (const date of shuffledDates) {
          if (assigned) break;
          
          const weatherKey = `${req.id}-${date}`;
          const forecastIds = requestWeatherMap.get(weatherKey) || [];
          if (forecastIds.length === 0) continue;

          const zoneIds = requestZoneMap.get(req.id) || [];
          if (zoneIds.length === 0) continue;

          const limitKey = `${req.id}-${date}`;
          const limitIds = requestLimitMap.get(limitKey) || [];
          if (limitIds.length === 0) continue;

          const dateLimits = dailyLimits.filter((l: any) => normalizeDate(l.limit_on_date) === date);
          const availableTeams = teamsByDate.get(date) || [];
          if (availableTeams.length === 0) continue;

          const shuffledLimitIds = [...limitIds].sort(() => Math.random() - 0.5);
          const shuffledZoneIds = [...zoneIds].sort(() => Math.random() - 0.5);
          const shuffledTeams = [...availableTeams].sort(() => Math.random() - 0.5);

          for (const limitId of shuffledLimitIds) {
            if (assigned) break;
            for (const zoneId of shuffledZoneIds) {
              if (assigned) break;
              for (const team of shuffledTeams) {
                if (isValidAssignment(
                  req, date, zoneId, team.team_id, limitId,
                  areaUsedByLimit, teamZoneByDate, dateLimits, limitIds
                )) {
                  mutatedAssignments.push({
                    request_id: req.id,
                    date,
                    zone_id: zoneId,
                    team_id: team.team_id,
                    limit_id: limitId,
                    weather_forecast_id: forecastIds[0],
                  });

                  const teamKey = `${date}-${team.team_id}`;
                  teamZoneByDate.set(teamKey, zoneId);
                  const currentUsed = areaUsedByLimit.get(limitId) || 0;
                  const reqArea = parseFloat(String(req.area_rai || 0)) || 0;
                  areaUsedByLimit.set(limitId, currentUsed + reqArea);
                  
                  assigned = true;
                  break;
                }
              }
            }
          }
        }
      }

      return {
        assignments: mutatedAssignments,
        fitness: calculateFitness(mutatedAssignments),
      };
    };

    // Initialize population
    let population: Solution[] = [];
    for (let i = 0; i < POPULATION_SIZE; i++) {
      population.push(generateRandomSolution());
    }

    // Sort by fitness
    population.sort((a, b) => b.fitness - a.fitness);

    // Evolution loop
    for (let generation = 0; generation < MAX_GENERATIONS; generation++) {
      const newPopulation: Solution[] = [];

      // Keep best solution (elitism)
      newPopulation.push(population[0]);

      // Generate new population
      while (newPopulation.length < POPULATION_SIZE) {
        const parent1 = tournamentSelection(population);
        const parent2 = tournamentSelection(population);
        let child = crossover(parent1, parent2);
        child = mutate(child);
        newPopulation.push(child);
      }

      // Sort by fitness
      newPopulation.sort((a, b) => b.fitness - a.fitness);
      population = newPopulation;

      // Log best fitness every 10 generations
      if (generation % 10 === 0) {
        console.log(`[Genetic] Generation ${generation}: Best fitness = ${population[0].fitness}`);
      }
    }

    // Get best solution
    const bestSolution = population[0];

    // Convert to response format (same as MIP)
    const assignmentsByDate = new Map<string, typeof bestSolution.assignments>();
    for (const assignment of bestSolution.assignments) {
      if (!assignmentsByDate.has(assignment.date)) {
        assignmentsByDate.set(assignment.date, []);
      }
      assignmentsByDate.get(assignment.date)!.push(assignment);
    }

    const plan = dates
      .filter(date => assignmentsByDate.has(date))
      .map(date => {
        const dayAssignments = assignmentsByDate.get(date)!;
        return {
          date,
          assignments: dayAssignments.map(a => {
            const req = validRequests.find((r: any) => r.id === a.request_id);
            const zone = zones.find((z: any) => z.id === a.zone_id);
            const team = teamAvailabilities.find((t: any) => 
              t.team_id === a.team_id && normalizeDate(t.work_date) === date
            );
            return {
              request_id: a.request_id,
              area_name: req?.area_name,
              owner_name: req?.owner_name,
              area_rai: parseFloat(String(req?.area_rai || 0)) || 0,
              zone_id: a.zone_id,
              zone_name: zone?.name || `Zone ${a.zone_id}`,
              team_id: a.team_id,
              team_name: team?.team_name || `Team ${a.team_id}`,
              limit_id: a.limit_id,
              weather_forecast_id: a.weather_forecast_id,
            };
          }),
        };
      });

    const total_area = bestSolution.fitness;
    const total_requests = bestSolution.assignments.length;

    const summary = plan.map((day) => ({
      date: day.date,
      total_area: day.assignments.reduce((sum, a) => sum + a.area_rai, 0),
      request_count: day.assignments.length,
      team_count: new Set(day.assignments.map((a) => a.team_id)).size,
    }));

    if (plan.length === 0) {
      return NextResponse.json({
        plan: [],
        total_area: 0,
        total_requests: 0,
        summary: [],
        message: 'ไม่สามารถสร้างแผนได้ เนื่องจากไม่มีข้อมูลที่เพียงพอ',
      });
    }

    return NextResponse.json({
      plan,
      total_area,
      total_requests,
      summary,
    });
  } catch (error: any) {
    console.error('Error optimizing plan with Genetic Algorithm:', error);
    return NextResponse.json(
      { 
        error: 'Failed to optimize plan', 
        message: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

