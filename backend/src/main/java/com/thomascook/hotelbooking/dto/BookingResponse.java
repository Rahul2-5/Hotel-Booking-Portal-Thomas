package com.thomascook.hotelbooking.dto;

import com.thomascook.hotelbooking.entity.BookingStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BookingResponse(
        String bookingReference,
        Long hotelId,
        String hotelName,
        Long roomTypeId,
        String roomTypeName,
        String guestName,
        String guestEmail,
        LocalDate checkIn,
        LocalDate checkOut,
        long nights,
        BigDecimal pricePerNight,
        BigDecimal totalAmount,
        BookingStatus status
) {
}
