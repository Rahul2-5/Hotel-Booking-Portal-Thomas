package com.thomascook.hotelbooking.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BookingEmailRequest(
        @NotBlank(message = "Email is required.")
        @Email(message = "Email must be a valid email address.")
        @Size(max = 150, message = "Email must be at most 150 characters.")
        String email
) {
    public BookingEmailRequest {
        if (email != null) {
            email = email.trim();
        }
    }
}
