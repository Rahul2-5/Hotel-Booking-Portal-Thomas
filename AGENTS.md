# AGENTS.md — Hotel Booking Portal (interview assignment)

You are helping me build a small hotel booking portal for a fresher full-stack interview assignment.
I must be able to explain every line in the interview, so keep the code simple and readable.

## Rules you follow on every request

1. **Commit gate.** Before starting any phase (except Phase 0), ask me exactly:
   "Have you recorded the commit for the previous phase?"
   Then stop and wait. Start the phase only after I answer yes. If I say no, show me the
   suggested commit message for the previous phase and wait again.
2. **One phase per request.** Do only the phase I name ("start phase 3"). Do not begin the next one.
3. **Before coding**, list in 3–6 lines what you will create or change. Then do it.
4. **After coding**, give me:
   - the files created or changed,
   - how to run and manually check this phase (exact commands or URLs),
   - a short plain-English explanation of the main logic, so I can explain it in the interview,
   - the suggested commit message.
5. **Do not run `git commit` yourself.** I make the commits.
6. **Stay in scope.** No authentication, payments, admin panel, Docker or cloud deployment.
   No extra libraries unless the phase needs them; if you add one, say why.
7. **No secrets in the repo.** Database credentials come from environment variables.
   Keep `.env.example` up to date; never create a committed `.env`.
8. **If something fails** (build error, failing test, unclear requirement), stop and tell me
   what failed and why. Do not silently work around it.
9. Use `BigDecimal` for money and `LocalDate` for dates. Never calculate the total on the frontend.

## Known pitfalls — prevent these

Setup
- Before Phase 1, ask me for the output of `java -version` and `mysql --version`, and build the
  project for those versions.
- Spring Boot does not read `.env` files. Read DB settings from environment variables
  (`${DB_URL}`, `${DB_USERNAME}`, `${DB_PASSWORD}`) and, in every phase's run instructions, show
  me the exact commands to set them in my terminal. For the local JDBC URL in `.env.example`,
  include `allowPublicKeyRetrieval=true&useSSL=false`.
- Keep `ddl-auto=validate`. If startup fails on schema validation, fix the entity mapping to
  match `db/schema.sql` and tell me what was wrong. Never switch to `update` or `create` for the
  main profile. Take extra care with the `booking.status` ENUM column and the `hotel_amenity`
  table (composite key).
- `db/schema.sql` has not been run yet. In Phase 0, read it carefully and report any syntax
  problem to me before anything else depends on it.

Backend
- The booking method that takes the lock must be `public`, annotated `@Transactional`, in a
  service class, and called from the controller (another bean). Never call it from a method in
  the same class, because the transaction and the lock would be silently skipped.
- Controllers never return JPA entities. Always map to DTOs, to avoid lazy-loading errors and
  endless nested JSON.
- Tests must not load `db/schema.sql`. Use an in-memory H2 database in a `test` profile with
  tables created from the entities (`ddl-auto=create-drop`), so MySQL-only syntax cannot break
  the tests. Tests must run with no MySQL server and no environment variables set.

Frontend
- Dates travel as plain `YYYY-MM-DD` strings. Use the value of `<input type="date">` directly.
  Never use `toISOString()` or `new Date(string)` to build a date for the API: I am in India
  (UTC+5:30) and the conversion to UTC shifts the day.
- To add days or count nights on the frontend (display only), work with year/month/day parts in
  local time, not with UTC timestamps.
- CORS: allow exactly `http://localhost:5173` (the Vite default). If the Vite port differs, tell
  me and update the config. Put the API base URL in one place (`VITE_API_BASE_URL`).
- Functionality first: keep styling plain until every screen in the phase works. Do not spend
  effort on visual polish unless I ask.

Working method
- Change only files that belong to the current phase. If you believe a file from an earlier
  phase must change, tell me which file and why before editing it.
- At the end of every phase, ask me 2–3 short questions about the code you just wrote (the kind
  an interviewer would ask) and correct my answers. Do this before giving the commit message.
- If you notice any password, token or real credential in a tracked file, stop and warn me
  immediately. Deleting it in a later commit is not enough because it stays in git history.
- If you are unsure whether you already asked the commit question in this session, ask it again.

## Stack

- Backend: Java 17+, Spring Boot (latest stable from start.spring.io), Maven,
  Spring Web, Spring Data JPA, Validation, MySQL driver.
- Frontend: React with Vite, plain CSS, `fetch` for API calls, React Router.
- Database: MySQL 8. Schema and sample data live in `db/schema.sql` (already written by me;
  the entities must match it — do not redesign the tables without asking).

## Repository layout

```
backend/     Spring Boot app (controller / service / repository / entity / dto / exception packages)
frontend/    React app
db/          schema.sql
docs/        screenshots
README.md
DESIGN.md
.env.example
```

## Business rules (apply everywhere)

- A stay is `[checkIn, checkOut)`: the check-out day is free for the next guest.
- Two stays overlap when `existing.checkIn < new.checkOut AND existing.checkOut > new.checkIn`.
- Available rooms = `room_type.total_rooms` − overlapping bookings with status `CONFIRMED`.
- Check-out must be after check-in. Check-in cannot be before today (server date).
- Total amount = nights × price per night, calculated on the backend, price stored on the booking.
- One room per booking. Cancelled bookings no longer count, so availability is released automatically.
- Error responses always use one JSON shape: `{ status, code, message, fieldErrors }`.
  400 = validation, 404 = not found (also when reference and email do not match), 409 = sold out
  or already cancelled.

