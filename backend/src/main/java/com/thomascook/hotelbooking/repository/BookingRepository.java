package com.thomascook.hotelbooking.repository;

import com.thomascook.hotelbooking.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingRepository extends JpaRepository<Booking, Long> {
}
