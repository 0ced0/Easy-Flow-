import {BarChart, Bar, YAxis, XAxis, CartesianGrid, Tooltip, Legend} from 'recharts'
import { RechartsDevtools } from '@recharts/devtools'


const testData = [
    {"page" :  "LSPU", "number" : 5, "total" : 50},
    {"page" :  "PAT", "number" : 10, "total" : 50},
    {"page" :  "BUK", "number" : 8, "total" : 50},
    {"page" :  "MET", "number" : 15, "total" : 50},
    ]

export default function OccupancyChart () {
    return (
        <div className="flex flex-col">
            <p>Occupancy</p>
            <div className="flex justify-center">
            <BarChart
                style={{width: "90%", aspectRatio: 1}}
                responsive
                data={testData}
                margin={{
                    top: 15,
                    left: 5,
                    bottom: 5,
                    right: 5
                }}
            >
                <CartesianGrid opacity="0.4" vertical={false}/>
                <XAxis dataKey="page" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: "black"}}/>
                {/* <YAxis width="auto"/> */}
                <Tooltip />
                {/* <Legend /> */}
                <Bar dataKey="number" fill="#091d9e" stackId="a"/>
                <Bar dataKey="total" fill="#3aa2f2" stackId="a"/>


            </BarChart>
            <RechartsDevtools />
        </div>
        </div>
    )
}  