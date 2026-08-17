# Wellness DynamoDB — Functionality Done

**Scope:** Recent Admin console, Backend account/access APIs, referral assignment, and related Frontend admin updates.

---

## 1. Staff authentication & role-aware console

**Done**
- Unified staff auth on the `Account` model (password + OTP, token refresh, active-role switch)
- Profile / password updates and live permission resolution
- Dual-read compatibility with legacy Admin / WC / AWC records
- Blocks inactive, blocked, deleted, or ineligible accounts
- Auto-creates missing WC/AWC referral codes when staff profiles load

**Main surface:** `/api/account/auth`, `/api/account/me`

---

## 2. Access control, roles & permissions

**Done**
- Console permission catalog (`console.*` slugs) for dashboard, users, PII, body analytics, reports, programs, teams, reassignment, calendar, pending, SOP, configs, banners, policies
- Default matrices / nav for Admin, Wellness Coach, Assistant WC, Trainee, Support
- Role templates, inheritance, custom roles, per-member overrides, reset-to-role-defaults
- System roles protected; Admin permissions locked; only Super Admin mutates roles/overrides
- Hierarchy-scoped team directory reads

**Admin UI:** Team member detail — profile, referral code, client counts, role, permission matrix, overrides

**Main surface:** `/api/account/access` (catalog, roles, members, permissions, seed)

---

## 3. Teams & staff account management

**Done**
- Teams page backed by live Account + Access APIs
- List members by console role with hierarchy metadata
- Super Admin can create WC, AWC, trainee, support (temp password if none supplied)
- Hierarchy rules: AWC → WC; Trainee → AWC
- WC sees AWCs + nested trainees; AWC sees trainees

**Pages:** `/teams`, `/teams/:memberId`  
**APIs:** `/api/account/access/members`, `/api/account/accounts`

---

## 4. Referral codes & referral-driven assignment

**Done**
- Every user gets a referral code
- Staff formats: WC `IRW-WC-NNN`, AWC `IRW-AWC-NNN` (suffix expands on collision)
- Central referral registry (entity type/id, owning WC)
- Registration accepts referral code → referral history + WC/AWC assignment + parent WC
- Invalid codes ignored (registration still succeeds)
- Referral history kept through downgrade / re-upgrade; registry ownership follows parent coach

**Key pieces:** `referralCode` util, `referralCodeModel`, `registrationReferralService`, user auth registration

---

## 5. User tiers, conversion & coach assignment

**Done**
- Tiers in UI: Seek, Consultancy only, Seek to Heal, Maintenance
- Convert Seek → Heal / Heal → Seek; assign / reassign WC or AWC (AWC requires parent WC)
- Heal downgrade clears active coaching/program/onboarding state; preserves referral history + user’s own code
- Heal conversion sets paid onboarding / program eligibility / Energy Exchange via conversion backend
- Admin user list: live data, search/filter/sort/pagination, status, archive, reassignment
- Non-admin staff: role-scoped `/account/heal-users` (read-only presentation)
- Legacy Frontend admin: tier/assignment filters, assignment modals, pending-assignment list, referral display

**APIs:** `/api/account/users` (+ convert / assign / reassign / pending-assignment), `/api/account/heal-users`  
**Also:** shared `ReferralAssignmentShared` + Frontend `UserList` / `UserAssignmentModals`

---

## 6. Client profile & paid-onboarding visibility

**Done**
- Profile mapping includes registration + paid-onboarding fields
- Admin client profile: personal/contact, health/diet, referral + coach, terms, onboarding availability, 7 paid-onboarding step statuses, completion %
- At-a-Glance onboarding / onboarded views
- Broader profile sections present (analytics, food, nutrition, BMS, Exchange, protocols, etc.)

**Gap:** Some tier/personal-detail buttons in the new Admin profile are still local UI (not fully wired to update/conversion APIs). Legacy Frontend modals call real APIs.

---

## 7. Role-scoped dashboards

**Done**
- Single statistics endpoint by active role:
  - Admin/Support → global
  - WC → own clients / assistants / pending
  - AWC → assigned clients / assistant pending
  - Trainee → parent coach dashboard
- Live metrics: client/tier counts, assistants, pending meal/testimonial/commitment, recent clients/assistants, Admin revenue
- Program-category cards from live config dropdowns; cards deep-link into filtered users/teams/pending/configs

**API:** `GET /api/account/dashboard/statistics`  
**Gap:** Challenges, broadcasts, reminders, notes, some progress/leaderboard cards remain static or session-local

---

## 8. Config dropdown management

**Done**
- DynamoDB-backed lists: slug/title, active status, layout, ordered options (value/icon/visibility/sort)
- Admin CRUD: search, add/edit/hide/delete options; program categories support icons
- Seeded lists (banners, health concerns, program categories, testimonials, discounts, yoga/recipes, medical Qs, placements, designations, etc.)
- Public/user APIs for active values; repairs missing `program-category` when needed

**APIs:** `/api/account/config-dropdowns`, `/api/user/config-dropdowns`

---

## 9. App-program pricing configuration

**Done**
- Configure programs: name, amount, discount %, discount validity (hours) with validation
- Config detail page loads/publishes via real app-config API (`app_program_pricing`)

**APIs:** `GET|PATCH /api/account/app-config`  
**Gap:** Many other Config editors (GST, gateways, legal, media, trackers, etc.) are still local/demo UI

---

## 10. Consultancy transactions & enrolled clients

**Done**
- Global admin list with filters (payment status, referral, coach, date, search)
- WC/AWC scoped to coaching hierarchy
- Enrolled-client lists; client detail with consultancy history + subscription state
- Update paid records: Zoom link, scheduled time, notes, status
- Paid invoice PDF retrieval
- Access via parent coach, direct assignee, or transaction visibility

**APIs:** `/api/account/consultancy` (transactions, invoice, enrolled-users, clients)

---

## 11. Pending Tasks page (UI)

**Done**
- Grouped queues: counselling/reports, meal review, orders, meetings
- Summaries scroll/link to sections; per-account notes in `localStorage`

**Gap:** Queue contents are static UI — not yet backed by pending-task APIs

---

## 12. Admin routing

**Done routes:** `/login`, `/dashboard`, `/users`, `/users/:userId`, `/access`, `/teams`, `/teams/:memberId`, `/calendar`, `/configs`, `/configs/:configId`, `/pending`, `/sop`, `/my-content`, `/my-content/letters/:coachId`

**Pattern:** New Admin uses `/api/account/*`; legacy `/api/admin/*` kept for compatibility. Auth often accepts console permission + legacy permission fallback.

---

## 13. Scripts & backfills

| Script | Purpose | Command |
|--------|---------|---------|
| `backfillStaffReferralCodes.js` | Missing staff codes + registry repair (`--dry-run`) | `npm run backfill:staff-referral-codes` |
| `backfillReferralUserAssignments.js` | Fill incomplete coach assignment from referral (`--dry-run`) | `npm run backfill:referral-user-assignments` |
| `seedCleanStaffAccounts.js` | Destructive clean seed of Super Admin / WC / AWC / trainee / support (`--confirm`) | `npm run seed:staff-accounts` |

---

## Known gaps / inconsistencies

1. New Admin profile/list tier actions partly local-only; legacy Frontend conversion/assign flows hit real APIs  
2. Frontend downgrade copy may say referral code is removed; backend preserves user referral code + history  
3. Clean staff seed may attach trainee to WC; product hierarchy expects Trainee → AWC  
4. Pending Tasks, parts of Dashboard, and most Config editors are UI-complete but not fully API-persisted  
