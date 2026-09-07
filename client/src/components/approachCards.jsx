export default function ApproachCards({approachStates, trafficLightData, stolStatData, stopStatData, stocStatData, stosStatData}) {
    try{
        const timers = trafficLightData[0]?.map(row=>{return(row[1])})
        const colors = trafficLightData[0]?.map(row=>{return(row[0])})
        const colorSelection = {
            "FREE FLOW" : "text-green-600",
            "SLOWDOWN" : "text-orange-400",
            "CONGESTED" : "text-red-600"
        }

        // console.log("LSPU", stolStatData)
        // console.log("PATIMBAO", stopStatData)
        // console.log("COMPLEX", stocStatData)
        // console.log("SUNSTAR", stosStatData)
        return(
            <div className="absolute left-80 z-100 w-[50%] h-full">
                 {colors && (
                    <>
                    <div className="relative w-full h-full">

                    </div>
                    <div className="grid grid-cols-2 card absolute top-30 left-45">
                        <div>
                            <p className="mb-[0.38rem] font-medium">Sambat to LSPU</p>
                            <p className="text-[0.4rem] text-[#A9A9A9] font-medium">{stolStatData.vehicleFlow}vh/hr</p>
                            <p className="text-[0.5rem] ">Timer:</p>
                            <p className={`text-[0.4rem] font-medium ${colorSelection[approachStates[0]]}`}>{approachStates[0]}</p>
                        </div>
                        <div className="text-end">
                            <svg className="size-3 ml-auto" 
                            viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round">
                            </g><g id="SVGRepo_iconCarrier"> 
                            <circle cx="12" cy="12" r="11" fill={colors[0]}></circle> 
                            </g></svg>
                            <p className="pr-1 text-[0.4rem] text-[#A9A9A9] font-medium mt-[1.15rem]">{stolStatData.density}vh/km</p>
                            <p className="pr-1 font-bold">{timers[0]}</p>
                        </div>
                    </div>
                    <div className="card grid grid-cols-2 absolute top-45 right-45">
                        <div>
                            <p className="mb-[0.38rem] font-medium">Sambat to Patimbao</p>
                            <p className="text-[0.4rem] text-[#A9A9A9] font-medium">{stopStatData.vehicleFlow}vh/hr</p>
                            <p className="text-[0.5rem] ">Timer:</p>
                            <p className={`text-[0.4rem] font-medium ${colorSelection[approachStates[1]]}`}>{approachStates[1]}</p>
                        </div>
                        <div className="text-end">
                            <svg className="size-3 ml-auto" 
                            viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round">
                            </g><g id="SVGRepo_iconCarrier"> 
                            <circle cx="12" cy="12" r="11" fill={colors[1]}></circle> 
                            </g></svg>
                            <p className="pr-1 text-[0.4rem] text-[#A9A9A9] font-medium mt-[1.15rem]">{stopStatData.density}vh/km</p>
                            <p className="pr-1 font-bold">{timers[1]}</p>
                        </div>
                    </div>
                    <div className="card grid grid-cols-2 absolute bottom-38 right-55">
                        <div>
                            <p className="mb-[0.38rem] font-medium">Sambat to Complex</p>
                            <p className="text-[0.4rem] text-[#A9A9A9] font-medium">{stocStatData.vehicleFlow}vh/hr</p>
                            <p className="text-[0.5rem] ">Timer:</p>
                            <p className={`text-[0.4rem] font-medium ${colorSelection[approachStates[2]]}`}>{approachStates[2]}</p>
                        </div>
                        <div className="text-end">
                            <svg className="size-3 ml-auto" 
                            viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round">
                            </g><g id="SVGRepo_iconCarrier"> 
                            <circle cx="12" cy="12" r="11" fill={colors[2]}></circle> 
                            </g></svg>
                            <p className="pr-1 text-[0.4rem] text-[#A9A9A9] font-medium mt-[1.15rem]">{stocStatData.density}vh/km</p>
                            <p className="pr-1 font-bold">{timers[2]}</p>
                        </div>
                    </div>
                    <div className="card grid grid-cols-2 absolute bottom-55 left-35">
                        <div>
                            <p className="mb-[0.38rem] font-medium">Sambat to Sunstar</p>
                            <p className="text-[0.4rem] text-[#A9A9A9] font-medium">{stosStatData.vehicleFlow}vh/hr</p>
                            <p className="text-[0.5rem] ">Timer:</p>
                            <p className={`text-[0.4rem] font-medium ${colorSelection[approachStates[3]]}`}>{approachStates[3]}</p>
                        </div>
                        <div className="text-end">
                            <svg className="size-3 ml-auto" 
                            viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round">
                            </g><g id="SVGRepo_iconCarrier"> 
                            <circle cx="12" cy="12" r="11" fill={colors[3]}></circle> 
                            </g></svg>
                            <p className="pr-1 text-[0.4rem] text-[#A9A9A9] font-medium mt-[1.15rem]">{stosStatData.density}vh/km</p>
                            <p className="pr-1 font-bold">{timers[3]}</p>
                        </div>
                    </div>
                    </>
                 )}   
            </div>
        )
    }catch(error){
        console.error(error)
    }
}