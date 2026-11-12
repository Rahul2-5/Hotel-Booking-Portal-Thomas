package com.thomascook.hotelbooking.repository;

import com.thomascook.hotelbooking.entity.Hotel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HotelRepository extends JpaRepository<Hotel, Long> {
    List<Hotel> findAllByOrderByIdAsc();

    List<Hotel> findByLocationContainingIgnoreCaseOrderByIdAsc(String location);
}
