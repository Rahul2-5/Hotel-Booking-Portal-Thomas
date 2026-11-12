package com.thomascook.hotelbooking.service;

import com.thomascook.hotelbooking.dto.BookingResponse;
import com.thomascook.hotelbooking.dto.CreateBookingRequest;
import com.thomascook.hotelbooking.entity.Booking;
import com.thomascook.hotelbooking.entity.BookingStatus;
import com.thomascook.hotelbooking.entity.Hotel;
import com.thomascook.hotelbooking.entity.RoomType;
import com.thomascook.hotelbooking.exception.SoldOutException;
import com.thomascook.hotelbooking.repository.BookingRepository;
import com.thomascook.hotelbooking.repository.HotelRepository;
import com.thomascook.hotelbooking.repository.RoomTypeRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
@Transactional
class BookingDatabaseTest {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private AvailabilityService availabilityService;

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private EntityManager entityManager;

    private RoomType roomType;
    private LocalDate checkIn;

    @BeforeEach
    void createOneRoomHotel() {
        Hotel hotel = new Hotel();
        hotel.setName("Test Hotel");
        hotel.setLocation("Test City");
        hotelRepository.save(hotel);

        roomType = new RoomType();
        roomType.setHotel(hotel);
        roomType.setName("Deluxe Room");
        roomType.setPricePerNight(new BigDecimal("3999.95"));
        roomType.setTotalRooms(1);
        roomTypeRepository.save(roomType);
        checkIn = LocalDate.now().plusDays(10);
    }

    @ParameterizedTest(name = "Stay [{0}, {1}) overlaps: {2}")
    @CsvSource({
            "-1, 1, true",
            "1, 2, true",
            "-1, 4, true",
            "2, 4, true",
            "-2, 0, false",
            "3, 5, false"
    })
    void detectsOverlapsAndAllowsBackToBackStays(int startOffset, int endOffset, boolean overlaps) {
        // The existing booking occupies [checkIn, checkIn + 3 days).
        bookingService.createBooking(request(checkIn, checkIn.plusDays(3)));

        int available = availabilityService.getAvailableRooms(roomType,
                checkIn.plusDays(startOffset), checkIn.plusDays(endOffset));

        assertThat(available).isEqualTo(overlaps ? 0 : 1);
    }

    @Test
    void rejectsBookingBeyondCapacity() {
        CreateBookingRequest request = request(checkIn, checkIn.plusDays(3));
        bookingService.createBooking(request);

        assertThatThrownBy(() -> bookingService.createBooking(request))
                .isInstanceOf(SoldOutException.class);
        assertThat(bookingRepository.count()).isEqualTo(1);
    }

    @Test
    void cancellationPersistsAndRestoresAvailabilityForAnotherBooking() {
        CreateBookingRequest request = request(checkIn, checkIn.plusDays(3));
        BookingResponse created = bookingService.createBooking(request);
        assertThat(availabilityService.getAvailableRooms(roomType, request.checkIn(), request.checkOut()))
                .isZero();

        bookingService.cancelBooking(created.bookingReference(), request.guestEmail());
        // Flush and clear force the assertions to read stored data, not only the managed object.
        entityManager.flush();
        entityManager.clear();

        Booking stored = bookingRepository.findByBookingReferenceAndGuestEmailIgnoreCase(
                created.bookingReference(), request.guestEmail()).orElseThrow();
        assertThat(stored.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(stored.getCancelledAt()).isNotNull();
        assertThat(availabilityService.getAvailableRooms(roomType, request.checkIn(), request.checkOut()))
                .isEqualTo(1);

        bookingService.createBooking(request);
        assertThat(availabilityService.getAvailableRooms(roomType, request.checkIn(), request.checkOut()))
                .isZero();
    }

    private CreateBookingRequest request(LocalDate start, LocalDate end) {
        return new CreateBookingRequest(roomType.getId(), "Test Guest", "guest@example.com", start, end);
    }
}
