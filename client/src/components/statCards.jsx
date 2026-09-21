import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useState, useEffect, useRef, useCallback } from 'react'
import {getTrafficData} from '../hooks/api.js'

export default function StatCard({approachFilter, setApproachFilter, dateFilter, setDateFilter, vehicleNumbers, averageVehicleSpeed}) {

    const [showDateDropDown, setShowDateDropDown] = useState(false)
    const [showApproachDropDown, setShowApproachDropDown] = useState(false)
    const dateRef = useRef(null)
    const dateButtonRef = useRef(null)
    const approachRef = useRef(null)
    const approachButtonRef = useRef(null)
    const dataRequestVersion = useRef(0)
    const [currentApproach, setCurrentApproach] = useState("Sambat to Lspu")
    const [currentData, setCurrentData] = useState([])
    const approaches = [
            "Sambat to Lspu",
            "Sambat to Patimbao",
            "Sambat to Sunstar",
            "Sambat to Complex",
        ]

    // console.log(approachFilter)
    const handleSetData = useCallback(async (requestVersion) => {
        
        const normalizeHourlyData = (hourlyData) => {
            const dataByHour = new Map(
                hourlyData.map(row => [
                    Number(row.hour),
                    Number(row.average_flow)
                ])
            )
            
            return Array.from({ length: 24 }, (_, hour) => ({
                hour: (hour + 1),
                average_flow: dataByHour.get(hour) ?? null
            }))
        }
        const response = await getTrafficData(approachFilter, dateFilter)
        let data = await response.json()
        if (requestVersion !== dataRequestVersion.current) return
        if(data.length > 0){
            data = normalizeHourlyData(data)
            setCurrentData(data)
        }
        else{
            setCurrentData(null)
        }

    }, [approachFilter, dateFilter])
    
    function handleClickOutsideDate (event) {
        if(!dateRef?.current?.contains(event.target)
            && !dateButtonRef?.current?.contains(event.target)
        ){
            setShowDateDropDown(false)
        }
    }

    function handleClickOutsideApproach (event) {
        if(!approachRef?.current?.contains(event.target)
            && !approachButtonRef?.current?.contains(event.target)
        ){
            setShowApproachDropDown(false)
        }
    }

    function handleApproachFilter(id) {
        setApproachFilter(id)
        setCurrentApproach(approaches[id-1])
        setShowApproachDropDown(false)
    }

    function handleDateFilter(event) {
        const date = event.target.value
        setDateFilter(date)
        setShowDateDropDown(false)
    }

    useEffect(() => {
        const requestVersion = ++dataRequestVersion.current
        document.addEventListener("mousedown", handleClickOutsideDate)
        document.addEventListener("mousedown", handleClickOutsideApproach)
        handleSetData(requestVersion).catch((error) => {
            if (requestVersion === dataRequestVersion.current) console.error(error)
        })

        return () => {
            document.removeEventListener("mousedown", handleClickOutsideDate)
            document.removeEventListener("mousedown", handleClickOutsideApproach)
        }
    },[handleSetData])

    // console.log(currentData)
    return (
        <div className="min-h-[18rem] sm:min-h-[165px] lg:min-h-0 h-full min-w-0 relative overflow-hidden rounded-lg bg-[#f9fcff] text-center flex-1 w-full shadow-[0_8px_20px_rgba(28,72,109,0.1)]">
            <div className="h-[100%] min-h-0 gap-1.5 absolute flex flex-col sm:flex-row p-1 inset-0">
                <div className="chart relative min-h-48 sm:min-h-0 lg:min-h-0 w-full sm:w-auto min-w-0">
                <div className="flex flex-wrap items-center border-b border-[#cfdeea] font-medium text-[0.75rem] sm:text-[0.75rem] text-start mb-1 px-1.5 py-1">
                    <button ref={dateButtonRef} onClick={() => {setShowDateDropDown(prev => !prev)}} className="rounded text-[#214766] hover:bg-[#edf4f9] py-1 px-2 min-h-11 sm:min-h-0">
                        Date
                    </button>
                    {showDateDropDown &&
                        <input ref={dateRef} onChange={(event) => {handleDateFilter(event)}} type="date" value={dateFilter}
                            className="absolute z-100 rounded-md border border-[#cfdeea] bg-[#f9fcff] p-2 text-[#214766] shadow-[0_8px_20px_rgba(28,72,109,0.16)] top-8 w-44 sm:w-[27%]">
                        </input>
                    }
                    <button ref={approachRef} onClick={() => {setShowApproachDropDown(prev => !prev)}} className="rounded text-[#214766] hover:bg-[#edf4f9] py-1 px-2 min-h-11 sm:min-h-0">
                        Approach
                    </button>
                    {showApproachDropDown &&(
                        <div ref={approachButtonRef} className="z-100 absolute overflow-hidden rounded-md border border-[#cfdeea] bg-[#f9fcff] text-[#214766] shadow-[0_8px_20px_rgba(28,72,109,0.16)] w-[min(18rem,90vw)] left-2 sm:left-16 top-10 sm:top-8 flex flex-col">
                            <button onClick={() => {handleApproachFilter(1)}} className="videoStreamButton">Sambat to LSPU</button>
                            <button onClick={() => {handleApproachFilter(2)}} className="videoStreamButton">Sambat to Patimbao</button>
                            <button onClick={() => {handleApproachFilter(4)}} className="videoStreamButton">Sambat to Complex</button>
                            <button onClick={() => {handleApproachFilter(3)}} className="videoStreamButton">Sambat to Sunstar</button>
                        </div>
                    )}
                </div>
                
                    <p className="text-[0.7rem] sm:text-[0.75rem] font-medium text-[#17324c]">{currentApproach}</p>
                
                    {currentData ? 
                        <LineChart
                            responsive
                            data={currentData}
                            style={{ width: "100%", minHeight: 127.5, height: "80%", padding: "0.15rem" }}
                            margin={{
                                top: 7.5,
                                right: 11.25,
                                left: 0,
                                bottom: 12
                            }}
                        >
                            <CartesianGrid
                                vertical={false}
                                stroke="#c7d8e5"
                                strokeOpacity="0.55"
                            />
                            <XAxis dataKey="hour" tick={{ fontSize: 3.75, fill: '#54708a' }} strokeDasharray='0 7.5' />
                            <YAxis width={15} tick={{ fontSize: 3.75, fill: '#54708a' }} strokeDasharray='0 7.5' />

                            <Line dataKey="average_flow" stroke='#16835e' dot={false} />

                        </LineChart> 
                        :
                        <p className="text-center pt-[3.375rem] text-[0.75rem] text-[#54708a]">No Data Available</p>}
                    
                </div>


                {/* Stat Numbers */}
                <div className="relative flex flex-row min-h-18 sm:min-h-0 lg:min-h-0 sm:flex-col justify-between gap-[0.5625rem] sm:gap-1.5 w-full sm:w-[4.5rem]">

                    <div className="counter h-full min-h-15 sm:min-h-0 flex-1 sm:flex-none text-[0.75rem]">
                        <p className="text-[0.4625rem] sm:text-[0.65rem]">Vehicle Count</p>
                        <h2 className="text-[0.9rem] sm:text-[0.8375rem] font-semibold">{vehicleNumbers}</h2>
                    </div>
                    <div className="counter h-full min-h-15 sm:min-h-0 flex-1 sm:flex-none text-[0.75rem]">
                        <p className="text-[0.4625rem] sm:text-[0.65rem]">Average speed</p>
                        <h2 className="text-[0.9rem] sm:text-[0.8375rem] font-semibold">{averageVehicleSpeed}</h2>
                        <h4 className="text-[0.4625rem] sm:text-[0.65rem]">km/h</h4>
                    </div>
                </div>
            </div>
        </div >
    )
}

