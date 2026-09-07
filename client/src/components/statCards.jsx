import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useState, useEffect, useRef } from 'react'
import {getTrafficData} from '../hooks/api.js'

export default function StatCard({approachFilter, setApproachFilter, dateFilter, setDateFilter, vehicleNumbers, averageVehicleSpeed, condition}) {

    const [showDateDropDown, setShowDateDropDown] = useState(false)
    const [showApproachDropDown, setShowApproachDropDown] = useState(false)
    const dateRef = useRef(null)
    const dateButtonRef = useRef(null)
    const approachRef = useRef(null)
    const approachButtonRef = useRef(null)
    const [currentApproach, setCurrentApproach] = useState("Sambat to Lspu")
    const approaches = [
            "Sambat to Lspu",
            "Sambat to Patimbao",
            "Sambat to Sunstar",
            "Sambat to Complex",
        ]

    // console.log(approachFilter)
    const handleSetData = async () => {
        
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
        if(data.length > 0){
            data = normalizeHourlyData(data)
            setCurrentData(data)
        }
        else{
            setCurrentData(null)
        }

    }
    
    const [currentData, setCurrentData] = useState([])

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
        document.addEventListener("mousedown", handleClickOutsideDate)
        document.addEventListener("mousedown", handleClickOutsideApproach)
        handleSetData()

        return () => {
            document.removeEventListener("mousedown", handleClickOutsideDate)
        }
    },[approachFilter, dateFilter])

    // console.log(currentData)
    return (
        <div className="min-h-[220px] h-full relative shadow-[0_1px_4px_1px_rgba(0,0,0,0.25)] text-center flex-1 w-full">

            {/* Background */}
            <div className="absolute z-10 inset-0 bg-[#0000FF] opacity-[10%]"></div>

            <div className="h-[100%] gap-2 z-20 absolute flex p-1 inset-0">
                <div className="chart relative">
                <div className="flex items-center border-b border-[#D9D9D9] font-medium text-start mb-2 px-2 py-0.5">
                    <button ref={dateButtonRef} onClick={() => {setShowDateDropDown(prev => !prev)}} className="text-[#363636] hover:bg-black/10 py-1 px-2">
                        Date
                    </button>
                    {showDateDropDown &&
                        <input ref={dateRef} onChange={(event) => {handleDateFilter(event)}} type="date" value={dateFilter}
                            className="absolute z-100 shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] bg-white top-7 p-2 w-[27%]">
                        </input>
                    }
                    <button ref={approachRef} onClick={() => {setShowApproachDropDown(prev => !prev)}} className="text-[#363636] hover:bg-black/10 py-1 px-2">
                        Approach
                    </button>
                    {showApproachDropDown &&(
                        <div ref={approachButtonRef} className="z-100 absolute shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] bg-white w-[30vh] left-16 top-7 flex flex-col">
                            <button onClick={() => {handleApproachFilter(1)}} className="videoStreamButton">Sambat to LSPU</button>
                            <button onClick={() => {handleApproachFilter(2)}} className="videoStreamButton">Sambat to Patimbao</button>
                            <button onClick={() => {handleApproachFilter(4)}} className="videoStreamButton">Sambat to Complex</button>
                            <button onClick={() => {handleApproachFilter(3)}} className="videoStreamButton">Sambat to Sunstar</button>
                        </div>
                    )}
                </div>
                
                    <p>{currentApproach}</p>
                
                    {currentData ? 
                        <LineChart
                            responsive
                            data={currentData}
                            style={{ width: "100%", minHeight: 170, height: "80%", padding: "0.2rem" }}
                            margin={{
                                top: 10,
                                right: 15,
                                left: 0,
                                bottom: 0
                            }}
                        >
                            <CartesianGrid
                                vertical={false}
                                strokeOpacity="0.4"
                            />
                            <XAxis dataKey="hour" tick={{ fontSize: 5 }} strokeDasharray='0 10' />
                            <YAxis width={20} tick={{ fontSize: 5 }} strokeDasharray='0 10' />

                            <Line dataKey="average_flow" stroke='blue' dot={false} />

                        </LineChart> 
                        :
                        <p className="text-center pt-18">No Data Available</p>}
                    
                </div>


                {/* Stat Numbers */}
                <div className="relative flex flex-col justify-between gap-3 w-[6rem]">

                    <div className="counter">
                        <p>Vehicle Count</p>
                        <h2>{vehicleNumbers}</h2>
                    </div>
                    <div className="counter">
                        <p>Average speed</p>
                        <h2>{averageVehicleSpeed}</h2>
                        <h4>km/h</h4>
                    </div>
                </div>
            </div>
        </div >
    )
}

