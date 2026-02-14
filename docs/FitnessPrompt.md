# Fitness Function Refactor Prompt (For Cursor AI)

## Objective

Refactor and improve the Genetic Algorithm (GA) Fitness Function for a
wildfire / controlled burning planning optimizer.

------------------------------------------------------------------------

## Planning Constraints (HARD CONSTRAINTS)

These constraints MUST NEVER be violated. Any violation must trigger a
VERY LARGE penalty.

1.  One team can be assigned to ONLY one zone per day
2.  A zone can be burned ONLY on valid burnable days (from weather
    forecast)
3.  Burned area per zone per day must NOT exceed Daily Burn Limit
4.  Assignment must respect available officer/team resources
5.  No resource conflicts (team/day/zone collision)

If any constraint is violated, the solution must receive a VERY LARGE
penalty.

------------------------------------------------------------------------

## Optimization Objectives

The optimizer should prefer plans that:

1.  Maximize total burned area (rai)
2.  Distribute burning across zones (avoid concentration)
3.  Prefer high-priority zones
4.  Utilize available teams efficiently
5.  Minimize operational imbalance if possible

------------------------------------------------------------------------

## Fitness Model

Fitness = Score - Penalty

------------------------------------------------------------------------

## Score Components (Weighted)

Score should include:

-   Burned Area Score
-   Zone Distribution Score
-   Priority Score
-   Resource Utilization Score

------------------------------------------------------------------------

## Penalty Components (Dominant)

Penalty MUST dominate Score.

Apply LARGE penalties for:

-   Constraint violations
-   Daily burn limit violations
-   Resource conflicts

------------------------------------------------------------------------

## Suggested Weight Strategy

W_area = 1.0 (highest importance)\
W_distribution ≈ 0.5\
W_priority ≈ 0.4\
W_utilization ≈ 0.3

Penalty values must dominate Score values.

------------------------------------------------------------------------

## Implementation Instructions

Please:

1.  Refactor the existing calculateFitness() function
2.  Ensure HARD CONSTRAINTS are strongly penalized
3.  Add clear comments explaining logic
4.  Keep code clean and readable
5.  Avoid overcomplicated math

Return only the improved Fitness Function code.

------------------------------------------------------------------------

## Chromosome Structure

Each chromosome represents assignments:

Assignment:

{ day, zone_id, team_id, burned_area, priority_weight }

------------------------------------------------------------------------

## Available Helper Functions

Assume these helper functions exist:

-   isBurnableDay(day, zone)
-   violatesTeamConstraint(team, day)
-   exceedsDailyLimit(zone, day, area)
-   hasResourceConflict(team, day)

------------------------------------------------------------------------

## Critical Rule

Invalid plans must NEVER receive higher fitness than valid plans.
