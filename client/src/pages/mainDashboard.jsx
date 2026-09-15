import '../styles/mainDashboard.css'
import StatCard from '../components/statCards.jsx'
import IntersectionModel from '../components/intersectionModel.jsx'
import DensityChart from '../components/densityChart.jsx'
import TrafficLightTimers from '../components/trafficLightTimers.jsx'
import ViolationMonitoring from '../components/violationMonitoring.jsx'
import ViolationPopUp from '../components/violationPopup.jsx'
// import DataTable from '../components/dataTable.jsx'
import ViolationDataDisplay from '../components/violationDataDisplay.jsx'
import TrafficMap from '../components/trafficMap.jsx'
import SummaryCard from '../components/summaryCard.jsx'
import ApproachCards from '../components/approachCards.jsx'
import SideBar from '../components/sideBar.jsx'

import { VideoStream } from '../components/videoStream.jsx'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import {getStolStatData, 
    getStopStatData, 
    getStocStatData, 
    getStosStatData, 
    stolUpdateFrontend, 
    stopUpdateFrontend, 
    stocUpdateFrontend, 
    stosUpdateFrontend,
    getTrafficForecast,
    getTrafficLightData,
    getDensityConfig,
    getFlowConfig,
    getViolationData,
    getAllRows,
    getSummaryData
} from '../hooks/api'
import { BarChart } from 'recharts'

const PERF_LOGGING = import.meta.env.DEV && import.meta.env.VITE_PERF_LOGGING === 'true'

