# Risk Engine

## Objective

The Risk Engine is responsible for identifying inventory items that require immediate replenishment attention.

Each SKU receives a risk score between 0 and 100 based on multiple inventory factors.

---

## Risk Score Classification

| Score    | Classification |
| -------- | -------------- |
| 0 - 29   | Low            |
| 30 - 59  | Medium         |
| 60 - 79  | High           |
| 80 - 100 | Critical       |

---

## Risk Factor 1 - Inventory Coverage Risk

Formula:

coverageDays = currentStock / dailySales30dAvg

Rule:

If coverageDays is lower than leadTimeDays:

+40 points

Reason:

The inventory may run out before the supplier delivers the next order.

---

## Risk Factor 2 - Historical Stockout Risk

Rule:

If stockoutDaysLast90d > 10:

+25 points

Reason:

The SKU already experienced inventory shortages recently.

---

## Risk Factor 3 - High Margin Risk

Rule:

If marginPct > 50 and coverageDays < leadTimeDays:

+15 points

Reason:

Running out of high-margin products generates a greater business impact.

---

## Risk Factor 4 - Seasonality Risk

Rule:

If seasonalIndex > 1.2:

+10 points

Reason:

Demand may increase during seasonal periods.

---

## Risk Factor 5 - Sales Trend Risk

Rule:

If dailySales30dAvg > dailySales90dAvg * 1.2:

+10 points

Reason:

Recent demand is accelerating faster than historical demand.

---

## Final Score

Risk Score = Sum of all activated factors

Maximum Score = 100
