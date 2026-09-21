import SideBar from '../components/sideBar.jsx'
import DataTable from '../components/dataTable.jsx'
import {useState, useEffect, useRef} from 'react'
import {getMonthlyData, getDailyData, getWeeklyData} from '../hooks/api.js'
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
    const summaryRequestVersion = useRef(0)
    const dailyRequestVersion = useRef(0)
    const now = new Date()
    const [dailyData, setDailyData] = useState([])
    const [weeklyData, setWeeklyData] = useState([])
    const [summaryData, setSummaryData] = useState(null)
    const [previousSummaryData, setPreviousSummaryData] = useState(null)
    const [isSummaryLoading, setIsSummaryLoading] = useState(true)
    const [isDailyLoading, setIsDailyLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [camera_id, setCamera_id] = useState(1)
    const [monthFilter, setMonthFilter] = useState(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    )
    const dataCategory = ["Total Vehicle Count", "Average Vehicle Flow", "Average Spatial Density"]
    
    useEffect(() => {
        const requestVersion = ++summaryRequestVersion.current
        setIsSummaryLoading(true)
        const handleRequestDataTable = async () => {
            try {
                const response = await getMonthlyData(camera_id, monthFilter)
                const data = await response.json()
                const previousMonth = getPreviousMonth(monthFilter)
                const previousResponse = await getMonthlyData(camera_id, previousMonth)
                const previousData = await previousResponse.json()
                const weeklyResponse = await getWeeklyData(camera_id, monthFilter)
                const weeklyResponseData = await weeklyResponse.json()

                if (requestVersion !== summaryRequestVersion.current) return
                setSummaryData(data)
                setPreviousSummaryData(previousData)
                setWeeklyData(weeklyResponseData)
            } catch (error) {
                if (requestVersion === summaryRequestVersion.current) console.error(error)
            } finally {
                if (requestVersion === summaryRequestVersion.current) setIsSummaryLoading(false)
            }
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
        const requestVersion = ++dailyRequestVersion.current
        setIsDailyLoading(true)
        const initialize = async () => {
            try {
                const ddResponse = await getDailyData(camera_id, page, monthFilter)
                const ddData = await ddResponse.json()
                if (requestVersion === dailyRequestVersion.current) setDailyData(ddData)
            } catch (error) {
                if (requestVersion === dailyRequestVersion.current) console.error(error)
            } finally {
                if (requestVersion === dailyRequestVersion.current) setIsDailyLoading(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutsideApproach)
        initialize()

        return () => {
            document.removeEventListener("mousedown", handleClickOutsideApproach)
        }
    },[camera_id, monthFilter, page])

    try{
        return(
            <div className="flex h-[100dvh] w-full box-border flex-col overflow-x-hidden overflow-y-auto bg-[#eaf1f6] p-[0.1875rem] pb-15 md:flex-row md:overflow-hidden md:pb-[0.1875rem]">
                <SideBar compact />
                <div className="w-full h-auto min-w-0 min-h-0 flex-none md:flex-1 flex flex-col py-[0.5625rem] px-[0.5625rem] sm:px-[1.125rem] md:py-[0.75rem] lg:px-[1.875rem] overflow-visible md:h-full md:overflow-hidden">
                    <div className="relative mb-[0.5625rem] flex shrink-0 flex-wrap items-center justify-between gap-1.5 md:mb-[0.375rem]">
                        <h1 className="w-full text-[0.9375rem] font-semibold text-[#17324c] sm:w-auto sm:text-[1.275rem]">{approaches[camera_id - 1]} Monthly Summary</h1>
                        <button ref={approachRef} onClick={() => {setShowApproachDropDown(prev => !prev)}} className="rounded-md border border-[#cfdeea] bg-[#f9fcff] px-3 py-1.5 text-[0.75rem] text-[#214766] shadow-[0_6px_14px_rgba(28,72,109,0.08)] hover:bg-[#edf4f9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c5f9f] sm:ml-auto sm:mr-[0.5625rem] lg:mr-[0.9375rem]">
                            Approach
                        </button>
                        {showApproachDropDown &&(
                            <div ref={approachButtonRef} className="absolute top-full left-0 z-100 mt-[0.1875rem] flex w-full flex-col overflow-hidden rounded-md border border-[#cfdeea] bg-[#f9fcff] text-[0.75rem] text-[#214766] shadow-[0_8px_20px_rgba(28,72,109,0.16)] sm:left-auto sm:right-33 sm:w-[22.5vh]">
                                <button onClick={() => {handleApproachFilter(1)}} className="videoStreamButton px-3 text-left">Sambat to LSPU</button>
                                <button onClick={() => {handleApproachFilter(2)}} className="videoStreamButton px-3 text-left">Sambat to Patimbao</button>
                                <button onClick={() => {handleApproachFilter(4)}} className="videoStreamButton px-3 text-left">Sambat to Complex</button>
                                <button onClick={() => {handleApproachFilter(3)}} className="videoStreamButton px-3 text-left">Sambat to Sunstar</button>
                            </div>
                        )}

                        <button className="rounded-md border border-[#cfdeea] bg-[#f9fcff] px-3 py-1.5 text-[0.75rem] text-[#214766] shadow-[0_6px_14px_rgba(28,72,109,0.08)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#1c5f9f]">
                            <input onChange={(event) => {handleMonthFilter(event)}} type="month" value={monthFilter} className="bg-transparent text-[0.75rem] text-[#214766] outline-none"></input>
                        </button>
                    </div>
                    
                    <div className="shrink-0 grid grid-cols-1 md:grid-cols-3 gap-[0.5625rem] md:gap-[0.9375rem] px-1.5 sm:px-3 py-1.5 h-auto md:h-[clamp(120px,25dvh,215px)] rounded-lg border border-[#cfdeea] bg-[#edf4f9] shadow-[0_8px_20px_rgba(28,72,109,0.08)]">
                        <div className="min-h-27 md:min-h-0 overflow-hidden rounded-md border border-[#cfdeea] bg-[#f9fcff] shadow-[0_6px_14px_rgba(28,72,109,0.08)]">
                            <TriSUmmaryCard isLoading={isSummaryLoading} dataCategory={dataCategory[0]} summaryValue={summaryData?.totalVehicleCount} previousValue={previousSummaryData?.totalVehicleCount} comparisonMonth={getMonthLabel(getPreviousMonth(monthFilter))}/>
                        </div>
                        <div className="min-h-27 md:min-h-0 overflow-hidden rounded-md border border-[#cfdeea] bg-[#f9fcff] shadow-[0_6px_14px_rgba(28,72,109,0.08)]">
                            <TriSUmmaryCard isLoading={isSummaryLoading} dataCategory={dataCategory[1]} summaryValue={summaryData?.averageVehicleFlow} previousValue={previousSummaryData?.averageVehicleFlow} comparisonMonth={getMonthLabel(getPreviousMonth(monthFilter))}/>
                        </div>
                        <div className="min-h-27 md:min-h-0 overflow-hidden rounded-md border border-[#cfdeea] bg-[#f9fcff] shadow-[0_6px_14px_rgba(28,72,109,0.08)]">
                            <TriSUmmaryCard isLoading={isSummaryLoading} dataCategory={dataCategory[2]} summaryValue={summaryData?.averageDensity} previousValue={previousSummaryData?.averageDensity} comparisonMonth={getMonthLabel(getPreviousMonth(monthFilter))}/>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 py-1.5 gap-3 h-auto flex-none md:flex-1 md:min-h-0">
                        {/* DATA TABLE */}
                        <div className="hidden sm:block min-h-0 min-w-0 overflow-hidden rounded-lg border border-[#cfdeea] bg-[#f9fcff] shadow-[0_8px_20px_rgba(28,72,109,0.08)] lg:pr-[0.5625rem]">
                            <DataTable cameraId={camera_id} dataTable={dailyData} setDailyData={setDailyData} setPage={setPage} page={page} monthFilter={monthFilter} isLoading={isDailyLoading} setIsLoading={setIsDailyLoading}/>
                        </div>
                        <div className="h-[15rem] sm:h-[16.5rem] md:h-full min-h-0 min-w-0 overflow-hidden rounded-lg border border-[#cfdeea] bg-[#edf4f9] p-1.5 sm:p-[0.5625rem] shadow-[0_8px_20px_rgba(28,72,109,0.08)]">
                            <div className="h-full min-h-0 w-full rounded-md border border-[#cfdeea] bg-[#f9fcff]">
                                <SummaryChart weeklyData={weeklyData} isLoading={isSummaryLoading}/>
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
