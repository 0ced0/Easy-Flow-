import {useState, useEffect} from 'react'

export default function SummaryCard ({currentSummaryData, flowConfiguration, densityConfiguration, isLoading}) {
    const [trafficState, setTrafficState] = useState([])

    const stateColor = {
        "FREE FLOW" : "text-[#16835e]",
        "SLOWDOWN" : "text-amber-700",
        "CONGESTED" : "text-red-700"
    }

    useEffect(() => {
        const checkState = (averageFlow, averageDensity, flowConfig, densityConfig) => {
            let state = null
            if (averageDensity <= densityConfig.freeflow_max){
                state = "FREE FLOW"
            }
            else if(averageDensity > densityConfig.freeflow_max
                && averageDensity <= densityConfig.slowdown_max){
                    state = "SLOWDOWN"
            }
            else if(averageDensity > densityConfig.slowdown_max){
                state = "CONGESTED"
            }

            return state
        }

        if(currentSummaryData && flowConfiguration && densityConfiguration){
            setTrafficState([
                {"approach" : 1,
                    "state" : checkState(currentSummaryData.lspuAverageFlow, 
                        currentSummaryData.lspuAverageDensity, 
                        flowConfiguration[0], 
                        densityConfiguration[0])},
                {"approach" : 2,
                    "state" : checkState(currentSummaryData.patimbaoAverageFlow, 
                        currentSummaryData.patimbaoAverageDensity, 
                        flowConfiguration[1], 
                        densityConfiguration[1])},
                {"approach" : 3,
                    "state" : checkState(currentSummaryData.sunstarAverageFlow, 
                        currentSummaryData.sunstarAverageDensity, 
                        flowConfiguration[2], 
                        densityConfiguration[2])},
                {"approach" : 4,
                    "state" : checkState(currentSummaryData.complexAverageFlow, 
                        currentSummaryData.complexAverageDensity, 
                        flowConfiguration[3], 
                        densityConfiguration[3])},
            ])
        }
    }, [currentSummaryData, flowConfiguration, densityConfiguration])

    if (isLoading) {
        return (
            <div className="relative h-auto lg:h-full min-h-48 lg:min-h-0 min-w-0 rounded-lg bg-[#f9fcff] p-1 animate-pulse">
                <div className="h-8 rounded-md bg-[#e6eff6]"></div>
                <div className="mt-1 flex-1 rounded-md bg-[#f2f7fb] p-3 space-y-3">
                    {[1, 2, 3, 4].map((row) => <div key={row} className="h-3 rounded bg-[#e6eff6]"></div>)}
                </div>
            </div>
        )
    }

    return(
    <div className="relative h-auto lg:h-full min-h-48 lg:min-h-0 min-w-0 overflow-hidden rounded-lg bg-[#f9fcff] shadow-[0_8px_20px_rgba(28,72,109,0.1)]">
        <div className="inset-0 absolute flex flex-col p-[0.5625rem] lg:p-[0.375rem] space-y-[0.28125rem] min-w-0">
            <div className="rounded-md border border-[#cfdeea] bg-[#f2f7fb]">
                <p className="p-[0.5625rem] lg:p-[0.375rem] font-medium text-[0.75rem] sm:text-[0.75rem] text-[#17324c]">Average Traffic Summary</p>
            </div>
            <div className="rounded-md border border-[#cfdeea] bg-[#f2f7fb] flex-1 min-h-0">
                <div className="grid grid-cols-4 gap-[0.1875rem] items-center border-b border-[#cfdeea] py-[0.375rem] text-center">
                    <p className="summaryHeader text-[0.4125rem] sm:text-[0.525rem]">Approach</p>
                    <p className="summaryHeader text-[0.4125rem] sm:text-[0.525rem]">Flow</p>
                    <p className="summaryHeader text-[0.4125rem] sm:text-[0.525rem]">Density</p>
                    <p className="summaryHeader text-[0.4125rem] sm:text-[0.525rem]">State</p>
                </div>
                {Object.keys(currentSummaryData).length > 0 ? 
                    <div className="grid grid-cols-4 gap-1 h-[90%] pb-[0.375rem]">
                        {/* SUMMARY APPROACH */}
                        <div className="summaryContent pl-[0.9375rem] sm:pl-[2.0625rem] md:ml-0 md:pl-[0.375rem] sm:pl-[0.9375rem] space-y-[3vw] md:space-y-1.5 pt-[0.375rem] lg:pb-[0.6rem] text-[0.4125rem] sm:text-[0.45rem] leading-tight lg:flex lg:flex-col lg:justify-between lg:space-y-0">
                            <p>Sambat to LSPU</p>
                            <p>Sambat to Patimbao</p>
                            <p>Sambat to Complex</p>
                            <p>Sambat to Sunstar</p>
                            </div>

                        {/* SUMMARY FLOW */}
                        <div className="summaryContent space-y-[1.125rem] pt-[0.375rem] lg:pb-[0.6rem] text-center md:text-end sm:pr-3 text-[0.4125rem] sm:text-[0.45rem] lg:flex lg:flex-col lg:justify-between lg:space-y-0">
                            <p>{currentSummaryData.lspuAverageFlow}vh/hr</p>
                            <p>{currentSummaryData.patimbaoAverageFlow}vh/vr</p>
                            <p>{currentSummaryData.complexAverageFlow}vh/vr</p>
                            <p>{currentSummaryData.sunstarAverageFlow}vh/vr</p>
                        </div>

                        {/* SUMMARY DENSITY */}
                        <div className="summaryContent space-y-[1.125rem] pt-[0.375rem] lg:pb-[0.6rem] text-center md:text-end sm:pr-3 text-[0.4125rem] sm:text-[0.45rem] lg:flex lg:flex-col lg:justify-between lg:space-y-0">
                            <p>{currentSummaryData.lspuAverageDensity}vh/km</p>
                            <p>{currentSummaryData.patimbaoAverageDensity}vh/km</p>
                            <p>{currentSummaryData.complexAverageDensity}vh/km</p>
                            <p>{currentSummaryData.sunstarAverageDensity}vh/km</p>
                        </div>
                    
                        {/* SUMMARY TRAFFIC STATE */}
                        <div className="text-[0.375rem] sm:text-[0.45rem] font-bold space-y-[1.125rem] pt-[0.375rem] lg:pb-[0.6rem] text-center md:text-end sm:pr-3 lg:flex lg:flex-col lg:justify-between lg:space-y-0">
                            <p className={`${stateColor[trafficState[0]?.state]}`}>{trafficState[0]?.state}</p>
                            <p className={`${stateColor[trafficState[1]?.state]}`}>{trafficState[1]?.state}</p>
                            <p className={`${stateColor[trafficState[3]?.state]}`}>{trafficState[3]?.state}</p>
                            <p className={`${stateColor[trafficState[2]?.state]}`}>{trafficState[2]?.state}</p>
                        </div>
                    </div>
                : <p className="h-[90%] flex items-center justify-center">No Available Data</p>}
                
            </div>
        </div>
    </div>
    )
}
