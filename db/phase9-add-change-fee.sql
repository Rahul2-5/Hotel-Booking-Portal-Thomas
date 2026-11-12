-- Run once on an existing database before starting the updated backend.
USE hotel_booking;
ALTER TABLE booking ADD COLUMN change_fee_total DECIMAL(10,2) NOT NULL DEFAULT 0;
