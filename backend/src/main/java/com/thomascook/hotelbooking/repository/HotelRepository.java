package com.thomascook.hotelbooking.repository;

import com.thomascook.hotelbooking.entity.Hotel;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HotelRepository extends JpaRepository<Hotel, Long> {
}
