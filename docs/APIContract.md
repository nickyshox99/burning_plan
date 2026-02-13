
# APIContract.md

## ✅ GET Burnable Zones

GET /api/zones/burnable?date=YYYY-MM-DD

Response:
{
  "zones": [
    { "id": 1, "name": "Zone A" }
  ]
}

---

## ✅ GET Available Teams

GET /api/teams/available?date=YYYY-MM-DD

Response:
{
  "availableTeams": 3
}

---

## ✅ GET Burn Limits

GET /api/burn-limits?date=YYYY-MM-DD

---

## ✅ GET Approved Requests

GET /api/burn-requests/approved

---

## ✅ POST Optimize Plan

POST /api/optimize

Request:
{
  "startDate": "...",
  "endDate": "..."
}

Response:
{
  "planId": 101,
  "objectiveValue": 845.5
}

---

## ✅ GET Plan Details

GET /api/plans/{planId}

---

## ✅ GET Plan Schedule

GET /api/plans/{planId}/assignments
