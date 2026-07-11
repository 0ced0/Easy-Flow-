import '../styles/mainDashboard.css'
import StatCard from '../components/statCards.jsx'
import IntersectionModel from '../components/intersectionModel.jsx'
import DensityChart from '../components/densityChart.jsx'
import OccupancyChart from '../components/occupancyChart.jsx'
import TrafficLightTimers from '../components/trafficLightTimers.jsx'

import { VideoStream } from '../components/videoStream.jsx'
import { useEffect, useState } from 'react'
import {getStobStatData, getStopStatData, stobUpdateFrontend, stopUpdateFrontend} from '../hooks/api'
import { BarChart } from 'recharts'


export default function MainDashboard() {
    const [stopVehicleNumbers, setStopVehicleNumbers] = useState(0)
    const [stobVehicleNumbers, setStobVehicleNumbers] = useState(0)
    const [statData, setStatData] = useState()
    const [averageVehicleSpeed, setAverageVehicleSpeed] = useState(0)
    const [densityData, setDensityData] = useState([
                    {"loc" : "BUK.", "den" : 0},
                    {"loc" : "PAT.", "den" : 0},
                    {"loc" : "COM.", "den" : 0},
                    {"loc" : "SUN.",  "den" : 0},
                ])
    // const [frame, setFrame] = useState(null)


    useEffect(() => {
        let isRunning = true
        
        const chartData = async () => {
            if (!isRunning) return 

            try{
                const stopStatResponse = await getStopStatData()
                const stopStatJson = await stopStatResponse.json()

                const stobStatResponse = await getStobStatData()
                const stobStatJson = await stobStatResponse.json()
                
                setStopVehicleNumbers(stopStatJson.vehicleCount);
                setStobVehicleNumbers(stobStatJson.vehicleCount)
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
                const response = await stobUpdateFrontend()
                const data = await response.json()
                console.log(data)

                setAverageVehicleSpeed(previous => {
                    if (data.averageVehicleSpeed){
                        return data.averageVehicleSpeed
                    }else{
                        return 0
                    }
                })

                setStatData(data.chartData)
                setDensityData([
                    {"loc" : "BUK.", "den" : data.density},
                    {"loc" : "PAT.", "den" : 5},
                    {"loc" : "COM.", "den" : 10},
                    {"loc" : "SUN.",  "den" : 15},
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
            <div className="flex-row space-y-5 w-[40%] p-4 h-[97vh] text-center rounded-[15px]">
            {/* <IntersectionModel/> */}
                <VideoStream />
                <VideoStream />
            </div>
            

            {/* Grid 2 */}
            <div className="w-[30%] flex flex-col justify-between p-1 gap-3">

                {/* Traffic Light Timers */}
                <div>
                    <TrafficLightTimers />
                </div>

                {/* Stat 1 */}
                <StatCard statData={statData} vehicleNumbers={stobVehicleNumbers} averageVehicleSpeed={averageVehicleSpeed}/>

                {/* Stat 2 */}
                <StatCard statData={statData} vehicleNumbers={stobVehicleNumbers} averageVehicleSpeed={averageVehicleSpeed}/>
            </div>


            {/* Grid 3 */}
            <div className="w-[30%] flex flex-col justify-between p-1 gap-3">

                {/* Density and Occupancy Chart  */}
                <div className="grid grid-cols-2 gap-2 p-2 pb-0 h-[30vh] bg-white shadow-[0_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[15px] ">
                    <DensityChart densityData={densityData}/>                    
                    <OccupancyChart/>
                </div>

                {/* Stat 1 */}
                <StatCard statData={statData} vehicleNumbers={stopVehicleNumbers} averageVehicleSpeed={averageVehicleSpeed}/>

                {/* Stat 2 */}
                <StatCard statData={statData} vehicleNumbers={stopVehicleNumbers} averageVehicleSpeed={averageVehicleSpeed}/>
            </div>
        </div>
    )
}