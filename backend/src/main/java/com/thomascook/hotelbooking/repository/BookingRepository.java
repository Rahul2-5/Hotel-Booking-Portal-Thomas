package com.thomascook.hotelbooking.repository;

import com.thomascook.hotelbooking.entity.Booking;
import com.thomascook.hotelbooking.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    boolean existsByBookingReference(String bookingReference);

    @Query("""
            select count(b) from Booking b
            where b.roomType.id = :roomTypeId
              and b.status = :status
              and b.checkIn < :checkOut
              and b.checkOut > :checkIn
            """)
    long countOverlappingBookings(@Param("roomTypeId") Long roomTypeId,
                                  @Param("status") BookingStatus status,
                                  @Param("checkIn") LocalDate checkIn,
                                  @Param("checkOut") LocalDate checkOut);
}
