package com.thomascook.hotelbooking.dto;

import java.util.Map;

public record ApiError(
        int status,
        String code,
        String message,
        Map<String, String> fieldErrors
) {
}
