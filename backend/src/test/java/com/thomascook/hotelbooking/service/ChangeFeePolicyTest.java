package com.thomascook.hotelbooking.service;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import java.math.BigDecimal;
import java.time.LocalDate;
import static org.assertj.core.api.Assertions.assertThat;

class ChangeFeePolicyTest {
    @ParameterizedTest
    @CsvSource({"0, 0, 0.00", "1, 0, 0.00", "2, 0, 0.00", "2, 1, 0.00", "1, 1, 750.00", "0, 1, 750.00"})
    void makesTheFirstChangeFreeThenAppliesTheTwoDayBoundary(int daysBefore, int successfulChanges, String expected) {
        LocalDate today = LocalDate.of(2026, 1, 10);
        assertThat(ChangeFeePolicy.calculate(today.plusDays(daysBefore), today, new BigDecimal("750.00"), successfulChanges))
                .isEqualByComparingTo(expected);
    }
}
