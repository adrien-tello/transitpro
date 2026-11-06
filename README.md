# TransitPro

**Integrated management system for intercity bus agencies in Cameroon.**
Online ticketing, fleet and maintenance, secure parcel tracking, human resources and finance, all connected through **one central database**.

> Course project: *Large System Environment*, ICT University. Group of 5, one module per member.

---

## 1. The problem

Most intercity bus agencies (Douala, Yaoundé, Bafoussam, Bamenda...) still run on paper and cash:

- Passengers can't book a seat in advance. They queue at the agency.
- **Parcels get lost, delayed or opened**, and nobody can say where they are or who had them last.
- Senders can't prove what they sent, and receivers can't prove what they received.
- Buses break down on the road because maintenance is not followed.
- Owners don't know how much each bus or route really makes, so cash goes missing.

## 2. The solution

One platform that runs the whole agency:

- A **web dashboard** for agency staff (counter agents, managers, fleet, HR, accountant, owner).
- A **mobile app** for customers (book tickets, send and track parcels) and for field staff (drivers, couriers).
- Both use **the same backend and the same central database**, so a change in one module is seen by all the others.

### A SaaS platform for many agencies

TransitPro does **not** own buses or employ staff. It is software that agencies subscribe to.

1. An agency signs up on TransitPro.
2. **The TransitPro team verifies it**: business registration (RCCM), taxpayer number (NIU), the owner's CNI and the agency's address.
3. Once approved, the agency owner adds their own **branches, buses, routes, staff and couriers**.
4. Each agency **only sees its own data**. Drivers, agents and couriers are the agency's employees; TransitPro gives them the tools and keeps the records.

Because many agencies are on one platform, a passenger can **compare all agencies on a route** (times, prices, seats left) in one app.

## 3. Modules

| # | Module | What it does |
|---|---|---|
| 1 | **Booking & Ticketing** | Search trips, choose seats, pay (MTN MoMo / Orange Money / cash), QR ticket, cancel or rebook, boarding check-in |
| 2 | **Fleet & Maintenance** | Buses, maintenance schedule, breakdowns, fuel logs, bus availability, live bus GPS |
| 3 | **Parcel & Courier** | Register, seal and label parcels, load them on trips, track every handover, OTP delivery, claims |
| 4 | **Human Resources** | Drivers, conductors, agents, couriers; shifts, licence expiry, trip assignment, payroll |
| 5 | **Finance & Reporting** | Payments, escrow, commissions, daily cash reconciliation per branch, revenue per route and bus, expenses, owner dashboard |

### How the modules are connected (examples)

- A bus goes into maintenance (Fleet) → its trips stop selling seats (Booking) and its driver is freed (HR).
- A driver's licence expires (HR) → they can no longer be assigned to a trip.
- Every ticket and parcel sold → recorded automatically in Finance.
- Fuel and repair costs (Fleet) → recorded as expenses in Finance.
- Parcels are loaded on a **Trip**, the same Trip that Booking sells seats on.

---

## 4. Who uses TransitPro

| Role | App | What they do |
|---|---|---|
| **Customer** (passenger, sender, receiver) | Mobile | Book tickets, pay, track parcels with a tracking code, confirm delivery with an OTP |
| **Counter Agent** | Web | Sells tickets at the counter, **registers parcels**, prints labels, hands parcels to receivers at the arrival branch |
| **Driver / Conductor** | Mobile (staff) | Scans tickets when passengers board, scans parcels loaded on the bus, shares bus GPS during the trip |
| **Courier** | Mobile (staff) | Delivers parcels to homes or offices, gets the receiver's OTP, takes a delivery photo |
| **Branch Manager** | Web | Watches trips and parcels of the branch, handles alerts and claims, closes the daily cash |
| **Fleet Manager** | Web | Manages buses, maintenance and fuel |
| **HR Officer** | Web | Manages staff, shifts, licences and payroll |
| **Accountant** | Web | Payments, reconciliation, expenses, reports |
| **Agency Owner** | Web | Sees everything in their agency, sets ticket and parcel prices, manages branches and staff |
| **Platform Admin** (TransitPro team) | Web | Verifies new agencies, sets platform commissions, suspends agencies, sees platform-wide reports |

---

## 5. How a parcel works (simple version)

