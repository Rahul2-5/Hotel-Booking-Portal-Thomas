package com.thomascook.hotelbooking.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "hotel_amenity")
public class HotelAmenity {

    @EmbeddedId
    private HotelAmenityId id;

    @MapsId("hotelId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "hotel_id", nullable = false)
    private Hotel hotel;

    public HotelAmenity() {
    }

    public HotelAmenityId getId() {
        return id;
    }

    public void setId(HotelAmenityId id) {
        this.id = id;
    }

    public Hotel getHotel() {
        return hotel;
    }

    public void setHotel(Hotel hotel) {
        this.hotel = hotel;
    }
}
