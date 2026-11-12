package com.thomascook.hotelbooking.repository;

import com.thomascook.hotelbooking.entity.HotelAmenity;
import com.thomascook.hotelbooking.entity.HotelAmenityId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface HotelAmenityRepository extends JpaRepository<HotelAmenity, HotelAmenityId> {
    @Query("""
            select a.id.amenity from HotelAmenity a
            where a.id.hotelId = :hotelId
            order by a.id.amenity
            """)
    List<String> findAmenitiesByHotelId(@Param("hotelId") Long hotelId);
}
