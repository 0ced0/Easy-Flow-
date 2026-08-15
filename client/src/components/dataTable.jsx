import {getAllRows} from "../hooks/api" 
import {useEffect, useState} from "react"

export default function DataTable({setShowDataTable}) {
    const [allDataRows, setAllDataRows] = useState([])
    useEffect(() => {
        const displayAllRows = async () => {
            const dtResponse = await getAllRows()
            const dtData = await dtResponse.json()
            setAllDataRows(dtData)
        }
        
        displayAllRows()
    }, [])
    
    return(
        <div className="popUpRoot">
            <div className="popUpBackground"></div>
            <div className="popUpContainer">
                <div className="flex gap-5 border-b pb-3 px-5 border-[#D9D9D9]">
                    <h1 className="opacity-[80%]">Sambat to LSPU</h1>
                    <div className="rounded-[15px] gap-4 grid grid-cols-2 px-4 py-2 bg-[#0000FF]/40">
                        <button className="rounded-[8px] bg-white flex gap-2 justify-between px-4 py-1 hover:bg-black/10">
                            Date
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>

                        </button>
                        <button className="rounded-[8px] bg-white flex gap-2 justify-between px-4 py-1 hover:bg-black/10">
                            Interval
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>
                    </div>
                    <button onClick={() => {setShowDataTable(false)}} className="ml-auto mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8 hover:stroke-red-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                    </button>

                </div>
                <div className="pt-4 mb-5 opacity-[50%] grid grid-cols-5 mx-auto place-items-center">
                    <h3>Date</h3>
                    <h3>Time</h3>
                    <h3>Number of Vehicles</h3>
                    <h3>Vehicle Flow</h3>
                    <h3>Spatial Density</h3>
                </div>
                {Object.entries(allDataRows).map(([id, row]) => {
                    return(
                    <div key={id} className="bg-white py-4 grid grid-cols-5 place-items-center">
                        <h3>{row.date}</h3>
                        <h3>{row.time}</h3>
                        <h3>{row.vehicleCount}</h3>
                        <h3>{row.flow}</h3>
                        <h3>{row.density}</h3>
                    </div>
                    )
                })}

                
                
            </div>
        </div>
    )
}