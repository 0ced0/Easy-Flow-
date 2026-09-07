export default function TriSummaryCard ({dataCategory, summaryValue}) {
    try{    
        return(
            <>
            {summaryValue ? (
            <div className="flex flex-col h-full w-full p-4">
                <div className="items-center flex flex-1 justify-between px-4 py-2">
                    <h1 className="font-medium text-[1.2rem]">{dataCategory}</h1>
                    <h1 className="ml-auto mr-2 font-medium text-[1.2rem]">Increased</h1>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="orange" className="size-9">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                    </svg>
                </div>
                <div className="flex flex-5 p-4 items-end">
                    <h1 className="text-[3rem] text-[black]/60">{summaryValue.toLocaleString()}</h1>
                    <h1 className="ml-auto text-[1.3rem] text-[black]/60">Vs. July</h1>

                </div>
            </div>

                ) : (
            <div className="flex flex-col h-full w-full p-4">
                <div className="items-center flex flex-1 justify-between px-4 py-2">
                    <h1 className="font-medium text-[1.2rem]">{dataCategory}</h1>
                </div>
                <div className="flex flex-5 p-4 items-end">
                    <h1 className="text-[1.3rem] text-[black]/60">No Data Available</h1>
                    <h1 className="ml-auto text-[1.3rem] text-[black]/60">Vs. July</h1>

                </div>
            </div>
                )}
            </>
        )
    }catch(error){
        console.error(error)
    }
}