package com.thomascook.hotelbooking.service;

import com.thomascook.hotelbooking.exception.RequestValidationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

class StayDateValidatorTest {

    private final StayDateValidator validator = new StayDateValidator();

    @Test
    void rejectsPastCheckIn() {
        LocalDate today = LocalDate.now();

        RequestValidationException error = catchThrowableOfType(
                () -> validator.validateOptionalDates(today.minusDays(1), today.plusDays(1)),
                RequestValidationException.class);

        assertThat(error).isNotNull();
        assertThat(error.getFieldErrors()).containsKey("checkIn");
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1})
    void rejectsCheckoutOnOrBeforeCheckIn(int checkoutOffset) {
        LocalDate checkIn = LocalDate.now().plusDays(10);

        RequestValidationException error = catchThrowableOfType(
                () -> validator.validateOptionalDates(checkIn, checkIn.plusDays(checkoutOffset)),
                RequestValidationException.class);

        assertThat(error).isNotNull();
        assertThat(error.getFieldErrors()).containsKey("checkOut");
    }
}
