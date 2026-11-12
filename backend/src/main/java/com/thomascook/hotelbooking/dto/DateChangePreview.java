package com.thomascook.hotelbooking.dto;

import java.math.BigDecimal;

public record DateChangePreview(boolean available, long nights, BigDecimal oldTotal,
                                BigDecimal newTotal, BigDecimal difference,
                                BigDecimal changeFee, BigDecimal netChange) {
}