export default function MainDashboard() {
    const [stolVehicleNumbers, setStolVehicleNumbers] = useState(0)
    const [stolStatData, setStolStatData] = useState()
    const [stolAverageVehicleSpeed, setStolAverageVehicleSpeed] = useState(0)
    const [stolIllegalParkingList, setStolIllegalParkingList] = useState()
    const [stolIllegalLoadingUnloading, setStolIllegalLoadingUnloading] = useState()
    
    const [stopVehicleNumbers, setStopVehicleNumbers] = useState(0)
    const [stopStatData, setStopStatData] = useState()
    const [stopAverageVehicleSpeed, setStopAverageVehicleSpeed] = useState(0)
    const [stopIllegalParkingList, setStopIllegalParkingList] = useState()

    const [stocVehicleNumbers, setStocVehicleNumbers] = useState(0)
    const [stocStatData, setStocStatData] = useState()
    const [stocAverageVehicleSpeed, setStocAverageVehicleSpeed] = useState(0)
    const [stocIllegalParkingList, setStocIllegalParkingList] = useState()

    const [stosVehicleNumbers, setStosVehicleNumbers] = useState(0)
    const [stosStatData, setStosStatData] = useState()
    const [stosAverageVehicleSpeed, setStosAverageVehicleSpeed] = useState(0)
    const [stosIllegalParkingList, setStosIllegalParkingList] = useState()

    const [densityData, setDensityData] = useState([
                    {"loc" : "LSPU", "den" : 0},
                    {"loc" : "PATIMBAO", "den" : 0},
                    {"loc" : "BUBUKAL", "den" : 0},
                    {"loc" : "SUNSTAR",  "den" : 0},
                ])

    const [trafficForecast, setTrafficForecast] = useState(0)
    const [trafficTiming, setTrafficTiming] = useState(null)
    const latestTrafficResponse = useRef({stateVersion: -1, requestStarted: -Infinity})
    const [approachStates, setApproachStates] = useState([])
    const [currentConfiguration, setCurrentConfiguration] = useState([])
    const [timerConfiguration, setTimerConfiguration] = useState(0)
    const [densityConfiguration, setDensityConfiguration] = useState(0)
    const [flowConfiguration, setFlowConfiguration] = useState(0)
    const [violationData, setViolationData] = useState([])
    const [violationDisplay, setViolationDisplay] = useState(null)
                
    const [showDataTable, setShowDataTable] = useState(false)
    const [showTrafficLightControls, setShowTrafficLightControls] = useState(false)
    const [showViolationPopUp, setShowViolationPopUp] = useState(false)
    const [dataTable, setDataTable] = useState([])
    const [currentSummaryData, setCurrentSummaryData] = useState(0)
    const [page, setPage] = useState(1)
    const [dateFilter, setDateFilter] = useState(null)
    const [approachFilter, setApproachFilter] = useState(0)

    
    useEffect(() => {
        if(!showDataTable){
            setPage(1)
        }
    }, [showDataTable])

    useEffect(() => {
        const handleSummaryData = async () => {
            const summaryResponse = await getSummaryData(dateFilter)
            const summaryData = await summaryResponse.json()
            setCurrentSummaryData(summaryData) 
        }

        handleSummaryData()
    }, [dateFilter])

    useEffect(() => {
        let isRunning = true
        let shortPollTimeout = null
        let trafficLightPollTimeout = null
        let violationPollTimeout = null
        let chartPollTimeout = null

        const loadConfiguration = async () => {
            try {
                const [densityConfigResponse, flowConfigurationResponse] = await Promise.all([
                    getDensityConfig(),
                    getFlowConfig(),
                ])
                const [densityConfigData, flowConfigurationData] = await Promise.all([
                    densityConfigResponse.json(),
                    flowConfigurationResponse.json(),
                ])

                if (!isRunning) return

                setDensityConfiguration(densityConfigData)
                setFlowConfiguration(flowConfigurationData)
            } catch (error) {
                console.error(error)
            }
        }
        
        const shortPoll = async () => {
            if (!isRunning) return 

            try {
                const cameraStatsStarted = performance.now()
                const [stopStatResponse, stolStatResponse, stocStatResponse, stosStatResponse] = await Promise.all([
                    getStopStatData(),
                    getStolStatData(),
                    getStocStatData(),
                    getStosStatData(),
                ])
                const [stopStatJson, stolStatJson, stocStatJson, stosStatJson] = await Promise.all([
                    stopStatResponse.json(),
                    stolStatResponse.json(),
                    stocStatResponse.json(),
                    stosStatResponse.json(),
                ])

                if (PERF_LOGGING) {
                    console.info(`[PERF] camera stats: ${(performance.now() - cameraStatsStarted).toFixed(1)}ms`)
                }

                if (!isRunning) return

                setStopVehicleNumbers(stopStatJson.vehicleCount)
                setStolVehicleNumbers(stolStatJson.vehicleCount)
                setStocVehicleNumbers(stocStatJson.vehicleCount)
                setStosVehicleNumbers(stosStatJson.vehicleCount)
            } catch (error) {
                console.error(error)
            }

            if (isRunning) {
                shortPollTimeout = window.setTimeout(shortPoll, 2000)
            }
        }

        const pollTrafficLight = async () => {
            if (!isRunning) return

            const requestStarted = Date.now() / 1000
            const trafficStateStarted = performance.now()
            try {
                const tltResponse = await getTrafficLightData()
                const responseReceived = Date.now() / 1000
                const tltData = await tltResponse.json()

                if (PERF_LOGGING) {
                    console.info(`[PERF] traffic state: ${(performance.now() - trafficStateStarted).toFixed(1)}ms`)
                }

                if (!isRunning) return

                const stateVersion = Number(tltData.state_version)
                if (!Number.isFinite(stateVersion)
                    || !Number.isFinite(tltData.server_timestamp)
                    || !Array.isArray(tltData.approaches)) {
                    throw new Error('Traffic-light response is missing timing metadata')
                }
                const isStale = stateVersion < latestTrafficResponse.current.stateVersion
                    || (stateVersion === latestTrafficResponse.current.stateVersion
                        && requestStarted < latestTrafficResponse.current.requestStarted)
                if (isStale) return

                const browserTimeAtServerResponse = (requestStarted + responseReceived) / 2
                latestTrafficResponse.current = {stateVersion, requestStarted}
                setTrafficTiming({
                    approaches: tltData.approaches,
                    clockOffset: tltData.server_timestamp - browserTimeAtServerResponse,
                    serverTimestamp: tltData.server_timestamp,
                    stateVersion,
                    controllerPhase: tltData.controller_phase,
                    phaseRemainingSeconds: tltData.phase_remaining_seconds,
                })
                if (PERF_LOGGING) {
                    const estimatedServerNow = Date.now() / 1000
                        + tltData.server_timestamp - browserTimeAtServerResponse
                    console.info('[TIMER SYNC]', {
                        stateVersion,
                        approaches: tltData.approaches.map((approach) => ({
                            approach: approach.approach,
                            backendRemaining: approach.remaining_seconds,
                            endsAt: approach.ends_at,
                            localRemaining: Math.max(
                                0,
                                approach.remaining_seconds
                                    - (estimatedServerNow - tltData.server_timestamp),
                            ),
                        })),
                    })
                }
                setApproachStates(tltData.state)
                setCurrentConfiguration(tltData.currentConfiguration)
                setTimerConfiguration(tltData.currentConfiguration)
            } catch (error) {
                console.error(error)
            }

            if (isRunning) {
                trafficLightPollTimeout = window.setTimeout(pollTrafficLight, 1000)
            }
        }

        const pollViolations = async () => {
            if (!isRunning) return

            try {
                const violationsStarted = performance.now()
                const violationDataResponse = await getViolationData()
                const violationData = await violationDataResponse.json()

                if (PERF_LOGGING) {
                    console.info(`[PERF] violations: ${(performance.now() - violationsStarted).toFixed(1)}ms`)
                }

                if (!isRunning) return

                setViolationData(violationData)
                setViolationDisplay((currentViolation) => currentViolation ?? violationData[0] ?? null)
            } catch (error) {
                console.error(error)
            }

            if (isRunning) {
                violationPollTimeout = window.setTimeout(pollViolations, 10000)
            }
        }

        const updateChartData = async () => {
            
            if(!isRunning) return
            
            try{

                const stolResponse = await stolUpdateFrontend()
                const stolData = await stolResponse.json()

                const stopResponse = await stopUpdateFrontend()
                const stopData = await stopResponse.json()

                const stocResponse = await stocUpdateFrontend()
                const stocData = await stocResponse.json()

                const stosResponse = await stosUpdateFrontend()
                const stosData = await stosResponse.json()

                const forecastResponse = await getTrafficForecast()
                const forecastData = await forecastResponse.json()
                // console.log("LSPU",stolData)
                // console.log("PATIMBAO", stopData)
                // console.log("COMPLEX", stocData)
                // console.log("SUNSTAR", stosData)

                setStolAverageVehicleSpeed(previous => {
                    if (stolData.averageVehicleSpeed){
                        return stolData.averageVehicleSpeed
                    }else{
                        return 0
                    }
                })

                setStopAverageVehicleSpeed(previous => {
                    if (stopData.averageVehicleSpeed){
                        return stopData.averageVehicleSpeed
                    }else{
                        return 0
                    }
                })

                setStocAverageVehicleSpeed(previous => {
                    if (stocData.averageVehicleSpeed){
                        return stocData.averageVehicleSpeed
                    }else{
                        return 0
                    }   
                })

                setStosAverageVehicleSpeed(previous => {
                    if (stosData.averageVehicleSpeed){
                        return stosData.averageVehicleSpeed
                    }else{
                        return 0
                    }
                })

                setStolStatData(stolData)
                setStopStatData(stopData)
                setStocStatData(stocData)
                setStosStatData(stosData)

                setStolIllegalParkingList(stolData.illegalParkingList)
                setStopIllegalParkingList(stopData.illegalParkingList)
                setStocIllegalParkingList(stocData.illegalParkingList)
                setStosIllegalParkingList(stosData.illegalParkingList)

                setDensityData([
                    {"loc" : "LSPU", "density" : stolData.density, "forecast" : Number(forecastData.trafficForecast[0][0][0])},
                    {"loc" : "PATIMBAO", "density" : stopData.density, "forecast" : Number(forecastData.trafficForecast[0][0][1])},
                    {"loc" : "SUNSTAR",  "density" : stosData.density, "forecast" : Number(forecastData.trafficForecast[0][0][2])},
                    {"loc" : "COMPLEX", "density" : stocData.density, "forecast" : Number(forecastData.trafficForecast[0][0][3])},
                ])

            }catch(error){
                console.error()
            }

            if(isRunning){
                chartPollTimeout = window.setTimeout(updateChartData, 30000)
            }
        }
        loadConfiguration()
        shortPoll()
        pollTrafficLight()
        pollViolations()
        updateChartData()

        return () => {
            isRunning = false
            if (shortPollTimeout !== null) clearTimeout(shortPollTimeout)
            if (trafficLightPollTimeout !== null) clearTimeout(trafficLightPollTimeout)
            if (violationPollTimeout !== null) clearTimeout(violationPollTimeout)
            if (chartPollTimeout !== null) clearTimeout(chartPollTimeout)
        }

    }, [])
    return (
        <div className="flex flex-col md:flex-row relative w-full h-[100dvh] box-border overflow-x-hidden overflow-y-auto md:overflow-hidden p-[0.1875rem] pb-15 md:pb-[0.1875rem] md:space-x-[0.125rem]">
            {showViolationPopUp && (
                <ViolationPopUp setShowViolationPopUp={setShowViolationPopUp} stolIllegalParkingList={stolIllegalParkingList}
                    stopIllegalParkingList={stopIllegalParkingList} 
                    stocIllegalParkingList={stocIllegalParkingList} 
                    stosIllegalParkingList={stosIllegalParkingList}
                    stolIllegalLoadingUnloading={stolIllegalLoadingUnloading}
                />
            )}
            {showTrafficLightControls && (
                <TrafficLightControls 
                setShowTrafficLightControls={setShowTrafficLightControls} 
                timerConfiguration={timerConfiguration} 
                densityConfiguration={densityConfiguration}
                flowConfiguration={flowConfiguration}/>
            )}
            {/* GRID 1 */}
            <SideBar compact />
            <div className="order-2 md:order-none w-full h-48 shrink-0 md:w-[16.5vw] md:min-w-45 md:h-full md:min-h-0 md:shrink-0 flex flex-col justify-between overflow-hidden bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)]">
                {/* <StatCard loc={"Sambat to Patimbao"} statData={stopStatData} vehicleNumbers={stopVehicleNumbers} averageVehicleSpeed={stopAverageVehicleSpeed} condition={approachStates[1]}/> */}
                <ViolationMonitoring violationData={violationData} setViolationDisplay={setViolationDisplay} />
            </div>
            

            {/* Grid 2 */}
            <div className="order-1 md:order-none h-auto min-w-0 min-h-0 flex-none md:flex-1 flex flex-col overflow-visible md:h-full md:overflow-hidden px-[0.1875rem] gap-1.5 md:gap-1">

                {/* MAP */}
                <div className="relative bg-white text-center h-[41.25vh] min-h-0 md:h-[315px] lg:h-auto lg:min-h-0 lg:flex-1">
                    <TrafficMap>
                        <ApproachCards approachStates={approachStates} trafficTiming={trafficTiming} stolStatData={stolStatData} stopStatData={stopStatData} stocStatData={stocStatData} stosStatData={stosStatData}/>
                    </TrafficMap>
                    <VideoStream />
                </div>

                {/* VIOLATION AND LINECHART */}
                <div className="flex flex-col mb-1.5 sm:mb-0 lg:flex-row lg:h-[clamp(172.5px,21dvh,225px)] lg:min-h-0 lg:flex-none gap-1.5 lg:space-x-1.5 overflow-hidden">
                    <div className="order-3 lg:order-none bg-white min-h-42 lg:h-full lg:min-h-0 min-w-0 flex-1 shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)]">
                        <ViolationDataDisplay violationDisplay={violationDisplay}/>
                    </div>
                    <div className="order-1 lg:order-none bg-white min-h-[18rem] sm:min-h-[16.5rem] lg:h-full lg:min-h-0 min-w-0 flex-2 shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)]">
                        <StatCard approachFilter={approachFilter} setApproachFilter={setApproachFilter} setDateFilter={setDateFilter} dateFilter={dateFilter} vehicleNumbers={stolVehicleNumbers} averageVehicleSpeed={stolAverageVehicleSpeed} condition={approachStates[0]}/>
                    </div>

                    {/* SUMMARY */}
                    <div className="order-2 lg:order-none flex-1 min-h-48 lg:h-full lg:min-h-0 min-w-0 bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)]">
                        <SummaryCard currentSummaryData={currentSummaryData} flowConfiguration={flowConfiguration} densityConfiguration={densityConfiguration}/>
                    </div>
                </div>
            </div>
        </div>
    )
}
