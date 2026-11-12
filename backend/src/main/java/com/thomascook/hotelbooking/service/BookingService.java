package com.thomascook.hotelbooking.service;

import com.thomascook.hotelbooking.dto.BookingResponse;
import com.thomascook.hotelbooking.dto.CreateBookingRequest;
import com.thomascook.hotelbooking.dto.DateChangeRequest;
import com.thomascook.hotelbooking.dto.DateChangePreview;
import com.thomascook.hotelbooking.exception.DateChangeNotAllowedException;
import com.thomascook.hotelbooking.entity.Booking;
import com.thomascook.hotelbooking.entity.BookingStatus;
import com.thomascook.hotelbooking.entity.RoomType;
import com.thomascook.hotelbooking.exception.AlreadyCancelledException;
import com.thomascook.hotelbooking.exception.NotFoundException;
import com.thomascook.hotelbooking.exception.RequestValidationException;
import com.thomascook.hotelbooking.exception.SoldOutException;
import com.thomascook.hotelbooking.repository.BookingRepository;
import com.thomascook.hotelbooking.repository.RoomTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class BookingService {

    private static final BigDecimal MAX_TOTAL_AMOUNT = new BigDecimal("99999999.99");

    private final BookingRepository bookingRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final AvailabilityService availabilityService;
    private final StayDateValidator dateValidator;
    private final BigDecimal configuredChangeFee;

    public BookingService(BookingRepository bookingRepository,
                          RoomTypeRepository roomTypeRepository,
                          AvailabilityService availabilityService,
                          StayDateValidator dateValidator,
                          @Value("${booking.change-fee}") BigDecimal configuredChangeFee) {
        this.bookingRepository = bookingRepository;
        this.roomTypeRepository = roomTypeRepository;
        this.availabilityService = availabilityService;
        this.dateValidator = dateValidator;
        this.configuredChangeFee = configuredChangeFee;
    }

    // The controller calls this public method through Spring's transaction proxy.
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public BookingResponse createBooking(CreateBookingRequest request) {
        // Required fields and their formats were checked by @Valid in the controller.
        dateValidator.validateOptionalDates(request.checkIn(), request.checkOut());

        RoomType roomType = roomTypeRepository.findByIdForUpdate(request.roomTypeId())
                .orElseThrow(() -> new NotFoundException("Room type not found."));

        // The lock is held until commit. A waiting request checks committed availability afterwards.
        if (availabilityService.getAvailableRooms(roomType, request.checkIn(), request.checkOut()) == 0) {
            throw new SoldOutException();
        }

        long nights = ChronoUnit.DAYS.between(request.checkIn(), request.checkOut());
        BigDecimal totalAmount = roomType.getPricePerNight().multiply(BigDecimal.valueOf(nights));
        // booking.total_amount is DECIMAL(10, 2), so reject a total that cannot fit in that column.
        if (totalAmount.compareTo(MAX_TOTAL_AMOUNT) > 0) {
            throw new RequestValidationException(Map.of(
                    "checkOut", "The stay total exceeds the maximum supported amount. Choose a shorter stay."));
        }

        Booking booking = new Booking();
        booking.setBookingReference(generateUniqueReference());
        booking.setRoomType(roomType);
        booking.setGuestName(request.guestName());
        booking.setGuestEmail(request.guestEmail());
        booking.setCheckIn(request.checkIn());
        booking.setCheckOut(request.checkOut());
        booking.setPricePerNight(roomType.getPricePerNight());
        booking.setTotalAmount(totalAmount);
        booking.setStatus(BookingStatus.CONFIRMED);
        bookingRepository.save(booking);

        return toResponse(booking);
    }

    @Transactional(readOnly = true)
    public BookingResponse getBooking(String reference, String email) {
        Booking booking = bookingRepository.findByBookingReferenceAndGuestEmailIgnoreCase(
                        reference.trim().toUpperCase(Locale.ROOT), email.trim())
                .orElseThrow(() -> new NotFoundException("Booking not found."));
        return toResponse(booking);
    }

    @Transactional
    public BookingResponse cancelBooking(String reference, String email) {
        Booking booking = bookingRepository.findByReferenceAndEmailForUpdate(
                        reference.trim().toUpperCase(Locale.ROOT), email.trim())
                .orElseThrow(() -> new NotFoundException("Booking not found."));
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new AlreadyCancelledException();
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(LocalDateTime.now());
        // JPA saves the changes when this transaction commits. The booking row stays in the database.
        return toResponse(booking);
    }

    @Transactional(readOnly = true)
    public DateChangePreview previewDateChange(String reference, DateChangeRequest request) {
        Booking booking = bookingRepository.findByBookingReferenceAndGuestEmailIgnoreCase(
                        reference.trim().toUpperCase(Locale.ROOT), request.email())
                .orElseThrow(() -> new NotFoundException("Booking not found."));
        validateDateChange(booking, request);
        return calculateDateChange(booking, booking.getRoomType(), request);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public BookingResponse changeDates(String reference, DateChangeRequest request) {
        // Lock the booking too, so cancellation and another date change cannot race on this booking.
        Booking booking = bookingRepository.findByReferenceAndEmailForUpdate(
                        reference.trim().toUpperCase(Locale.ROOT), request.email())
                .orElseThrow(() -> new NotFoundException("Booking not found."));
        validateDateChange(booking, request);
        RoomType roomType = roomTypeRepository.findByIdForUpdate(booking.getRoomType().getId())
                .orElseThrow(() -> new NotFoundException("Room type not found."));
        DateChangePreview preview = calculateDateChange(booking, roomType, request);
        if (!preview.available()) {
            throw new SoldOutException("The new dates are sold out. Your booking is unchanged.");
        }

        // Submitting identical dates is a no-op and does not consume the first free change.
        if (booking.getCheckIn().equals(request.checkIn()) && booking.getCheckOut().equals(request.checkOut())) {
            return toResponse(booking);
        }
        BigDecimal accumulatedFees = booking.getChangeFeeTotal().add(preview.changeFee());
        if (accumulatedFees.compareTo(MAX_TOTAL_AMOUNT) > 0) {
            throw new RequestValidationException(Map.of("checkOut", "Accumulated change fees exceed the supported amount."));
        }
        // No booking fields change until all checks have passed. JPA saves at transaction commit.
        booking.setCheckIn(request.checkIn());
        booking.setCheckOut(request.checkOut());
        booking.setTotalAmount(preview.newTotal());
        booking.setChangeFeeTotal(accumulatedFees);
        booking.setDateChangeCount(booking.getDateChangeCount() + 1);
        return toResponse(booking);
    }

    private void validateDateChange(Booking booking, DateChangeRequest request) {
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new DateChangeNotAllowedException();
        }
        dateValidator.validateOptionalDates(request.checkIn(), request.checkOut());
    }

    private DateChangePreview calculateDateChange(Booking booking, RoomType roomType, DateChangeRequest request) {
        long nights = ChronoUnit.DAYS.between(request.checkIn(), request.checkOut());
        BigDecimal newTotal = booking.getPricePerNight().multiply(BigDecimal.valueOf(nights));
        if (newTotal.compareTo(MAX_TOTAL_AMOUNT) > 0) {
            throw new RequestValidationException(Map.of(
                    "checkOut", "The stay total exceeds the maximum supported amount. Choose a shorter stay."));
        }
        boolean available = availabilityService.getAvailableRoomsExcludingBooking(
                roomType, request.checkIn(), request.checkOut(), booking.getId()) > 0;
        BigDecimal difference = newTotal.subtract(booking.getTotalAmount());
        boolean sameDates = booking.getCheckIn().equals(request.checkIn()) && booking.getCheckOut().equals(request.checkOut());
        BigDecimal changeFee = sameDates ? BigDecimal.ZERO : ChangeFeePolicy.calculate(
                booking.getCheckIn(), LocalDate.now(), configuredChangeFee, booking.getDateChangeCount());
        return new DateChangePreview(available, nights, booking.getTotalAmount(), newTotal,
                difference, changeFee, difference.add(changeFee));
    }

    private BookingResponse toResponse(Booking booking) {
        RoomType roomType = booking.getRoomType();
        long nights = ChronoUnit.DAYS.between(booking.getCheckIn(), booking.getCheckOut());
        return new BookingResponse(booking.getBookingReference(), roomType.getHotel().getId(),
                roomType.getHotel().getName(), roomType.getId(), roomType.getName(),
                booking.getGuestName(), booking.getGuestEmail(), booking.getCheckIn(), booking.getCheckOut(),
                nights, booking.getPricePerNight(), booking.getTotalAmount(), booking.getStatus(),
                booking.getCancelledAt(), booking.getChangeFeeTotal(),
                booking.getTotalAmount().add(booking.getChangeFeeTotal()), booking.getDateChangeCount());
    }

    private String generateUniqueReference() {
        String reference;
        do {
            reference = "HB-" + UUID.randomUUID().toString().replace("-", "")
                    .substring(0, 16).toUpperCase(Locale.ROOT);
        } while (bookingRepository.existsByBookingReference(reference));
        // The UNIQUE constraint in MySQL also prevents duplicate references from being stored.
        return reference;
    }
}
