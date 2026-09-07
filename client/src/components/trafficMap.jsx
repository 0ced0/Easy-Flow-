import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function TrafficMap() {

    const sambatPosition = [14.259, 121.398];

    return (
        <div className="trafficMapContainer">

            <MapContainer
                center={sambatPosition}
                zoom={18}
                className="trafficMap"
            >
                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
            </MapContainer>

        </div>
    );
}