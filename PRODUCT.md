# OneDig — revised product strategy

## Decision

**Retain OneDig and the public works record; significantly upgrade coordination.** The previous map, complaint receipt and conflict alert were useful, but a map plus a warning can feel like a conventional civic dashboard. The missing leap is helping departments turn fragmented notices into a **feasible, reviewable change of plan**, then making that decision visible to residents. The new flagship, **Dig Once Studio**, compares the current street schedule with computed alternatives and lets an officer publish a reasoned change.

## Problem and evidence boundary

The brief confirms fragmented planned/active works, weak interdepartmental coordination, repeat digging, delayed updates and limited resident follow-up. It does **not** supply municipal data, an official judging rubric, engineering constraints or measured savings. Likely judging interests—impact, innovation, usability and working behaviour—are competitive hypotheses. Assume two developers, a 36–48 hour build and one synthetic neighbourhood. Every demo record is labelled illustrative; every warning is a schedule signal, not an engineering approval.

## Users and outcomes

| User | Need | Product outcome |
| --- | --- | --- |
| Resident/shop owner | Know what is happening, disruption dates and whether concerns were addressed | Map/list, project timeline, accountable updates, private report receipt |
| Department coordinator | Spot repeat work early and negotiate a better sequence | Shared calendar, evidence-backed warnings, feasible alternative dates, before/after comparison |
| Project officer | Turn scattered notices into a trusted shared record | Paste a notice, review AI-extracted fields against the source, confirm the project; edit and publish updates |

## Product experience

The **complete core app** works on its own: an operator creates and updates projects on canonical road segments, residents see their details and timelines, and a concern can be answered through a receipt. This is the reliable civic service.

**Dig Once Studio** is the flagship. For a selected planned work, it evaluates the same road segment's other works, identifies schedule overlap or excavation soon after resurfacing, and enumerates alternative start dates inside an operator-supplied allowable window. A before/after street calendar shows the exact warning removed, shift in days and constraints used. The officer decides whether to apply the suggestion; the core app saves a version-checked schedule change with a public reason. If no valid option exists, the Studio says so and leaves the warning unresolved.

**AI notice intake** complements the Studio by attacking the scattered-information problem at its source. A pasted, synthetic departmental notice becomes a structured *draft* with exact source excerpts. Dates, department and road-segment matches are validated; unknowns stay blank. The officer confirms or corrects every field before the core app creates a project. Without an AI key, a clearly labelled rule-based/manual path remains available. No AI output is presented as a verified authority statement.

## Why this is stronger

The live result is observable: a new notice enters the record, a scheduling warning appears, a computed option removes it, and the public timeline changes after an operator decision. The before/after comparison makes coordination legible to judges and residents. The system performs actual analysis on mutable data; it does not rely on a prerecorded recommendation, a chatbot, a cost-savings claim, or an invented prediction.

## Single demonstration story

In a visibly fictional Market Road neighbourhood, resurfacing is scheduled first. A water department notice proposes excavating the same stretch a few days later. Paste the notice; AI extracts candidate fields with highlighted source excerpts, and the operator confirms them. The new project appears on the resident map. Dig Once Studio flags the reopening sequence and shows the two-work timeline. It searches the water job's allowed window, proposes completing that job before resurfacing, and compares **one warning before / zero after** with exact dates. The operator applies the change with a public reason; the resident view updates. A resident then submits an access concern and later sees the operator's response using a receipt. The AI call, scheduling computation, database write and public refresh are distinct visible steps.

## Practical limits

Canonical road segments are curated for the demo; name matching is not geocoding. The simulator uses dates and declared flexibility, not traffic models, budgets, utility dependencies or contractor availability. It never auto-approves a schedule. Real rollout needs data-sharing agreements, a maintained segment registry, richer constraints, moderation and stronger operator identity.
