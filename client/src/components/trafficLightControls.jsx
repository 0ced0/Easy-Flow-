import "../styles/trafficLightControls.css"
import {postTrafficTimersConfig, postDensityConfig, postFlowConfig} from "../hooks/api"
import {useState} from 'react'

export default function TrafficLightControls({
    setShowTrafficLightControls,
    timerConfiguration,
    densityConfiguration,
    flowConfiguration}) 
    {
    try{
        const [currentTimerConfiguration, setCurrentTimerConfiguration] = useState([
        {
            approach_id: 1,
            approach_name: "Sambat - LSPU",
            freeflow: timerConfiguration.freeflow[0],
            slowdown: timerConfiguration.slowdown[0],
            congested: timerConfiguration.congested[0]
        },

        {
            approach_id: 2,
            approach_name: "Sambat - Patimbao",
            freeflow: timerConfiguration.freeflow[1],
            slowdown: timerConfiguration.slowdown[1],
            congested: timerConfiguration.congested[1]
        },

        {
            approach_id: 3,
            approach_name: "Sambat - Sunstar",
            freeflow: timerConfiguration.freeflow[2],
            slowdown: timerConfiguration.slowdown[2],
            congested: timerConfiguration.congested[2]
        },

        {
            approach_id: 4,
            approach_name: "Sambat - Complex",
            freeflow: timerConfiguration.freeflow[3],
            slowdown: timerConfiguration.slowdown[3],
            congested: timerConfiguration.congested[3]
        }
        ])

        const [currentDensityConfig, setCurrentDensityConfig] = useState([
            {
                "approach_id": 1,
                "approach_name": "Sambat - LSPU",
                "freeflow_max": densityConfiguration[0].freeflow_max,
                "slowdown_max": densityConfiguration[0].slowdown_max
            },
            {
                "approach_id": 2,
                "approach_name": "Sambat - Patimbao",
                "freeflow_max": densityConfiguration[1].freeflow_max,
                "slowdown_max": densityConfiguration[1].slowdown_max
            },
            {
                "approach_id": 3,
                "approach_name": "Sambat - Sunstar",
                "freeflow_max": densityConfiguration[2].freeflow_max,
                "slowdown_max": densityConfiguration[2].slowdown_max
            },
            {
                "approach_id": 4,
                "approach_name": "Sambat - Complex",
                "freeflow_max": densityConfiguration[3].freeflow_max,
                "slowdown_max": densityConfiguration[3].slowdown_max
            }
        ])

        const [currentFlowConfig, setCurrentFlowConfig] = useState([
            {
                "approach_id": 1,
                "approach_name": "Sambat - LSPU",
                "freeflow_max": flowConfiguration[0].freeflow_max,
                "slowdown_max": flowConfiguration[0].slowdown_max
            },
            {
                "approach_id": 2,
                "approach_name": "Sambat - Patimbao",
                "freeflow_max": flowConfiguration[1].freeflow_max,
                "slowdown_max": flowConfiguration[1].slowdown_max
            },
            {
                "approach_id": 3,
                "approach_name": "Sambat - Sunstar",
                "freeflow_max": flowConfiguration[2].freeflow,
                "slowdown_max": flowConfiguration[2].slowdown_max
            },
            {
                "approach_id": 4,
                "approach_name": "Sambat - Complex",
                "freeflow_max": flowConfiguration[3].freeflow_max,
                "slowdown_max": flowConfiguration[3].slowdown_max
            }
        ])

        const handleSave = async () => {
            try{
                const timerResponse = await postTrafficTimersConfig(currentTimerConfiguration)
                const densityResponse = await postDensityConfig(currentDensityConfig)
                const flowResponse = await postFlowConfig(currentFlowConfig)
                const flowData = await flowResponse.json()

                console.log(flowData)
            }catch(error){
                console.error(error)
            }
        }

        function handleTimerChange (event, approach, state) {
            const update = [...currentTimerConfiguration]

            update[approach] = {
                ...update[approach],
                [state]: Number(event.target.value)
            }

            setCurrentTimerConfiguration(update)
        }
        
        function handleDensityConfigChange (event, approach, state) {
            const update = [...currentDensityConfig]

            update[approach] = {
                ...update[approach],
                [state]: Number(event.target.value)
            }

            setCurrentDensityConfig(update)
        }

        function handleFlowConfigChange (event, approach, state) {
            const update = [...currentFlowConfig]

            update[approach] = {
                ...update[approach],
                [state]: Number(event.target.value)
            }

            setCurrentFlowConfig(update)
        }

        // console.log(timerConfiguration.freeflow[0])
    
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
                            <div className="shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded flex justify-around h-[95%] items-center">
                                <div className="flex flex-col gap-7 items-start">
                                    <h3 className="boxInternalLabels mr-5">Road</h3>
                                    <h3 className="roads">Sambat to LSPU</h3>
                                    <h3 className="roads">Sambat to Patimbao</h3>
                                    <h3 className="roads">Sambat to Complex</h3>
                                    <h3 className="roads">Sambat to Sunstar</h3>
                                </div>
                                <div className="flex flex-col gap-7 items-center">
                                    <h3 className="boxInternalLabels">Free Flow Max</h3>
                                    <input className="tlcInput" type="number" onChange={(event) => {handleDensityConfigChange(event, 0, "freeflow_max")}} defaultValue={densityConfiguration[0].freeflow_max}></input>
                                    <input className="tlcInput" type="number" onChange={(event) => {handleDensityConfigChange(event, 1, "freeflow_max")}} defaultValue={densityConfiguration[1].freeflow_max}></input>
                                    <input className="tlcInput" type="number" onChange={(event) => {handleDensityConfigChange(event, 2, "freeflow_max")}} defaultValue={densityConfiguration[2].freeflow_max}></input>
                                    <input className="tlcInput" type="number" onChange={(event) => {handleDensityConfigChange(event, 3, "freeflow_max")}} defaultValue={densityConfiguration[3].freeflow_max}></input>
                                </div>
                                <div className="flex flex-col gap-7 items-center">
                                    <h3 className="boxInternalLabels">Slowing Down Max</h3>
                                    <input className="tlcInput" type="number" onChange={(event) => {handleDensityConfigChange(event, 0, "slowdown_max")}} defaultValue={densityConfiguration[0].slowdown_max}></input>
                                    <input className="tlcInput" type="number" onChange={(event) => {handleDensityConfigChange(event, 1, "slowdown_max")}} defaultValue={densityConfiguration[1].slowdown_max}></input>
                                    <input className="tlcInput" type="number" onChange={(event) => {handleDensityConfigChange(event, 2, "slowdown_max")}} defaultValue={densityConfiguration[2].slowdown_max}></input>
                                    <input className="tlcInput" type="number" onChange={(event) => {handleDensityConfigChange(event, 3, "slowdown_max")}} defaultValue={densityConfiguration[3].slowdown_max}></input>
                                </div>
                            </div>

                            
                        </div>
                        <div className="">
                            <h3 className="boxExternalLabels">Maximum Flow Threshold</h3>
                            <div className="shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded flex justify-around h-[95%] items-center">
                                <div className="flex flex-col gap-7 items-start">
                                    <h3 className="boxInternalLabels mr-5">Road</h3>
                                    <h3 className="roads">Sambat to LSPU</h3>
                                    <h3 className="roads">Sambat to Patimbao</h3>
                                    <h3 className="roads">Sambat to Complex</h3>
                                    <h3 className="roads">Sambat to Sunstar</h3>
                                </div>
                                <div className="flex flex-col gap-7 items-center">
                                    <h3 className="boxInternalLabels">Free Flow Max</h3>
                                    <input className="tlcInput" type="number" onChange={(event) => handleFlowConfigChange(event, 0, "freeflow_max")} defaultValue={flowConfiguration[0].freeflow_max}></input>
                                    <input className="tlcInput" type="number" onChange={(event) => handleFlowConfigChange(event, 1, "freeflow_max")} defaultValue={flowConfiguration[1].freeflow_max}></input>
                                    <input className="tlcInput" type="number" onChange={(event) => handleFlowConfigChange(event, 2, "freeflow_max")} defaultValue={flowConfiguration[2].freeflow_max}></input>
                                    <input className="tlcInput" type="number" onChange={(event) => handleFlowConfigChange(event, 3, "freeflow_max")} defaultValue={flowConfiguration[3].freeflow_max}></input>
                                </div>
                                <div className="flex flex-col gap-7 items-center">
                                    <h3 className="boxInternalLabels">Slowing Down Max</h3>
                                    <input className="tlcInput" type="number" onChange={(event) => handleFlowConfigChange(event, 0, "slowdown_max")} defaultValue={flowConfiguration[0].slowdown_max}></input>
                                    <input className="tlcInput" type="number" onChange={(event) => handleFlowConfigChange(event, 1, "slowdown_max")} defaultValue={flowConfiguration[1].slowdown_max}></input>
                                    <input className="tlcInput" type="number" onChange={(event) => handleFlowConfigChange(event, 2, "slowdown_max")} defaultValue={flowConfiguration[2].slowdown_max}></input>
                                    <input className="tlcInput" type="number" onChange={(event) => handleFlowConfigChange(event, 3, "slowdown_max")} defaultValue={flowConfiguration[3].slowdown_max}></input>
                                </div>
                            </div>
                        </div>
                        <div className="">
                            <h3 className="boxExternalLabels">Timers</h3>
                            <div className="rounded shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] flex justify-around h-[95%] items-center">
                                <div className="flex-1 flex flex-col gap-7 items-start pl-4">
                                    <h3 className="boxInternalLabels mr-5">Road</h3>
                                    <h3 className="roads">Sambat to LSPU</h3>
                                    <h3 className="roads">Sambat to Patimbao</h3>
                                    <h3 className="roads">Sambat to Complex</h3>
                                    <h3 className="roads">Sambat to Sunstar</h3>
                                </div>
                                <div className="flex-1 flex flex-col gap-7 items-center">
                                    <h3 className="boxInternalLabels">Free Flow</h3>
                                    <input className="tlcInput" type="number" onChange={(event) => {handleTimerChange(event, 0, "freeflow")}} defaultValue={timerConfiguration.freeflow[0]}></input>
                                    <input className="tlcInput" type="number" onChange={(event) => {handleTimerChange(event, 1, "freeflow")}} defaultValue={timerConfiguration.freeflow[1]}></input>
                                    <input className="tlcInput" type="number" onChange={(event) => {handleTimerChange(event, 3, "freeflow")}} defaultValue={timerConfiguration.freeflow[2]}></input>
                                    <input className="tlcInput" type="number" onChange={(event) => {handleTimerChange(event, 2, "freeflow")}} defaultValue={timerConfiguration.freeflow[3]}></input>
                                </div>
                                <div className="flex flex-1 flex-col gap-7 items-center">
                                    <h3 className="boxInternalLabels">Slowing Down</h3>
                                    <input className="tlcInput" type="number" defaultValue={timerConfiguration.slowdown[0]}></input>
                                    <input className="tlcInput" type="number" defaultValue={timerConfiguration.slowdown[1]}></input>
                                    <input className="tlcInput" type="number" defaultValue={timerConfiguration.slowdown[2]}></input>
                                    <input className="tlcInput" type="number" defaultValue={timerConfiguration.slowdown[3]}></input>
                                </div>
                                <div className="flex flex-1 flex-col gap-7 items-center">
                                    <h3 className="boxInternalLabels">congested</h3>
                                    <input className="tlcInput" type="number" defaultValue={timerConfiguration.congested[0]}></input>
                                    <input className="tlcInput" type="number" defaultValue={timerConfiguration.congested[1]}></input>
                                    <input className="tlcInput" type="number" defaultValue={timerConfiguration.congested[2]}></input>
                                    <input className="tlcInput" type="number" defaultValue={timerConfiguration.congested[3]}></input>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end px-10 py-3 items-end gap-5">
                            <button onClick={() => {setShowTrafficLightControls(false)}}className="px-5 py-2 rounded shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] hover:bg-black/20">Close</button>
                            <button onClick={() => {
                                const saveConfig = () =>{
                                    setShowTrafficLightControls(false)
                                    handleSave()
                                }
                                saveConfig()
                                }} className="px-5 py-2 rounded shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] hover:bg-blue-700/20">Save</button>
                        </div>                        
                    </div>
                </div>
            </div>
        )
    }catch(error){
        console.error(error)
    }
}