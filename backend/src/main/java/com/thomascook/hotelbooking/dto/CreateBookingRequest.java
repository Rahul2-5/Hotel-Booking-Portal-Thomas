package com.thomascook.hotelbooking.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateBookingRequest(
        @NotNull(message = "Room type is required.")
        @Positive(message = "Room type must be a positive ID.")
        Long roomTypeId,
        @NotBlank(message = "Guest name is required.")
        @Size(max = 100, message = "Guest name must be at most 100 characters.")
        String guestName,
        @NotBlank(message = "Guest email is required.")
        @Email(message = "Guest email must be a valid email address.")
        @Size(max = 150, message = "Guest email must be at most 150 characters.")
        String guestEmail,
        @NotNull(message = "Check-in is required.")
        LocalDate checkIn,
        @NotNull(message = "Check-out is required.")
        LocalDate checkOut
) {
    public CreateBookingRequest {
        if (guestName != null) {
            guestName = guestName.trim();
        }
        if (guestEmail != null) {
            guestEmail = guestEmail.trim();
        }
    }
}
