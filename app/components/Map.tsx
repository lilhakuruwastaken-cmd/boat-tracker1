'use client';

import { useEffect, useState } from 'react';
import Leaflet from 'leaflet';

export default function Map({ boats, activeBoatId, onBoatClick }: any) {
  const [map, setMap] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize map
    const L = require('leaflet');
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });

    const initializedMap = L.map('map', {
      center: [4.1755, 73.5093],
      zoom: 10,
      zoomControl: false
    });

    // Beautiful, modern free map
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19
    }).addTo(initializedMap);

    L.control.zoom({ position: 'bottomright' }).addTo(initializedMap);
    setMap(initializedMap);

    return () => {
      initializedMap.remove();
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    const L = require('leaflet');

    // Clear old markers
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
      if (layer instanceof L.Polyline) map.removeLayer(layer);
    });

    boats.forEach((boat: any) => {
      if (!boat.liveData || !boat.liveData.devices || !boat.liveData.devices[boat.id]) return;
      
      const d = boat.liveData.devices[boat.id];
      const lat = parseFloat(d.la);
      const lng = parseFloat(d.lo);
      const speed = parseFloat(d.sp) || 0;
      const isMoving = speed >= 0.5;
      const isActive = boat.id === activeBoatId;

      // Custom HTML Marker
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-pin ${isMoving ? 'moving' : ''}" style="${isActive ? 'width: 40px; height: 40px; margin: -20px 0 0 -20px;' : ''}"></div><div class="marker-label">${boat.name}</div>`,
        iconSize: [isActive ? 40 : 30, isActive ? 40 : 30],
        iconAnchor: [isActive ? 20 : 15, isActive ? 40 : 30],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);
      marker.on('click', () => onBoatClick(boat.id));

      if (isActive) {
        map.setView([lat, lng], 14, { animate: true });
      }
    });
  }, [map, boats, activeBoatId]);

  return <div id="map" className="absolute inset-0 z-0" />;
}