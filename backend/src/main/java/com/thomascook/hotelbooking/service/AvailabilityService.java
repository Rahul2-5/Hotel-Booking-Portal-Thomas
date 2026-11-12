package com.thomascook.hotelbooking.service;

import com.thomascook.hotelbooking.entity.BookingStatus;
import com.thomascook.hotelbooking.entity.RoomType;
import com.thomascook.hotelbooking.repository.BookingRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class AvailabilityService {

    private final BookingRepository bookingRepository;

    public AvailabilityService(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    // The caller supplies validated dates. Checkout is exclusive, so adjacent stays do not overlap.
    public int getAvailableRooms(RoomType roomType, LocalDate checkIn, LocalDate checkOut) {
        long bookedRooms = bookingRepository.countOverlappingBookings(
                roomType.getId(), BookingStatus.CONFIRMED, checkIn, checkOut);
        return (int) Math.max(0, roomType.getTotalRooms() - bookedRooms);
    }
}
