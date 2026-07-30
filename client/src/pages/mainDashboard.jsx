import '../styles/mainDashboard.css'
import StatCard from '../components/statCards.jsx'
import IntersectionModel from '../components/intersectionModel.jsx'
import DensityChart from '../components/densityChart.jsx'
import TrafficLightTimers from '../components/trafficLightTimers.jsx'
import ViolationMonitoring from '../components/violationMonitoring.jsx'

import { VideoStream } from '../components/videoStream.jsx'
import { useEffect, useState } from 'react'
import {getStolStatData, getStopStatData, getStocStatData, getStosStatData, stolUpdateFrontend, stopUpdateFrontend, stocUpdateFrontend, stosUpdateFrontend} from '../hooks/api'
import { BarChart } from 'recharts'


export default function MainDashboard() {
    const [stolVehicleNumbers, setStolVehicleNumbers] = useState(0)
    const [stolStatData, setStolStatData] = useState()
    const [stolAverageVehicleSpeed, setStolAverageVehicleSpeed] = useState(0)
    
    const [stopVehicleNumbers, setStopVehicleNumbers] = useState(0)
    const [stopStatData, setStopStatData] = useState()
    const [stopAverageVehicleSpeed, setStopAverageVehicleSpeed] = useState(0)

    const [stocVehicleNumbers, setStocVehicleNumbers] = useState(0)
    const [stocStatData, setStocStatData] = useState()
    const [stocAverageVehicleSpeed, setStocAverageVehicleSpeed] = useState(0)

    const [stosVehicleNumbers, setStosVehicleNumbers] = useState(0)
    const [stosStatData, setStosStatData] = useState()
    const [stosAverageVehicleSpeed, setStosAverageVehicleSpeed] = useState(0)

    const [densityData, setDensityData] = useState([
                    {"loc" : "LSPU", "den" : 0},
                    {"loc" : "PATIMBAO", "den" : 0},
                    {"loc" : "BUBUKAL", "den" : 0},
                    {"loc" : "SUNSTAR",  "den" : 0},
                ])


    useEffect(() => {
        let isRunning = true
        
        const chartData = async () => {
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

                setStopVehicleNumbers(stopStatJson.vehicleCount)
                setStolVehicleNumbers(stolStatJson.vehicleCount)
                setStocVehicleNumbers(stocStatJson.vehicleCount)
                setStosVehicleNumbers(stosStatJson.vehicleCount)
                // console.log(stolStatJson)

            }catch(error){
                console.error(error)
            }

            if (isRunning){
                setTimeout(chartData, 80)
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

                console.log("LSPU", stolData)
                console.log("PATIMBAO", stopData)
                console.log("COMPLEX", stocData)
                console.log("SUNSTAR", stosData)

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
                
                setDensityData([
                    {"loc" : "LSPU", "den" : stolData.density},
                    {"loc" : "PATIMBAO", "den" : stopData.density},
                    {"loc" : "COMPLEX", "den" : stocData.density},
                    {"loc" : "SUNSTAR",  "den" : stosData.density},
                ])

            }catch(error){
                console.error()
            }

            if(isRunning){
                setTimeout(updateChartData, 30000)
            }
        }

        chartData()
        updateChartData()

        return () => {
            clearTimeout(chartData)
            clearTimeout(updateChartData)
            // URL.revokeObjectURL(frame)
            isRunning = false
        }

    }, [])


    return (
        <div className="flex space-x-1 m-1 h-[98vh]">
            <div className="flex flex-col justify-between gap-5 w-[40%] px-3 pt-5 h-[97.5vh] rounded-[15px]">
                <VideoStream/>
                <ViolationMonitoring />
            </div>
            

            {/* Grid 2 */}
            <div className="w-[30%] flex flex-col justify-between p-1 gap-3">

                {/* Traffic Light Timers */}
                <div>
                    <TrafficLightTimers />
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