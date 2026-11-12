package com.thomascook.hotelbooking.exception;

public class DateChangeNotAllowedException extends RuntimeException {
    public DateChangeNotAllowedException() {
        super("Only confirmed bookings can have their dates changed.");
    }
}
