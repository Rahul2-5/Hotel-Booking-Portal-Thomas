package com.thomascook.hotelbooking.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public final class ChangeFeePolicy {
    private ChangeFeePolicy() {
    }

    public static BigDecimal calculate(LocalDate currentCheckIn, LocalDate today, BigDecimal configuredFee,
                                       int successfulChanges) {
        if (successfulChanges == 0) return BigDecimal.ZERO;
        return ChronoUnit.DAYS.between(today, currentCheckIn) >= 2 ? BigDecimal.ZERO : configuredFee;
    }
}
