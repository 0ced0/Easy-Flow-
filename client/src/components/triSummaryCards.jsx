export default function TriSummaryCard ({dataCategory, summaryValue, previousValue, comparisonMonth, isLoading}) {
    const currentAmount = Number(summaryValue)
    const previousAmount = Number(previousValue)
    const hasCurrentData = Number.isFinite(currentAmount)
    const hasPreviousData = Number.isFinite(previousAmount)
    const difference = currentAmount - previousAmount
    const status = !hasPreviousData ? "No Comparison" : difference > 0 ? "Increased" : difference < 0 ? "Decreased" : "No Change"
    const statusColor = status === "Increased" ? "text-[#1c5f9f]" : status === "Decreased" ? "text-amber-700" : "text-[#54708a]"
    const statusStroke = status === "Increased" ? "#1c5f9f" : status === "Decreased" ? "#b45309" : "#54708a"

    try{    
        if (isLoading) {
            return (
                <div className="flex flex-col h-full w-full p-[0.5625rem] sm:p-[0.75rem] animate-pulse">
                    <div className="m-1.5 sm:m-3 h-3.5 w-2/3 rounded bg-[#e6eff6]" />
                    <div className="mt-auto flex items-end justify-between p-1.5 sm:p-3">
                        <div className="h-8 w-1/3 rounded bg-[#e6eff6]" />
                        <div className="h-3 w-1/4 rounded bg-[#e6eff6]" />
                    </div>
                </div>
            )
        }

        return(
            <>
            {hasCurrentData ? (
            <div className="flex flex-col h-full w-full p-[0.5625rem] sm:p-[0.75rem]">
                <div className="items-center flex flex-1 justify-between gap-1.5 px-1.5 sm:px-3 py-1.5">
                    <h1 className="font-medium text-[0.75rem] sm:text-[0.9rem] text-[#17324c]">{dataCategory}</h1>
                    <h1 className={`ml-auto mr-[0.1875rem] sm:mr-[0.375rem] font-medium text-[0.75rem] sm:text-[0.9rem] ${statusColor}`}>{status}</h1>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke={statusStroke} className="size-[1.3125rem] sm:size-[1.6875rem] shrink-0">
                            <path strokeLinecap="round" strokeLinejoin="round" d={status === "Decreased" ? "M2.25 6 9 12.75l4.306-4.306a11.95 11.95 0 0 0 5.814 5.518l2.74 1.22m0 0-5.94 2.281m5.94-2.28-2.28-5.941" : "M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"} />
                    </svg>
                </div>
                <div className="flex flex-5 p-1.5 sm:p-3 items-end">
                    <h1 className="text-[1.125rem] sm:text-[2.25rem] text-[#17324c]">{currentAmount.toLocaleString()}</h1>
                    <h1 className="ml-auto text-[0.75rem] sm:text-[0.975rem] text-[#54708a]">Vs. {comparisonMonth}</h1>

                </div>
            </div>

                ) : (
            <div className="flex flex-col h-full w-full p-[0.5625rem] sm:p-[0.75rem]">
                <div className="items-center flex flex-1 justify-between px-1.5 sm:px-3 py-1.5">
                    <h1 className="font-medium text-[0.75rem] sm:text-[0.9rem] text-[#17324c]">{dataCategory}</h1>
                </div>
                <div className="flex flex-5 p-1.5 sm:p-3 items-end">
                    <h1 className="text-[0.75rem] sm:text-[0.975rem] text-[#54708a]">No Data Available</h1>
                    <h1 className="ml-auto text-[0.75rem] sm:text-[0.975rem] text-[#54708a]">Vs. {comparisonMonth}</h1>

                </div>
            </div>
                )}
            </>
        )
    }catch(error){
        console.error(error)
    }
}
