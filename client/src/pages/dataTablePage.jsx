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
            <div className="p-1 pb-20 md:pb-1 flex flex-col md:flex-row w-full min-h-screen md:h-[99vh]">
                <SideBar />
                <div className="w-full min-w-0 py-3 px-3 sm:px-6 md:py-4 lg:px-10 overflow-y-auto">
                    <div className="relative flex flex-wrap items-center gap-2 justify-between mb-3 md:mb-2">
                        <h1 className="w-full sm:w-auto font-medium text-[black]/70 text-xl sm:text-[1.7rem]">{approaches[camera_id - 1]} Monthly Summary</h1>
                        <button ref={approachRef} onClick={() => {setShowApproachDropDown(prev => !prev)}} className="bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[15px] py-2 px-4 sm:ml-auto sm:mr-3 lg:mr-5">
                            Approach
                        </button>
                        {showApproachDropDown &&(
                            <div ref={approachButtonRef} className="z-100 absolute shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] bg-white w-full sm:w-[30vh] left-0 sm:left-auto sm:right-44 top-full mt-1 flex flex-col">
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5 px-2 sm:px-4 py-2 h-auto md:h-[30vh] bg-blue-700/10 shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded">
                        <div className="min-h-36 md:min-h-0 bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded">
                            <TriSUmmaryCard dataCategory={dataCategory[0]} summaryValue={summaryData.totalVehicleCount}/>
                        </div>
                        <div className="min-h-36 md:min-h-0 bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded">
                            <TriSUmmaryCard dataCategory={dataCategory[1]} summaryValue={summaryData.averageVehicleFlow}/>
                        </div>
                        <div className="min-h-36 md:min-h-0 bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded">
                            <TriSUmmaryCard dataCategory={dataCategory[2]} summaryValue={summaryData.averageDensity}/>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 py-2 gap-4 h-auto lg:h-[60vh]">
                        {/* DATA TABLE */}
                        <div className="hidden sm:block min-h-[28rem] overflow-x-auto lg:pr-3 bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded">
                            <DataTable setCamera_id={setCamera_id} dataTable={dailyData} tableId={tableId} setDataTable={setDailyData} setPage={setPage} page={page} monthFilter={monthFilter}/>
                        </div>
                        <div className="h-[90%] md:h-full bg-blue-700/10 shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] space-y-3 p-2 sm:p-3 max-h-none lg:max-h-[65vh]">
                            <div className="h-full sm:h-[55vh] bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded w-full">
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