1. **The sender brings the parcel to the agency counter.** (They can fill in the receiver's details on the mobile app beforehand to save time.)
2. **The counter agent registers it** on the web dashboard: sender, receiver name and phone, destination, declared contents and value. The agent **weighs it** and **takes photos of the contents**.
3. The parcel is closed in a **numbered security seal**. The seal number is saved with the parcel.
4. The sender pays. The system then **generates a unique tracking code** (e.g. `TP-DLA-48213`) and a **QR code** of that same code. The agent prints it on a sticker label and sticks it on the parcel.
5. The sender and the receiver both get an **SMS with the tracking code**.
6. **Every time the parcel changes hands, someone scans the QR**: loading on the bus, arrival at the destination branch, handover to a courier. Each scan saves *who*, *when* and *where*.
7. At arrival, the parcel is **weighed again**. A different weight raises an alert.
8. **The receiver gets an OTP by SMS.** They check the seal and the contents (against the photos), then give the OTP. **No OTP, no delivery.**
9. If something is wrong, the receiver refuses and opens a **claim**.

---

## 6. Answers to the lecturer's questions

### Tracking
QR label + tracking code on every parcel. Every handover is a scan saved with time, place and staff ID. The driver app shares the bus GPS, so "in transit" has a live position. SMS updates at each step. Anyone can track with the code.

### Making sure the delivery person delivers
- **Chain of custody**: a parcel always belongs to one named person. The last person who scanned it is responsible.
- **Delivery only counts with the receiver's OTP**, plus a photo and GPS location of the handover.
- **Deadline alerts** to the branch manager when a parcel is late.
- Courier rating and incident history, linked to the HR module.

### What is sent is exactly what is received / no tampering
- Declared contents, value, **weight and photos** recorded before sealing.
- **Numbered tamper-evident seal** linked to the parcel.
- **Weight checked again on arrival**; any difference is flagged.
- The receiver checks the seal number and the photos **before** giving the OTP, and can refuse and open a claim.
- **Optional insurance** on the declared value.

### Making sure the payment reaches the right person
- Payments go **through the app (MoMo / Orange Money)**, not cash in someone's hand.
- For cash-on-delivery, the money is held by the platform (**escrow**) and **released automatically to the sender** when the receiver confirms with the OTP.
- Cash collected by staff shows as **"cash to remit"**, checked in the **daily reconciliation**.
- Everyone gets an **SMS receipt** with the amount.

### How the platform makes money
| Source | How |
|---|---|
| Parcel commission | % of each parcel fee (weight × distance) |
| Booking fee | Small fee per online ticket |
| Insurance | % of the declared value on insured parcels |
| Home / express delivery | Extra fee for last-mile delivery |
| Cash-on-delivery handling | 1–2% of the amount collected |
| Subscription | Agencies pay monthly for the dashboard |

---

## 7. Scope: what we build first

We build a working core first, then add the rest if time allows.

| Version 1 (MVP) | Later |
|---|---|
| Agency sign-up + manual verification | Automatic document checks |
| Trips, seats, ticket booking, QR ticket | Rebooking, multi-agency route comparison |
| Bus list + maintenance status | Fuel analytics, live GPS map |
| Parcel registration, QR label, scan updates, OTP delivery | Weight alarms, claims, insurance |
| Staff list, roles, trip assignment | Payroll, shifts |
| Payments (sandbox), daily cash report | Escrow, commissions dashboard |

## 8. Tech stack

| Layer | Technology |
|---|---|
| Backend | Express 5 + TypeScript |
| Database | PostgreSQL (cloud) + Prisma |
| Auth | httpOnly session cookie (JWT inside) + role-based access control |
| Web dashboard | React 19 + Vite + Tailwind CSS v4 + TanStack Query |
| Mobile | Expo SDK 54 + Expo Router (customer and staff screens in one app, chosen by role) |
| Payments | Notch Pay / CinetPay (MTN MoMo, Orange Money) |
| Notifications | SMS + push notifications |

### Repository structure

```
transitpro/
  server/     Express API, the only part that touches the database (one folder per module)
  web/        Agency dashboard
  mobile/     Expo app (customers + drivers and couriers)
  docs/       Team plan, API contract, UML diagrams
  AGENTS.md   Coding rules for the team and for AI agents (read first)
```

### Getting started

1. Read [AGENTS.md](AGENTS.md) and [docs/TEAM_PLAN.md](docs/TEAM_PLAN.md).
2. Server: see [server/README.md](server/README.md).
3. Web: see [web/README.md](web/README.md). Mobile: see [mobile/README.md](mobile/README.md).
4. Endpoints: [docs/API.md](docs/API.md). Design: https://claude.ai/artifact/1NiJFaNhTtXLuCb5VuzRaw

---

## 9. UML deliverables (CA)

Each member draws the four diagrams for their own module:

- **Use case diagram**: the actors of the module and what they can do
- **Class diagram**: the module's classes, plus the shared classes it uses (Trip, Payment...)
- **Sequence diagram**: one or two key flows of the module
- **Activity diagram**: one process of the module, with its decisions

The group also agrees on **one shared class diagram for the central database**, so all five modules fit together. Details per member: [docs/TEAM_PLAN.md](docs/TEAM_PLAN.md).

## 10. Team

| Member | UML module (CA) | Builds |
|---|---|---|
| **Fanyi Charllson** (Project Lead) | Parcel & Courier | Web dashboard, Parcels server, auth, agencies, security |
| Adrien Tello | Booking & Ticketing | Customer mobile app, then web pages |
| Ngwese Fidel | Fleet & Maintenance | Staff mobile app (drivers, couriers), then web pages |
| Joy | Human Resources | Server: HR + Booking |
| Sweet | Finance & Reporting | Server: Finance + Fleet |
