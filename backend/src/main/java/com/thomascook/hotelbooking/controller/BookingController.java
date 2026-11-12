package com.thomascook.hotelbooking.controller;

import com.thomascook.hotelbooking.dto.BookingResponse;
import com.thomascook.hotelbooking.dto.BookingEmailRequest;
import com.thomascook.hotelbooking.dto.CreateBookingRequest;
import com.thomascook.hotelbooking.dto.DateChangeRequest;
import com.thomascook.hotelbooking.dto.DateChangePreview;
import com.thomascook.hotelbooking.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    public ResponseEntity<BookingResponse> createBooking(@Valid @RequestBody CreateBookingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.createBooking(request));
    }

    @GetMapping("/{reference}")
    public BookingResponse getBooking(@PathVariable("reference") String reference,
                                      @Valid @ModelAttribute BookingEmailRequest request) {
        return bookingService.getBooking(reference, request.email());
    }

    @GetMapping("/{reference}/date-change-preview")
    public DateChangePreview previewDateChange(@PathVariable("reference") String reference,
                                               @Valid @ModelAttribute DateChangeRequest request) {
        return bookingService.previewDateChange(reference, request);
    }

    @PutMapping("/{reference}/dates")
    public BookingResponse changeDates(@PathVariable("reference") String reference,
                                        @Valid @RequestBody DateChangeRequest request) {
        return bookingService.changeDates(reference, request);
    }

    @PostMapping("/{reference}/cancel")
    public BookingResponse cancelBooking(@PathVariable("reference") String reference,
                                         @Valid @RequestBody BookingEmailRequest request) {
        return bookingService.cancelBooking(reference, request.email());
    }
}
