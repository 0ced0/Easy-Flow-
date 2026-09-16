import SideBar from '../components/sideBar.jsx'
import TrafficLightControls from '../components/trafficLightControls.jsx'
import '../styles/trafficLightControls.css'
import {useState, useEffect} from 'react'
import {getTrafficLightData, getDensityConfig, getFlowConfig} from '../hooks/api.js'
import PageLoading from '../components/pageLoading.jsx'

export default function  TrafficLightControlsPage() {
    const [timerConfiguration, setTimerConfiguration] = useState(0)
    const [densityConfiguration, setDensityConfiguration] = useState(0)
    const [flowConfiguration, setFlowConfiguration] = useState(0)
    const configurationReady = (
        Array.isArray(timerConfiguration?.freeflow)
        && Array.isArray(timerConfiguration?.slowdown)
        && Array.isArray(timerConfiguration?.congested)
        && densityConfiguration?.length >= 4
        && flowConfiguration?.length >= 4
    )

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
            <div className="flex flex-col md:flex-row relative w-full h-[100dvh] box-border overflow-hidden p-[0.1875rem] pb-15 md:pb-[0.1875rem] md:space-x-[0.125rem]">
                <SideBar compact />
                {configurationReady ? (
                    <TrafficLightControls timerConfiguration={timerConfiguration} densityConfiguration={densityConfiguration} flowConfiguration={flowConfiguration}/>
                ) : (
                    <PageLoading message="Loading traffic controls..." />
                )}
            </div>
        )
    }catch(error){
        console.error(error)
    }
}
