import {Tooltip, Bar, Line, ComposedChart, XAxis, YAxis, CartesianGrid} from 'recharts'

export default function SummaryChart ({weeklyData}) {
    try{
    return (
        <div className="h-full min-h-0 flex flex-col gap-[0.5625rem] sm:gap-[0.9375rem] py-[0.5625rem] px-[0.375rem] sm:px-[0.9375rem]">
            <h1 className="shrink-0 text-[0.75rem] sm:text-[1.125rem] text-black/70">
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
                    strokeOpacity={0.2}
                    strokeDasharray="3 3"
                />

                <XAxis
                    dataKey="weekNumber"
                    tick={{ fontSize: 7.5 }}
                    tickLine={false}
                    axisLine={false}
                />

                <YAxis
                    width={26.25}
                    tick={{ fontSize: 7.5 }}
                    tickLine={false}
                    axisLine={false}
                />

                <Tooltip
                    cursor={false}
                    contentStyle={{
                        borderRadius: "6px",
                        border: "none",
                        boxShadow: "0 1.5px 7.5px rgba(0,0,0,0.15)",
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
                    className="fill-blue-500/30"
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
                    className="stroke-blue-600"
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
