import '../styles/mainDashboard.css'
import StatCard from '../components/statCards.jsx'
import IntersectionModel from '../components/intersectionModel.jsx'
import { VideoStream } from '../components/videoStream.jsx'
// import { useEffect, useState } from 'react'


export default function MainDashboard() {
    // const [frame, setFrame] = useState(null)


    // useEffect(() => {
    //     const video = async () => {
    //         const response = await streamVideo()
    //         const data = await response.blob()
    //         const frameUrl = await URL.createObjectURL(data)
    //         console.log(frameUrl)
    //         setFrame(frameUrl)
    //     }

    //     video()

    // }, [])

    return (
        <div className="flex space-x-1 m-1 h-[98vh]">
            <div className="w-[40%] min-h-0 p-4 h-full text-center">
                <IntersectionModel />
            </div>

            {/* Grid 2 */}
            <div className="w-[30%] flex flex-col justify-between p-1 gap-3 ">

                {/* Stream */}
                <div>
                    <VideoStream />
                </div>

                {/* Stat 1 */}
                <StatCard />

                {/* Stat 2 */}
                <StatCard />
            </div>


            {/* Grid 3 */}
            <div className="w-[30%] flex flex-col justify-between p-1 gap-3">

                {/* Stream */}
                <div>
                    <VideoStream />
                </div>

                {/* Stat 1 */}
                <StatCard />

                {/* Stat 2 */}
                <StatCard />
            </div>
        </div>
    )
}