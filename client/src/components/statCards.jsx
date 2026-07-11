import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useState, useEffect } from 'react'


export default function StatCard({statData, vehicleNumbers, averageVehicleSpeed}) {

    // console.log(statData)
    return (
        <div className="min-h-[220px] relative shadow-[0_1px_4px_1px_rgba(0,0,0,0.25)] text-center flex-1 rounded-[15px] w-full">

            {/* Background */}
            <div className="absolute z-10 inset-0 bg-[#0000FF] opacity-[10%] rounded-[15px]"></div>

            <div className="gap-2 z-20 absolute flex p-2 inset-0">
                <div className="chart">

                    <p>Sambat to LSPU</p>
                    <h3>Condition</h3>

                    <LineChart
                        responsive
                        data={statData}
                        style={{ width: "100%", minHeight: 170, height: "100%" }}
                        margin={{
                            top: 10,
                            right: 15,
                            left: 0,
                            bottom: 0
                        }}
                    >
                        <CartesianGrid
                            vertical={false}
                            // strokeDasharray="3 3"
                            strokeOpacity="0.3"
                        />
                        <XAxis dataKey="time" tick={{ fontSize: 5 }} strokeDasharray='0 10' />
                        <YAxis width="auto" tick={{ fontSize: 5 }} strokeDasharray='0 10' />

                        <Line dataKey="vehicleCount" stroke='blue' dot={false} />

                    </LineChart>
                </div>


                {/* Stat Numbers */}
                <div className="relative flex flex-col justify-between gap-3 w-[6rem]">

                    <div className="counter">
                        <p>Vehicle Flow</p>
                        <h1>{vehicleNumbers}</h1>
                    </div>
                    <div className="counter">
                        <p>Average speed</p>
                        <h2>{averageVehicleSpeed}</h2>
                        <h4>km/h</h4>
                    </div>
                </div>
            </div>
        </div >
    )
}

