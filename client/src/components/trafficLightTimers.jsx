
export default function TrafficLightTimers() {
    return (
        <div className="grid grid-cols-3 w-full min-h-0 p-12 h-[30vh] text-center bg-white rounded-[15px] shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)]">
            <div className="flex flex-col justify-center">
                <div className="timer">
                    00
                </div>
            </div>
            <div className="flex flex-col justify-between">
                <div className="timer">
                    00
                </div>
                <div className="timer">
                    00
                </div>
            </div>
            <div className="flex flex-col justify-center">
                <div className="bg-black text-green-700 p-[15px] rounded-[10px]">
                    00
                </div>
            </div>
        </div>
    )
}