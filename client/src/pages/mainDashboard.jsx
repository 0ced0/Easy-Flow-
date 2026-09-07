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
import { useEffect, useEffectEvent, useState } from 'react'
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
    const [trafficLightData, setTrafficLightData] = useState(0)
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
            console.log("happened")
            const summaryResponse = await getSummaryData(dateFilter)
            const summaryData = await summaryResponse.json()
            console.log(summaryData)
            setCurrentSummaryData(summaryData) 
        }

        handleSummaryData()
    }, [dateFilter])

    useEffect(() => {
        let isRunning = true

        const initialize = async () => {
            const violationDataResponse = await getViolationData()
            const violationData = await violationDataResponse.json()

            setViolationDisplay(violationData[0])
        }
        
        const shortPoll = async () => {
            if (!isRunning) return 

            try{
                const stopStatResponse = await getStopStatData()
                const stopStatJson = await stopStatResponse.json()

                const stolStatResponse = await getStolStatData()
                const stolStatJson = await stolStatResponse.json()
                
                const stocStatResponse =  await getStocStatData()
                const stocStatJson = await stocStatResponse.json()

                const stosStatResponse =  await getStosStatData()
                const stosStatJson = await stosStatResponse.json()

                const tltResponse = await getTrafficLightData()
                const tltData = await tltResponse.json()

                const densityConfigResponse = await getDensityConfig()
                const densityConfigData = await densityConfigResponse.json()

                const flowConfigurationResponse = await getFlowConfig()
                const flowConfigurationData = await flowConfigurationResponse.json()

                const violationDataResponse = await getViolationData()
                const violationData = await violationDataResponse.json()

                setStopVehicleNumbers(stopStatJson.vehicleCount)
                setStolVehicleNumbers(stolStatJson.vehicleCount)
                setStocVehicleNumbers(stocStatJson.vehicleCount)
                setStosVehicleNumbers(stosStatJson.vehicleCount)
                setViolationData(violationData)


                setTrafficLightData([tltData.trafficLightData, tltData.allowedApproach])
                setApproachStates(tltData.state)
                setCurrentConfiguration(tltData.currentConfiguration)
                setTimerConfiguration(tltData.currentConfiguration)
                setDensityConfiguration(densityConfigData)
                setFlowConfiguration(flowConfigurationData)
            }catch(error){
                console.error(error)
            }

            if (isRunning){
                setTimeout(shortPoll, 80)
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
                setTimeout(updateChartData, 30000)
            }
        }
        shortPoll()
        updateChartData()
        initialize()

        return () => {
            clearTimeout(shortPoll)
            clearTimeout(updateChartData)
            // URL.revokeObjectURL(frame)
            isRunning = false
        }

    }, [])
    return (
        <div className="flex relative m-1 h-[98vh] space-x-0.5">
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
            <SideBar />
            <div className="w-[18vw] border- flex flex-col justify-between max-h-[97.5vh] bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)]">
                {/* <StatCard loc={"Sambat to Patimbao"} statData={stopStatData} vehicleNumbers={stopVehicleNumbers} averageVehicleSpeed={stopAverageVehicleSpeed} condition={approachStates[1]}/> */}
                <ViolationMonitoring violationData={violationData} setViolationDisplay={setViolationDisplay} />
            </div>
            

            {/* Grid 2 */}
            <div className="flex-4 flex flex-col justify-between p-1 gap-1.5">

                {/* MAP */}
                <div className="relative bg-white text-center h-[80vh]">
                    <TrafficMap/>
                    <ApproachCards approachStates={approachStates} trafficLightData={trafficLightData} stolStatData={stolStatData} stopStatData={stopStatData} stocStatData={stocStatData} stosStatData={stosStatData}/>
                    <VideoStream setShowTrafficLightControls={setShowTrafficLightControls} setShowViolationPopUp={setShowViolationPopUp}/>
                </div>

                {/* VIOLATION AND LINECHART */}
                <div className="flex h-[40vh] space-x-2">
                    <div className="bg-white flex-1 shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)]">
                        <ViolationDataDisplay violationDisplay={violationDisplay}/>
                    </div>
                    <div className="bg-white flex-2 shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)]">
                        <StatCard approachFilter={approachFilter} setApproachFilter={setApproachFilter} setDateFilter={setDateFilter} dateFilter={dateFilter} vehicleNumbers={stolVehicleNumbers} averageVehicleSpeed={stolAverageVehicleSpeed} condition={approachStates[0]}/>
                    </div>

                    {/* SUMMARY */}
                    <div className="flex-1 bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)]">
                        <SummaryCard currentSummaryData={currentSummaryData} flowConfiguration={flowConfiguration} densityConfiguration={densityConfiguration}/>
                    </div>
                </div>
                {/* Traffic Light Timers */}
                {/* <div>
                    <TrafficLightTimers trafficLightData={trafficLightData}/>
                </div> */}

                {/* Stat 1 */}
                {/* <StatCard loc={"Sambat to Lspu"} statData={stolStatData} vehicleNumbers={stolVehicleNumbers} averageVehicleSpeed={stolAverageVehicleSpeed} condition={approachStates[0]}/> */}

                {/* Stat 2 */}
                {/* <StatCard loc={"Sambat to Patimbao"} statData={stopStatData} vehicleNumbers={stopVehicleNumbers} averageVehicleSpeed={stopAverageVehicleSpeed} condition={approachStates[1]}/> */}
            </div>


            {/* Grid 3 */}
            {/* <div className="w-[30%] flex flex-col justify-between p-1 gap-3"> */}

                {/* Density and Occupancy Chart  */}
                {/* <div className="mb-auto gap-2 pt-2.5 bg-white shadow-[0_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[15px]">
                    <DensityChart densityData={densityData}/>                    
                </div>

                <VideoStream handleRequestDataTable={handleRequestDataTable} setShowTrafficLightControls={setShowTrafficLightControls} setShowViolationPopUp={setShowViolationPopUp}/> */}


                {/* Stat 1 */}
                {/* <StatCard loc={"Sambat to Sunstar"} statData={stosStatData} vehicleNumbers={stosVehicleNumbers} averageVehicleSpeed={stosAverageVehicleSpeed} condition={approachStates[2]}/> */}

                {/* Stat 2 */}
                {/* <StatCard loc={"Sambat to Complex"} statData={stocStatData} vehicleNumbers={stocVehicleNumbers} averageVehicleSpeed={stocAverageVehicleSpeed} condition={approachStates[3]}/> */}
            {/* </div> */}
        </div>
    )
}