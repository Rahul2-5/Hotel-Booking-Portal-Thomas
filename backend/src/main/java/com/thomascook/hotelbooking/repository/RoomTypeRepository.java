package com.thomascook.hotelbooking.repository;

import com.thomascook.hotelbooking.entity.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoomTypeRepository extends JpaRepository<RoomType, Long> {
    List<RoomType> findByHotel_IdOrderByIdAsc(Long hotelId);
}
