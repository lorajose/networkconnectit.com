"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

type SiteLocationMapClientProps = {
  coordinates: [number, number];
  title: string;
  location: string;
};

export default function SiteLocationMapClient({
  coordinates,
  title,
  location
}: SiteLocationMapClientProps) {
  return (
    <div className="h-[320px] w-full">
      <MapContainer
        center={coordinates}
        zoom={11}
        scrollWheelZoom={false}
        className="h-full w-full rounded-[1.5rem]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={coordinates}>
          <Popup>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              <p className="text-xs text-slate-600">{location}</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
