
# OptimizerQueries.md

## ✅ Burnable Zones per Day

SELECT z.id, z.name
FROM zones z
JOIN weather_forecast wf ON wf.zone_id = z.id
WHERE wf.forecast_date = :date
AND wf.is_burnable = TRUE;

---

## ✅ Available Teams per Day

SELECT COUNT(*) AS available_teams
FROM team_availability
WHERE work_date = :date
AND is_available = TRUE;

---

## ✅ Approved Burn Requests per Zone

SELECT zone_id, SUM(area_rai) AS total_request_area
FROM burn_requests
WHERE status = 'approved'
GROUP BY zone_id;

---

## ✅ Daily Burn Limit

SELECT zone_id, max_area_rai
FROM daily_burn_limits
WHERE limit_date = :date;

---

## ✅ Remaining Burnable Area

SELECT 
    br.zone_id,
    SUM(br.area_rai) - IFNULL(SUM(pa.assigned_area_rai), 0) AS remaining_area
FROM burn_requests br
LEFT JOIN plan_assignments pa 
    ON pa.zone_id = br.zone_id
WHERE br.status = 'approved'
GROUP BY br.zone_id;
