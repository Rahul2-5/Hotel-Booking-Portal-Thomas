package com.thomascook.hotelbooking.exception;

public class SoldOutException extends RuntimeException {

    public SoldOutException() {
        this("No rooms are available for the selected dates.");
    }

    public SoldOutException(String message) {
        super(message);
    }
}
