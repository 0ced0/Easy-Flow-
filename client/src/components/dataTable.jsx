import {getAllRows} from "../hooks/api" 
import {useEffect, useState, useRef} from "react"

export default function DataTable({setShowDataTable, dataTable, tableId, setDataTable, setPage, page}) {
    
    try{
        const approaches = ["Sambat to LSPU", "Sambat to Patimbao", "Sambat to Sunstar", "Sambat to Complex"]
        
        const [dateFilter, setDateFilter] = useState(null)
        const [showDateDropDown, setShowDateDropDown] = useState(false)

        const dateDropDownRef = null

        const nextPage = page + 1
        const prevPage = page - 1
        const handlePage = async (action) => {
            if (action === 1){
                const response = await getAllRows(tableId, nextPage, dateFilter)
                const data = await response.json()
                
                if (data.length >= 1){
                    setDataTable(data)
                    setPage(prev => nextPage)
                }
            }
            else if (action === 0 && page > 1){
                const response = await getAllRows(tableId, prevPage, dateFilter)
                const data = await response.json()
                
                if (data.length >= 1){
                    setPage(prevPage)
                    setDataTable(data)
                } 
            }
        }

        const handleDateFilter = async (event) => {
            try{
                setDateFilter(event.target.value)
                setPage(1)
                const response = await getAllRows(tableId, 1, event.target.value)
                const data = await response.json()
                setDataTable(data)
            }catch(error){
                console.error(error)
            }
        }

        // function handleShowDateFilter() {
            
        // }
        
        // console.log(dataTable)

        return(
            <div className="popUpRoot">
                <div className="popUpBackground"></div>
                <div className="popUpContainer relative">
                    <div className="flex gap-5 pb-3 mb-3 border-b px-5 border-[#D9D9D9]">
                        <h1 className="opacity-[80%]">{approaches[(tableId -1)]}</h1>
                        <button onClick={() => {setShowDateDropDown(prev => !prev)}} className="shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[8px] bg-white flex gap-2 justify-between items-center px-4 py-1 hover:bg-black/10">
                            Date
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`size-6 transition-transform duration-200 ${showDateDropDown ? "rotate-180" : "rotate-0"}`}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>
                        {showDateDropDown &&
                            <input onChange={(event) => {handleDateFilter(event)}} type="date"
                                className="absolute z-100 shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] left-68 bg-white top-16 p-2 w-[18%]">
                            </input>
                        }
                        
                        <button onClick={() => {setShowDataTable(false)}} className="ml-auto mr-4">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8 hover:stroke-red-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </button>
                    </div>
                    <div className="pt-4 mb-2 opacity-[50%] grid grid-cols-5 mx-auto place-items-center">
                        <h3>Date</h3>
                        <h3>Time</h3>
                        <h3>Number of Vehicles</h3>
                        <h3>Vehicle Flow</h3>
                        <h3>Spatial Density</h3>
                    </div>

                    {dataTable.length >= 1 ? 
                        dataTable.map((row, id) => {
                            return(
                            <div key={id} className="bg-white py-4 grid grid-cols-5 place-items-center">
                                <h3>{row.date}</h3>
                                <h3>{row.time}</h3>
                                <h3>{row.vehicleCount}</h3>
                                <h3>{row.flow} veh/hr</h3>
                                <h3>{row.density} veh/km</h3>
                            </div>
                            )
                        }) :
                        <h3 className="mt-10 flex justify-center">No Data Available</h3> 
                    }
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex justify-center mt-2 gap-8 items-center">
                        <button onClick={() => {handlePage(0)}} className="shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] p-1 hover:bg-black/20 hover:shadow-none">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                            </svg>
                        </button>

                        <div className="w-[5%] max-w-[5%] text-center">{page}</div>
                        {/* <div className="">2</div>
                        <div className="">3</div> */}

                        <button onClick={() => handlePage(1)} className="shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] p-1 hover:bg-black/20 hover:shadow-none">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        )
    }
    catch(error){
        console.error(error)
    }

}