import {useEffect, useState} from 'react'
import {getViolationEvidence} from '../hooks/api.js'

const approaches = ['Sambat to LSPU', 'Sambat to Patimbao', 'Sambat to Sunstar', 'Sambat to Complex']

function violationDetail(type) {
    return type === 2
        ? {label: 'Illegal parking', color: 'text-red-300', mark: '!'}
        : {label: 'Loading / unloading', color: 'text-amber-300', mark: '▲'}
}

export default function ViolationDataDisplay({violationDisplay, isLoading, compact = false}) {
    const [evidence, setEvidence] = useState({violationId: null, frame: null})
    const violationId = violationDisplay?.id

    useEffect(() => {
        if (!violationId) return undefined
        const controller = new AbortController()
        let active = true
        getViolationEvidence(violationId, controller.signal)
            .then((response) => response?.ok ? response.json() : null)
            .then((nextEvidence) => {
                if (active) setEvidence({violationId, frame: nextEvidence?.frame ?? null})
            })
            .catch((error) => {
                if (error.name !== 'AbortError') console.error(error)
                if (active) setEvidence({violationId, frame: null})
            })
        return () => {
            active = false
            controller.abort()
        }
    }, [violationId])

    const frame = evidence.violationId === violationId ? evidence.frame : null
    const isEvidenceLoading = Boolean(violationId) && evidence.violationId !== violationId

    if (isLoading || isEvidenceLoading) {
        return (
            <div className={`${compact ? 'h-auto min-h-48' : 'h-full min-h-0'} min-w-0 space-y-1 bg-[#f9fcff] p-1 animate-pulse`}>
                <div className="h-8 rounded-md bg-[#e6eff6]" />
                <div className="h-[calc(100%-2.25rem)] rounded-md bg-[#f2f7fb]" />
            </div>
        )
    }

    if (!violationDisplay) {
        return (
            <div className={`flex ${compact ? 'min-h-48' : 'h-full min-h-0'} flex-col items-center justify-center bg-[#f9fcff] px-4 text-center`}>
                <span className="grid size-8 place-items-center rounded-full bg-[#edf4f9] text-[#54708a]">!</span>
                <p className="mt-2 text-[0.65rem] font-medium text-[#17324c]">No alert selected</p>
                <p className="mt-1 text-[0.55rem] leading-relaxed text-[#54708a]">Choose an alert to review its evidence.</p>
            </div>
        )
    }

    const detail = violationDetail(violationDisplay.violation_type)
    const approach = approaches[violationDisplay.camera_id - 1] ?? `Camera ${violationDisplay.camera_id}`

    return (
        <article className={`flex ${compact ? 'h-auto' : 'h-full min-h-0'} min-w-0 flex-col overflow-hidden rounded-md bg-[#f9fcff] text-[#17324c] shadow-[0_8px_20px_rgba(28,72,109,0.1)]`} aria-label="Violation evidence">
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[#cfdeea] px-2 py-1.5">
                <div className="min-w-0">
                    <p className="truncate text-[0.65rem] font-semibold">{violationDisplay.vehicle || 'Unknown vehicle'}</p>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-[#edf4f9] px-1.5 py-0.5 text-[0.45rem] font-medium ${detail.color}`}>
                    <span className="font-bold" aria-hidden="true">{detail.mark}</span>
                    {detail.label}
                </span>
            </header>

            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#cfdeea] px-2 py-1 text-[0.48rem] text-[#54708a]">
                <p className="min-w-0 truncate">{approach}</p>
                <p className="shrink-0 text-[#214766]">{violationDisplay.time_stamp || '—'}</p>
            </div>

            <div className={compact ? 'mx-2 mb-2 mt-2 flex h-52 shrink-0 items-center justify-center rounded-sm bg-[#edf4f9] p-1 lg:h-64' : 'flex min-h-0 flex-1 items-center justify-center bg-[#edf4f9] p-1'}>
                {frame ? (
                    <img src={`data:image/jpeg;base64,${frame}`} alt={`Evidence for ${detail.label}`} className={compact ? 'h-full w-full rounded-sm object-contain' : 'h-full w-full rounded-sm object-cover'} />
                ) : (
                    <p className="text-center text-[0.6rem] text-[#54708a]">Evidence is not available for this alert.</p>
                )}
            </div>
        </article>
    )
}
