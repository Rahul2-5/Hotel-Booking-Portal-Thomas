package com.thomascook.hotelbooking.dto;

import java.math.BigDecimal;

public record RoomTypeResponse(
        Long id,
        String name,
        BigDecimal pricePerNight,
        int totalRooms,
        Integer availableRooms,
        BigDecimal totalAmount
) {
}
