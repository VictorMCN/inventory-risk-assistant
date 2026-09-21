# Risk Engine

## Objective

The Risk Engine identifies SKUs that require replenishment attention by evaluating stock coverage, historical stockouts, recent demand changes, and seasonality.

The engine intentionally separates stockout risk from business impact and inventory health issues.

This prevents unrelated problems, such as stale inventory, from incorrectly increasing replenishment urgency.

---

## Design Principles

The risk model follows five principles:

1. Stock coverage is the primary indicator of immediate replenishment risk.
2. Historical stockouts, demand acceleration, and seasonality act as supporting risk signals.
3. Business impact must not be confused with stockout probability.
4. Inventory health issues such as stale inventory must be tracked separately from replenishment risk.
5. Secondary signals alone must not classify a SKU as High or Critical. High replenishment risk requires an active inventory coverage problem.

---

## Dataset Observations

The supplied dataset contains 8,000 SKUs.

Initial analysis identified:

- 835 SKUs with inventory coverage below supplier lead time
- 521 SKUs with coverage below 50% of supplier lead time
- 1,580 SKUs with at least one stockout day in the previous 90 days
- 192 SKUs with more than 10 stockout days
- 1,937 SKUs with recent demand growth above 20%
- 1,188 SKUs with a seasonal index above 1.2
- 2,436 SKUs with margins above 50%
- 574 SKUs with no sale for at least 60 days

These observations are used to calibrate the initial heuristics.

---

## Coverage Days

Inventory coverage estimates how many days the current stock can support recent demand.

Formula:

coverageDays = currentStock / dailySales30dAvg

If recent daily sales are zero, coverage is treated as undefined for stockout calculations because there is currently no measurable demand.

---

## Coverage Ratio

To compare inventory coverage with supplier delivery time:

coverageRatio = coverageDays / leadTimeDays

Interpretation:

- coverageRatio < 1 means inventory may run out before replenishment arrives
- coverageRatio < 0.5 indicates severe coverage risk
- coverageRatio >= 1 means the current stock should theoretically cover the supplier lead time

---

## Stockout Risk Score

Each SKU receives a score between 0 and 100.

The final score is capped at 100.

### Factor 1 — Inventory Coverage

Severe coverage risk:

coverageDays < leadTimeDays × 0.5

Score:

+50 points

Moderate coverage risk:

coverageDays < leadTimeDays

Score:

+40 points

Reason:

Inventory coverage is the strongest direct indicator that a SKU may run out before replenishment arrives.

---

### Factor 2 — Historical Stockouts

If:

stockoutDaysLast90d > 10

Score:

+20 points

If:

stockoutDaysLast90d is between 1 and 10

Score:

+10 points

Reason:

Recent stockout history may indicate recurring replenishment problems or insufficient inventory planning.

---

### Factor 3 — Demand Acceleration

If:

dailySales30dAvg > dailySales90dAvg × 1.20

Score:

+10 points

Reason:

Recent demand is at least 20% higher than the longer-term average, which may cause historical replenishment settings to underestimate current demand.

---

### Factor 4 — Seasonality

If:

seasonalIndex > 1.2

Score:

+5 points

Reason:

The SKU is experiencing above-normal seasonal demand and may require additional attention.

---

## Immediate Stockout

If:

currentStock = 0

and:

dailySales30dAvg > 0

the SKU is automatically classified as Critical.

Its risk score is set to 100.

Reason:

There is active demand but no inventory available.

---

## Risk Classification

| Risk Score | Classification |
|---|---|
| 0–19 | Low |
| 20–39 | Medium |
| 40–69 | High |
| 70–100 | Critical |

The classification is intended to provide a simple operational view while preserving the individual risk factors for explainability.

---

## Reorder Point

The historical `reorderPoint` is not currently used as an independent score factor.

The dataset analysis shows that the number of SKUs below the reorder point is very similar to the number of SKUs whose coverage is below supplier lead time.

Additionally, the case explicitly notes that historical reorder points may be outdated.

The value will therefore be displayed as supporting information rather than automatically increasing the risk score.

---

## Business Impact

Business impact is intentionally separated from stockout probability.

A high-margin SKU does not necessarily have a higher probability of stockout. However, a stockout involving a high-margin product may create greater financial impact.

Initial business-impact signal:

marginPct > 50

High-margin SKUs that also have elevated stockout risk should receive additional prioritization in the user interface.

Business-impact scoring will be refined separately from the stockout risk model.

---

## Inventory Health Flags

Some inventory conditions require attention but should not increase replenishment urgency.

### Stale Inventory

A SKU is flagged as stale when:

daysSinceLastSale >= 60

This flag indicates potentially excess or slow-moving inventory.

Stale inventory must not increase the stockout risk score because ordering additional units could worsen the problem.

---

## Explainability

Every risk score must include the reasons that contributed to the result.

Example:

Risk Score: 85

Classification: Critical

Triggered factors:

- Coverage below 50% of supplier lead time
- More than 10 historical stockout days
- Demand increased by more than 20%

The application should allow an inventory analyst to understand why a SKU received its classification rather than exposing only an unexplained numerical score.

---

## Future Calibration

The initial thresholds are intentionally heuristic and transparent.

They may be refined after:

- comparing results against the provided benchmark
- reviewing the distribution of risk classifications
- validating false positives
- receiving analyst feedback
- evaluating category-specific behavior