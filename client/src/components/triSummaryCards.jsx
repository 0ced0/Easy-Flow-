export default function TriSummaryCard ({dataCategory, summaryValue, previousValue, comparisonMonth}) {
    const currentAmount = Number(summaryValue)
    const previousAmount = Number(previousValue)
    const hasCurrentData = Number.isFinite(currentAmount)
    const hasPreviousData = Number.isFinite(previousAmount)
    const difference = currentAmount - previousAmount
    const status = !hasPreviousData ? "No Comparison" : difference > 0 ? "Increased" : difference < 0 ? "Decreased" : "No Change"
    const statusColor = status === "Increased" ? "text-purple-600" : status === "Decreased" ? "text-orange-400" : "text-black/50"
    const statusStroke = status === "Increased" ? "#9333EA" : status === "Decreased" ? "#ffb700" : "#737373"

    try{    
        return(
            <>
            {hasCurrentData ? (
            <div className="flex flex-col h-full w-full p-3 sm:p-4">
                <div className="items-center flex flex-1 justify-between gap-2 px-2 sm:px-4 py-2">
                    <h1 className="font-medium text-base sm:text-[1.2rem]">{dataCategory}</h1>
                    <h1 className={`ml-auto mr-1 sm:mr-2 font-medium text-sm sm:text-[1.2rem] ${statusColor}`}>{status}</h1>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke={statusStroke} className="size-7 sm:size-9 shrink-0">
                            <path strokeLinecap="round" strokeLinejoin="round" d={status === "Decreased" ? "M2.25 6 9 12.75l4.306-4.306a11.95 11.95 0 0 0 5.814 5.518l2.74 1.22m0 0-5.94 2.281m5.94-2.28-2.28-5.941" : "M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"} />
                    </svg>
                </div>
                <div className="flex flex-5 p-2 sm:p-4 items-end">
                    <h1 className="text-3xl sm:text-[3rem] text-[black]/60">{currentAmount.toLocaleString()}</h1>
                    <h1 className="ml-auto text-sm sm:text-[1.3rem] text-[black]/60">Vs. {comparisonMonth}</h1>

                </div>
            </div>

                ) : (
            <div className="flex flex-col h-full w-full p-3 sm:p-4">
                <div className="items-center flex flex-1 justify-between px-2 sm:px-4 py-2">
                    <h1 className="font-medium text-base sm:text-[1.2rem]">{dataCategory}</h1>
                </div>
                <div className="flex flex-5 p-2 sm:p-4 items-end">
                    <h1 className="text-base sm:text-[1.3rem] text-[black]/60">No Data Available</h1>
                    <h1 className="ml-auto text-sm sm:text-[1.3rem] text-[black]/60">Vs. {comparisonMonth}</h1>

                </div>
            </div>
                )}
            </>
        )
    }catch(error){
        console.error(error)
    }
}
