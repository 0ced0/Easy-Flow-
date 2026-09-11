// import "../styles/violationMonitoring.css"

export default function ViolationMonitoring ({violationData, setViolationDisplay}) {

    try{
        return(
            <div className="violationBox h-full overflow-y-auto mt-auto">
                {/* <h2 className="vmh2 pl-3 pb-4">Violation Monitoring</h2> */}
                {/* <div className="border border-[#D3D3D3]">
                    filters
                </div> */}
                <div>   
                    {Object.entries(violationData).map(([vehicleId, violationInformation]) => {
                        return(
                            <div className="listItemContainer"
                                key={vehicleId}
                                onClick={() => {setViolationDisplay(violationInformation)}}
                                >
                                <div>
                                <p className="vmVehicle">{violationInformation.vehicle}</p>
                                <p className="vmViolation">{violationInformation.violation_type === 2 ? "Illegal Parking" : violationInformation.violation_type === 1 ? "Illegal Loading/Unloading" : ""}</p>
                                </div>
                                {violationInformation.violation_type === 2 ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" className="size-5 mb-auto">
                                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                                </svg> : 
                                violationInformation.violation_type === 1 ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="orange" className="size-5 mb-auto">
                                    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                                </svg> : ""
                                }
                            </div>
                        )
                    })}
                </div>

            </div>
        )
    }catch(error){
        console.error(error)
    }
    
}
