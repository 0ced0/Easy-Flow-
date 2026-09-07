import {BarChart, Bar, YAxis, XAxis, CartesianGrid, Tooltip, Legend} from 'recharts'
import { RechartsDevtools } from '@recharts/devtools'


export default function DensityChart ({densityData}) {
    return (
        <div className="flex flex-col justify-center p-2">
            {/* <p>Density</p> */}
            <div className="flex justify-center pt-9">
                <BarChart
                    style={{width: "90%", aspectRatio: 1.65}}
                    responsive
                    data={densityData}
                    margin={{
                        top: 15,
                        left: 5,
                        bottom: 5,
                        right: 5
                    }}
                >
                    <CartesianGrid opacity="0.4" vertical={false}/>
                    <XAxis dataKey="loc" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: "black"}}/>
                    {/* <YAxis width="auto"/> */}
                    <Tooltip 
                        formatter={(value, name) => [
                            Number(value).toFixed(2),
                            name
                        ]}
                    />
                    {/* <Legend /> */}
                    <Bar dataKey="density" fill="#7e77d6" tool/>
                    <Bar dataKey="forecast" fill="orange"/>
                </BarChart>
                <RechartsDevtools />
        </div>
        </div>
    )
}  