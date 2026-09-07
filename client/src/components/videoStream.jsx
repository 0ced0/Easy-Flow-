import { useEffect, useState, useRef } from 'react'
import "../styles/videoStream.css"


export const VideoStream = ({handleRequestDataTable, setShowTrafficLightControls, setShowViolationPopUp}) => {
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

        function handleSelectApproach(approach) {
            handleRequestDataTable(approach)
            setShowDataDropdown(false)
        }

        return (

            <div className="absolute p-0.5 bg-black/70 top-0 right-0 z-300 grid shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] max-h-[50vh] h-[35vh] max-w-[20vw]">
            
                <div className="gap-0 overflow-hidden">
                    <img src={'http://127.0.0.1:5000/stol_stream_video'} className="h-full w-full" />
                </div>
                <div className="grid grid-cols-3 gap-0 overflow-hidden">
                    <img src={'http://127.0.0.1:5000/stos_stream_video'} className="h-full w-[100%]" />
                    <img src={'http://127.0.0.1:5000/stop_stream_video'} className="h-full w-[100%]" />
                    <img src={'http://127.0.0.1:5000/stoc_stream_video'} className="h-full w-[100%]" />
                </div>
            </div>
        )
    }catch(error){
        console.error(error)
    }
}