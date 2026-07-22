import {BarChart, Bar, YAxis, XAxis, CartesianGrid, Tooltip, Legend} from 'recharts'
import { RechartsDevtools } from '@recharts/devtools'


export default function DensityChart ({densityData}) {
    return (
        <div className="flex flex-col justify-center max-h-[30vh]">
            <p>Density</p>
            <div className="flex justify-center">
            <BarChart
                style={{width: "90%", aspectRatio: 1}}
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
                <Tooltip />
                {/* <Legend /> */}
                <Bar dataKey="den" fill="#7e77d6"/>
            </BarChart>
            <RechartsDevtools />
        </div>
        </div>
    )
}  