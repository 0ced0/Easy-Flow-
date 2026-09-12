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
            <div className="flex flex-col h-full w-full p-[0.5625rem] sm:p-[0.75rem]">
                <div className="items-center flex flex-1 justify-between gap-1.5 px-1.5 sm:px-3 py-1.5">
                    <h1 className="font-medium text-[0.75rem] sm:text-[0.9rem]">{dataCategory}</h1>
                    <h1 className={`ml-auto mr-[0.1875rem] sm:mr-[0.375rem] font-medium text-[0.75rem] sm:text-[0.9rem] ${statusColor}`}>{status}</h1>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke={statusStroke} className="size-[1.3125rem] sm:size-[1.6875rem] shrink-0">
                            <path strokeLinecap="round" strokeLinejoin="round" d={status === "Decreased" ? "M2.25 6 9 12.75l4.306-4.306a11.95 11.95 0 0 0 5.814 5.518l2.74 1.22m0 0-5.94 2.281m5.94-2.28-2.28-5.941" : "M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"} />
                    </svg>
                </div>
                <div className="flex flex-5 p-1.5 sm:p-3 items-end">
                    <h1 className="text-[1.125rem] sm:text-[2.25rem] text-[black]/60">{currentAmount.toLocaleString()}</h1>
                    <h1 className="ml-auto text-[0.75rem] sm:text-[0.975rem] text-[black]/60">Vs. {comparisonMonth}</h1>

                </div>
            </div>

                ) : (
            <div className="flex flex-col h-full w-full p-[0.5625rem] sm:p-[0.75rem]">
                <div className="items-center flex flex-1 justify-between px-1.5 sm:px-3 py-1.5">
                    <h1 className="font-medium text-[0.75rem] sm:text-[0.9rem]">{dataCategory}</h1>
                </div>
                <div className="flex flex-5 p-1.5 sm:p-3 items-end">
                    <h1 className="text-[0.75rem] sm:text-[0.975rem] text-[black]/60">No Data Available</h1>
                    <h1 className="ml-auto text-[0.75rem] sm:text-[0.975rem] text-[black]/60">Vs. {comparisonMonth}</h1>

                </div>
            </div>
                )}
            </>
        )
    }catch(error){
        console.error(error)
    }
}
