# Duke Baseball Hub

An operations hub that helps Duke Baseball track and promote its corporate sponsorships.

Duke Baseball commits to spend targets with corporate partners in exchange for discounts, but those commitments are currently tracked across receipts, texts and spreadsheets. Nobody can easily see whether a deal is on pace, and keeping partnerships up to date takes a lot of manual work.

**Duke Baseball Hub** turns every receipt, appearance or promotional post into progress against a partnership: snap a receipt, OCR fills it in, it gets tagged to the right deal, and the dashboard shows spend vs. target, time left and status for each partner.

---

## Table of Contents

- [Problem](#problem)
- [Users](#users)
- [Key Features](#key-features)
- [User Journey](#user-journey)
- [App Structure](#app-structure)
- [MVP Requirements](#mvp-requirements)
- [Roadmap: MVP vs. Later](#roadmap-mvp-vs-later)
- [Tech Stack](#tech-stack)
- [Success Metrics](#success-metrics)

---

## Problem

| Pain point | Description |
|---|---|
| **Fragmented information** | NIL spending, receipts and partnership details live in different places. |
| **Hard to demonstrate value** | There's no easy way to show current or potential sponsors how the team has followed through on past sponsorships. |
| **Tedious workflows** | Logging spending is a slow, manual process. |

## Users

| User | Role | Needs |
|---|---|---|
| **Mickey** | Client, Director of Operations, decision maker | See every partnership's status at a glance; pitch and renew sponsors with real numbers |
| **Jack** | Point of contact | Log receipts in seconds at the time of purchase; keep the team's Excel sheet current without retyping |
| **Players and staff** | Occasional loggers | Text in a receipt or an NIL update without opening an app |

## Key Features

### Receipt capture with OCR
- Upload a photo of a receipt, or log a promotional post or appearance.
- Vendor, date, total and line items are extracted automatically.
- Every extracted field is editable, and the user confirms before saving.
- Likely duplicates and fields that don't match the receipt are flagged.

### Progress dashboard
- See all active partnerships, spend toward each commitment, time remaining and status.
- Sort by status, deadline or alphabetically.
- Each partnership has its own page with receipts and more detail.
- Add new partnerships directly from the dashboard.

### Data export
- Export receipts and partnerships to CSV / Excel in the team's existing column format.
- Generate a season report per partner for renewal conversations.

## User Journey

| Step | Today | With Duke Baseball Hub |
|---|---|---|
| Spending or a partnership activity happens | Receipts end up in email, texts, card statements, paper, etc. | Jack snaps or forwards the receipt at the time of purchase |
| Logged into a database | Manual entry into a spreadsheet | Amount, vendor and date are pulled automatically after scanning |
| Tied to a partner or sponsor | Someone has to remember which sponsor each expense belongs to | Each expense is tagged to a sponsor or partnership |
| Progress is checked | Manual sheet updates make checks slow | Live view of spend against budget by partner and season |
| Pitch to a new sponsor | Mickey assembles information from scattered files | One-page summary of current partners, what they fund and their impact |
| Report and renew | End-of-season recap takes days | Export a season report per partner |

## App Structure

| Screen | Purpose |
|---|---|
| **Overview** | Active deals, at-risk deals and spend this season; a sortable list of partnerships with progress, time left and status |
| **Partnership detail** | Progress vs. target, days left, actual vs. required pace, status, contract and all linked receipts |
| **Receipts** | Every purchase across all partnerships |
| **Add receipt** | Log by photo (OCR) or manual entry |
| **New partnership** | Company, contact, commitment type, target, dates, discount, deliverables and contract |

## MVP Requirements

### Functional

- **Authentication:** staff sign in with a Duke NetID or a passkey.
- **Partnerships:** create a partnership with company, contact, commitment type (spend $ or buy units), target, start/end dates, discount, optional deliverables and a contract PDF.
- **Receipts:** add a receipt by photo or manual entry. OCR (Tesseract) pre-fills vendor, total, date and line items, and the user confirms before saving.
- **Validation:** flag likely duplicates and fields that don't match the receipt.
- **Linking:** every receipt links to one partnership and records units, amount, who logged it, and an optional trip or event.
- **Progress:** each partnership shows progress vs. target, days left, actual vs. required pace, and a status of **On track**, **At risk** or **Complete**.
- **Overview:** totals for active deals, at-risk deals and spend this season.
- **Export:** receipts and partnerships to CSV / Excel in the team's existing column format.

### Non-Functional

- **Speed:** a receipt is confirmed in under 30 seconds from photo to save.
- **Role-based access:** only staff edit partnerships; loggers can add receipts.
- **Privacy:** receipt images and contracts are stored privately in Supabase with row-level security.
- **Responsive:** works in a phone browser for logging and on desktop for review.

## Roadmap: MVP vs. Later

| Capability | MVP | Later |
|---|---|---|
| Receipt capture | Photo upload with OCR, manual entry | Text-in receipts via SMS (Twilio) |
| Tagging | Categorize partnerships with tags; duplicate and error flags | Auto-tag to category and deal |
| Progress | Spend or units vs. target, time left, status | Threshold alerts and deadline suggestions |
| Data out | CSV / Excel export | Real-time Excel sync |
| Sponsor pitch | Season report per partner | One-page summary of current partners, what they fund and impact |
| Assistant | None | Priorities, drafted reminders and LLM chat; routing of student text requests |

## Tech Stack

| Layer | Choice |
|---|---|
| OCR | [Tesseract](https://github.com/tesseract-ocr/tesseract) |
| Database, auth and storage | [Supabase](https://supabase.com) (Postgres, row-level security, private storage buckets) |
| Authentication | Duke NetID (SSO) and passkeys |
| SMS (later) | [Twilio](https://www.twilio.com) |

## Repo Layout

```
frontend/   UI (owned by the frontend team)
backend/    FastAPI API: OCR, progress/status, validation, exports (see backend/README.md)
supabase/   Database migrations, row-level security policies, seed data (shared)
```

The frontend calls the backend at `/api/*` and can read the API contract at `http://localhost:8000/docs`.

## Success Metrics

Success means Jack stops retyping receipts and Mickey stops logging every action by hand.

| Metric | Definition | Target |
|---|---|---|
| Receipt capture rate | Share of partnership purchases logged in the Hub | TBD |
| Time to log | Photo to saved receipt | Under 30 seconds |
| Logging lag | Days from purchase to receipt logged | Same day |
| OCR accuracy | Receipts saved without field corrections | 85% |
| Partnership targets met | Commitments completed by their end date | TBD |
| Report time | Time to produce an end-of-season partner report | Minutes, down from days |
