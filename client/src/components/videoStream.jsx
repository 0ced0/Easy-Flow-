import { useEffect, useState, useRef } from 'react'
import "../styles/videoStream.css"


export const VideoStream = ({setShowDataTable, setShowTrafficLightControls}) => {
    try{
        const [showDataDropdown, setShowDataDropdown] = useState(false)
   

        const dataDropdownRef = useRef(null)
        const dataDropdownButtonRef = useRef(null)

        useEffect(() => {
            function handleDataClickOutside(event) {
                if (dataDropdownRef.current &&
                    !dataDropdownRef.current.contains(event.target) &&
                    !dataDropdownButtonRef.current.contains(event.target) 
                ) {
                    setShowDataDropdown(false)
                }
            }

            addEventListener("mousedown", handleDataClickOutside)
        }, [])

        return (

            <div className="grid max-h-[45vh]">
                <div className="relative bg-[#0000FF]/20 flex justify-start mb-2 rounded-[8px] shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] w-[100%] p-1">
                        <button ref={dataDropdownButtonRef} onClick={() => setShowDataDropdown(previous => !previous)} className="videoStreamButton rounded-[8px]">
                            <div className="px-5 rounded-[8px]">
                                Data
                            </div>
                        </button>
                        <button onClick={() => setShowTrafficLightControls(previous => !previous)} className="videoStreamButton rounded-[8px]">
                            <div className="px-5 rounded-[8px]">
                                Timer Control
                            </div>
                        </button>

                        {showDataDropdown &&(
                            <div ref={dataDropdownRef} className="absolute bg-white w-[30vh] left-1 top-12 flex flex-col">
                                <button onClick={() => {setShowDataTable(true)}} className="videoStreamButton">Sambat to LSPU</button>
                                <button onClick={() => {setShowDataTable(true)}} className="videoStreamButton">Sambat to Patimbao</button>
                                <button onClick={() => {setShowDataTable(true)}} className="videoStreamButton">Sambat to Complex</button>
                                <button onClick={() => {setShowDataTable(true)}} className="videoStreamButton">Sambat to Sunstar</button>
                            </div>
                        )}

                </div>
                <div className="grid grid-cols-2 gap-0 overflow-hidden">
                    <img src={'http://127.0.0.1:5000/stol_stream_video'} className="h-full" />
                    <img src={'http://127.0.0.1:5000/stos_stream_video'} className="h-full" />
                </div>
                <div className="grid grid-cols-2 gap-0 overflow-hidden">
                    <img src={'http://127.0.0.1:5000/stop_stream_video'} className="h-full" />
                    <img src={'http://127.0.0.1:5000/stoc_stream_video'} className="h-full" />
                </div>
            </div>
        )
    }catch(error){
        console.error(error)
    }
}