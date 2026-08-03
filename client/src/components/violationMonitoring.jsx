import "../styles/violationMonitoring.css"

export default function ViolationMonitoring ({stolIllegalParkingList, 
    stopIllegalParkingList, 
    stocIllegalParkingList, 
    stosIllegalParkingList,
    stolIllegalLoadingUnloading}) {

    try{
        const compiledIllegalParkingList = [
        ...Object.entries(stolIllegalParkingList ?? {}),
        ...Object.entries(stopIllegalParkingList ?? {}),
        ...Object.entries(stocIllegalParkingList ?? {}),
        ...Object.entries(stosIllegalParkingList ?? {}),
        ...Object.entries(stolIllegalLoadingUnloading ?? {})
        ]

        return(
            <div className="violationBox bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[5px] h-[45vh] overflow-y-auto">
                <h2 className="vmh2 pl-3 pb-4">Violation Monitoring</h2>
                    
                <div>   
                    {compiledIllegalParkingList.map(([vehicleId, violationInformation]) => {
                        return(violationInformation.violationStatus > 1 && (
                            <div className="listItemContainer"
                                key={vehicleId}>
                                {violationInformation.violationType === 2 ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" className="size-9">
                                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                                </svg> : 
                                violationInformation.violationType === 1 ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="orange" class="size-9">
                                    <path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd" />
                                </svg> : ""
                                }

                                <p className="vmVehicle">{violationInformation.vehicle}</p>
                                <p className="vmNp">{violationInformation.cameraId === 1 ? "Sambat to Lspu" : 
                                    violationInformation.cameraId === 2 ? "Sambat to Patimbao" : 
                                    violationInformation.cameraId === 3 ? "Sambat to Sunstar" :
                                    violationInformation.cameraId === 4 ? "Sambat to Complex" : ""}</p>
                                <p className="vmViolation">{violationInformation.violationType === 2 ? "Illegal Parking" : violationInformation.violationType === 1 ? "Illegal Loading/Unloading" : ""}</p>
                                {/* <p className="vmNp">{violationInformation.timeStamp}</p> */}
                            </div>
                        ))
                    })}
                    {/* <div className="listItemContainer">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" className="size-9">
                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                        </svg>

                        <p class="vmVehicle">Car</p>
                        <p class="vmNp">Sambat to LSPU</p>
                        <p class="vmViolation">Illegal Parking</p>
                        <p class="vmNp">10:30AM</p>
                    </div> */}

                </div>

            </div>
        )
    }catch(error){
        console.error(error)
    }
    
}