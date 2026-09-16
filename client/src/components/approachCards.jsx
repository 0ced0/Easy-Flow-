import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMap } from 'react-leaflet'

const desktopCardOffsets = [
    [0.44, 0.38],
    [0.60, 0.42],
    [0.54, 0.66],
    [0.38, 0.62],
]

const mobileCardOffsets = [
    [0.48, 0.20],
    [0.78, 0.43],
    [0.52, 0.76],
    [0.20, 0.54],
]

const statusColors = {
    'FREE FLOW': 'text-green-600',
    SLOWDOWN: 'text-orange-400',
    CONGESTED: 'text-red-600',
}

function useLocalTrafficCountdown(trafficTiming) {
    const [timers, setTimers] = useState([])

    useEffect(() => {
        const approaches = trafficTiming?.approaches
        const clockOffset = trafficTiming?.clockOffset
        const serverTimestamp = trafficTiming?.serverTimestamp
        if (!Array.isArray(approaches) || !Number.isFinite(clockOffset)
            || !Number.isFinite(serverTimestamp)) {
            return undefined
        }

        const updateTimers = () => {
            const estimatedServerNow = Date.now() / 1000 + clockOffset
            const nextApproachTimers = approaches.map((approach) => Math.max(
                0,
                Math.ceil(
                    approach.remaining_seconds - (estimatedServerNow - serverTimestamp),
                ),
            ))
            setTimers((currentTimers) => (
                currentTimers.length === nextApproachTimers.length
                && currentTimers.every((timer, index) => timer === nextApproachTimers[index])
                    ? currentTimers
                    : nextApproachTimers
            ))
        }

        updateTimers()
        const intervalId = window.setInterval(updateTimers, 200)
        return () => window.clearInterval(intervalId)
    }, [trafficTiming])

    return timers
}

export default function ApproachCards({approachStates, trafficTiming, stolStatData, stopStatData, stocStatData, stosStatData}) {
    const map = useMap()
    const pane = map.getPane('overlayPane')
    const [, setMapVersion] = useState(0)
    const size = map.getSize()
    const cardOffsets = size.x < 768 ? mobileCardOffsets : desktopCardOffsets
    const positions = cardOffsets.map(([x, y]) => (
        map.containerPointToLatLng([size.x * x, size.y * y])
    ))
    const trafficLightRows = trafficTiming?.approaches ?? []
    const localTimers = useLocalTrafficCountdown(trafficTiming)
    const cards = [
        {label: 'Sambat to LSPU', data: stolStatData, position: 0, approachIndex: 0},
        {label: 'Sambat to Patimbao', data: stopStatData, position: 1, approachIndex: 1},
        {label: 'Sambat to Sunstar', data: stosStatData, position: 3, approachIndex: 3},
        {label: 'Sambat to Complex', data: stocStatData, position: 2, approachIndex: 2},
    ]

    useEffect(() => {
        const updateCardCoordinates = () => setMapVersion((version) => version + 1)
        map.on('zoomend', updateCardCoordinates)
        map.on('resize', updateCardCoordinates)

        return () => {
            map.off('zoomend', updateCardCoordinates)
            map.off('resize', updateCardCoordinates)
        }
    }, [map])

    if (!pane) return null

    return createPortal(
        <>
            {cards.map((card) => {
                const point = map.latLngToLayerPoint(positions[card.position])
                const timer = trafficLightRows.length ? (localTimers[card.approachIndex] ?? '--') : '--'
                const lightColor = trafficLightRows[card.approachIndex]?.state ?? '#A9A9A9'
                const condition = approachStates[card.approachIndex] ?? 'Unavailable'

                return (
                    <div key={card.label} style={{left: point.x, top: point.y, pointerEvents: 'auto'}} className="absolute -translate-x-1/2 -translate-y-1/2">
                        <div className="card grid grid-cols-2">
                            <div>
                                <p className="mb-[0.285rem] font-medium">{card.label}</p>
                                <p className="text-[0.3rem] text-[#A9A9A9] font-medium">{card.data?.vehicleFlow ?? 0}vh/hr</p>
                                <p className="text-[0.375rem]">Timer:</p>
                                <p className={`text-[0.3rem] font-medium ${statusColors[condition] ?? 'text-[#363636]'}`}>{condition}</p>
                            </div>
                            <div className="text-end">
                                <svg className="size-[0.5625rem] ml-auto" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <circle cx="12" cy="12" r="11" fill={lightColor} />
                                </svg>
                                <p className="pr-[0.1875rem] text-[0.3rem] text-[#A9A9A9] font-medium mt-[0.8625rem]">{card.data?.density ?? 0}vh/km</p>
                                <p className="pr-[0.1875rem] font-bold">{timer}</p>
                            </div>
                        </div>
                    </div>
                )
            })}
        </>,
        pane,
    )
}
