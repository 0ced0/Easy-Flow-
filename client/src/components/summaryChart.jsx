import {Tooltip, Bar, Line, ComposedChart, XAxis, YAxis, CartesianGrid} from 'recharts'

export default function SummaryChart ({weeklyData}) {
    try{
    return (
        <div className="h-full min-h-0 py-3 px-2 sm:px-5 space-y-3 sm:space-y-5">
            <h1 className="text-lg sm:text-[1.5rem] text-black/70">
                Weekly Flow and Density Chart
            </h1>

            <ComposedChart
            className="h-[95%] pb-2 md:pb-0 md:h-[90%]"
                responsive
                data={weeklyData}
                style={{
                    width: "100%",
                }}
            >
                <CartesianGrid
                    vertical={false}
                    strokeOpacity={0.2}
                    strokeDasharray="3 3"
                />

                <XAxis
                    dataKey="weekNumber"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                />

                <YAxis
                    width={35}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                />

                <Tooltip
                    cursor={false}
                    contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
                        fontSize: "12px"
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
                    barSize={18}
                    radius={[3, 3, 0, 0]}
                    activeBar={{
                        fillOpacity: 0.6
                    }}
                />

                {/* FLOW */}
                <Line
                    dataKey="averageFlow"
                    name="Flow"
                    className="stroke-blue-600"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                        r: 5,
                        strokeWidth: 2
                    }}
                />
            </ComposedChart>
        </div>
    )
    }catch(error){
        console.error(error)
    }
}
