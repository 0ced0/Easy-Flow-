import {getAllRows} from "../hooks/api" 
import {useEffect, useState, useRef} from "react"

export default function DataTable({setCamera_id, dataTable, tableId, setDailyData, setPage, page}) {
    try{
        const [dateFilter, setDateFilter] = useState(null)

        const nextPage = page + 1
        const prevPage = page - 1

        const handlePage = async (action) => {
            if (action === 1){
                const response = await getAllRows(tableId, nextPage, dateFilter)
                const data = await response.json()
                
                if (data.length >= 1){
                    setDailyData(data)
                    setPage(prev => nextPage)
                }
            }
            else if (action === 0 && page > 1){
                const response = await getAllRows(tableId, prevPage, dateFilter)
                const data = await response.json()
                
                if (data.length >= 1){
                    setPage(prevPage)
                    setDailyData(data)
                } 
            }
        }

        const handleDateFilter = async (event) => {
            try{
                setDateFilter(event.target.value)
                setPage(1)
                const response = await getTrafficData(tableId, 1, event.target.value)
                const data = await response.json()
                setDailyData(data)
            }catch(error){
                console.error(error)
            }
        }
         
        // console.log(dataTable)

        return(
            <div className="popUpRoot">
                <div className="popUpBackground"></div>
                <div className="popUpContainer relative min-w-[40rem] lg:min-w-0">
                    <div className="flex gap-5 mb-3 border-b px-3 sm:px-5 border-[#D9D9D9] h-14 sm:h-[7vh] items-center">

                        {/* <h1 className="opacity-[80%]">{approaches[(tableId -1)]}</h1> */}
                        {/* <button onClick={() => {setShowDateDropDown(prev => !prev)}} className="shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[8px] bg-white flex gap-2 justify-between items-center px-4 py-1 hover:bg-black/10">
                            Date
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`size-6 transition-transform duration-200 ${showDateDropDown ? "rotate-180" : "rotate-0"}`}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>
                        {showDateDropDown &&
                            <input onChange={(event) => {handleDateFilter(event)}} type="date"
                                className="absolute z-100 shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] left-68 bg-white top-16 p-2 w-[18%]">
                            </input>
                        } */}
                        
                    </div>
                    <div className="pt-4 mb-2 opacity-[50%] grid grid-cols-4 gap-2 mx-auto place-items-center text-xs sm:text-sm">
                        <h3>Date</h3>
                        <h3>Number of Vehicles</h3>
                        <h3>Vehicle Flow</h3>
                        <h3>Spatial Density</h3>
                    </div>

                    {dataTable.length >= 1 ? 
                        dataTable.map((row, id) => {
                            return(
                            <div key={id} className="text-xs sm:text-[0.8rem] bg-white py-4 grid grid-cols-4 gap-2 place-items-center">
                                <h3>{row.date}</h3>
                                <h3>{row.vehicleCount}</h3>
                                <h3>{row.averageFlow} veh/hr</h3>
                                <h3>{row.averageDensity} veh/km</h3>
                            </div>
                            )
                        }) :
                        <h3 className="mt-10 flex justify-center">No Data Available</h3> 
                    }
                    <div className="absolute top-1 right-3 sm:right-10 flex justify-center mt-2 gap-3 sm:gap-8 items-center">
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
