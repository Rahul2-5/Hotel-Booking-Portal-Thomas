package com.thomascook.hotelbooking.repository;

import com.thomascook.hotelbooking.entity.Booking;
import com.thomascook.hotelbooking.entity.BookingStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    boolean existsByBookingReference(String bookingReference);

    Optional<Booking> findByBookingReferenceAndGuestEmailIgnoreCase(String bookingReference, String guestEmail);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select b from Booking b
            where b.bookingReference = :reference
              and lower(b.guestEmail) = lower(:email)
            """)
    Optional<Booking> findByReferenceAndEmailForUpdate(@Param("reference") String reference,
                                                     @Param("email") String email);

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
