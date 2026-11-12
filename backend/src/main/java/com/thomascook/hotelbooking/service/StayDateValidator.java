package com.thomascook.hotelbooking.service;

import com.thomascook.hotelbooking.exception.RequestValidationException;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class StayDateValidator {

    public void validateOptionalDates(LocalDate checkIn, LocalDate checkOut) {
        if (checkIn == null && checkOut == null) {
            return;
        }

        Map<String, String> errors = new LinkedHashMap<>();
        if (checkIn == null) {
            errors.put("checkIn", "Check-in is required when check-out is provided.");
        } else if (checkIn.isBefore(LocalDate.now())) {
            errors.put("checkIn", "Check-in cannot be before today.");
        }
        if (checkOut == null) {
            errors.put("checkOut", "Check-out is required when check-in is provided.");
        } else if (checkIn != null && !checkOut.isAfter(checkIn)) {
            errors.put("checkOut", "Check-out must be after check-in.");
        }
        if (!errors.isEmpty()) {
            throw new RequestValidationException(errors);
        }
    }
}
