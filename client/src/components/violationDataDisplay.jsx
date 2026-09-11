export default function ViolationDataDisplay({violationDisplay}) {
    try{
        const approach=["Sambat to LSPU", "Sambat to Patimbao", "Sambat to SunStar", "Sambat to Complex"]
        const violations=["Illegal Loading/Unloading", "Illegal Parking"]
        return(
            <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
                <div className="flex shrink-0 justify-between px-2 border-b border-[#D3D3D3] min-h-12">
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
                    <div className="shrink-0 min-w-0">
                        <img
                            src={`data:image/jpeg;base64,${violationDisplay.frame}`}
                            className="block w-full h-auto max-w-full object-contain"
                        />
                    </div>
                )}
            </div>
        )
    }catch(error){
        console.error(error)
    }
}
