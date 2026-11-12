package com.thomascook.hotelbooking.dto;

import com.thomascook.hotelbooking.entity.BookingStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

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
        BookingStatus status,
        LocalDateTime cancelledAt,
        BigDecimal changeFeeTotal,
        BigDecimal amountDue,
        int dateChangeCount
) {
}
