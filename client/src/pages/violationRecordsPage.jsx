import {useEffect, useMemo, useState} from 'react'
import SideBar from '../components/sideBar.jsx'
import {getAllViolationData} from '../hooks/api.js'

const approaches = {
    1: 'Sambat to LSPU',
    2: 'Sambat to Patimbao',
    3: 'Sambat to Sunstar',
    4: 'Sambat to Complex'
}

const violationTypes = {
    1: 'Illegal Loading/Unloading',
    2: 'Illegal Parking'
}

export default function ViolationRecordsPage() {
    const [violations, setViolations] = useState([])
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('all')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const loadViolations = async () => {
            try {
                const response = await getAllViolationData()
                if (!response?.ok) throw new Error('Unable to load violation records.')
                setViolations(await response.json())
            } catch (requestError) {
                setError(requestError.message)
            } finally {
                setIsLoading(false)
            }
        }

        loadViolations()
    }, [])

    const filteredViolations = useMemo(() => {
        const searchTerm = search.trim().toLowerCase()

        return violations.filter((violation) => {
            const matchesType = typeFilter === 'all' || String(violation.violation_type) === typeFilter
            const matchesSearch = !searchTerm || [
                violation.vehicle,
                approaches[violation.camera_id],
                violationTypes[violation.violation_type],
                violation.time_stamp
            ].some((value) => String(value ?? '').toLowerCase().includes(searchTerm))

            return matchesType && matchesSearch
        })
    }, [violations, search, typeFilter])

    const parkingCount = violations.filter((violation) => violation.violation_type === 2).length
    const loadingCount = violations.filter((violation) => violation.violation_type === 1).length

    return (
        <div className="p-1 pb-20 md:pb-1 flex flex-col md:flex-row w-full min-h-screen md:h-[99vh]">
            <SideBar />
            <main className="w-full min-w-0 py-3 px-3 sm:px-6 md:py-4 lg:px-10 overflow-y-auto">
                <div className="relative flex flex-wrap items-center gap-2 justify-between mb-3 md:mb-2">
                    <h1 className="w-full sm:w-auto font-medium text-[black]/70 text-xl sm:text-[1.7rem]">Traffic Violation History</h1>
                    <p className="text-sm text-[#363636]/70">All violations recorded by the monitoring system</p>
                </div>

                <section className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5 px-2 sm:px-4 py-2 h-auto md:h-[22vh] bg-blue-700/10 shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded" aria-label="Violation totals">
                    <SummaryCard label="Total Recorded Violations" value={violations.length} />
                    <SummaryCard label="Illegal Parking" value={parkingCount} />
                    <SummaryCard label="Illegal Loading/Unloading" value={loadingCount} />
                </section>

                <section className="mt-3 min-h-[32rem] bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] flex flex-col">
                    <div className="flex flex-col gap-3 border-b border-[#D9D9D9] p-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="font-medium text-base sm:text-[1.2rem] text-[#363636]">Recorded Violations</h2>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search vehicle, approach, or time"
                                className="bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[15px] py-2 px-4 text-sm outline-none"
                            />
                            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[15px] py-2 px-4 text-sm outline-none">
                                <option value="all">All Violation Types</option>
                                <option value="1">Illegal Loading/Unloading</option>
                                <option value="2">Illegal Parking</option>
                            </select>
                        </div>
                    </div>

                    {isLoading && <p className="p-8 text-center text-[#363636]">Loading violation records...</p>}
                    {error && <p className="p-8 text-center text-red-600">{error}</p>}
                    {!isLoading && !error && (
                        <>
                            <p className="border-b border-[#D9D9D9] px-3 sm:px-5 py-3 text-xs sm:text-sm text-[#363636]/70">Showing {filteredViolations.length} of {violations.length} recorded violations</p>
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full min-w-[42rem] text-left">
                                    <thead className="border-b border-[#D9D9D9] text-xs sm:text-sm text-[#363636]/70">
                                        <tr>
                                            <th className="px-3 sm:px-5 py-3 font-medium">Vehicle</th>
                                            <th className="px-3 sm:px-5 py-3 font-medium">Violation</th>
                                            <th className="px-3 sm:px-5 py-3 font-medium">Approach</th>
                                            <th className="px-3 sm:px-5 py-3 font-medium">Recorded At</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredViolations.map((violation, index) => (
                                            <tr key={`${violation.vehicle}-${violation.time_stamp}-${index}`} className="border-b border-[#D9D9D9] hover:bg-black/10 text-xs sm:text-[0.8rem] text-[#363636]">
                                                <td className="px-3 sm:px-5 py-4 font-medium">{violation.vehicle || 'Unknown vehicle'}</td>
                                                <td className={`px-3 sm:px-5 py-4 font-bold ${violation.violation_type === 2 ? 'text-red-600' : 'text-orange-500'}`}>{violationTypes[violation.violation_type] || 'Unknown violation'}</td>
                                                <td className="px-3 sm:px-5 py-4">{approaches[violation.camera_id] || `Camera ${violation.camera_id}`}</td>
                                                <td className="px-3 sm:px-5 py-4">{violation.time_stamp}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filteredViolations.length === 0 && <p className="p-8 text-center text-[#363636]">No violation records match the current filters.</p>}
                        </>
                    )}
                </section>
            </main>
        </div>
    )
}

function SummaryCard({label, value}) {
    return (
        <div className="min-h-32 md:min-h-0 bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded flex flex-col justify-between p-4 sm:p-5">
            <p className="font-medium text-base sm:text-[1.1rem] text-[#363636]">{label}</p>
            <p className="text-3xl sm:text-[3rem] text-[black]/60">{value.toLocaleString()}</p>
        </div>
    )
}
