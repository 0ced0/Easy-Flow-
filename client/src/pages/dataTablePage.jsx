import SideBar from '../components/sideBar.jsx'
import DataTable from '../components/dataTable.jsx'
import {useState, useEffect, useRef} from 'react'
import {getTrafficData, getAllRows, getMonthlyData, getDailyData, getWeeklyData} from '../hooks/api.js'
import TriSUmmaryCard from '../components/triSummaryCards.jsx'
import SummaryChart from '../components/summaryChart.jsx'

function getPreviousMonth(month) {
    const [year, monthNumber] = month.split("-").map(Number)
    const previousMonth = new Date(year, monthNumber - 2, 1)

    return `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, "0")}`
}

function getMonthLabel(month) {
    const [year, monthNumber] = month.split("-").map(Number)
    return new Intl.DateTimeFormat("en-US", {month: "long"}).format(new Date(year, monthNumber - 1, 1))
}

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
    const [previousSummaryData, setPreviousSummaryData] = useState(null)
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

            const previousMonth = getPreviousMonth(monthFilter)
            const previousResponse = await getMonthlyData(camera_id, previousMonth)
            const previousData = await previousResponse.json()
            setPreviousSummaryData(previousData)

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
            <div className="p-[0.1875rem] pb-15 md:pb-[0.1875rem] flex flex-col md:flex-row w-full h-[100dvh] box-border overflow-x-hidden overflow-y-auto md:overflow-hidden">
                <SideBar compact />
                <div className="w-full h-auto min-w-0 min-h-0 flex-none md:flex-1 flex flex-col py-[0.5625rem] px-[0.5625rem] sm:px-[1.125rem] md:py-[0.75rem] lg:px-[1.875rem] overflow-visible md:h-full md:overflow-hidden">
                    <div className="relative shrink-0 flex flex-wrap items-center gap-1.5 justify-between mb-[0.5625rem] md:mb-[0.375rem]">
                        <h1 className="w-full sm:w-auto font-medium text-[black]/70 text-[0.9375rem] sm:text-[1.275rem]">{approaches[camera_id - 1]} Monthly Summary</h1>
                        <button ref={approachRef} onClick={() => {setShowApproachDropDown(prev => !prev)}} className="bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[11.25px] py-1.5 px-3 sm:ml-auto sm:mr-[0.5625rem] lg:mr-[0.9375rem] text-[0.75rem]">
                            Approach
                        </button>
                        {showApproachDropDown &&(
                            <div ref={approachButtonRef} className="z-100 absolute shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] bg-white w-full sm:w-[22.5vh] left-0 sm:left-auto sm:right-33 top-full mt-[0.1875rem] flex flex-col text-[0.75rem]">
                                <button onClick={() => {handleApproachFilter(1)}} className="videoStreamButton">Sambat to LSPU</button>
                                <button onClick={() => {handleApproachFilter(2)}} className="videoStreamButton">Sambat to Patimbao</button>
                                <button onClick={() => {handleApproachFilter(4)}} className="videoStreamButton">Sambat to Complex</button>
                                <button onClick={() => {handleApproachFilter(3)}} className="videoStreamButton">Sambat to Sunstar</button>
                            </div>
                        )}

                        <button className="bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[11.25px] py-1.5 px-3 text-[0.75rem]">
                            <input onChange={(event) => {handleMonthFilter(event)}} type="month" value={monthFilter} className="text-[0.75rem]"></input>
                        </button>
                    </div>
                    
                    <div className="shrink-0 grid grid-cols-1 md:grid-cols-3 gap-[0.5625rem] md:gap-[0.9375rem] px-1.5 sm:px-3 py-1.5 h-auto md:h-[clamp(120px,25dvh,215px)] bg-blue-700/10 shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded">
                        <div className="min-h-27 md:min-h-0 bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded">
                            <TriSUmmaryCard dataCategory={dataCategory[0]} summaryValue={summaryData.totalVehicleCount} previousValue={previousSummaryData?.totalVehicleCount} comparisonMonth={getMonthLabel(getPreviousMonth(monthFilter))}/>
                        </div>
                        <div className="min-h-27 md:min-h-0 bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded">
                            <TriSUmmaryCard dataCategory={dataCategory[1]} summaryValue={summaryData.averageVehicleFlow} previousValue={previousSummaryData?.averageVehicleFlow} comparisonMonth={getMonthLabel(getPreviousMonth(monthFilter))}/>
                        </div>
                        <div className="min-h-27 md:min-h-0 bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded">
                            <TriSUmmaryCard dataCategory={dataCategory[2]} summaryValue={summaryData.averageDensity} previousValue={previousSummaryData?.averageDensity} comparisonMonth={getMonthLabel(getPreviousMonth(monthFilter))}/>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 py-1.5 gap-3 h-auto flex-none md:flex-1 md:min-h-0">
                        {/* DATA TABLE */}
                        <div className="hidden sm:block min-h-0 min-w-0 overflow-hidden lg:pr-[0.5625rem] bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded">
                            <DataTable setCamera_id={setCamera_id} dataTable={dailyData} tableId={tableId} setDataTable={setDailyData} setPage={setPage} page={page} monthFilter={monthFilter}/>
                        </div>
                        <div className="h-[15rem] sm:h-[16.5rem] md:h-full min-h-0 min-w-0 bg-blue-700/10 shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] space-y-[0.5625rem] p-1.5 sm:p-[0.5625rem] overflow-hidden">
                            <div className="h-full min-h-0 bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded w-full">
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
