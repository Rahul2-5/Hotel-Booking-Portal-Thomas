package com.thomascook.hotelbooking.repository;

import com.thomascook.hotelbooking.entity.HotelAmenity;
import com.thomascook.hotelbooking.entity.HotelAmenityId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HotelAmenityRepository extends JpaRepository<HotelAmenity, HotelAmenityId> {
}
