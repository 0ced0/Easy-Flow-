import { useState } from 'react'
import "../styles/videoStream.css"

const cameras = [
    {id: 'stol', label: 'Sambat to LSPU', stream: 'stol_stream_video'},
    {id: 'stos', label: 'Sambat to Sunstar', stream: 'stos_stream_video'},
    {id: 'stop', label: 'Sambat to Patimbao', stream: 'stop_stream_video'},
    {id: 'stoc', label: 'Sambat to Complex', stream: 'stoc_stream_video'},
]

export const VideoStream = () => {
    const [selectedCameraId, setSelectedCameraId] = useState('stol')
    const selectedCamera = cameras.find((camera) => camera.id === selectedCameraId) ?? cameras[0]
    const thumbnailCameras = cameras.filter((camera) => camera.id !== selectedCamera.id)

    return (
        <section className="hidden md:grid grid-rows-[1.3fr_0.7fr] absolute p-0.5 bg-black/70 top-0 right-0 z-300 shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] md:w-[clamp(14rem,20vw,24rem)] md:aspect-[4/3]" aria-label="CCTV camera feeds">
            <div className="relative min-h-0 min-w-0 overflow-hidden">
                <img src={`http://127.0.0.1:5000/${selectedCamera.stream}`} alt={`${selectedCamera.label} live camera`} className="h-full w-full object-cover" />
                <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white">{selectedCamera.label}</span>
            </div>
            <div className="grid grid-cols-3 min-h-0 min-w-0 gap-0 overflow-hidden">
                {thumbnailCameras.map((camera) => (
                    <button key={camera.id} type="button" onClick={() => setSelectedCameraId(camera.id)} className="relative min-h-0 min-w-0 overflow-hidden text-left focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-400" aria-label={`Focus ${camera.label} camera`}>
                        <img src={`http://127.0.0.1:5000/${camera.stream}`} alt="" className="h-full w-full min-w-0 object-cover" />
                        <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-[0.55rem] leading-tight text-white">{camera.label}</span>
                    </button>
                ))}
            </div>
        </section>
    )
}
