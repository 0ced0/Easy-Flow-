import {useState, useEffect} from 'react'

export default function SummaryCard ({currentSummaryData, flowConfiguration, densityConfiguration}) {
    const [trafficState, setTrafficState] = useState([])

    const stateColor = {
        "FREE FLOW" : "text-green-500",
        "SLOWDOWN" : "text-orange-500",
        "CONGESTED" : "text-red-500"
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

    return(
    <div className="relative h-auto lg:h-full min-h-64 lg:min-h-0 z-10 overflow-hidden">
        {/* BACKGROUND */}
        <div className="absolute z-50 bg-[#0000FF]/10 inset-0"></div>
        <div className="inset-0 absolute z-100 flex flex-col p-3 lg:p-2 space-y-1.5 min-w-0">
            <div className="bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)]">
                <p className="p-3 lg:p-2 font-medium text-sm sm:text-base text-[#363636]">Average Traffic Summary</p>
            </div>
            <div className="bg-white flex-1 min-h-0 shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)]">
                <div className="grid grid-cols-4 gap-1 items-center pt-2 text-center">
                    <p className="summaryHeader text-[0.55rem] sm:text-[0.7rem]">Approach</p>
                    <p className="summaryHeader text-[0.55rem] sm:text-[0.7rem]">Flow</p>
                    <p className="summaryHeader text-[0.55rem] sm:text-[0.7rem]">Density</p>
                    <p className="summaryHeader text-[0.55rem] sm:text-[0.7rem]">State</p>
                </div>
                {Object.keys(currentSummaryData).length > 0 ? 
                    <div className="grid grid-cols-4 gap-1 h-[90%]">
                        {/* SUMMARY APPROACH */}
                        <div className="summaryContent pl-5 sm:pl-11 md:ml-0 md:pl-2 sm:pl-5 space-y-[4vw] md:space-y-2 pt-2 lg:pb-[0.8rem] text-[0.55rem] sm:text-[0.6rem] leading-tight lg:flex lg:flex-col lg:justify-between lg:space-y-0">
                            <p>Sambat to LSPU</p>
                            <p>Sambat to Patimbao</p>
                            <p>Sambat to Complex</p>
                            <p>Sambat to Sunstar</p>
                            </div>

                        {/* SUMMARY FLOW */}
                        <div className="summaryContent space-y-6 pt-2 lg:pb-[0.8rem] text-center md:text-end sm:pr-4 text-[0.55rem] sm:text-[0.6rem] lg:flex lg:flex-col lg:justify-between lg:space-y-0">
                            <p>{currentSummaryData.lspuAverageFlow}vh/hr</p>
                            <p>{currentSummaryData.patimbaoAverageFlow}vh/vr</p>
                            <p>{currentSummaryData.complexAverageFlow}vh/vr</p>
                            <p>{currentSummaryData.sunstarAverageFlow}vh/vr</p>
                        </div>

                        {/* SUMMARY DENSITY */}
                        <div className="summaryContent space-y-6 pt-2 lg:pb-[0.8rem] text-center md:text-end sm:pr-4 text-[0.55rem] sm:text-[0.6rem] lg:flex lg:flex-col lg:justify-between lg:space-y-0">
                            <p>{currentSummaryData.lspuAverageDensity}vh/km</p>
                            <p>{currentSummaryData.patimbaoAverageDensity}vh/km</p>
                            <p>{currentSummaryData.complexAverageDensity}vh/km</p>
                            <p>{currentSummaryData.sunstarAverageDensity}vh/km</p>
                        </div>
                    
                        {/* SUMMARY TRAFFIC STATE */}
                        <div className="text-[0.5rem] sm:text-[0.6rem] font-bold space-y-6 pt-2 lg:pb-[0.8rem] text-center md:text-end sm:pr-4 lg:flex lg:flex-col lg:justify-between lg:space-y-0">
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
