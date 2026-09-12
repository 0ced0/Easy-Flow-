import "../styles/trafficLightControls.css"
import {postTrafficTimersConfig, postDensityConfig, postFlowConfig} from "../hooks/api"
import {useState} from 'react'

export default function TrafficLightControls({
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
                "freeflow_max": flowConfiguration[2].freeflow_max,
                "slowdown_max": flowConfiguration[2].slowdown_max
            },
            {
                "approach_id": 4,
                "approach_name": "Sambat - Complex",
                "freeflow_max": flowConfiguration[3].freeflow_max,
                "slowdown_max": flowConfiguration[3].slowdown_max
            }
        ])

        const [option, setOption] = useState(0)

        const optionTitles = [
            "Signal Timers",
            "Flow Thresholds",
            "Density Thresholds"
        ]

        const handleSave = async () => {
            try{
                const timerResponse = await postTrafficTimersConfig(currentTimerConfiguration)
                const densityResponse = await postDensityConfig(currentDensityConfig)
                const flowResponse = await postFlowConfig(currentFlowConfig)
                const timerData = await timerResponse.json()

                console.log(timerData)
            }catch(error){
                console.error(error)
            }
        }

        function handleTimerChange (event, approach, state) {
            const update = [...currentTimerConfiguration]
            const value = event.target.value
            update[approach] = {
                ...update[approach],
                [state]: value === "" ? "" :Number(event.target.value)
            }

            setCurrentTimerConfiguration(update)
        }
        
        function handleDensityConfigChange (event, approach, state) {
            const update = [...currentDensityConfig]
            const value = event.target.value
            update[approach] = {
                ...update[approach],
                [state]: value === "" ? "" : Number(event.target.value)
            }

            setCurrentDensityConfig(update)
        }

        function handleFlowConfigChange (event, approach, state) {
            const update = [...currentFlowConfig]
            const value = event.target.value

            update[approach] = {
                ...update[approach],
                [state]: value === "" ? "" : Number(event.target.value)
            }

            setCurrentFlowConfig(update)
        }

        // console.log(timerConfiguration)
    
        return(
            <div className="popUpRoot flex-1 h-full min-h-0 min-w-0 flex">
                <div className="popUpBackground "></div>
                <div className="popUpContainerTLC w-[72vw] md:w-[75vw] h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
                    <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-end gap-[0.5625rem] justify-between py-[0.5625rem] px-[0.75rem] md:pl-15 md:pr-[3.25rem] w-full border-[#D9D9D9]">
                        <h1 className="font-bold text-[0.9375rem] sm:text-[1.125rem] opacity-[80%]">Traffic Controls Configuration</h1>
                        <button onClick={() => {
                            const saveConfig = () =>{
                                handleSave()
                            }
                            saveConfig()
                            }} className="bg-white px-[0.9375rem] py-[0.375rem] text-[0.75rem] rounded shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] hover:bg-blue-700/20">Save Configuration</button>
                    </div>

                    <div className="controlWorkspace rounded py-3 md:py-6 flex flex-col md:flex-row bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] w-[69vw] md:w-[68vw] flex-1 min-h-0 min-w-0 mx-auto md:ml-15 md:mr-0 overflow-hidden">
                        <div className="border-b md:border-b-0 md:border-r border-black/10 flex flex-row md:flex-col flex-1 min-h-0 min-w-0 gap-1.5 md:gap-0 px-[0.5625rem] md:pl-[0.9375rem] pt-[0.5625rem] md:pt-[0.9375rem] pb-[0.5625rem] md:pb-0 md:space-y-[1.875rem] overflow-x-auto">
                            <button className="sideBarOptions" onClick={() => {setOption(0)}}>
                                <p>Signal Timers</p>
                            </button>
                            <button className="sideBarOptions" onClick={() => {setOption(1)}}>
                            <p>Flow Thresholds</p>

                            </button>
                            <button className="sideBarOptions" onClick={() => {setOption(2)}}>
                            <p>Density Thresholds</p>
                            </button>
                        </div>
                        <div className="flex-4 flex flex-col min-h-0 px-1.5 sm:px-[0.9375rem] min-w-0">
                            <div className="border-b border-black/10 shrink-0 flex py-1.5 px-1.5 sm:px-[0.9375rem] text-[0.9375rem] sm:text-[1.125rem] font-medium text-black/60 items-center">
                                {optionTitles[option]}
                            </div>
                            <div className="flex-1 min-h-0 flex">
                                {/* INPUTS CONTAINER */}
                                {option === 2 ? (
                                <div className="gap-3 flex flex-col px-[0.5625rem] sm:px-[1.875rem] py-[0.9375rem] flex-1 min-h-0 w-full overflow-y-auto">
                                    {/* MAXIMUM FREE FLOW THRESHOLDS */}
                                    <h1 className="font-medium text-black/60">Maximum Free Flow Thresholds</h1>
                                    <div className="flex w-full justify-between">
                                        <div className="flex flex-col gap-7 items-start">
                                            <h3 className="roads">Sambat to LSPU</h3>
                                            <h3 className="roads">Sambat to Patimbao</h3>
                                            <h3 className="roads">Sambat to Complex</h3>
                                            <h3 className="roads">Sambat to Sunstar</h3>
                                        </div>
                                        <div className="flex flex-col gap-7 items-center">
                                            <input className="tlcInput" type="number" onChange={(event) => {handleDensityConfigChange(event, 0, "freeflow_max")}} value={currentDensityConfig[0].freeflow_max}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleDensityConfigChange(event, 1, "freeflow_max")}} value={currentDensityConfig[1].freeflow_max}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleDensityConfigChange(event, 2, "freeflow_max")}} value={currentDensityConfig[2].freeflow_max}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleDensityConfigChange(event, 3, "freeflow_max")}} value={currentDensityConfig[3].freeflow_max}></input>
                                        </div>
                                    </div>
                                    {/* MAXIMUM DENSITY THRESHOLDS */}
                                    <h1 className="font-medium text-black/60">Maximum Slow Down Thresholds</h1>
                                    <div className="flex w-full justify-between">
                                        <div className="flex flex-col gap-7 items-start">
                                            <h3 className="roads">Sambat to LSPU</h3>
                                            <h3 className="roads">Sambat to Patimbao</h3>
                                            <h3 className="roads">Sambat to Complex</h3>
                                            <h3 className="roads">Sambat to Sunstar</h3>
                                        </div>
                                        <div className="flex flex-col gap-7 items-center">
                                            <input className="tlcInput" type="number" onChange={(event) => {handleDensityConfigChange(event, 0, "slowdown_max")}} value={currentDensityConfig[0].slowdown_max}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleDensityConfigChange(event, 1, "slowdown_max")}} value={currentDensityConfig[1].slowdown_max}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleDensityConfigChange(event, 2, "slowdown_max")}} value={currentDensityConfig[2].slowdown_max}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleDensityConfigChange(event, 3, "slowdown_max")}} value={currentDensityConfig[3].slowdown_max}></input>
                                        </div>
                                    </div>
                                </div>
                                ) : option === 1 ? (
                                <div className="gap-3 flex flex-col px-[0.5625rem] sm:px-[1.875rem] py-[0.9375rem] flex-1 min-h-0 w-full overflow-y-auto">
                                    {/* MAXIMUM FREE FLOW THRESHOLDS */}
                                    <h1 className="font-medium text-black/60">Maximum Free Flow Thresholds</h1>
                                    <div className="flex w-full justify-between">
                                        <div className="flex flex-col gap-7 items-start">
                                            <h3 className="roads">Sambat to LSPU</h3>
                                            <h3 className="roads">Sambat to Patimbao</h3>
                                            <h3 className="roads">Sambat to Complex</h3>
                                            <h3 className="roads">Sambat to Sunstar</h3>
                                        </div>
                                        <div className="flex flex-col gap-7 items-center">
                                            <input className="tlcInput" type="number" onChange={(event) => {handleFlowConfigChange(event, 0, "freeflow_max")}} value={currentFlowConfig[0].freeflow_max}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleFlowConfigChange(event, 1, "freeflow_max")}} value={currentFlowConfig[1].freeflow_max}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleFlowConfigChange(event, 2, "freeflow_max")}} value={currentFlowConfig[2].freeflow_max}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleFlowConfigChange(event, 3, "freeflow_max")}} value={currentFlowConfig[3].freeflow_max}></input>
                                        </div>
                                    </div>
                                    {/* MAXIMUM DENSITY THRESHOLDS */}
                                    <h1 className="font-medium text-black/60">Maximum Slow Down Thresholds</h1>
                                    <div className="flex w-full justify-between">
                                        <div className="flex flex-col gap-7 items-start">
                                            <h3 className="roads">Sambat to LSPU</h3>
                                            <h3 className="roads">Sambat to Patimbao</h3>
                                            <h3 className="roads">Sambat to Complex</h3>
                                            <h3 className="roads">Sambat to Sunstar</h3>
                                        </div>
                                        <div className="flex flex-col gap-7 items-center">
                                            <input className="tlcInput" type="number" onChange={(event) => {handleFlowConfigChange(event, 0, "slowdown_max")}} value={currentFlowConfig[0].slowdown_max}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleFlowConfigChange(event, 1, "slowdown_max")}} value={currentFlowConfig[1].slowdown_max}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleFlowConfigChange(event, 2, "slowdown_max")}} value={currentFlowConfig[2].slowdown_max}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleFlowConfigChange(event, 3, "slowdown_max")}} value={currentFlowConfig[3].slowdown_max}></input>
                                        </div>
                                    </div>
                                </div>
                                ) : option === 0 ? (
                                <div className="gap-3 flex flex-col px-[0.5625rem] sm:px-[1.875rem] py-[0.9375rem] flex-1 min-h-0 w-full overflow-y-auto">
                                {/* MAXIMUM FREE FLOW THRESHOLDS */}
                                    <h1 className="font-medium text-black/60">Free Flow</h1>
                                    <div className="flex w-full justify-between">
                                        <div className="flex flex-col gap-7 items-start">
                                            <h3 className="roads">Sambat to LSPU</h3>
                                            <h3 className="roads">Sambat to Patimbao</h3>
                                            <h3 className="roads">Sambat to Complex</h3>
                                            <h3 className="roads">Sambat to Sunstar</h3>
                                        </div>
                                        <div className="flex flex-col gap-7 items-center">
                                            <input className="tlcInput" type="number" onChange={(event) => {handleTimerChange(event, 0, "freeflow")}} value={currentTimerConfiguration[0].freeflow}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleTimerChange(event, 1, "freeflow")}} value={currentTimerConfiguration[1].freeflow}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleTimerChange(event, 2, "freeflow")}} value={currentTimerConfiguration[2].freeflow}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleTimerChange(event, 3, "freeflow")}} value={currentTimerConfiguration[3].freeflow}></input>
                                        </div>
                                    </div>
                                    {/* MAXIMUM DENSITY THRESHOLDS */}
                                    <h1 className="font-medium text-black/60">Slow Down</h1>
                                    <div className="flex w-full justify-between">
                                        <div className="flex flex-col gap-7 items-start">
                                            <h3 className="roads">Sambat to LSPU</h3>
                                            <h3 className="roads">Sambat to Patimbao</h3>
                                            <h3 className="roads">Sambat to Complex</h3>
                                            <h3 className="roads">Sambat to Sunstar</h3>
                                        </div>
                                        <div className="flex flex-col gap-7 items-center">
                                            <input className="tlcInput" type="number" onChange={(event) => {handleTimerChange(event, 0, "slowdown")}} value={currentTimerConfiguration[0].slowdown}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleTimerChange(event, 1, "slowdown")}} value={currentTimerConfiguration[1].slowdown}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleTimerChange(event, 2, "slowdown")}} value={currentTimerConfiguration[2].slowdown}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleTimerChange(event, 3, "slowdown")}} value={currentTimerConfiguration[3].slowdown}></input>
                                        </div>
                                    </div>
                                    <h1 className="font-medium text-black/60">Congested</h1>
                                    <div className="flex w-full justify-between">
                                        <div className="flex flex-col gap-7 items-start">
                                            <h3 className="roads">Sambat to LSPU</h3>
                                            <h3 className="roads">Sambat to Patimbao</h3>
                                            <h3 className="roads">Sambat to Complex</h3>
                                            <h3 className="roads">Sambat to Sunstar</h3>
                                        </div>
                                        <div className="flex flex-col gap-7 items-center">
                                            <input className="tlcInput" type="number" onChange={(event) => {handleTimerChange(event, 0, "congested")}} value={currentTimerConfiguration[0].congested}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleTimerChange(event, 1, "congested")}} value={currentTimerConfiguration[1].congested}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleTimerChange(event, 2, "congested")}} value={currentTimerConfiguration[2].congested}></input>
                                            <input className="tlcInput" type="number" onChange={(event) => {handleTimerChange(event, 3, "congested")}} value={currentTimerConfiguration[3].congested}></input>
                                        </div>
                                    </div>
                                </div>
                                ) : null}
                                
                            </div>
                        </div>
                    </div>

                    {/* <div className="h-[90%] w-[62vw] auto-rows-[minmax(0,45vh)] ml-5 pt-3"> */}
                        {/* DENSITY THRESHOLD */}
                        {/* <h3 className="boxExternalLabels">Traffic Thresholds</h3>
                        <div className="rounded w-full bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] mb-3 px-10"> 
                            <div className="flex justify-end gap-70 pr-37 items-center pt-2">
                                <h3 className="boxExternalLabels">Density Threshold</h3>
                                <h3 className="boxExternalLabels">Flow Threshold</h3>
                            </div>
                            <div className="flex justify-around h-[35vh] w-full items-center">
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
                    </div> */}
                    {/* TIMERS */}
                    {/* <div className="h-[35vh] w-[65vw] ml-2 pl-3 pr-9">
                        <h3 className="boxExternalLabels">Signal Timers</h3>
                        <div className="bg-white rounded shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] flex justify-around h-[95%] items-center px-10">
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
                                <h3 className="boxInternalLabels">Congested</h3>
                                <input className="tlcInput" type="number" defaultValue={timerConfiguration.congested[0]}></input>
                                <input className="tlcInput" type="number" defaultValue={timerConfiguration.congested[1]}></input>
                                <input className="tlcInput" type="number" defaultValue={timerConfiguration.congested[2]}></input>
                                <input className="tlcInput" type="number" defaultValue={timerConfiguration.congested[3]}></input>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end px-10 py-3 items-end gap-5 mt-8">
                        <button onClick={() => {
                            const saveConfig = () =>{
                                setShowTrafficLightControls(false)
                                handleSave()
                            }
                            saveConfig()
                            }} className="bg-white px-5 py-2 rounded shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] hover:bg-blue-700/20">Save Changes</button>
                    </div>                         */}
                </div>
            </div>
        )
    }catch(error){
        console.error(error)
    }
}
