import "../styles/violationMonitoring.css"

export default function ViolationMonitoring () {
    return(
        <div className="bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[5px] h-[45vh]">
            <h2 className="vmh2 pl-3 pb-4">Violation Monitoring</h2>
                
            <div className="">   
                <div className="listItemContainer">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" className="size-9">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                    </svg>

                    <p class="vmVehicle">Car</p>
                    <p class="vmNp">Sambat to LSPU</p>
                    <p class="vmViolation">Illegal Parking</p>
                    <p class="vmNp">10:30AM</p>
                </div>

                <div className="listItemContainer">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" className="size-9">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                    </svg>

                    <p class="vmVehicle">Car</p>
                    <p class="vmNp">Sambat to LSPU</p>
                    <p class="vmViolation">Illegal Parking</p>
                    <p class="vmNp">10:30AM</p>
                </div>
            </div>

        </div>
    )
}