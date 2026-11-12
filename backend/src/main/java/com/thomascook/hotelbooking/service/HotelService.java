package com.thomascook.hotelbooking.service;

import com.thomascook.hotelbooking.dto.HotelResponse;
import com.thomascook.hotelbooking.dto.RoomTypeResponse;
import com.thomascook.hotelbooking.entity.Hotel;
import com.thomascook.hotelbooking.entity.RoomType;
import com.thomascook.hotelbooking.exception.NotFoundException;
import com.thomascook.hotelbooking.repository.HotelAmenityRepository;
import com.thomascook.hotelbooking.repository.HotelRepository;
import com.thomascook.hotelbooking.repository.RoomTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class HotelService {

    private final HotelRepository hotelRepository;
    private final HotelAmenityRepository amenityRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final AvailabilityService availabilityService;
    private final StayDateValidator dateValidator;

    public HotelService(HotelRepository hotelRepository,
                        HotelAmenityRepository amenityRepository,
                        RoomTypeRepository roomTypeRepository,
                        AvailabilityService availabilityService,
                        StayDateValidator dateValidator) {
        this.hotelRepository = hotelRepository;
        this.amenityRepository = amenityRepository;
        this.roomTypeRepository = roomTypeRepository;
        this.availabilityService = availabilityService;
        this.dateValidator = dateValidator;
    }

    public List<HotelResponse> findHotels(String location, LocalDate checkIn, LocalDate checkOut) {
        dateValidator.validateOptionalDates(checkIn, checkOut);
        List<Hotel> hotels;
        if (location == null || location.isBlank()) {
            hotels = hotelRepository.findAllByOrderByIdAsc();
        } else {
            hotels = hotelRepository.findByLocationContainingIgnoreCaseOrderByIdAsc(location.trim());
        }

        List<HotelResponse> responses = new ArrayList<>();
        for (Hotel hotel : hotels) {
            responses.add(toResponse(hotel, checkIn, checkOut));
        }
        return responses;
    }

    public HotelResponse getHotel(Long id, LocalDate checkIn, LocalDate checkOut) {
        dateValidator.validateOptionalDates(checkIn, checkOut);
        Hotel hotel = hotelRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Hotel not found."));
        return toResponse(hotel, checkIn, checkOut);
    }

    private HotelResponse toResponse(Hotel hotel, LocalDate checkIn, LocalDate checkOut) {
        Long nights = checkIn == null ? null : ChronoUnit.DAYS.between(checkIn, checkOut);
        List<RoomTypeResponse> rooms = new ArrayList<>();
        for (RoomType roomType : roomTypeRepository.findByHotel_IdOrderByIdAsc(hotel.getId())) {
            Integer availableRooms = null;
            BigDecimal totalAmount = null;
            if (nights != null) {
                availableRooms = availabilityService.getAvailableRooms(roomType, checkIn, checkOut);
                totalAmount = roomType.getPricePerNight().multiply(BigDecimal.valueOf(nights));
            }
            rooms.add(new RoomTypeResponse(roomType.getId(), roomType.getName(),
                    roomType.getPricePerNight(), roomType.getTotalRooms(), availableRooms, totalAmount));
        }
        return new HotelResponse(hotel.getId(), hotel.getName(), hotel.getLocation(),
                hotel.getDescription(), amenityRepository.findAmenitiesByHotelId(hotel.getId()),
                checkIn, checkOut, nights, rooms);
    }
}
