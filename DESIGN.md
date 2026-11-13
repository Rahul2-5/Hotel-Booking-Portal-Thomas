# Design write-up: Hotel Booking Portal

This document explains how the application is built and why. Section numbers follow the
order asked for in the assignment.

1. [Architecture](#1-architecture)
2. [Database design](#2-database-design)
3. [API design](#3-api-design)
4. [Booking logic](#4-booking-logic) (includes [Assumptions](#assumptions))
5. [Design decisions](#5-design-decisions)
6. [Simultaneous bookings](#6-simultaneous-bookings)
7. [Surprise feature](#7-surprise-feature-change-booking-dates-without-cancelling)
8. [Limitations and improvements](#8-limitations-and-improvements)

---

## 1. Architecture

The application has three parts.

```text
Browser                         Server                              Database
+--------------------+  JSON   +-------------------------------+   SQL   +---------+
| React app (Vite)   | <-----> | Spring Boot REST API          | <-----> | MySQL 8 |
| localhost:5173     |  HTTP   | localhost:8080/api            |  JDBC   |         |
+--------------------+         +-------------------------------+         +---------+
                                controller -> service -> repository
```

**Frontend (React).** Four pages: hotel search, hotel details with the booking form,
booking confirmation, and manage booking. All API calls go through one helper,
`frontend/src/api.js`, which adds the base URL and turns every failed response into one
`ApiError` object with `status`, `code`, `message` and `fieldErrors`. The frontend never
calculates money. It only displays totals returned by the backend.

**Backend (Spring Boot).** The code is split by responsibility:

| Package | Responsibility |
|---|---|
| `controller` | Maps HTTP requests to service calls. No business logic. |
| `service` | Booking rules: date validation, availability, pricing, cancellation, date changes, change fee. |
| `repository` | Spring Data JPA interfaces and the overlap-count queries. |
| `entity` | JPA classes that mirror the tables in `db/schema.sql`. |
| `dto` | Java records for requests and responses. Controllers never return entities. |
| `exception` | Custom exceptions and one `GlobalExceptionHandler` that produces the error JSON. |
| `config` | CORS: allows only `http://localhost:5173`. |

**Database (MySQL).** Stores hotels, amenities, room types and bookings. The schema is
owned by `db/schema.sql`. Hibernate runs with `ddl-auto=validate`, so the application
checks the schema at startup but never changes it.

**One request from start to finish (creating a booking):**

1. The guest selects **Confirm booking**. React sends `POST /api/bookings` with the room
   type id, name, email and the two dates as `YYYY-MM-DD` strings.
2. `BookingController` validates the body with Bean Validation (`@Valid`).
3. `BookingService.createBooking` runs inside one database transaction: it validates the
   dates, locks the room type row, counts overlapping bookings, calculates the total and
   saves the booking.
4. The controller returns `201 Created` with a `BookingResponse` that includes the
   reference and total.
5. React navigates to the confirmation page and shows the reference.

If anything fails, `GlobalExceptionHandler` returns the shared error JSON and the frontend
shows the message, with field messages next to the matching inputs.

**Configuration and secrets.** Database URL, username and password come from the
environment variables `DB_URL`, `DB_USERNAME` and `DB_PASSWORD`. Only placeholders are in
`.env.example`. The change fee is a normal setting: `booking.change-fee=500.00`.

---

## 2. Database design

### Entities and relationships

```text
hotel (1) ----< (many) hotel_amenity
hotel (1) ----< (many) room_type
room_type (1) ----< (many) booking
```

| Table | Purpose | Main columns |
|---|---|---|
| `hotel` | One row per hotel | `id`, `name`, `location`, `description` |
| `hotel_amenity` | One row per amenity of a hotel | `hotel_id`, `amenity` |
| `room_type` | A room category of a hotel, with price and capacity | `id`, `hotel_id`, `name`, `price_per_night`, `total_rooms` |
| `booking` | One booking of one room | `id`, `booking_reference`, `room_type_id`, `guest_name`, `guest_email`, `check_in`, `check_out`, `price_per_night`, `total_amount`, `change_fee_total`, `date_change_count`, `status`, `created_at`, `cancelled_at` |

### Important constraints

| Constraint | Why it exists |
|---|---|
| `booking.booking_reference` is `UNIQUE` | Two bookings can never share a reference, even if the application check were skipped. |
| `CHECK (check_out > check_in)` on `booking` | The database refuses a zero-night or negative stay. |
| `CHECK (price_per_night > 0)` and `CHECK (total_rooms > 0)` on `room_type` | Bad sample or admin data cannot create free rooms or a hotel with no capacity. |
| Composite primary key `(hotel_id, amenity)` on `hotel_amenity` | The same amenity cannot be listed twice for one hotel. |
| Foreign keys `hotel_amenity.hotel_id`, `room_type.hotel_id`, `booking.room_type_id` | A booking always points to a real room type, and a room type to a real hotel. |
| `status ENUM('CONFIRMED','CANCELLED')`, default `CONFIRMED` | Only the two valid states can be stored. |
| `NOT NULL` on all required columns | Incomplete bookings cannot be saved. |

### Indexes

- `idx_hotel_location (location)` on `hotel` for the location column used by search.
- `idx_booking_availability (room_type_id, status, check_in, check_out)` on `booking`.
  The availability query filters on exactly these columns, in this order.

### How availability is stored

There is no separate availability table. Availability is **calculated** when needed:

```text
available rooms = room_type.total_rooms
                  - number of CONFIRMED bookings for that room type that overlap the stay
```

`total_rooms` is the capacity, and the `booking` table is the record of what is taken.
Because there is only one source of truth, the numbers cannot drift apart.

### Columns worth explaining

- `booking.price_per_night` is a **copy** of the room price at the time of booking. If the
  hotel changes its price later, existing bookings keep the price the guest agreed to.
- `booking.total_amount` is always `nights x price_per_night`. It never includes fees.
- `booking.change_fee_total` and `booking.date_change_count` belong to the surprise
  feature (section 7).
- `booking.check_out` is the day the guest leaves. That night is not booked.
- Money uses `DECIMAL(10,2)` in MySQL and `BigDecimal` in Java, so there are no
  floating-point rounding errors.

---

## 3. API design

Base path: `/api`. All bodies are JSON. Dates are plain `YYYY-MM-DD` strings.

### Endpoints

| Method and path | Purpose | Success | Possible errors |
|---|---|---|---|
| `GET /api/hotels?location=&checkIn=&checkOut=` | Browse and search. All parameters are optional. `location` matches any part of the city name, ignoring case. With dates, each room type also returns `availableRooms` and `totalAmount`. | 200 | 400 |
| `GET /api/hotels/{id}?checkIn=&checkOut=` | One hotel with its amenities and room types. With dates: available rooms, nights and total. | 200 | 400, 404 |
| `POST /api/bookings` | Create a booking. Body: `roomTypeId`, `guestName`, `guestEmail`, `checkIn`, `checkOut`. | 201 | 400, 404, 409 `SOLD_OUT` |
| `GET /api/bookings/{reference}?email=` | Retrieve a booking. | 200 | 400, 404 |
| `POST /api/bookings/{reference}/cancel` | Cancel a booking. Body: `email`. | 200 | 400, 404, 409 `ALREADY_CANCELLED` |
| `GET /api/bookings/{reference}/date-change-preview?email=&checkIn=&checkOut=` | Show what a date change would cost. Changes nothing. | 200 | 400, 404, 409 `BOOKING_NOT_CONFIRMED` |
| `PUT /api/bookings/{reference}/dates` | Change the dates. Body: `email`, `checkIn`, `checkOut`. | 200 | 400, 404, 409 `SOLD_OUT` or `BOOKING_NOT_CONFIRMED` |

An OpenAPI 3 description of these endpoints is served at `/openapi.json`.

### One error shape for every failure

```json
{
  "status": 409,
  "code": "SOLD_OUT",
  "message": "No rooms are available for the selected dates.",
  "fieldErrors": {}
}
```

| HTTP status | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or invalid field, bad date format, check-in in the past, check-out not after check-in. `fieldErrors` names each field. |
| 404 | `NOT_FOUND` | Unknown hotel, room type or URL; or the booking reference and email do not match. |
| 405 | `METHOD_NOT_ALLOWED` | Wrong HTTP method for a URL. |
| 409 | `SOLD_OUT` | No room left for the dates (on create or on date change). |
| 409 | `ALREADY_CANCELLED` | Cancelling a booking that is already cancelled. |
| 409 | `BOOKING_NOT_CONFIRMED` | Trying to change the dates of a cancelled booking. |
| 500 | `INTERNAL_ERROR` | Anything unexpected. The details are logged on the server, not sent to the client. |

`GlobalExceptionHandler` also overrides Spring's built-in handlers, so framework errors
such as an unknown route or a malformed date use the same shape.

### API choices

- **Cancel is `POST .../cancel`, not `DELETE`.** The booking row is kept with status
  `CANCELLED`, so nothing is deleted. A `POST` to an action URL describes that honestly.
- **Changing dates is `PUT .../dates`.** It replaces the dates of an existing booking.
- **Preview is a separate `GET`.** It is read-only, so it is safe to call as often as the
  guest changes the date inputs.
- **Wrong email returns 404, not 403.** The response is the same whether the reference
  does not exist or the email is wrong, so the API does not reveal which references exist.
- **Responses are DTO records.** Entities are never returned, which avoids lazy-loading
  errors and keeps internal ids such as `booking.id` private.

---

## 4. Booking logic

### Pricing

```text
nights       = days between check-in and check-out
total amount = nights x price per night
```

Example: Sea Breeze Residency costs 6,500 per night. Check-in 10 January, check-out
13 January is 3 nights (10th, 11th, 12th), so the total is 3 x 6,500 = 19,500.

- The total is calculated **only on the backend** (`BookingService.createBooking`).
- The frontend shows a total on the review step before the guest confirms. That number
  comes from `GET /api/hotels/{id}` with the dates. When the booking is created, the
  backend calculates the total again and does not accept any amount from the client.
- The room price is copied to the booking, and the total is stored.
- The total must fit the `DECIMAL(10,2)` column. A stay whose total would be above
  99,999,999.99 is rejected with a validation message.

### Date validation

Done in one place, `StayDateValidator`, and used by search, details, booking and date
change:

| Rule | Message |
|---|---|
| Check-in is before today | "Check-in cannot be before today." |
| Check-out is the same as or before check-in | "Check-out must be after check-in." |
| Only one of the two dates is given | "... is required when ... is provided." |

Other input checks use Bean Validation on the request records: name required (max 100
characters), email required and valid (max 150), room type id required and positive, both
dates required when booking. Name and email are trimmed.

The date inputs in the browser also set a minimum date, but that is only for convenience.
The backend is the authority and repeats every check.

### Availability and overlapping stays

A stay is treated as the half-open range `[checkIn, checkOut)`: the check-in day is
included, the check-out day is not.

Two stays for the same room type overlap when:

```text
existing.checkIn < new.checkOut   AND   existing.checkOut > new.checkIn
```

| Existing booking | New request | Overlap? | Reason |
|---|---|---|---|
| 10 to 13 | 13 to 15 | No | Back-to-back: the first guest leaves on the 13th |
| 10 to 13 | 8 to 10 | No | Back-to-back on the other side |
| 10 to 13 | 12 to 14 | Yes | Both need the night of the 12th |
| 10 to 13 | 11 to 12 | Yes | New stay is inside the existing one |
| 10 to 13 | 9 to 14 | Yes | New stay surrounds the existing one |

Available rooms = `total_rooms` minus the number of overlapping `CONFIRMED` bookings.
If the result is 0, a new booking is refused with `409 SOLD_OUT`.

This check is conservative. It counts every booking that overlaps any part of the
requested stay. For a hotel with one room category and one room per booking, that can only
ever refuse a booking that might have fitted, never accept one that does not fit.
Section 8 describes the more exact per-night approach.

### Creating a booking

Inside one transaction, in this order:

1. Validate the dates.
2. Load the room type **with a row lock** (404 if it does not exist).
3. Count overlapping confirmed bookings. If none are left, return `409 SOLD_OUT`.
4. Calculate nights and total.
5. Generate the reference: `HB-` followed by 16 uppercase hexadecimal characters taken
   from a random UUID. The code checks that it is unused, and the `UNIQUE` constraint is
   the final guard.
6. Save the booking with status `CONFIRMED`.

### Retrieving a booking

The reference is trimmed and upper-cased, and the email is compared ignoring case. Both
must match the same booking, otherwise the answer is `404`.

### Cancelling

- The booking is found by reference and email, and its row is locked.
- If it is already cancelled, the answer is `409 ALREADY_CANCELLED`.
- Otherwise `status` becomes `CANCELLED` and `cancelled_at` is set.
- **Availability is released automatically.** The availability query counts only
  `CONFIRMED` bookings, so a cancelled booking simply stops being counted. No counter has
  to be increased again, so cancellation cannot leave the numbers wrong.
- The row is kept as a record. It is not deleted.

### Assumptions

1. **Overlapping stays:** a stay is `[checkIn, checkOut)`. The check-out day is free for
   the next guest, so back-to-back stays do not overlap.
2. One booking reserves exactly one room. A guest who needs two rooms makes two bookings.
3. Each hotel has a single room category ("Deluxe Room"). The `room_type` table still
   allows more categories later.
4. Rooms of the same category are interchangeable. A booking reserves capacity, not a
   specific room number.
5. "Today" is the server's date. The app is assumed to run in the same time zone as its
   guests (India).
6. The minimum stay is one night. There is no maximum other than the amount limit.
7. The reference plus the email identifies the guest. There are no accounts or passwords.
8. The same email may make any number of bookings.
9. A booking can be cancelled at any time and there is no cancellation charge.
10. No payment is processed. `total_amount` and fees are amounts owed, shown to the guest.
11. Prices are in Indian rupees and include everything. Taxes are not modelled.
12. A booking keeps the price it was made at, even if the room price changes later or the
    guest changes dates.

---

## 5. Design decisions

| Decision | Chosen | Alternatives considered | Trade-off |
|---|---|---|---|
| How to store availability | Calculate it from bookings with an overlap query | (a) A counter column on the room type. (b) One inventory row per room type per night. | A single counter cannot represent different dates. A per-night table is exact and fast to read, but needs rows created for future dates and must be kept in step with bookings. Calculating is the simplest correct option at this size; it costs one count query per room type. |
| Preventing overbooking | Pessimistic lock on the `room_type` row during booking | (a) Optimistic locking with a version column and retry. (b) `SERIALIZABLE` isolation. (c) No lock. | The lock is simple to reason about and explain, and no retry code is needed. The cost is that bookings for the same room type run one after another. See section 6. |
| Check-out day | Exclusive | Inclusive | Exclusive matches how hotels work and makes nights equal to the difference between the dates. |
| Cancelling | Keep the row, set status `CANCELLED` | Delete the row | Keeping it preserves history, lets the guest still look the booking up, and makes "already cancelled" detectable. Cancelled rows stay in the table. |
| Price on the booking | Copy `price_per_night` into `booking` | Read the current price from `room_type` every time | A copy uses a little more storage but old bookings never change when prices change. |
| Total calculation | Backend only | Calculate in the browser and send it | The browser cannot be trusted with money. The cost is one extra request to show the total on the review step. |
| Schema ownership | Hand-written `db/schema.sql`, Hibernate `validate` | (a) Hibernate `ddl-auto=update`. (b) Flyway migrations. | Hand-written SQL lets me define CHECK constraints, the ENUM and the index exactly, and the app can never alter tables by surprise. Changes need manual scripts (the two `phase9` files). Flyway would be the next step. |
| Amenities | Separate `hotel_amenity` table | Comma-separated text in `hotel` | A table is normalised and easy to filter on. It needs one more query. |
| Guest identity | Reference + email | User accounts and login | Authentication is out of scope. This is the lightest way to stop one guest opening another guest's booking. |
| Booking reference | `HB-` + 16 random hex characters | (a) The numeric id. (b) A shorter code. | A sequential id could be guessed. 16 random characters are hard to guess and still fit `VARCHAR(20)`. The cost is that it is long to type, so the confirmation page has a copy button. |
| Error handling | One `@RestControllerAdvice` and one error shape | Handle errors in each controller | One place, one format, and the frontend needs only one parser. |
| Tests | H2 in-memory database for database tests | Run tests against MySQL | Tests run anywhere with no setup. H2 is not identical to MySQL, so MySQL-specific behaviour (the CHECK constraints, real lock waits) is not tested automatically. |
| Dates in the frontend | Send the `<input type="date">` string unchanged | Build JavaScript `Date` objects | Converting to a `Date` and back through UTC can shift the day in India (UTC+5:30). Plain strings avoid that bug. |
| Frontend libraries | `fetch`, React state, plain CSS | Axios, Redux, a UI kit | Fewer dependencies and less code to explain. More CSS written by hand. |

---

## 6. Simultaneous bookings

**The problem.** Hilltop Haven has one room. Guests A and B both select *Confirm booking*
for the same dates at the same moment. Without protection, both requests could count
"0 bookings so far", both would insert, and the hotel would be overbooked.

**What the code does.** `BookingService.createBooking` is one `@Transactional` method.
Its first database action is:

```java
roomTypeRepository.findByIdForUpdate(roomTypeId)   // @Lock(PESSIMISTIC_WRITE)
```

In MySQL this runs `SELECT ... FROM room_type WHERE id = ? FOR UPDATE`, which locks that
one room type row until the transaction ends.

| Time | Guest A's request | Guest B's request |
|---|---|---|
| 1 | Locks the Hilltop Haven room type row | Tries to lock the same row and **waits** |
| 2 | Counts overlapping bookings: 0 of 1 used | waiting |
| 3 | Inserts the booking | waiting |
| 4 | Commits. The lock is released. | Gets the lock |
| 5 | Receives `201` with a reference | Counts overlapping bookings: 1 of 1 used |
| 6 | | Receives `409 SOLD_OUT`: "No rooms are available for the selected dates." |

The check and the insert happen while holding the lock, so no other booking for that room
type can slip in between them.

**Details that make this work:**

- The transaction uses `READ_COMMITTED` isolation. Each query sees the latest committed
  data, so when B's count runs after waiting, it sees A's booking.
- The method is `public` and is called from the controller, which is a different Spring
  bean. Spring applies `@Transactional` through a proxy, so calling the method from inside
  the same class would skip the transaction and the lock would be released immediately.
- The lock is on one room type row. Bookings for other hotels are not delayed.
- In the browser, the Confirm button is disabled while the request is running, so one
  guest cannot send the same booking twice by double-clicking.
- When B gets `SOLD_OUT`, the page reloads availability and tells the guest to pick
  another room or other dates.

**Date changes and cancellations** use the same idea. A date change locks the booking row
first and then the room type row. A cancellation locks the booking row. This stops a
cancellation and a date change of the same booking from running at the same time.

**Costs and what could be done at larger scale:**

- All bookings for one room type wait in line, even for dates that do not overlap. For a
  busy hotel this would limit throughput. Alternatives: a per-night inventory table where
  only the affected nights are locked or updated with a conditional `UPDATE`, or optimistic
  locking with a version number and automatic retry.
- If a request waited longer than MySQL's lock wait timeout (50 seconds by default), it
  would fail and currently be reported as a generic `500`. A friendlier "please try
  again" response would be better.
- There is no automated test that runs two bookings in parallel. The capacity rule itself
  is tested (`rejectsBookingBeyondCapacity`), but the lock itself is not exercised by an
  automated test. A test with two threads against a real MySQL (for example with Testcontainers)
  is the first improvement I would add.

---

## 7. Surprise feature: change booking dates without cancelling

### What it does

On the **Manage booking** page, a guest with a confirmed booking can select
**Change dates**, choose a new check-in and check-out, and see a preview before deciding:

- the number of nights and the new total,
- the difference from the current total,
- the change fee, or "Free change",
- one clear sentence: "You pay X more", "You pay X less" or "Your total stays the same".

If the guest confirms, the same booking is updated. The reference stays the same.
The change is **all-or-nothing**: if the new dates are sold out, the guest is told
"The new dates are sold out. Your booking is unchanged." and nothing is modified.

### Why I chose it

Plans change. With only the core features, a guest who needs different dates has to cancel
and book again. That has three problems:

1. **Risk of losing the room.** After cancelling, the new dates might be sold out, or
   someone else might take the room that was just released. The guest ends up with nothing.
2. **Price changes.** A new booking would use today's price instead of the price the guest
   already agreed to.
3. **A new reference.** The guest has to keep track of a different code.

A date change solves a real problem, is small enough to finish properly, and reuses the
existing availability and locking logic instead of adding a separate system. It also made
me think about an interesting edge case (a booking must not block itself).

### How it is implemented

**Endpoints**

- `GET /api/bookings/{reference}/date-change-preview?email=&checkIn=&checkOut=` returns
  `available`, `nights`, `oldTotal`, `newTotal`, `difference`, `changeFee`, `netChange`.
  It is read-only.
- `PUT /api/bookings/{reference}/dates` performs the change and returns the updated
  booking.

**Steps in `BookingService.changeDates` (one transaction)**

1. Find the booking by reference and email and lock its row. No match gives `404`.
2. If it is not `CONFIRMED`, return `409 BOOKING_NOT_CONFIRMED`.
3. Validate the new dates with the same rules as a new booking.
4. Lock the room type row, exactly as when creating a booking.
5. Count overlapping confirmed bookings for the new dates, **excluding this booking**.
6. If no room is free, return `409 SOLD_OUT` and change nothing.
7. If the new dates are identical to the current dates, return the booking unchanged.
8. Otherwise update `check_in`, `check_out` and `total_amount`, add any fee to
   `change_fee_total`, and add 1 to `date_change_count`.

No field of the booking is modified until every check has passed, and everything is in
one transaction, so a failure at any step leaves the booking exactly as it was.

The preview and the real change share one private method, `calculateDateChange`, so the
numbers the guest sees in the preview are produced by the same code that applies them.

**Why the booking's own id is excluded from the availability check**

Take a hotel with one room and a booking for the 10th to the 12th. The guest wants to
extend it to the 13th. The new dates overlap the booking's *current* dates. If the booking
counted itself, the check would say "1 of 1 rooms used: sold out", and no stay could ever
be extended or shifted by a day. The guest already holds that room, so the query
`countOverlappingBookingsExcluding` leaves the booking's own row out.

**Why the stored price is reused**

The new total is `new nights x booking.price_per_night`, using the price saved on the
booking and not the hotel's current price. The guest keeps the rate they agreed to, and
changing dates cannot be used by either side to change the price. A test changes the room
price after booking and confirms the date change still uses the original price.

**The change fee rule**

The rule is one small pure method, `ChangeFeePolicy.calculate(currentCheckIn, today,
configuredFee, successfulChanges)`:

| Situation | Fee |
|---|---|
| First successful change of this booking, at any time | 0 |
| Later change made 2 or more days before the **current** check-in date | 0 |
| Later change made less than 2 days before the current check-in date | Flat fee from configuration (`booking.change-fee=500.00`) |

The idea is to be generous once, stay free when the hotel has notice, and charge only for
repeated last-minute changes, when the hotel has little time to resell the room.

- The fee is calculated only on the backend, from the server date.
- Previews, failed changes and submitting identical dates do **not** use up the free
  change. Only a successful, real change increases `date_change_count`.
- A failed change never adds a fee.
- Because the rule is a pure function with no database access, it is tested directly with
  a table of cases, including the exact 2-day boundary.

**Why fees are stored separately from `total_amount`**

`total_amount` always means `nights x price_per_night`. Fees are added up in their own
column, `change_fee_total`. The API returns both, plus `amountDue = totalAmount +
changeFeeTotal`.

- The price of the stay stays easy to check and to recalculate on the next date change.
  If fees were mixed in, the next recalculation would wipe them out or count them twice.
- The guest sees clearly what is room cost and what is fees.

**No payment is processed.** The application does not collect or refund money. The price
difference and the fees are calculated, stored and displayed only.

**Database changes**

Two columns on `booking`: `change_fee_total DECIMAL(10,2) NOT NULL DEFAULT 0` and
`date_change_count INT NOT NULL DEFAULT 0`. They are part of `db/schema.sql`. The two
`db/phase9-*.sql` scripts add them to a database created before the feature existed.

**Frontend**

`DateChangeForm.jsx` on the manage-booking page: two date inputs, a
**Preview date change** button, the preview lines, and a **Confirm date change** button
that appears only when the new dates are available. Editing a date clears the old
preview, so the guest can never confirm numbers that belong to different dates.

**Tests**

- Change to free dates succeeds and the total is recalculated with the stored price.
- Extending a stay in a one-room hotel succeeds (own booking not counted).
- Change to sold-out dates is rejected and dates, total and fees are unchanged.
- A cancelled booking cannot be changed.
- First change is free even one day before check-in; later late changes add the fee and
  fees accumulate across changes.
- A rejected change and an identical-date submission do not use the free change.

---

## 8. Limitations and improvements

### What is incomplete

| Limitation | Effect | What I would do |
|---|---|---|
| No automated concurrency test | The last-room protection is not proven by an automated test | Add a two-thread test against real MySQL using Testcontainers |
| Tests use H2, not MySQL | MySQL-only behaviour (CHECK constraints, real lock waits) is not covered | Run the database tests against MySQL in CI |
| No controller or frontend component tests | The JSON error shape and the screens are checked by hand | Add `MockMvc` tests for each endpoint and error code, and React Testing Library tests for the booking flow |
| Reference + email is weak identity | Anyone who knows both can cancel the booking. The email also travels in the URL of the two `GET` booking endpoints, so it can appear in server logs. | Send a confirmation email with a one-time link, or add accounts. Move the email out of the URL. |
| No rate limiting | References could be guessed by trying many requests, although 16 random characters make this impractical | Add rate limiting on the booking lookup endpoints |
| No confirmation email | The guest must write down the reference | Send an email on booking, date change and cancellation |
| No payment or refunds | Amounts are informational | Integrate a payment provider; record payments and refunds per booking |
| Conservative availability count | For multi-night stays in hotels with several rooms, a request can be refused although every single night has a free room | Count per night, or use a per-night inventory table |
| One lock per room type | Bookings for the same room type are processed one at a time | Per-night inventory with narrower locks, or optimistic locking with retry |
| Lock wait timeout becomes a `500` | A very slow competing request gives an unhelpful error | Catch the lock exception and return a "please try again" response |
| A stay that has started cannot be changed | A guest already checked in cannot extend, because the new check-in may not be before today | Allow keeping the original check-in when only the check-out moves |
| Server date and server time zone | A guest in another time zone could see "today" differently | Store a time zone per hotel and use the hotel's local date |
| Hotel list runs several queries per hotel and has no pagination | Fine for 5 hotels, slow for thousands | Fetch amenities, rooms and availability in bulk; add pagination |
| Location search is a simple "contains" match | No typo tolerance; the index is not used for a match in the middle of the name | Prefix search or full-text search |
| Schema changes are manual SQL files | Easy to forget a script | Use Flyway migrations |
| No history of date changes | Only the count and the fee total are kept | Add a `booking_change` table with old dates, new dates, fee and time |
| CORS origin and port are fixed in code | Only works on `localhost:5173` | Read allowed origins from configuration |
| Some unused stock images and fonts remain in `frontend/public` | Larger repository | Remove unused assets |

### With more time, in priority order

1. Concurrency test against real MySQL.
2. Controller tests for every endpoint and error code.
3. Confirmation emails.
4. Per-night inventory for exact availability and narrower locking.
5. Flyway migrations and a Docker Compose file so the project starts with one command.
6. Multiple room categories per hotel in the UI (the schema already supports them).
7. Photos per hotel, pagination, and more filters.
