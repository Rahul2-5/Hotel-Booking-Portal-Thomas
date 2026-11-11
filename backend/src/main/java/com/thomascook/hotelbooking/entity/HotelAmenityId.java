package com.thomascook.hotelbooking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class HotelAmenityId implements Serializable {

    private static final long serialVersionUID = 1L;

    @Column(name = "hotel_id", nullable = false)
    private Long hotelId;

    @Column(name = "amenity", nullable = false, length = 50)
    private String amenity;

    public HotelAmenityId() {
    }

    public HotelAmenityId(Long hotelId, String amenity) {
        this.hotelId = hotelId;
        this.amenity = amenity;
    }

    public Long getHotelId() {
        return hotelId;
    }

    public void setHotelId(Long hotelId) {
        this.hotelId = hotelId;
    }

    public String getAmenity() {
        return amenity;
    }

    public void setAmenity(String amenity) {
        this.amenity = amenity;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof HotelAmenityId that)) {
            return false;
        }
        return Objects.equals(hotelId, that.hotelId)
                && Objects.equals(amenity, that.amenity);
    }

    @Override
    public int hashCode() {
        return Objects.hash(hotelId, amenity);
    }
}
