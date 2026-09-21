import {Tooltip, Bar, Line, ComposedChart, XAxis, YAxis, CartesianGrid} from 'recharts'

export default function SummaryChart ({weeklyData, isLoading}) {
    try{
    if (isLoading) {
        return (
            <div className="h-full min-h-0 flex flex-col gap-[0.9375rem] p-[0.9375rem] animate-pulse">
                <div className="h-4 w-2/3 rounded bg-[#e6eff6]" />
                <div className="flex flex-1 items-end gap-3 px-3">
                    {[35, 60, 45, 75, 55, 90].map((height, index) => (
                        <div key={index} className="flex-1 rounded-t bg-[#e6eff6]" style={{height: `${height}%`}} />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="h-full min-h-0 flex flex-col gap-[0.5625rem] sm:gap-[0.9375rem] py-[0.5625rem] px-[0.375rem] sm:px-[0.9375rem]">
            <h1 className="shrink-0 text-[0.75rem] sm:text-[1.125rem] text-[#17324c]">
                Weekly Flow and Density Chart
            </h1>

            <ComposedChart
            className="flex-1 min-h-0 w-full pb-1.5 md:pb-0"
                responsive
                data={weeklyData}
                style={{
                    width: "100%",
                    height: "100%"
                }}
            >
                <CartesianGrid
                    vertical={false}
                    stroke="#c7d8e5"
                    strokeOpacity={0.7}
                    strokeDasharray="3 3"
                />

                <XAxis
                    dataKey="weekNumber"
                    tick={{ fontSize: 7.5, fill: '#54708a' }}
                    tickLine={false}
                    axisLine={false}
                />

                <YAxis
                    width={26.25}
                    tick={{ fontSize: 7.5, fill: '#54708a' }}
                    tickLine={false}
                    axisLine={false}
                />

                <Tooltip
                    cursor={false}
                    contentStyle={{
                        borderRadius: "6px",
                        border: "1px solid #cfdeea",
                        backgroundColor: "#f9fcff",
                        boxShadow: "0 8px 20px rgba(28,72,109,0.12)",
                        color: "#17324c",
                        fontSize: "9px"
                    }}
                    labelFormatter={(week) => `Week ${week}`}
                    formatter={(value, name) => {
                        if (name === "Density") {
                            return [`${value.toFixed(2)} veh/km`, name]
                        }

                        if (name === "Flow") {
                            return [`${value.toFixed(2)} veh/hr`, name]
                        }

                        return [value, name]
                    }}
                />

                {/* DENSITY */}
                <Bar
                    dataKey="averageDensity"
                    name="Density"
                    fill="#8dbbd8"
                    barSize={13.5}
                    radius={[2.25, 2.25, 0, 0]}
                    activeBar={{
                        fillOpacity: 0.6
                    }}
                />

                {/* FLOW */}
                <Line
                    dataKey="averageFlow"
                    name="Flow"
                    stroke="#1c5f9f"
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{
                        r: 3.75,
                        strokeWidth: 1.5
                    }}
                />
            </ComposedChart>
        </div>
    )
    }catch(error){
        console.error(error)
    }
}
