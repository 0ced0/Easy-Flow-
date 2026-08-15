import '../styles/mainDashboard.css'
import StatCard from '../components/statCards.jsx'
import IntersectionModel from '../components/intersectionModel.jsx'
import DensityChart from '../components/densityChart.jsx'
import TrafficLightTimers from '../components/trafficLightTimers.jsx'
import ViolationMonitoring from '../components/violationMonitoring.jsx'
import DataTable from '../components/dataTable.jsx'
import TrafficLightControls from '../components/trafficLightControls.jsx'

import { VideoStream } from '../components/videoStream.jsx'
import { useEffect, useState } from 'react'
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
    const [showDataTable, setShowDataTable] = useState(false)
    const [showTrafficLightControls, setShowTrafficLightControls] = useState(false)

    useEffect(() => {
        let isRunning = true
        
        const shortPoll = async () => {
            if (!isRunning) return 

            try{VideoStream
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

                setStopVehicleNumbers(stopStatJson.vehicleCount)
                setStolVehicleNumbers(stolStatJson.vehicleCount)
                setStocVehicleNumbers(stocStatJson.vehicleCount)
                setStosVehicleNumbers(stosStatJson.vehicleCount)

                setTrafficLightData([tltData.trafficLightData, tltData.allowedApproach])
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

                setStolStatData(stolData.chartData)
                setStopStatData(stopData.chartData)
                setStocStatData(stocData.chartData)
                setStosStatData(stosData.chartData)

                setStolIllegalParkingList(stolData.illegalParkingList)
                setStopIllegalParkingList(stopData.illegalParkingList)
                setStocIllegalParkingList(stocData.illegalParkingList)
                setStosIllegalParkingList(stosData.illegalParkingList)

                // setStolIllegalLoadingUnloading({1 : 
                //     {"cameraId" : 1, 
                //     "violationType" : 1,
                //     "motion" : false, 
                //     "vehicle" : "Car", 
                //     "vehicleCenter" : (100,100), 
                //     "violationStatus" : 2}})

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

        // const function 

        shortPoll()
        updateChartData()

        return () => {
            clearTimeout(shortPoll)
            clearTimeout(updateChartData)
            // URL.revokeObjectURL(frame)
            isRunning = false
        }

    }, [])

    return (
        <div className="flex relative space-x-1 m-1 h-[98vh]">

            {showDataTable && (
                <DataTable setShowDataTable={setShowDataTable}/>
            )}
            {showTrafficLightControls && (
                <TrafficLightControls setShowTrafficLightControls={setShowTrafficLightControls}/>
            )}
            <div className="flex flex-col justify-between gap-5 w-[40%] px-3 pt-2 max-h-[97.5vh] rounded-[15px]">
                <VideoStream setShowDataTable={setShowDataTable} setShowTrafficLightControls={setShowTrafficLightControls}/>
                <ViolationMonitoring stolIllegalParkingList={stolIllegalParkingList} 
                stopIllegalParkingList={stopIllegalParkingList} 
                stocIllegalParkingList={stocIllegalParkingList} 
                stosIllegalParkingList={stosIllegalParkingList}
                stolIllegalLoadingUnloading={stolIllegalLoadingUnloading}/>
            </div>
            

            {/* Grid 2 */}
            <div className="w-[30%] flex flex-col justify-between p-1 gap-3">

                {/* Traffic Light Timers */}
                <div>
                    <TrafficLightTimers trafficLightData={trafficLightData}/>
                </div>

                {/* Stat 1 */}
                <StatCard loc={"Sambat to Lspu"} statData={stolStatData} vehicleNumbers={stolVehicleNumbers} averageVehicleSpeed={stolAverageVehicleSpeed}/>

                {/* Stat 2 */}
                <StatCard loc={"Sambat to Patimbao"} statData={stopStatData} vehicleNumbers={stopVehicleNumbers} averageVehicleSpeed={stopAverageVehicleSpeed}/>
            </div>


            {/* Grid 3 */}
            <div className="w-[30%] flex flex-col justify-between p-1 gap-3">

                {/* Density and Occupancy Chart  */}
                <div className="gap-2 pt-2.5 bg-white shadow-[0_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[15px] ">
                    <DensityChart densityData={densityData}/>                    
                </div>

                {/* Stat 1 */}
                <StatCard loc={"Sambat to Sunstar"} statData={stosStatData} vehicleNumbers={stosVehicleNumbers} averageVehicleSpeed={stosAverageVehicleSpeed}/>

                {/* Stat 2 */}
                <StatCard loc={"Sambat to Complex"} statData={stocStatData} vehicleNumbers={stocVehicleNumbers} averageVehicleSpeed={stocAverageVehicleSpeed}/>
            </div>
        </div>
    )
}