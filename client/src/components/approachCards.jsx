import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMap } from 'react-leaflet'

const cardOffsets = [
    [0.44, 0.38],
    [0.60, 0.42],
    [0.54, 0.66],
    [0.38, 0.62],
]

const statusColors = {
    'FREE FLOW': 'text-green-600',
    SLOWDOWN: 'text-orange-400',
    CONGESTED: 'text-red-600',
}

function useLocalTrafficCountdown(trafficTiming) {
    const [timers, setTimers] = useState({approaches: [], phase: null})

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
            const phaseRemaining = Number.isFinite(trafficTiming.phaseRemainingSeconds)
                ? Math.max(0, Math.ceil(trafficTiming.phaseRemainingSeconds - (estimatedServerNow - serverTimestamp)))
                : null
            setTimers((currentTimers) => (
                currentTimers.phase === phaseRemaining
                && currentTimers.approaches.length === nextApproachTimers.length
                && currentTimers.approaches.every((timer, index) => timer === nextApproachTimers[index])
                    ? currentTimers
                    : {approaches: nextApproachTimers, phase: phaseRemaining}
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
    const [positions] = useState(() => {
        const size = map.getSize()
        return cardOffsets.map(([x, y]) => map.containerPointToLatLng([size.x * x, size.y * y]))
    })
    const [, setMapVersion] = useState(0)
    const trafficLightRows = trafficTiming?.approaches ?? []
    const localTimers = useLocalTrafficCountdown(trafficTiming)
    const controllerPhase = trafficTiming?.controllerPhase
    const cards = [
        {label: 'Sambat to LSPU', data: stolStatData, position: 0},
        {label: 'Sambat to Patimbao', data: stopStatData, position: 1},
        {label: 'Sambat to Sunstar', data: stosStatData, position: 2},
        {label: 'Sambat to Complex', data: stocStatData, position: 3},
    ]

    useEffect(() => {
        const updateCardCoordinates = () => setMapVersion((version) => version + 1)
        map.on('zoomend', updateCardCoordinates)

        return () => map.off('zoomend', updateCardCoordinates)
    }, [map])

    if (!pane) return null

    return createPortal(
        <>
            {cards.map((card, index) => {
                const point = map.latLngToLayerPoint(positions[index])
                const timer = controllerPhase === 'all-red'
                    ? (localTimers.phase ?? '--')
                    : controllerPhase === 'yellow' && trafficLightRows[index]?.state === 'yellow'
                        ? (localTimers.phase ?? '--')
                        : trafficLightRows.length ? (localTimers.approaches[index] ?? '--') : '--'
                const lightColor = trafficLightRows[index]?.state ?? '#A9A9A9'
                const condition = approachStates[index] ?? 'Unavailable'

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
