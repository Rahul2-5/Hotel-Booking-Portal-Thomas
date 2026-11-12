package com.thomascook.hotelbooking.exception;

import com.thomascook.hotelbooking.dto.ApiError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(RequestValidationException.class)
    public ResponseEntity<ApiError> handleValidation(RequestValidationException exception) {
        return ResponseEntity.badRequest().body(new ApiError(400, "VALIDATION_ERROR",
                exception.getMessage(), exception.getFieldErrors()));
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(NotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiError(404, "NOT_FOUND", exception.getMessage(), Map.of()));
    }

    @Override
    protected ResponseEntity<Object> handleTypeMismatch(TypeMismatchException exception,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        Map<String, String> fields = new LinkedHashMap<>();
        if (exception instanceof MethodArgumentTypeMismatchException argument) {
            String message = argument.getRequiredType() == LocalDate.class
                    ? "Must be a valid date in YYYY-MM-DD format."
                    : "Must be a valid " + argument.getName() + ".";
            fields.put(argument.getName(), message);
        }
        return new ResponseEntity<>(new ApiError(400, "VALIDATION_ERROR",
                "Please correct the invalid request fields.", fields), headers, status);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException exception,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        Map<String, String> fields = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(error ->
                fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return new ResponseEntity<>(new ApiError(400, "VALIDATION_ERROR",
                "Please correct the invalid request fields.", fields), headers, status);
    }

    // Keep Spring MVC errors, such as unknown routes and unsupported methods, in the same shape.
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception exception, Object body,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        String code = switch (status.value()) {
            case 400 -> "VALIDATION_ERROR";
            case 404 -> "NOT_FOUND";
            case 405 -> "METHOD_NOT_ALLOWED";
            default -> status.is5xxServerError() ? "INTERNAL_ERROR" : "REQUEST_ERROR";
        };
        String message = HttpStatus.valueOf(status.value()).getReasonPhrase();
        return new ResponseEntity<>(new ApiError(status.value(), code, message, Map.of()), headers, status);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception exception) {
        log.error("Unexpected request failure", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiError(500, "INTERNAL_ERROR", "An unexpected error occurred.", Map.of()));
    }
}
