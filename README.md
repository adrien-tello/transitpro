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
| **Admin / Owner** | Web | Sees everything, sets prices and commissions, manages branches and users |

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

## 7. Tech stack

| Layer | Technology |
|---|---|
| Mobile | Expo + React Native |
| Web dashboard | React (Vite or Next.js), Tailwind CSS, shadcn/ui |
| Backend | NestJS (TypeScript) |
| Database | PostgreSQL + Prisma |
| Auth | JWT with roles |
| Payments | Notch Pay / CinetPay (MTN MoMo, Orange Money) |
| Notifications | Push notifications + SMS |
| Hosting | Railway / Render (API + database), Vercel (web) |

### Planned repository structure

```
transitpro/
  apps/
    mobile/     Expo app (customers + field staff)
    web/        Agency dashboard
    api/        NestJS backend, one folder per module
  packages/
    types/      Shared TypeScript types (Trip, Ticket, Parcel...)
  docs/
    uml/        Use case, class, sequence and activity diagrams
```

---

## 8. UML deliverables (CA)

Each member draws the four diagrams for their own module:

- **Use case diagram**: the actors of the module and what they can do
- **Class diagram**: the module's classes, plus the shared classes it uses (Trip, Payment...)
- **Sequence diagram**: one or two key flows of the module
- **Activity diagram**: one process of the module, with its decisions

The group also agrees on **one shared class diagram for the central database**, so all five modules fit together.

## 9. Team

| Member | Module |
|---|---|
| _TBD_ | Booking & Ticketing |
| _TBD_ | Fleet & Maintenance |
| _TBD_ | Parcel & Courier |
| _TBD_ | Human Resources |
| _TBD_ | Finance & Reporting |
