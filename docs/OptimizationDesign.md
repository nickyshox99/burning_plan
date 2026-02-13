# OptimizationDesign.md

## Optimization Model & Algorithm Strategy

------------------------------------------------------------------------

# 1️⃣ Genetic Algorithm (GA)

## 1.1 Representation (Chromosome Design)

Chromosome = แผนการเผาทั้งหมดในช่วงเวลา

ตัวอย่าง gene:

Gene = (date, zone, assigned_area)

หรือ

Gene = BurnDecision(zone, date) ∈ {0,1}

------------------------------------------------------------------------

## 1.2 Fitness Function

Objective หลัก:\
Maximize Total Burn Area

Fitness =

Fitness = W1 \* AreaScore\
- W2 \* ConstraintPenalty\
- W3 \* ConcentrationPenalty\
- W4 \* ImbalancePenalty

------------------------------------------------------------------------

### ✅ AreaScore

AreaScore = Σ (burned_area)

------------------------------------------------------------------------

### ❌ ConstraintPenalty

Penalty หากละเมิด constraints:

-   เผาวันที่ isBurnable = false
-   เกิน maxBurnAreaPerDay
-   ทีมไม่พอ

ConstraintPenalty = Σ (violations × penalty_weight)

------------------------------------------------------------------------

### ❌ ConcentrationPenalty

ลดการเผากระจุก

ConcentrationPenalty ∝ Σ(zone_burn_ratio²)

------------------------------------------------------------------------

### ❌ ImbalancePenalty

ลดความไม่สมดุลระหว่างเขต

ImbalancePenalty ∝ Variance(burned_area_per_zone)

------------------------------------------------------------------------

## 1.3 GA Operators

-   Selection → Tournament / Roulette
-   Crossover → Zone Swap / Day Swap
-   Mutation → Flip Burn Day / Reassign Zone
-   Elitism → เก็บ best solutions

------------------------------------------------------------------------

## 1.4 Termination Criteria

-   Max Generations
-   Convergence Threshold
-   Time Limit

------------------------------------------------------------------------

# 2️⃣ Mixed Integer Programming (MIP)

⭐️ Core Optimization Model

------------------------------------------------------------------------

## 2.1 Decision Variables

Burn(z, d) ∈ {0,1}\
Area(z, d) ≥ 0

Burn(z, d) = เผาหรือไม่\
Area(z, d) = จำนวนไร่ที่เผา

------------------------------------------------------------------------

## 2.2 Objective Function

Maximize:

Maximize Σ Area(z, d)

------------------------------------------------------------------------

## 2.3 Constraints

------------------------------------------------------------------------

### ✅ Weather Constraint

Area(z, d) ≤ isBurnable(z, d) × M

------------------------------------------------------------------------

### ✅ Daily Burn Limit

Σ Area(z, d) ≤ maxBurnAreaPerDay(z, d)

------------------------------------------------------------------------

### ✅ Team Constraint

Σ Burn(z, d) ≤ AvailableTeams(d)

------------------------------------------------------------------------

### ✅ Logical Link

Area(z, d) ≤ Burn(z, d) × M

------------------------------------------------------------------------

### ✅ Request Availability

Area(z, d) ≤ AvailableRequestArea(z)

------------------------------------------------------------------------

### ✅ Balance Constraint (Optional)

Area(z, total) ≤ BalanceFactor × AverageArea

------------------------------------------------------------------------

# 3️⃣ Solver & Tech Stack

------------------------------------------------------------------------

## 3.1 Recommended Solver Options

### 🥇 OR-Tools (Google)

✔ ฟรี\
✔ รองรับ MIP + CP-SAT\
✔ ใช้ได้กับ Python / Node.js

------------------------------------------------------------------------

### 🥈 CBC Solver

✔ Open Source\
✔ ใช้ฟรี\
✔ Stable

------------------------------------------------------------------------

### 🥉 Gurobi

✔ เร็วมาก\
✔ Industry Grade\
❌ มีค่าใช้จ่าย

------------------------------------------------------------------------

## 3.2 Suggested Stack

### Backend / Optimizer

Option A (แนะนำ):

-   Python
-   OR-Tools

เหตุผล:

✔ Library Optimization ดีสุด\
✔ Ecosystem ด้าน math/AI แข็งแรง

------------------------------------------------------------------------

Option B:

-   Node.js
-   OR-Tools via bindings

------------------------------------------------------------------------

## 3.3 Architecture Pattern

Frontend (Next.js)\
↓\
API Layer\
↓\
Optimization Engine (Python Service)\
↓\
Database

------------------------------------------------------------------------

## 3.4 Hybrid Strategy (Advanced)

-   Heuristic / GA → Generate Candidates
-   MIP → Refine & Validate

------------------------------------------------------------------------

# 4️⃣ Practical Recommendation

⭐️ Production Strategy

1.  ใช้ MIP เป็น Core Optimizer\
2.  ใช้ Heuristic / GA เป็น Fallback / Exploration\
3.  Log + Explain Decisions

------------------------------------------------------------------------

# 5️⃣ Future Extensions

-   Multi-objective Optimization
-   Risk Model
-   Smoke / PM2.5 Prediction
-   Cost Optimization
