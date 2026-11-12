package com.thomascook.hotelbooking.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;

public record DateChangeRequest(
        @NotBlank(message = "Email is required.")
        @Email(message = "Email must be a valid email address.")
        @Size(max = 150, message = "Email must be at most 150 characters.") String email,
        @NotNull(message = "Check-in is required.")
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
        @NotNull(message = "Check-out is required.")
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut
) {
    public DateChangeRequest {
        if (email != null) email = email.trim();
    }
}
