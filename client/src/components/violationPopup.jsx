import {useState, useEffect} from 'react'

export default function ViolationPopUp ({setShowViolationPopUp,
    stolIllegalParkingList,
    stopIllegalParkingList, 
    stocIllegalParkingList, 
    stosIllegalParkingList,
    stolIllegalLoadingUnloading}) {

    const compiledIllegalParkingList = [
        ...Object.entries(stolIllegalParkingList ?? {}),
        ...Object.entries(stopIllegalParkingList ?? {}),
        ...Object.entries(stocIllegalParkingList ?? {}),
        ...Object.entries(stosIllegalParkingList ?? {}),
        ...Object.entries(stolIllegalLoadingUnloading ?? {})
    ]

    const [violationFocus, setViolationFocus] = useState([])
    const [displayFrame, setDisplayFrame] = useState(null)
    const [violationVehicle, setViolationVehicle] = useState(null)
    const [violationType, setViolationType] = useState(null)

    const approaches = [
        "Sambat to LSPU",
        "Sambat to Patimbao",
        "Sambat to Sunstar",
        "Sambat to Complex"
    ]
    useEffect(() => {
        const violation = compiledIllegalParkingList.find(
            ([vehicleId, violationInformation]) =>
                violationInformation.violationStatus === 2
        )

        if (violation){
            setViolationFocus(violation)
            setDisplayFrame(violation[1].frame)
            setViolationVehicle(violation[1].vehicle)
        }

    }, [])

    console.log(violationFocus)
    try{

        return(
            <div className="popUpRoot">
                <div className="popUpBackground"></div>
                <div className="popUpContainerVM">
                    <div className="flex border-b border-[#D9D9D9] px-4 pb-2 justify-between overflow-y-auto pt-1">
                        <h1>Violation Monitoring</h1>
                        <button className="ml-5 border-none outline-none focus:outline-none focus:ring-0 shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[8px] bg-white flex gap-2 justify-between items-center px-4 py-1 hover:bg-black/10">
                            Date
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`size-6 transition-transform duration-200 "rotate-180" : "rotate-0"}`}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>
                        <button onClick={() => {setShowViolationPopUp(false)}} className="ml-auto mr-4">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8 hover:stroke-red-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </button>
                    </div>
                    <div className="h-[70vh] p-4 grid grid-cols-2">
                        <div className="px-4 flex w-[55vw] ml-10">
                            <div className="shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[15px] p-3 w-full h-full">   
                                {compiledIllegalParkingList.map(([vehicleId, violationInformation]) => {
                                    return(violationInformation.violationStatus > 1 && (
                                        <button onClick={() => {setViolationFocus([vehicleId, violationInformation])}} className="grid grid-cols-5 p-2 items-center w-[100%] m-auto hover:bg-black/10 rounded-[15px]"
                                            key={vehicleId}>
                                            {violationInformation.violationType === 2 ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" className="size-9">
                                                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                                            </svg> : 
                                            violationInformation.violationType === 1 ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="orange" class="size-9">
                                                <path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd" />
                                            </svg> : ""
                                            }

                                            <p className="vmVehicle mr-[100px]">{violationInformation.vehicle}</p>
                                            <p className="vmNp">{violationInformation.cameraId === 1 ? "Sambat to Lspu" : 
                                                violationInformation.cameraId === 2 ? "Sambat to Patimbao" : 
                                                violationInformation.cameraId === 3 ? "Sambat to Sunstar" :
                                                violationInformation.cameraId === 4 ? "Sambat to Complex" : ""}</p>
                                            <p className="vmNp">{violationInformation.timeStamp}</p>
                                            <p className="vmViolation">{violationInformation.violationType === 2 ? "Illegal Parking" : violationInformation.violationType === 1 ? "Illegal Loading/Unloading" : ""}</p>
                                        </button>
                                    ))
                                })}
                            </div>
                        </div>
                        <div className="space-y-5">
                            <div className="shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[15px] max-w-[29vw] h-[33vh] p-4 ml-auto mr-4">
                                {violationFocus[1] && (
                                    <img
                                        src={`data:image/jpeg;base64,${violationFocus?.[1]?.frame ?? ""}`}
                                        className="shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[15px]"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }catch(error){
        console.error(error)
    }
}