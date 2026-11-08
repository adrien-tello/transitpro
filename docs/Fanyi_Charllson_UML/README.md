# Fanyi Charllson: UML diagrams (CA)

**Module 3 · Parcel & Courier** and the **system architecture** of TransitPro.
Each diagram is provided as PNG (for slides and printing) and SVG (sharp at any zoom).

| # | Diagram | What it shows |
|---|---|---|
| 1 | [Use case](01-use-case-parcel-courier.png) | The actors of the parcel service (sender, receiver, counter agent, driver, courier, branch manager, SMS gateway, payment provider) and their goals |
| 2 | [Class](02-class-parcel-courier.png) | Parcel, ParcelEvent and ParcelClaim, with their links to Employee (HR), Branch, Trip (Booking), Escrow and Payment (Finance) |
| 3 | [Sequence](03-sequence-deliver-with-code.png) | A courier delivers a parcel with the receiver's 4-digit code: checks, database transaction, escrow released by the Finance module, sender notified |
| 4 | [Activity](04-activity-parcel-journey.png) | The journey of one parcel across five swimlanes, with every control point: seal, payment, re-weighing, delivery code, refusal |
| 5 | [System architecture](05-system-architecture.png) | The whole platform: three apps, the security pipeline, six business modules, one central database, external services |

## How these diagrams answer the lecturer's questions

| Question | Shown in |
|---|---|
| Tracking | Class (ParcelEvent, append-only), Activity (scan at every handover) |
| The delivery guy really delivers | Sequence (holder check, receiver's code, photo, GPS), Activity |
| What is sent is what is received / not tampered | Class (seal number, photos, two weights), Activity (re-weigh, check seal before the code) |
| Payment reaches the right person | Sequence (escrow released only when the code matches), Class (Escrow, Payment) |
| How the platform earns money | Architecture (Finance module, platform fee on each payment) |