## API list

| Method and path | Purpose |
|---|---|
| `GET /api/hotels?location=&checkIn=&checkOut=` | Browse and search; all parameters optional |
| `GET /api/hotels/{id}?checkIn=&checkOut=` | Details, available rooms, nights, total amount |
| `POST /api/bookings` | Create booking; 201 with reference and total |
| `GET /api/bookings/{reference}?email=` | Retrieve booking |
| `POST /api/bookings/{reference}/cancel` | Cancel booking; email in body |
| `GET /api/hotels/{id}/alternative-dates?checkIn=&checkOut=` | Surprise feature |

## Phases

### Phase 0 — Repository setup
Create the folder layout, `.gitignore` (Java, Node, IDE files, `.env`), `.env.example`
(DB_URL, DB_USERNAME, DB_PASSWORD), and a README stub. Put my `schema.sql` in `db/`.
Commit: `chore: project structure, gitignore and env example`

### Phase 1 — Backend skeleton and entities
Generate the Spring Boot project in `backend/`. Configure the datasource from environment
variables, `ddl-auto=validate`. Create entities and repositories for hotel, hotel_amenity,
room_type and booking matching `db/schema.sql`. Add CORS config for the Vite dev server.
Check: app starts against the database with no schema validation errors.
Commit: `feat(backend): spring boot setup, entities and repositories`

### Phase 2 — Hotel browse, search and availability
Add the availability query (overlap rule above). Implement the two hotel GET endpoints with
DTOs. Add date validation and the global exception handler with the shared error shape.
Check: curl examples for search by location, details with dates, and an invalid date range.
Commit: `feat(backend): hotel search, details and availability`

### Phase 3 — Create booking
Implement `POST /api/bookings` in one `@Transactional` service method:
validate input → lock the room_type row (`PESSIMISTIC_WRITE`) → re-check availability →
calculate total → generate a unique reference (for example `HB-` + 8 random uppercase
letters/digits, retry on collision) → save. Return 409 when no room is left.
Explain clearly why the lock prevents two users taking the last room.
Commit: `feat(backend): booking creation with availability lock`

### Phase 4 — Retrieve and cancel booking
Implement retrieve by reference + email and cancel. Cancelling sets status `CANCELLED` and
`cancelled_at`; cancelling twice returns 409. Wrong email returns 404.
Commit: `feat(backend): retrieve and cancel booking`

### Phase 5 — Automated tests
Write a few meaningful tests, not many: nights and total calculation, past check-in rejected,
check-out not after check-in rejected, overlap detection (including back-to-back stays that
must NOT overlap), booking beyond capacity rejected, cancellation restores availability.
Tell me which tests use mocks and which use a database, and why. All tests must pass.
Commit: `test(backend): booking calculation and availability rules`

### Phase 6 — Frontend setup and search page
Create the Vite React app in `frontend/`, routing, one small API helper that parses the
shared error shape, and the home page: hotel list with name, location, description,
amenities, price; location search and check-in / check-out date pickers.
Commit: `feat(frontend): project setup and hotel search page`

### Phase 7 — Hotel details, booking and confirmation
Details page with availability for the chosen dates; booking form (name, email); a review
step showing the backend-calculated total before confirming; confirmation page showing the
booking reference. Show API validation messages next to the form, and a clear sold-out message.
Commit: `feat(frontend): hotel details, booking flow and confirmation`

### Phase 8 — Manage booking
Page to find a booking by reference + email, show its details and cancel it with a
confirmation prompt. Handle not found and already cancelled.
Commit: `feat(frontend): retrieve and cancel booking`

### Phase 9 — Surprise feature: alternative dates
Backend: when the requested stay is sold out, return up to 3 nearest available stays of the
same length for that hotel, searching up to 14 days before and after (never in the past).
Reuse the availability logic. Frontend: on a sold-out hotel, show these as clickable
suggestions that re-run the search. Add one test for it.
Commit: `feat: alternative date suggestions when sold out`

### Phase 10 — Documentation
README.md: prerequisites, database setup, step-by-step run instructions for backend and
frontend, how to run tests, screenshots section, time spent (leave a blank for me),
unfinished items, and an "AI assistance" section stating that Codex and Claude were used.
DESIGN.md with these 8 headings in this order: Architecture; Database design; API design;
Booking logic; Design decisions (with alternatives and trade-offs); Simultaneous bookings;
Surprise feature (what, why, how); Limitations and improvements. Include assumptions,
especially how overlapping stays are handled. Write a first draft from the actual code;
I will rewrite it in my own words.
Commit: `docs: README and DESIGN write-up`

### Phase 11 — Final review
Do not add features. Check the repo against this list and report pass/fail for each:
fresh clone runs by following the README only; all tests pass; no credentials anywhere in
the repo or git-tracked files; every API returns the shared error shape; total shown before
confirming; reference returned on booking; cancel releases availability; 5+ hotels in sample
data; README and DESIGN.md complete; screenshots or demo recording present in `docs/` and
linked from the README; time spent filled in; AI assistance disclosed; no secret anywhere in
git history (`git log -p` search for the DB password); reminder to me that the GitHub repo
must be public. List anything that fails and wait for my decision.
Commit: `chore: final review fixes`
