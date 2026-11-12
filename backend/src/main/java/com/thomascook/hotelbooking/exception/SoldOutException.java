package com.thomascook.hotelbooking.exception;

public class SoldOutException extends RuntimeException {

    public SoldOutException() {
        super("No rooms are available for the selected dates.");
    }
}
