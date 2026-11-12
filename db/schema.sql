-- Hotel Booking Portal: schema + sample data (MySQL 8.0.16+ for CHECK constraints)
-- UNTESTED: written without a MySQL server to run it on. Run it once and fix any typo before committing.

CREATE DATABASE IF NOT EXISTS hotel_booking;
USE hotel_booking;

CREATE TABLE hotel (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    location    VARCHAR(100) NOT NULL,
    description TEXT,
    INDEX idx_hotel_location (location)
);

CREATE TABLE hotel_amenity (
    hotel_id BIGINT      NOT NULL,
    amenity  VARCHAR(50) NOT NULL,
    PRIMARY KEY (hotel_id, amenity),
    FOREIGN KEY (hotel_id) REFERENCES hotel (id)
);

-- One row per hotel for now (assignment allows a single room category),
-- but a separate table lets a hotel have more categories later.
CREATE TABLE room_type (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    hotel_id        BIGINT         NOT NULL,
    name            VARCHAR(100)   NOT NULL,
    price_per_night DECIMAL(10, 2) NOT NULL,
    total_rooms     INT            NOT NULL,
    FOREIGN KEY (hotel_id) REFERENCES hotel (id),
    CHECK (price_per_night > 0),
    CHECK (total_rooms > 0)
);

CREATE TABLE booking (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_reference VARCHAR(20)    NOT NULL UNIQUE,
    room_type_id      BIGINT         NOT NULL,
    guest_name        VARCHAR(100)   NOT NULL,
    guest_email       VARCHAR(150)   NOT NULL,
    check_in          DATE           NOT NULL,
    check_out         DATE           NOT NULL,   -- exclusive: guest leaves this day, room is free for the next guest
    price_per_night   DECIMAL(10, 2) NOT NULL,   -- snapshot, so later price changes do not alter old bookings
    total_amount      DECIMAL(10, 2) NOT NULL,   -- nights x price_per_night, computed by the backend
    change_fee_total  DECIMAL(10, 2) NOT NULL DEFAULT 0,
    date_change_count INT            NOT NULL DEFAULT 0,
    status            ENUM ('CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
    created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at      TIMESTAMP      NULL,
    FOREIGN KEY (room_type_id) REFERENCES room_type (id),
    CHECK (check_out > check_in),
    INDEX idx_booking_availability (room_type_id, status, check_in, check_out)
);

-- Availability for a stay [:checkIn, :checkOut):
--   SELECT rt.total_rooms - COUNT(b.id)
--   FROM room_type rt
--   LEFT JOIN booking b ON b.room_type_id = rt.id
--        AND b.status = 'CONFIRMED'
--        AND b.check_in < :checkOut
--        AND b.check_out > :checkIn
--   WHERE rt.id = :roomTypeId
--   GROUP BY rt.id, rt.total_rooms;
-- When booking: first lock the room_type row (SELECT ... FOR UPDATE) inside the transaction,
-- then run this check, then insert.

-- ---------- Sample data (invented hotels and prices) ----------

INSERT INTO hotel (id, name, location, description) VALUES
    (1, 'Sea Breeze Residency', 'Mumbai',    'Sea-facing hotel a short walk from Marine Drive.'),
    (2, 'Fort View Inn',        'Jaipur',    'Heritage-style stay near the old city.'),
    (3, 'Backwater Retreat',    'Kochi',     'Quiet lakeside property with houseboat access.'),
    (4, 'Hilltop Haven',        'Manali',    'Mountain-view rooms close to Mall Road.'),
    (5, 'City Central Suites',  'Bengaluru', 'Business hotel near the tech corridor.');

INSERT INTO hotel_amenity (hotel_id, amenity) VALUES
    (1, 'Free WiFi'), (1, 'Pool'), (1, 'Breakfast'),
    (2, 'Free WiFi'), (2, 'Parking'), (2, 'Restaurant'),
    (3, 'Free WiFi'), (3, 'Spa'), (3, 'Breakfast'),
    (4, 'Free WiFi'), (4, 'Heater'), (4, 'Parking'),
    (5, 'Free WiFi'), (5, 'Gym'), (5, 'Airport Shuttle');

-- Small room counts on purpose, so "sold out" is easy to demo.
INSERT INTO room_type (id, hotel_id, name, price_per_night, total_rooms) VALUES
    (1, 1, 'Deluxe Room', 6500.00, 3),
    (2, 2, 'Deluxe Room', 4200.00, 2),
    (3, 3, 'Deluxe Room', 5500.00, 2),
    (4, 4, 'Deluxe Room', 3800.00, 1),
    (5, 5, 'Deluxe Room', 4800.00, 5);
