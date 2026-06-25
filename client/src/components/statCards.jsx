// import { RechartsDevtools } from '@recharts/devtools';
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useState } from 'react'

const mockData = [
    {
        "time": 5,
        "flow": 8,
        "test": 2
    },
    {
        "time": 1,
        "flow": 7,
        "test": 4
    },
    {
        "time": 4,
        "flow": 7,
        "test": 7
    },
    {
        "time": 7,
        "flow": 2,
        "test": 1
    },
    {
        "time": 2,
        "flow": 1,
        "test": 8
    },
    {
        "time": 6,
        "flow": 3,
        "test": 1
    },
    {
        "time": 7,
        "flow": 1,
        "test": 6
    },
    {
        "time": 8,
        "flow": 2,
        "test": 9
    },
    {
        "time": 9,
        "flow": 5,
        "test": 9
    },
    {
        "time": 10,
        "flow": 7,
        "test": 2
    },

]

export default function StatCard() {
    const [vehicleNumbers, setVehicleNumbers] = useState(0)
    const [averageVehicleSpeed, setAverageVehicleSpeed] = useState(0)


    return (
        <div className="p-5 relative shadow-[0_1px_4px_1px_rgba(0,0,0,0.25)] text-center flex-1 rounded-[15px] w-full">

            {/* Background */}
            <div className="absolute z-10 inset-0 bg-[#0000FF] opacity-[10%] rounded-[15px]"></div>

            <div className="gap-2 z-20 absolute flex p-1.5 inset-0">
                <div className="chart">
                    <p>Location</p>
                    <h3>Condition</h3>
                    <LineChart
                        data={mockData}
                        style={{ width: '100%', height: "100%" }}
                        margin={{
                            top: 0,
                            right: 15,
                            left: 0,
                            bottom: 25
                        }}
                    >
                        <CartesianGrid
                            vertical={false}
                            strokeDasharray="3 3"
                        />
                        <XAxis dataKey="time" tick={{ fontSize: 5 }} strokeDasharray='0 10' />
                        <YAxis width="auto" tick={{ fontSize: 5 }} domain={[0, 10]} strokeDasharray='0 10' />

                        <Line dataKey="flow" stroke='yellow' dot={false} />
                        <Line dataKey="test" stroke='red' dot={false} />

                    </LineChart>
                </div>


                {/* Stat Numbers */}
                <div className="relative flex flex-col justify-between gap-2 w-[6rem]">

                    <div className="counter">
                        <p>Vehicles arriving per minute</p>
                        <h1>{vehicleNumbers}</h1>
                    </div>
                    <div className="counter">
                        <p>Average vehicle speed</p>
                        <h2>{averageVehicleSpeed}</h2>
                    </div>
                </div>
            </div>
        </div >
    )
}

