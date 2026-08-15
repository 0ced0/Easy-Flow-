import "../styles/trafficLightControls.css"

export default function TrafficLightControls({setShowTrafficLightControls}) {
    const [timerData, setTimerData] = useState([])

    try{
        return(
            <div className="popUpRoot">
                <div className="popUpBackground "></div>
                <div className="popUpContainerTLC">
                    <div className="flex border-b pb-3 px-5 w-full border-[#D9D9D9]">
                        <h1 className="opacity-[80%]">Traffic Light Timers Control</h1>
                        {/* <button onClick={() => {setShowTrafficLightControls(false)}} className="ml-auto mr-4">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8 hover:stroke-red-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </button> */}
                    </div>
                    <div className="h-[90%] w-full grid grid-cols-2 auto-rows-[minmax(0,330px)] space-x-4 space-y-4 p-3 ml-2">
                        <div className="">
                            <h3 className="boxExternalLabels">Maximum Density Threshold</h3>
                            <div className="border flex justify-around h-[95%] items-center">
                                <div className="flex flex-col gap-7 items-start">
                                    <h3 className="boxInternalLabels mr-5">Road</h3>
                                    <h3 className="roads">Sambat to LSPU</h3>
                                    <h3 className="roads">Sambat to Patimbao</h3>
                                    <h3 className="roads">Sambat to Complex</h3>
                                    <h3 className="roads">Sambat to Sunstar</h3>
                                </div>
                                <div className="flex flex-col gap-7 items-center">
                                    <h3 className="boxInternalLabels">Free Flow Max</h3>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                </div>
                                <div className="flex flex-col gap-7 items-center">
                                    <h3 className="boxInternalLabels">Slowing Down Max</h3>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                </div>
                            </div>

                            
                        </div>
                        <div className="">
                            <h3 className="boxExternalLabels">Maximum Flow Threshold</h3>
                            <div className="border flex justify-around h-[95%] items-center">
                                <div className="flex flex-col gap-7 items-start">
                                    <h3 className="boxInternalLabels mr-5">Road</h3>
                                    <h3 className="roads">Sambat to LSPU</h3>
                                    <h3 className="roads">Sambat to Patimbao</h3>
                                    <h3 className="roads">Sambat to Complex</h3>
                                    <h3 className="roads">Sambat to Sunstar</h3>
                                </div>
                                <div className="flex flex-col gap-7 items-center">
                                    <h3 className="boxInternalLabels">Free Flow Max</h3>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                </div>
                                <div className="flex flex-col gap-7 items-center">
                                    <h3 className="boxInternalLabels">Slowing Down Max</h3>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                </div>
                            </div>
                        </div>
                        <div className="">
                            <h3 className="boxExternalLabels">Timers</h3>
                            <div className="border flex justify-around h-[95%] items-center">
                                <div className="flex-1 flex flex-col gap-7 items-start pl-4">
                                    <h3 className="boxInternalLabels mr-5">Road</h3>
                                    <h3 className="roads">Sambat to LSPU</h3>
                                    <h3 className="roads">Sambat to Patimbao</h3>
                                    <h3 className="roads">Sambat to Complex</h3>
                                    <h3 className="roads">Sambat to Sunstar</h3>
                                </div>
                                <div className="flex-1 flex flex-col gap-7 items-center">
                                    <h3 className="boxInternalLabels">Free Flow</h3>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                </div>
                                <div className="flex flex-1 flex-col gap-7 items-center">
                                    <h3 className="boxInternalLabels">Slowing Down</h3>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                </div>
                                <div className="flex flex-1 flex-col gap-7 items-center">
                                    <h3 className="boxInternalLabels">congested</h3>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                    <input type="number"></input>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end px-10 py-3 items-end gap-5">
                            <button onClick={() => {setShowTrafficLightControls(false)}}className="px-5 py-2 border hover:bg-black/20">CLOSE</button>
                            <button onClick={() => {setShowTrafficLightControls(false)}} className="px-5 py-2 border hover:bg-blue-700/20">SAVE</button>
                        </div>                        
                    </div>
                </div>
            </div>
        )
    }catch(error){
        console.error(error)
    }
}