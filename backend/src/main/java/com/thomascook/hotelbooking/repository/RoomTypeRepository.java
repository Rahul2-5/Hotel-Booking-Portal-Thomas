package com.thomascook.hotelbooking.repository;

import com.thomascook.hotelbooking.entity.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomTypeRepository extends JpaRepository<RoomType, Long> {
}
