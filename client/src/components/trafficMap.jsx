import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function MapResizeHandler() {
    const map = useMap();

    useEffect(() => {
        const mapElement = map.getContainer();
        const observedElement = mapElement.parentElement || mapElement;
        let animationFrame;

        const resizeObserver = new ResizeObserver(() => {
            cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(() => map.invalidateSize());
        });

        resizeObserver.observe(observedElement);
        map.invalidateSize();

        return () => {
            cancelAnimationFrame(animationFrame);
            resizeObserver.disconnect();
        };
    }, [map]);

    return null;
}

export default function TrafficMap({children}) {

    const sambatPosition = [14.259, 121.398];

    return (
        <div className="trafficMapContainer">

                <MapContainer
                center={sambatPosition}
                zoom={18}
                className="trafficMap"
            >
                    <MapResizeHandler />
                    <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {children}
                </MapContainer>

        </div>
    );
}
