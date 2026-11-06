# TransitPro: team plan

**Project Lead:** Fanyi Charllson
**Course:** Large System Environment · Group of 5
**Repository:** https://github.com/fanyicharllson/transitpro
**Design:** https://claude.ai/artifact/1NiJFaNhTtXLuCb5VuzRaw (pages: Web dashboard · Customer app · Staff app)

## 1. Who does what

Everyone owns **one module**: its UML diagrams (CA) **and** its server code. Then each person builds the screens listed for them.

| Member | Module (UML + server) | Screens you build | Server folder |
|---|---|---|---|
| **Fanyi Charllson** (Lead) | 3 · Parcel & Courier, plus auth, agencies and shared code | Web: dashboard layout, Dashboard, Parcels (register, detail), Live tracking, Trips & booking | `modules/parcels`, `auth`, `agencies` |
| **Adrien Tello** | 1 · Booking & Ticketing | **Customer mobile app**: login, sign-up, home, search, results, agencies, agency profile, seat, pay, e-ticket, track parcel | `modules/booking` |
| **Ngwese Fidel** | 2 · Fleet & Maintenance | **Staff mobile app**: invite, Courier Today, courier delivery (code entry), Driver Today, scanner | `modules/fleet` |
| **Joy** | 4 · Human Resources | Web: Staff (list, invite, licences, payroll), Fleet page | `modules/hr` |
| **Sweet** | 5 · Finance & Reporting | Web: Finance (payments, expenses, cash reconciliation), dashboard numbers and revenue chart | `modules/finance` |

The two mobile developers (Adrien and Fidel) share `mobile/`. Adrien owns `app/(auth)` and `app/(customer)`, Fidel owns `app/(staff)` and `app/invite`. Shared pieces (`src/lib`, `src/components`, theme) are agreed between the two of you.

## 2. The lecturer's questions: where each one is answered

He said: if we cannot answer these at the presentation, no A. **Every member must be able to explain these answers.**

| Question | Our answer | Where |
|---|---|---|
| How do we solve tracking? | Each parcel gets a QR label and tracking code. Every handover is scanned and saved as a `ParcelEvent` (who, when, where). The bus shares its GPS. SMS at each step. | Parcel module, Fleet live map |
| How do we make sure the delivery guy delivers? | The parcel always has one `currentHolder`. Delivery only counts with the **receiver's 4-digit code** (sent by SMS), plus a photo and the GPS location. Late parcels raise an alert. | Parcel module, Staff app |
| How do we make sure what is sent is what is received? | At registration: declared contents, value, **photos before sealing**, **numbered seal**, **weight**. | Parcel module, Web register |
| How do we make sure it is not tampered with? | On arrival it is **weighed again**: a difference above 0.1 kg puts it ON HOLD. The receiver checks the seal number and the photos **before** giving the code, and can refuse (a claim is opened). Optional insurance. | Parcel + Finance |
| How do we earn money (commissions)? | % commission on every parcel fee, booking fee per online ticket, insurance %, home delivery, cash-on-delivery fee, monthly agency subscription. | Finance module (`platformFee`) |
| How do we make sure the payment reaches the receiver? | Payments go through MoMo / OM. Cash on delivery is held in **escrow** and released **only** when the receiver's code is correct. Staff cash is checked in the daily reconciliation. SMS receipts. | Finance module |

## 3. UML diagrams for the CA (each member, own module)

Draw 4 diagrams for your module, save the source **and** a PNG in `docs/uml/<module>/`. Tool: draw.io (diagrams.net), StarUML or PlantUML, your choice, but export PNG.

| Member | Use case | Class | Sequence | Activity |
|---|---|---|---|---|
| **Adrien** · Booking | Passenger, Counter agent, Driver, Payment provider | Route, Trip, Ticket, Review (+ Bus, Payment, User) | Passenger books a seat and pays with MoMo | Booking: search → seat → pay → ticket, with "seat taken" and "payment failed" branches |
| **Fidel** · Fleet | Fleet manager, Driver, Branch manager | Bus, MaintenanceRecord, FuelLog (+ Trip, Employee, Expense) | Driver reports a breakdown → bus in maintenance → its trips stop selling → repair cost to Finance | Bus maintenance cycle (due → in maintenance → active) |
| **Charllson** · Parcel | Sender, Receiver, Counter agent, Driver, Courier, Branch manager | Parcel, ParcelEvent, ParcelClaim (+ Escrow, Employee, Branch, Trip) | Courier delivers with the receiver's code, escrow released to sender | Parcel journey: register → load → arrive (weight check) → courier → delivered / refused |
| **Joy** · HR | HR officer, Agency owner, Staff member | Employee, StaffInvite (+ User, Role, Branch) | HR invites a courier → SMS link → sets password → staff mode | Assigning a driver to a trip (licence valid? active?) |
| **Sweet** · Finance | Accountant, Branch manager, Courier, Payment provider | Payment, Escrow, Expense, CashRemittance (+ Ticket, Parcel) | MoMo payment confirmed by the provider webhook | Daily cash reconciliation (settled / short) |

**Shared class diagram (whole group, led by Charllson):** all models of `server/prisma/schema.prisma` with their relations. This is the proof that the 5 modules share one central database. Save in `docs/uml/shared/`.

Tips:
- In your class diagram, draw your own classes in full and the other modules' classes you touch with only their name and key fields.
- In your sequence diagram, show the call into the other module's service (e.g. `ParcelService → FinanceService.releaseEscrowForParcel`). That is the interconnection the lecturer is grading.

## 4. Timeline (12 weeks)

Dates are a proposal. If the lecturer gives a different CA date, we move the UML weeks to match.

| Week | Dates | Everyone does |
|---|---|---|
| 1 | Nov 5 – 11 | Clone the repo, run the server, read AGENTS.md and the design. Group meeting: agree on the shared class diagram. |
| 2 | Nov 12 – 18 | Use case + class diagram of your module. Push to `docs/uml/<module>/`. |
| 3 | Nov 19 – 25 | Sequence + activity diagrams. Lead reviews all diagrams. **CA UML ready.** |
| 4 – 5 | Nov 26 – Dec 9 | Server: build your module's endpoints from `docs/API.md`. Mobile: navigation, auth screens, theme. Web: layout + dashboard shell. |
| 6 – 7 | Dec 10 – 23 | Screens connected to the real API. First end-to-end flow: register parcel → scan → deliver with code. |
| – | Dec 24 – Jan 3 | Holidays: light work only. |
| 8 – 9 | Jan 4 – 17 | Connect modules: payments to Finance, maintenance blocks trips, licence check, live map. |
| 10 | Jan 18 – 24 | Testing together on real phones. Fix bugs. Deploy server + web. |
| 11 – 12 | Jan 25 – Feb 7 | Polish, report, slides, demo script. **Defense rehearsal** (everyone answers the lecturer's questions). |

## 5. Ground rules

1. Read [AGENTS.md](../AGENTS.md) before coding, and give it to your AI agent.
2. One branch per task, Pull Request to `main`, the Lead merges. Never push to `main`.
3. Need a change in someone else's module or in the database schema? Ask in the group first.
4. Weekly check-in in the WhatsApp group every **Sunday evening**: what you did, what you will do, what blocks you.
5. Stuck for more than a day? Say it. Nobody gets judged for asking.
