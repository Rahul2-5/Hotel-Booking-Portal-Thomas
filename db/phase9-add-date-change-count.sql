-- Run once after phase9-add-change-fee.sql on an existing database.
USE hotel_booking;
ALTER TABLE booking ADD COLUMN date_change_count INT NOT NULL DEFAULT 0;
-- Charged bookings have already used at least one date change.
UPDATE booking SET date_change_count = 1 WHERE change_fee_total > 0;
