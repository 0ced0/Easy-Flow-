import {useEffect, useState} from 'react'
import {getViolationEvidence} from '../hooks/api.js'

export default function ViolationDataDisplay({violationDisplay, isLoading}) {
    const [evidence, setEvidence] = useState({ violationId: null, frame: null })
    const violationId = violationDisplay?.id

    useEffect(() => {
        if (!violationId) return undefined
        const controller = new AbortController()
        let active = true
        getViolationEvidence(violationId, controller.signal)
            .then((response) => response?.ok ? response.json() : null)
            .then((evidence) => {
                if (active) setEvidence({ violationId, frame: evidence?.frame ?? null })
            })
            .catch((error) => {
                if (error.name !== 'AbortError') console.error(error)
                if (active) setEvidence({ violationId, frame: null })
            })
        return () => {
            active = false
            controller.abort()
        }
    }, [violationId])

    const approach=["Sambat to LSPU", "Sambat to Patimbao", "Sambat to SunStar", "Sambat to Complex"]
    const violations=["Illegal Loading/Unloading", "Illegal Parking"]
    const frame = evidence.violationId === violationId ? evidence.frame : null
    const isEvidenceLoading = Boolean(violationId) && evidence.violationId !== violationId

    if (isLoading || isEvidenceLoading) {
        return (
            <div className="h-full min-h-0 min-w-0 p-2 animate-pulse">
                <div className="h-8 rounded bg-slate-200/70"></div>
                <div className="mt-2 h-[calc(100%-2.5rem)] rounded bg-slate-200/50"></div>
            </div>
        )
    }

    return(
            <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
                <div className="flex shrink-0 justify-between px-1.5 border-b border-[#D3D3D3] min-h-9">
                    <div className="mt-[0.1875rem]">
                    <p className="text-[0.525rem]">{violationDisplay?.vehicle}</p>
                    <p className="text-[0.45rem] font-bold">{approach[(violationDisplay?.camera_id) - 1]}</p>
                    </div>                 
                    <div className="text-end mt-[0.1875rem]">
                    <p className="text-[0.525rem]">{violationDisplay?.time_stamp}</p>
                    <p className="text-[0.45rem] font-bold">{violations[(violationDisplay?.violation_type - 1)]}</p>
                    </div>
                </div>
                {frame && (
                    <div className="shrink-0 min-w-0">
                        <img
                            src={`data:image/jpeg;base64,${frame}`}
                            className="block w-full h-auto max-w-full object-contain"
                        />
                    </div>
                )}
            </div>
    )
}
