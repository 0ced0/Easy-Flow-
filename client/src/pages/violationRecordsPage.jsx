import {useEffect, useState} from 'react'
import SideBar from '../components/sideBar.jsx'
import ViolationDataDisplay from '../components/violationDataDisplay.jsx'
import {getPaginatedViolationData} from '../hooks/api.js'

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

const PAGE_SIZE = 10

export default function ViolationRecordsPage() {
    const [violations, setViolations] = useState([])
    const [totalViolations, setTotalViolations] = useState(0)
    const [counts, setCounts] = useState({total: 0, loadingCount: 0, parkingCount: 0})
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [selectedViolation, setSelectedViolation] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const loadViolations = async () => {
            setIsLoading(true)
            setError('')
            try {
                const response = await getPaginatedViolationData(page, search, typeFilter)
                if (!response?.ok) throw new Error('Unable to load violation records.')
                const data = await response.json()
                setViolations(data.violations)
                setSelectedViolation(data.violations[0] || null)
                setTotalViolations(data.total)
                setCounts(data.counts)
            } catch (requestError) {
                setError(requestError.message)
            } finally {
                setIsLoading(false)
            }
        }

        loadViolations()
    }, [page, search, typeFilter])

    const totalPages = Math.max(Math.ceil(totalViolations / PAGE_SIZE), 1)
    const firstRecord = totalViolations === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
    const lastRecord = Math.min(page * PAGE_SIZE, totalViolations)
    const showInitialLoading = isLoading && violations.length === 0

    const updateSearch = (value) => {
        setSearch(value)
        setPage(1)
    }

    const updateTypeFilter = (value) => {
        setTypeFilter(value)
        setPage(1)
    }

    return (
        <div className="p-1 pb-20 md:pb-1 flex flex-col md:flex-row w-full min-h-screen md:h-[99vh]">
            <SideBar />
            <main className="w-full min-w-0 py-3 px-3 sm:px-6 md:py-4 lg:px-10 overflow-y-auto">
                <div className="relative flex flex-wrap items-center gap-2 justify-between mb-3 md:mb-2">
                    <h1 className="w-full sm:w-auto font-medium text-[black]/70 text-xl sm:text-[1.7rem]">Traffic Violation History</h1>
                    <p className="text-sm text-[#363636]/70">All violations recorded by the monitoring system</p>
                </div>

                <section className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5 px-2 sm:px-4 py-2 h-auto md:h-[22vh] bg-blue-700/10 shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded" aria-label="Violation totals">
                    <SummaryCard label="Total Recorded Violations" value={counts.total} />
                    <SummaryCard label="Illegal Parking" value={counts.parkingCount} />
                    <SummaryCard label="Illegal Loading/Unloading" value={counts.loadingCount} />
                </section>

                <section className="mt-3 min-h-[32rem] bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] flex flex-col">
                    <div className="flex flex-col gap-3 border-b border-[#D9D9D9] p-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="font-medium text-base sm:text-[1.2rem] text-[#363636]">Recorded Violations</h2>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => updateSearch(event.target.value)}
                                placeholder="Search vehicle, camera, or time"
                                className="bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[15px] py-2 px-4 text-sm outline-none"
                            />
                            <select value={typeFilter} onChange={(event) => updateTypeFilter(event.target.value)} className="bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[15px] py-2 px-4 text-sm outline-none">
                                <option value="all">All Violation Types</option>
                                <option value="1">Illegal Loading/Unloading</option>
                                <option value="2">Illegal Parking</option>
                            </select>
                        </div>
                    </div>

                    {showInitialLoading && <p className="p-8 text-center text-[#363636]">Loading violation records...</p>}
                    {error && <p className="p-8 text-center text-red-600">{error}</p>}
                    {!showInitialLoading && !error && (
                        <>
                            <p className="border-b border-[#D9D9D9] px-3 sm:px-5 py-3 text-xs sm:text-sm text-[#363636]/70">Showing {firstRecord}-{lastRecord} of {totalViolations} recorded violations</p>
                            <div className="flex flex-col lg:flex-row flex-1 min-h-0">
                                <div className="overflow-x-auto flex-1 min-w-0">
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
                                            {violations.map((violation, index) => (
                                                <tr key={`${violation.vehicle}-${violation.time_stamp}-${index}`} onClick={() => setSelectedViolation(violation)} className={`cursor-pointer border-b border-[#D9D9D9] hover:bg-black/10 text-xs sm:text-[0.8rem] text-[#363636] ${selectedViolation === violation ? 'bg-black/10' : ''}`}>
                                                    <td className="px-3 sm:px-5 py-4 font-medium">{violation.vehicle || 'Unknown vehicle'}</td>
                                                    <td className={`px-3 sm:px-5 py-4 font-bold ${violation.violation_type === 2 ? 'text-red-600' : 'text-orange-500'}`}>{violationTypes[violation.violation_type] || 'Unknown violation'}</td>
                                                    <td className="px-3 sm:px-5 py-4">{approaches[violation.camera_id] || `Camera ${violation.camera_id}`}</td>
                                                    <td className="px-3 sm:px-5 py-4">{violation.time_stamp}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <aside className="min-h-64 lg:min-h-0 lg:w-[18rem] lg:shrink-0 flex flex-col overflow-hidden border-t lg:border-t-0 lg:border-l border-[#D9D9D9] bg-white">
                                    <p className="shrink-0 px-3 py-2 text-xs font-medium text-[#363636]/70 border-b border-[#D9D9D9]">Selected violation</p>
                                    {selectedViolation ? <div className="flex-1 min-h-0"><ViolationDataDisplay violationDisplay={selectedViolation} /></div> : <p className="p-6 text-center text-sm text-[#363636]/70">Select a recorded violation to view its evidence.</p>}
                                </aside>
                            </div>
                            {violations.length === 0 && <p className="p-8 text-center text-[#363636]">No violation records match the current filters.</p>}
                            {totalViolations > 0 && (
                                <nav className="flex items-center justify-between gap-3 border-t border-[#D9D9D9] px-3 sm:px-5 py-3" aria-label="Violation history pages">
                                    <button type="button" onClick={() => setPage(page - 1)} disabled={page === 1} className="rounded border border-[#D9D9D9] px-3 py-2 text-sm text-[#363636] disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                                    <span className="text-xs sm:text-sm text-[#363636]/70">Page {page} of {totalPages}</span>
                                    <button type="button" onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="rounded border border-[#D9D9D9] px-3 py-2 text-sm text-[#363636] disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                                </nav>
                            )}
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
