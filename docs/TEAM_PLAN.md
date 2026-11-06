# TransitPro: team plan

**Project Lead:** Fanyi Charllson
**Course:** Large System Environment · Group of 5
**Repository:** https://github.com/fanyicharllson/transitpro
**Design:** https://claude.ai/artifact/1NiJFaNhTtXLuCb5VuzRaw (pages: Web dashboard · Customer app · Staff app)

## 1. Who does what

Two kinds of work:
- **UML diagrams (CA):** each person draws the 4 diagrams of **one module**. The lecturer marks each of us on our own diagrams.
- **Building the app:** three people build the **screens**, two people build the **server** (the part that saves and checks the data).

| Member | UML module (CA) | Builds |
|---|---|---|
| **Fanyi Charllson** (Lead) | Parcel & Courier | Web dashboard, Parcels server, login and security |
| **Adrien Tello** | Booking & Ticketing | Customer mobile app, then web pages |
| **Ngwese Fidel** | Fleet & Maintenance | Staff mobile app (drivers, couriers), then web pages |
| **Joy** | Human Resources | Server: **HR** + **Booking** |
| **Sweet** | Finance & Reporting | Server: **Finance** + **Fleet** |

Why these pairs: Booking needs HR (a driver's licence must be valid before a trip), so Joy owns both. Fleet costs (fuel, repairs) go into Finance, so Sweet owns both.

## 2. Your job in simple words

**Joy and Sweet: the server**
The apps never touch the database themselves. They ask the server: "book seat 14", "give me today's trips". Your job is to write those answers. Each one is called an **endpoint**. The full list of endpoints you must build is already written in `docs/API.md`, and the empty files are already in the repo with the endpoint names. You fill them in, one by one, following [docs/SERVER_GUIDE.md](SERVER_GUIDE.md). You can use an AI agent: give it `AGENTS.md` first.

**Fidel: the staff app**
You build the phone screens a driver or courier uses: their day, scanning a QR code, and delivering a parcel with the receiver's 4-digit code. The screens are already designed (page "Staff app"). Until Sweet's and Charllson's endpoints are ready, show fake data shaped like `docs/API.md`, then switch to the real server.

**Adrien: the customer app**
You build the screens a passenger uses: login, search a trip, choose a seat, pay, ticket, track a parcel. Designed on page "Customer app". Same idea as Fidel: fake data first, real server when Joy's endpoints are ready.

**Charllson: web + parcels + glue**
Web dashboard, the Parcels server (the lecturer's questions), login and security, merging everyone's work.

**Everyone, for the defense:** you draw the UML of your module even if someone else codes it. Joy explains the Booking code to Adrien, Sweet explains the Fleet code to Fidel, so you can both defend your diagrams.

## 3. The lecturer's questions: where each one is answered

If we cannot answer these at the presentation, no A. **Every member must be able to explain them.**

| Question | Our answer |
|---|---|
| How do we solve tracking? | Every parcel has a QR label and tracking code. Every handover is scanned and saved (who, when, where). The bus shares its GPS. SMS at each step. |
| How do we make sure the delivery guy delivers? | The parcel always has one named holder. Delivery only counts with the **receiver's 4-digit code** (sent by SMS), plus a photo and GPS. Late parcels raise an alert. |
| What is sent is what is received? | At registration: declared contents and value, **photos before sealing**, a **numbered seal**, and the **weight**. |
| Not tampered with? | On arrival it is **weighed again**: a difference above 0.1 kg puts it on hold. The receiver checks the seal and the photos **before** giving the code, and can refuse (a claim is opened). Optional insurance. |
| How do we earn money? | Commission on each parcel, booking fee per online ticket, insurance %, home delivery, cash-on-delivery fee, monthly agency subscription. |
| Does the payment reach the right person? | MoMo / Orange Money. Cash on delivery is held in **escrow** and released **only** when the receiver's code is correct. Staff cash is checked every evening. SMS receipts. |

## 4. UML diagrams for the CA (each member, own module)

Save the source **and** a PNG in `docs/uml/<module>/`. Tool: draw.io (diagrams.net), StarUML or PlantUML.

| Member | Use case | Class | Sequence | Activity |
|---|---|---|---|---|
| **Adrien** · Booking | Passenger, Counter agent, Driver, Payment provider | Route, Trip, Ticket, Review (+ Bus, Payment, User) | Passenger books a seat and pays with MoMo | Search → seat → pay → ticket, with "seat taken" and "payment failed" |
| **Fidel** · Fleet | Fleet manager, Driver, Branch manager | Bus, MaintenanceRecord, FuelLog (+ Trip, Employee, Expense) | Driver reports a breakdown → bus in maintenance → its trips stop selling → cost to Finance | Bus maintenance cycle |
| **Charllson** · Parcel | Sender, Receiver, Counter agent, Driver, Courier, Branch manager | Parcel, ParcelEvent, ParcelClaim (+ Escrow, Employee, Branch, Trip) | Courier delivers with the receiver's code, escrow released | Parcel journey with weight check and refusal |
| **Joy** · HR | HR officer, Agency owner, Staff member | Employee, StaffInvite (+ User, Role, Branch) | HR invites a courier → SMS link → sets password → staff mode | Assigning a driver to a trip (licence valid?) |
| **Sweet** · Finance | Accountant, Branch manager, Courier, Payment provider | Payment, Escrow, Expense, CashRemittance (+ Ticket, Parcel) | MoMo payment confirmed by the provider | Daily cash reconciliation (settled / short) |

**Shared class diagram (whole group, led by Charllson):** all tables of `server/prisma/schema.prisma` and their links. It proves the 5 modules share one database. Save in `docs/uml/shared/`.

Tip: in your sequence diagram, show the call into another module (e.g. `ParcelService → FinanceService`). That link between modules is what the lecturer is grading.

## 5. Timeline (12 weeks)

If the lecturer gives a different CA date, we move the UML weeks.

| Week | Dates | Everyone does |
|---|---|---|
| 1 | Nov 5 – 11 | Clone the repo, read this plan and the design. Group meeting on the shared class diagram. |
| 2 | Nov 12 – 18 | Use case + class diagram of your module. |
| 3 | Nov 19 – 25 | Sequence + activity diagrams. Lead reviews. **CA UML ready.** |
| 4 – 5 | Nov 26 – Dec 9 | Joy and Sweet: first endpoints. Adrien, Fidel: navigation, login, main screens with fake data. Lead: web layout, parcels server. |
| 6 – 7 | Dec 10 – 23 | Screens switch to the real server. First full flow: register parcel → scan → deliver with code. |
| – | Dec 24 – Jan 3 | Holidays: light work only. |
| 8 – 9 | Jan 4 – 17 | Modules linked: payments to Finance, maintenance blocks trips, licence check, live map. Adrien and Fidel help on web pages. |
| 10 | Jan 18 – 24 | Test together on real phones, fix bugs, deploy. |
| 11 – 12 | Jan 25 – Feb 7 | Polish, report, slides. **Defense rehearsal.** |

## 6. Ground rules

1. Read [AGENTS.md](../AGENTS.md) before coding, and give it to your AI agent.
2. One branch per task, Pull Request to `main`, the Lead merges. Never push to `main`.
3. Need a change in someone else's part or in the database? Ask in the group first.
4. Check-in in the WhatsApp group every **Sunday evening**: what you did, what is next, what blocks you.
5. Stuck for more than a day? Say it. Nobody gets judged for asking.
