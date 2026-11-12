package com.thomascook.hotelbooking.dto;

import java.time.LocalDate;
import java.util.List;

public record HotelResponse(
        Long id,
        String name,
        String location,
        String description,
        List<String> amenities,
        LocalDate checkIn,
        LocalDate checkOut,
        Long nights,
        List<RoomTypeResponse> roomTypes
) {
}
