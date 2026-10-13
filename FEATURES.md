# OneDig — revised feature portfolio

Priority tracks: **Core** is Developer 1's independently working product; **Flagship** and **Complement** are Developer 2's parallel innovation; **Support** improves the integrated experience; **Stretch** waits for a successful full demo. Innovation starts alongside the core, not after it.

## Innovation options considered

| Candidate | Real value and demo impact | AI need / data | Feasibility and integration | Main risk / fallback | Decision |
| --- | --- | --- | --- | --- | --- |
| Pairwise overlap alerts | Useful but visually familiar; identifies a problem without solving it | No AI; segment IDs and dates | Easy | False confidence if treated as approval; label advisory | Keep inside flagship as evidence |
| **Dig Once Studio schedule simulator** | High: before/after plan, actual computed suggestion, public result | No AI; known segments, dates, allowable window | Moderate, bounded search and one adapter into core | Missing flexibility or no safe option; show warning and manual reschedule | **Flagship** |
| **AI notice intake with source evidence** | High: turns scattered text into reviewable project data in the live demo | AI useful for varied wording; pasted notice and curated segment/dept lists | Moderate, one structured-output call plus validation | Provider unavailable or unsupported text; labelled rule-based/manual entry | **Complement** |
| AI clustering of citizen reports | Useful at city scale, weak with a few demo reports | Needs many reports and privacy review | Moderate to high | Sparse data creates misleading trends; leave individual report workflow | Stretch only |
| Predictive delays or cost savings | Potentially valuable, but no historical ground truth | Requires credible training/evaluation data | Poor for this timebox | False precision; none | Exclude |
| Photo-based work verification | Could support accountability | Requires photos, geotags, moderation and truth labels | High | Unverifiable claims/privacy; none | Exclude |
| Dynamic routing/traffic forecast | Could help residents plan | Live road/traffic network | High | External data and reliability; map/list still works | Exclude |

## Selected build

| Feature | User value | Approach | Priority / owner | Dependencies |
| --- | --- | --- | --- | --- |
| Public map **and** accessible list | Find planned and active works | React, Leaflet, API data; list survives tile failure | Core / D1 | Seed, project API |
| Project detail, timeline, source and delay reason | Understand purpose, owner, expected dates and changes | Stored project events, visible update times and demo provenance | Core / D1 | Project/event schema |
| Operator project and schedule management | Maintain the shared record | Authenticated create/edit/reschedule with version checks and public reason | Core / D1 | SQLite, sessions |
| Anonymous concern and trackable response | Close the feedback loop | Report form, random receipt token, operator queue/response | Core / D1 | Report API, rate limits |
| Curated segments and schedule flexibility | Give the simulator trustworthy inputs | Canonical segment IDs plus optional earliest start/latest end on planned jobs | Core / D1 | Segment registry, project validation |
| Warning analysis and **before/after scenario search** | Prevent repeat digging instead of merely flagging it | Pure deterministic evaluator, bounded candidate enumeration, exact rule evidence | Flagship / D2 | Snapshot contract and flexibility fields |
| Studio timeline and apply interaction | Make the choice legible and actionable | React component with current/candidate tracks, metrics and no-solution state; core owns save | Flagship / D2 | Analysis adapter, reschedule callback |
| AI notice extraction and evidence | Reduce manual cross-department entry | Structured extraction; validate exact quotes, dates and known IDs; operator confirms | Complement / D2 | Notice text, segment/dept catalog, AI key |
| Rule-based/manual intake fallback | Preserve a working path when AI fails | Clearly labelled parsing of known aliases/dates plus editable form | Complement / D2 | Core project form |
| Responsive visual system, filters and empty/error states | Present one polished product | Shared tokens, mobile layout, keyboard and loading states | Support / D1 core, D2 owned Studio | Both UI modules |
| Demo seed, reset and one-process run | Repeat a genuine live interaction | Synthetic data with a feasible suggestion and visible provenance | Core / D1; D2 matching fixtures | Schema, contract |

## Explicit behaviour and priority gates

- The **core completion gate** is a fresh database → operator creates/edits a project → resident sees it → resident reports a concern → operator responds → receipt reflects the response.
- The **innovation completion gate** is a new, confirmed project → computed warning → valid candidate inside declared dates → before/after view → version-checked save through the core API → public timeline refresh. A candidate is never silently applied.
- The AI gate is an evidence-linked draft from a live call. The UI must label `ai`, `rules` or `manual` mode. A prepared synthetic notice is acceptable; a hardcoded extraction passed off as live AI is not.
- The integrated product gate includes desktop and mobile presentation, failure states and two repeatable rehearsals.

## Stretch and exclusions

Only after the gates pass: a report-theme digest with cited report IDs, Hindi notices reviewed by an operator, or CSV bulk intake. Do not build native apps, citywide geospatial matching, autonomous scheduling, arbitrary document scraping, traffic predictions, cost-savings claims, or unmoderated evidence uploads. These would weaken trust or consume the integration window.
