import {Line, LineChart, XAxis, YAxis, CartesianGrid} from 'recharts'

const test = [
    {"day": 1, "flow": 100},
    {"day": 2, "flow": 200},
    {"day": 3, "flow": 300},
    {"day": 4, "flow": 100},
    {"day": 5, "flow": 500},
]
export default function SummaryChart () {
    try{
        return(
            <div className="h-[50vh] py-3 px-5 space-y-5">
                <h1 className="text-[1.5rem] text-[black]/70">
                    Flow and Density Chart
                </h1>
                <LineChart
                responsive
                data={test}
                style={{ width: "100%", height: "100%"}}>
                    <CartesianGrid 
                    vertical={false}
                    strokeOpacity="0.4"/>
                    <XAxis dataKey="day" tick={{ fontSize: 5 }} strokeDasharray='0 10'/>
                    <YAxis width={20} tick={{ fontSize: 5 }} strokeDasharray='0 10' />

                    <Line dataKey="flow" tick={{ fontSize: 5 }} strokeDashArray='0 10' dot={false}/>
                </LineChart>
            </div>
        )
    }catch(error){
        console.error(error)
    }
}