import SideBar from '../components/sideBar.jsx'
import TrafficLightControls from '../components/trafficLightControls.jsx'
import '../styles/trafficLightControls.css'
import {useState, useEffect} from 'react'
import {getTrafficLightData, getDensityConfig, getFlowConfig} from '../hooks/api.js'

export default function  TrafficLightControlsPage() {
    const [timerConfiguration, setTimerConfiguration] = useState(0)
    const [densityConfiguration, setDensityConfiguration] = useState(0)
    const [flowConfiguration, setFlowConfiguration] = useState(0)

    useEffect(() => {
        const firstPoll = async () => {

            const tltResponse = await getTrafficLightData()
            const tltData = await tltResponse.json()

            const densityConfigResponse = await getDensityConfig()
            const densityConfigData = await densityConfigResponse.json()

            const flowConfigurationResponse = await getFlowConfig()
            const flowConfigurationData = await flowConfigurationResponse.json()
            
            // console.log(tltData.currentConfiguration)
            setTimerConfiguration(tltData.currentConfiguration)
            setDensityConfiguration(densityConfigData)
            setFlowConfiguration(flowConfigurationData)
            // console.log(timerConfiguration)
        }

        firstPoll()
    }, [])

    // console.log(flowConfiguration)
    try{ 

        return(
            <div className="flex flex-col md:flex-row relative w-full h-[100dvh] box-border overflow-hidden p-1 pb-20 md:pb-1 md:space-x-0.5">
                <SideBar/>
                <TrafficLightControls timerConfiguration={timerConfiguration} densityConfiguration={densityConfiguration} flowConfiguration={flowConfiguration}/>
            </div>
        )
    }catch(error){
        console.error(error)
    }
}
