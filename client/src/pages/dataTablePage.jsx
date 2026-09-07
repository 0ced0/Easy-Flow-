import SideBar from '../components/sideBar.jsx'
import DataTable from '../components/dataTable.jsx'
import {useState, useEffect, useRef} from 'react'
import {getTrafficData, getAllRows, getMonthlyData, getDailyData, getWeeklyData} from '../hooks/api.js'
import TriSUmmaryCard from '../components/triSummaryCards.jsx'
import SummaryChart from '../components/summaryChart.jsx'

export default function DataTablePage() {
    const [showApproachDropDown, setShowApproachDropDown] = useState(false)
    const approaches = ["Sambat to LSPU", 
        "Sambat to Patimbao", 
        "Sambat to Sunstar", 
        "Sambat to Complex"]
    const approachRef = useRef(null)
    const approachButtonRef = useRef(null)
    const now = new Date()
    const [dailyData, setDailyData] = useState([])
    const [weeklyData, setWeeklyData] = useState([])
    const [summaryData, setSummaryData] = useState(null)
    const [tableId, setTableId] = useState(0)
    const [page, setPage] = useState(1)
    const [camera_id, setCamera_id] = useState(1)
    const [monthFilter, setMonthFilter] = useState(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    )
    const dataCategory = ["Total Vehicle Count", "Average Vehicle Flow", "Average Spatial Density"]
    
    useEffect(() => {
        const handleRequestDataTable = async () => {
            const response = await getMonthlyData(camera_id, monthFilter) 
            const data = await response.json()
            setTableId(camera_id)
            setSummaryData(data)

            const weeklyResponse = await getWeeklyData(camera_id, monthFilter)
            const weeklyResponseData = await weeklyResponse.json()
            setWeeklyData(weeklyResponseData)
        }
        handleRequestDataTable()
    }, [monthFilter, camera_id])

    function handleMonthFilter (event) {
        const dateFilter = event.target.value
        setMonthFilter(dateFilter)
    }
    
    function handleClickOutsideApproach (event) {
        if(!approachRef?.current?.contains(event.target)
            && !approachButtonRef?.current?.contains(event.target)
    ){
        setShowApproachDropDown(false)
    }
    }

    function handleApproachFilter(id) {
        setCamera_id(id)
        setShowApproachDropDown(false)
    }

    useEffect (() => {
        const initialize = async () => {
            const dtResponse = await getAllRows(camera_id, page)
            const dtData = await dtResponse.json()
            
            const ddResponse = await getDailyData(camera_id, page, monthFilter)
            const ddData = await ddResponse.json()
            // console.log(ddData)
            setDailyData(ddData)
        }

        document.addEventListener("mousedown", handleClickOutsideApproach)
        initialize()

        return () => {
            document.removeEventListener("mousedown", handleClickOutsideApproach)
        }
    },[camera_id, monthFilter])

    try{
        return(
            <div className="p-1 flex w-full h-[99vh]">
                <SideBar />
                <div className="w-full py-4 px-10">
                    <div className="flex justify-between mb-2">
                        <h1 className="font-medium text-[black]/70 text-[1.7rem]">{approaches[camera_id - 1]} Monthly Summary</h1>
                        <button ref={approachRef} onClick={() => {setShowApproachDropDown(prev => !prev)}} className="bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[15px] py-2 px-4 ml-auto mr-5">
                            Approach
                        </button>
                        {showApproachDropDown &&(
                            <div ref={approachButtonRef} className="z-100 absolute shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] bg-white w-[30vh] right-65 top-15 flex flex-col">
                                <button onClick={() => {handleApproachFilter(1)}} className="videoStreamButton">Sambat to LSPU</button>
                                <button onClick={() => {handleApproachFilter(2)}} className="videoStreamButton">Sambat to Patimbao</button>
                                <button onClick={() => {handleApproachFilter(4)}} className="videoStreamButton">Sambat to Complex</button>
                                <button onClick={() => {handleApproachFilter(3)}} className="videoStreamButton">Sambat to Sunstar</button>
                            </div>
                        )}

                        <button className="bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[15px] py-2 px-4">
                            <input onChange={(event) => {handleMonthFilter(event)}} type="month" value={monthFilter}></input>
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-5 px-4 py-2 h-[30vh] bg-blue-700/10 shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded">
                        <div className="bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded">
                            <TriSUmmaryCard dataCategory={dataCategory[0]} summaryValue={summaryData.totalVehicleCount}/>
                        </div>
                        <div className="bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded">
                            <TriSUmmaryCard dataCategory={dataCategory[1]} summaryValue={summaryData.averageVehicleFlow}/>
                        </div>
                        <div className="bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded">
                            <TriSUmmaryCard dataCategory={dataCategory[2]} summaryValue={summaryData.averageDensity}/>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 py-2 gap-4 h-[60vh]">
                        {/* DATA TABLE */}
                        <div className="pr-3 bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded">
                            <DataTable setCamera_id={setCamera_id} dataTable={dailyData} tableId={tableId} setDataTable={setDailyData} setPage={setPage} page={page} monthFilter={monthFilter}/>
                        </div>
                        <div className="bg-blue-700/10 shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] space-y-3 p-3 max-h-[65vh]">
                            <div className="h-[55vh] bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded w-full">
                                <SummaryChart weeklyData={weeklyData}/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }catch(error){
        console.error(error)
    }
}
