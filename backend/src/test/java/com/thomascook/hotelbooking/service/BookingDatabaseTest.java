package com.thomascook.hotelbooking.service;

import com.thomascook.hotelbooking.dto.BookingResponse;
import com.thomascook.hotelbooking.dto.CreateBookingRequest;
import com.thomascook.hotelbooking.dto.DateChangeRequest;
import com.thomascook.hotelbooking.dto.DateChangePreview;
import com.thomascook.hotelbooking.exception.DateChangeNotAllowedException;
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

    @Test
    void changesToFreeDatesAndRecalculatesUsingTheStoredPrice() {
        BookingResponse original = bookingService.createBooking(request(checkIn, checkIn.plusDays(2)));
        roomType.setPricePerNight(new BigDecimal("9000.00"));
        DateChangeRequest change = new DateChangeRequest(original.guestEmail(),
                checkIn.plusDays(5), checkIn.plusDays(9));

        DateChangePreview preview = bookingService.previewDateChange(original.bookingReference(), change);
        assertThat(preview.available()).isTrue();
        assertThat(preview.nights()).isEqualTo(4);
        assertThat(preview.oldTotal()).isEqualByComparingTo("7999.90");
        assertThat(preview.newTotal()).isEqualByComparingTo("15999.80");
        assertThat(preview.difference()).isEqualByComparingTo("7999.90");
        assertThat(preview.changeFee()).isZero();
        assertThat(preview.netChange()).isEqualByComparingTo(preview.difference());
        entityManager.flush();
        entityManager.clear();
        BookingResponse beforeUpdate = bookingService.getBooking(original.bookingReference(), original.guestEmail());
        assertThat(beforeUpdate.checkIn()).isEqualTo(original.checkIn());
        assertThat(beforeUpdate.totalAmount()).isEqualByComparingTo(original.totalAmount());

        bookingService.changeDates(original.bookingReference(), change);
        entityManager.flush();
        entityManager.clear();
        BookingResponse updated = bookingService.getBooking(original.bookingReference(), original.guestEmail());
        assertThat(updated.checkIn()).isEqualTo(change.checkIn());
        assertThat(updated.checkOut()).isEqualTo(change.checkOut());
        assertThat(updated.pricePerNight()).isEqualByComparingTo("3999.95");
        assertThat(updated.totalAmount()).isEqualByComparingTo("15999.80");
        assertThat(updated.bookingReference()).isEqualTo(original.bookingReference());
        assertThat(bookingRepository.count()).isEqualTo(1);
    }

    @Test
    void extendsOneRoomStayWithoutCountingItsOwnBooking() {
        BookingResponse original = bookingService.createBooking(request(checkIn, checkIn.plusDays(2)));
        DateChangeRequest change = new DateChangeRequest(original.guestEmail(), checkIn, checkIn.plusDays(3));

        assertThat(bookingService.previewDateChange(original.bookingReference(), change).available()).isTrue();
        BookingResponse updated = bookingService.changeDates(original.bookingReference(), change);

        assertThat(updated.nights()).isEqualTo(3);
        assertThat(updated.totalAmount()).isEqualByComparingTo("11999.85");
        assertThat(updated.status()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(bookingRepository.count()).isEqualTo(1);
    }

    @Test
    void soldOutDateChangeLeavesTheOriginalBookingUnchanged() {
        BookingResponse original = bookingService.createBooking(request(checkIn, checkIn.plusDays(2)));
        bookingService.createBooking(request(checkIn.plusDays(4), checkIn.plusDays(6)));
        DateChangeRequest change = new DateChangeRequest(original.guestEmail(),
                checkIn.plusDays(4), checkIn.plusDays(6));
        assertThat(bookingService.previewDateChange(original.bookingReference(), change).available()).isFalse();

        assertThatThrownBy(() -> bookingService.changeDates(original.bookingReference(), change))
                .isInstanceOf(SoldOutException.class).hasMessageContaining("unchanged");
        entityManager.flush();
        entityManager.clear();

        BookingResponse unchanged = bookingService.getBooking(original.bookingReference(), original.guestEmail());
        assertThat(unchanged).isEqualTo(original);
        assertThat(bookingRepository.count()).isEqualTo(2);
    }

    @Test
    void cancelledBookingCannotHaveItsDatesChanged() {
        BookingResponse original = bookingService.createBooking(request(checkIn, checkIn.plusDays(2)));
        bookingService.cancelBooking(original.bookingReference(), original.guestEmail());
        DateChangeRequest change = new DateChangeRequest(original.guestEmail(), checkIn, checkIn.plusDays(3));

        assertThatThrownBy(() -> bookingService.previewDateChange(original.bookingReference(), change))
                .isInstanceOf(DateChangeNotAllowedException.class);
        assertThatThrownBy(() -> bookingService.changeDates(original.bookingReference(), change))
                .isInstanceOf(DateChangeNotAllowedException.class);
        entityManager.flush();
        entityManager.clear();
        BookingResponse unchanged = bookingService.getBooking(original.bookingReference(), original.guestEmail());
        assertThat(unchanged.status()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(unchanged.checkIn()).isEqualTo(original.checkIn());
        assertThat(unchanged.checkOut()).isEqualTo(original.checkOut());
        assertThat(unchanged.totalAmount()).isEqualByComparingTo(original.totalAmount());
    }

    @Test
    void successiveChargedChangesAccumulateFeesSeparatelyFromTheStayPrice() {
        LocalDate today = LocalDate.now();
        BookingResponse original = bookingService.createBooking(request(today.plusDays(1), today.plusDays(3)));
        DateChangeRequest firstChange = new DateChangeRequest(original.guestEmail(), today, today.plusDays(3));
        DateChangePreview preview = bookingService.previewDateChange(original.bookingReference(), firstChange);
        assertThat(preview.changeFee()).isZero();
        assertThat(preview.netChange()).isEqualByComparingTo("3999.95");
        assertThat(bookingService.getBooking(original.bookingReference(), original.guestEmail()).changeFeeTotal()).isZero();

        BookingResponse first = bookingService.changeDates(original.bookingReference(), firstChange);
        assertThat(first.changeFeeTotal()).isZero();
        assertThat(first.dateChangeCount()).isEqualTo(1);
        assertThat(first.totalAmount()).isEqualByComparingTo("11999.85");
        assertThat(first.amountDue()).isEqualByComparingTo("11999.85");
        entityManager.flush();
        entityManager.clear();

        BookingResponse second = bookingService.changeDates(original.bookingReference(),
                new DateChangeRequest(original.guestEmail(), today, today.plusDays(4)));
        entityManager.flush();
        entityManager.clear();
        BookingResponse stored = bookingService.getBooking(original.bookingReference(), original.guestEmail());
        assertThat(stored.changeFeeTotal()).isEqualByComparingTo("500.00");
        assertThat(stored.dateChangeCount()).isEqualTo(2);
        assertThat(stored.totalAmount()).isEqualByComparingTo("15999.80");
        assertThat(stored.amountDue()).isEqualByComparingTo("16499.80");
        assertThat(second.bookingReference()).isEqualTo(original.bookingReference());
        BookingResponse third = bookingService.changeDates(original.bookingReference(),
                new DateChangeRequest(original.guestEmail(), today, today.plusDays(5)));
        entityManager.flush();
        entityManager.clear();
        BookingResponse afterThird = bookingService.getBooking(original.bookingReference(), original.guestEmail());
        assertThat(afterThird.changeFeeTotal()).isEqualByComparingTo("1000.00");
        assertThat(afterThird.dateChangeCount()).isEqualTo(3);
        assertThat(afterThird.totalAmount()).isEqualByComparingTo("19999.75");
        assertThat(third.amountDue()).isEqualByComparingTo("20999.75");
    }

    @Test
    void rejectedLateChangeDoesNotAddAFee() {
        LocalDate today = LocalDate.now();
        BookingResponse original = bookingService.createBooking(request(today.plusDays(1), today.plusDays(3)));
        BookingResponse afterFreeChange = bookingService.changeDates(original.bookingReference(),
                new DateChangeRequest(original.guestEmail(), today.plusDays(1), today.plusDays(4)));
        bookingService.createBooking(request(today.plusDays(4), today.plusDays(6)));
        DateChangeRequest change = new DateChangeRequest(original.guestEmail(), today.plusDays(4), today.plusDays(6));
        DateChangePreview preview = bookingService.previewDateChange(original.bookingReference(), change);
        assertThat(preview.available()).isFalse();
        assertThat(preview.changeFee()).isEqualByComparingTo("500.00");
        assertThatThrownBy(() -> bookingService.changeDates(original.bookingReference(), change))
                .isInstanceOf(SoldOutException.class);
        entityManager.flush();
        entityManager.clear();
        assertThat(bookingService.getBooking(original.bookingReference(), original.guestEmail())).isEqualTo(afterFreeChange);
    }

    @Test
    void identicalDatesDoNotConsumeTheFirstFreeChange() {
        LocalDate today = LocalDate.now();
        BookingResponse original = bookingService.createBooking(request(today, today.plusDays(2)));
        DateChangeRequest unchanged = new DateChangeRequest(original.guestEmail(), today, today.plusDays(2));
        assertThat(bookingService.previewDateChange(original.bookingReference(), unchanged).changeFee()).isZero();
        assertThat(bookingService.changeDates(original.bookingReference(), unchanged)).isEqualTo(original);
        BookingResponse changed = bookingService.changeDates(original.bookingReference(),
                new DateChangeRequest(original.guestEmail(), today, today.plusDays(3)));
        assertThat(changed.changeFeeTotal()).isZero();
        assertThat(changed.dateChangeCount()).isEqualTo(1);
    }

    private CreateBookingRequest request(LocalDate start, LocalDate end) {
        return new CreateBookingRequest(roomType.getId(), "Test Guest", "guest@example.com", start, end);
    }
}
