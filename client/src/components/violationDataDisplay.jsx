export default function ViolationDataDisplay({violationDisplay}) {
    try{
        const approach=["Sambat to LSPU", "Sambat to Patimbao", "Sambat to SunStar", "Sambat to Complex"]
        const violations=["Illegal Loading/Unloading", "Illegal Parking"]
        return(
            <div>
                <div className="flex justify-between px-2 border-b border-[#D3D3D3] h-[6vh]">
                    <div className="mt-1">
                    <p className="text-[0.7rem]">{violationDisplay?.vehicle}</p>
                    <p className="text-[0.6rem] font-bold">{approach[(violationDisplay?.camera_id) - 1]}</p>
                    </div>                 
                    <div className="text-end mt-1">
                    <p className="text-[0.7rem]">{violationDisplay?.time_stamp}</p>
                    <p className="text-[0.6rem] font-bold">{violations[(violationDisplay?.violation_type - 1)]}</p>                        
                    </div>
                </div>
                {violationDisplay?.frame && (
                    <img
                        src={`data:image/jpeg;base64,${violationDisplay.frame}`}
                    />
                )}
            </div>
        )
    }catch(error){
        console.error(error)
    }
}