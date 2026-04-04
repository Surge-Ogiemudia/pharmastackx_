
"use client";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { LatLngExpression } from "leaflet";

// This component finds the user's location and animates the map to it.
const LocationFinder = () => {
  const map = useMap();

  useEffect(() => {
    map.locate().on("locationfound", function (e) {
      map.flyTo(e.latlng, 13);
    });
  }, [map]);

  return null;
};

const MapBackground = () => {
  // A neutral starting point before geolocation is found
  const initialPosition: LatLngExpression = [20, 0];

  return (
    <MapContainer
      center={initialPosition}
      zoom={2} // Start zoomed out
      style={{ height: "100%", width: "100%", zIndex: 0 }}
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={false}
      dragging={false}
      touchZoom={false}
      doubleClickZoom={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <LocationFinder />
    </MapContainer>
  );
};

export default MapBackground;
