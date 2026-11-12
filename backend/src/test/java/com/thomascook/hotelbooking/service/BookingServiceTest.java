package com.thomascook.hotelbooking.service;

import com.thomascook.hotelbooking.dto.BookingResponse;
import com.thomascook.hotelbooking.dto.CreateBookingRequest;
import com.thomascook.hotelbooking.entity.Booking;
import com.thomascook.hotelbooking.entity.Hotel;
import com.thomascook.hotelbooking.entity.RoomType;
import com.thomascook.hotelbooking.repository.BookingRepository;
import com.thomascook.hotelbooking.repository.RoomTypeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private RoomTypeRepository roomTypeRepository;

    @Mock
    private AvailabilityService availabilityService;

    @Test
    void calculatesNightsAndTotalAndSavesThePriceSnapshot() {
        LocalDate checkIn = LocalDate.now().plusDays(10);
        LocalDate checkOut = checkIn.plusDays(3);
        Hotel hotel = mock(Hotel.class);
        RoomType roomType = mock(RoomType.class);
        when(hotel.getId()).thenReturn(1L);
        when(hotel.getName()).thenReturn("Test Hotel");
        when(roomType.getId()).thenReturn(1L);
        when(roomType.getName()).thenReturn("Deluxe Room");
        when(roomType.getHotel()).thenReturn(hotel);
        when(roomType.getPricePerNight()).thenReturn(new BigDecimal("3999.95"));
        when(roomTypeRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(roomType));
        when(availabilityService.getAvailableRooms(roomType, checkIn, checkOut)).thenReturn(1);
        BookingService service = new BookingService(bookingRepository, roomTypeRepository,
                availabilityService, new StayDateValidator());

        BookingResponse response = service.createBooking(new CreateBookingRequest(
                1L, "Test Guest", "guest@example.com", checkIn, checkOut));

        assertThat(response.nights()).isEqualTo(3);
        assertThat(response.totalAmount()).isEqualByComparingTo("11999.85");
        ArgumentCaptor<Booking> savedBooking = ArgumentCaptor.forClass(Booking.class);
        verify(bookingRepository).save(savedBooking.capture());
        assertThat(savedBooking.getValue().getPricePerNight()).isEqualByComparingTo("3999.95");
        assertThat(savedBooking.getValue().getTotalAmount()).isEqualByComparingTo("11999.85");
    }
}
