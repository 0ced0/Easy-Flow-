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
        <div className="p-[0.1875rem] pb-15 md:pb-[0.1875rem] flex flex-col md:flex-row w-full min-h-screen md:h-[99vh]">
            <SideBar compact />
            <main className="w-full min-w-0 py-[0.5625rem] px-[0.5625rem] sm:px-[1.125rem] md:py-[0.75rem] lg:px-[1.875rem] overflow-y-auto">
                <div className="relative flex flex-wrap items-center gap-1.5 justify-between mb-[0.5625rem] md:mb-[0.375rem]">
                    <h1 className="w-full sm:w-auto font-medium text-[black]/70 text-[0.9375rem] sm:text-[1.275rem]">Traffic Violation History</h1>
                    <p className="text-[0.75rem] text-[#363636]/70">All violations recorded by the monitoring system</p>
                </div>

                <section className="grid grid-cols-1 md:grid-cols-3 gap-[0.5625rem] md:gap-[0.9375rem] px-1.5 sm:px-3 py-1.5 h-auto md:h-[16.5vh] bg-blue-700/10 shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded" aria-label="Violation totals">
                    <SummaryCard label="Total Recorded Violations" value={counts.total} />
                    <SummaryCard label="Illegal Parking" value={counts.parkingCount} />
                    <SummaryCard label="Illegal Loading/Unloading" value={counts.loadingCount} />
                </section>

                <section className="mt-[0.5625rem] min-h-[24rem] bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] flex flex-col">
                    <div className="flex flex-col gap-[0.5625rem] border-b border-[#D9D9D9] p-[0.5625rem] sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="font-medium text-[0.75rem] sm:text-[0.9rem] text-[#363636]">Recorded Violations</h2>
                        <div className="flex flex-col gap-1.5 sm:flex-row">
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => updateSearch(event.target.value)}
                                placeholder="Search vehicle, camera, or time"
                                className="bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[11.25px] py-1.5 px-3 text-[0.75rem] outline-none"
                            />
                            <select value={typeFilter} onChange={(event) => updateTypeFilter(event.target.value)} className="bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded-[11.25px] py-1.5 px-3 text-[0.75rem] outline-none">
                                <option value="all">All Violation Types</option>
                                <option value="1">Illegal Loading/Unloading</option>
                                <option value="2">Illegal Parking</option>
                            </select>
                        </div>
                    </div>

                    {showInitialLoading && <p className="p-6 text-[0.75rem] text-center text-[#363636]">Loading violation records...</p>}
                    {error && <p className="p-6 text-[0.75rem] text-center text-red-600">{error}</p>}
                    {!showInitialLoading && !error && (
                        <>
                            <p className="border-b border-[#D9D9D9] px-[0.5625rem] sm:px-[0.9375rem] py-[0.5625rem] text-[0.5625rem] sm:text-[0.75rem] text-[#363636]/70">Showing {firstRecord}-{lastRecord} of {totalViolations} recorded violations</p>
                            <div className="flex flex-col lg:flex-row flex-1 min-h-0">
                                <div className="overflow-x-auto flex-1 min-w-0">
                                    <table className="w-full min-w-[31.5rem] text-left">
                                        <thead className="border-b border-[#D9D9D9] text-[0.5625rem] sm:text-[0.75rem] text-[#363636]/70">
                                            <tr>
                                                <th className="px-[0.5625rem] sm:px-[0.9375rem] py-[0.5625rem] font-medium">Vehicle</th>
                                                <th className="px-[0.5625rem] sm:px-[0.9375rem] py-[0.5625rem] font-medium">Violation</th>
                                                <th className="px-[0.5625rem] sm:px-[0.9375rem] py-[0.5625rem] font-medium">Approach</th>
                                                <th className="px-[0.5625rem] sm:px-[0.9375rem] py-[0.5625rem] font-medium">Recorded At</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {violations.map((violation, index) => (
                                                <tr key={`${violation.vehicle}-${violation.time_stamp}-${index}`} onClick={() => setSelectedViolation(violation)} className={`cursor-pointer border-b border-[#D9D9D9] hover:bg-black/10 text-[0.5625rem] sm:text-[0.6rem] text-[#363636] ${selectedViolation === violation ? 'bg-black/10' : ''}`}>
                                                    <td className="px-[0.5625rem] sm:px-[0.9375rem] py-3 font-medium">{violation.vehicle || 'Unknown vehicle'}</td>
                                                    <td className={`px-[0.5625rem] sm:px-[0.9375rem] py-3 font-bold ${violation.violation_type === 2 ? 'text-red-600' : 'text-orange-500'}`}>{violationTypes[violation.violation_type] || 'Unknown violation'}</td>
                                                    <td className="px-[0.5625rem] sm:px-[0.9375rem] py-3">{approaches[violation.camera_id] || `Camera ${violation.camera_id}`}</td>
                                                    <td className="px-[0.5625rem] sm:px-[0.9375rem] py-3">{violation.time_stamp}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <aside className="min-h-48 lg:min-h-0 lg:w-[13.5rem] lg:shrink-0 flex flex-col overflow-hidden border-t lg:border-t-0 lg:border-l border-[#D9D9D9] bg-white">
                                    <p className="shrink-0 px-[0.5625rem] py-[0.375rem] text-[0.5625rem] font-medium text-[#363636]/70 border-b border-[#D9D9D9]">Selected violation</p>
                                    {selectedViolation ? <div className="flex-1 min-h-0"><ViolationDataDisplay violationDisplay={selectedViolation} compact /></div> : <p className="p-[1.125rem] text-center text-[0.75rem] text-[#363636]/70">Select a recorded violation to view its evidence.</p>}
                                </aside>
                            </div>
                            {violations.length === 0 && <p className="p-6 text-[0.75rem] text-center text-[#363636]">No violation records match the current filters.</p>}
                            {totalViolations > 0 && (
                                <nav className="flex items-center justify-between gap-[0.5625rem] border-t border-[#D9D9D9] px-[0.5625rem] sm:px-[0.9375rem] py-[0.5625rem]" aria-label="Violation history pages">
                                    <button type="button" onClick={() => setPage(page - 1)} disabled={page === 1} className="rounded border border-[#D9D9D9] px-[0.5625rem] py-[0.375rem] text-[0.75rem] text-[#363636] disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                                    <span className="text-[0.5625rem] sm:text-[0.75rem] text-[#363636]/70">Page {page} of {totalPages}</span>
                                    <button type="button" onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="rounded border border-[#D9D9D9] px-[0.5625rem] py-[0.375rem] text-[0.75rem] text-[#363636] disabled:cursor-not-allowed disabled:opacity-40">Next</button>
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
        <div className="min-h-24 md:min-h-0 bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] rounded flex flex-col justify-between p-3 sm:p-[0.9375rem]">
            <p className="font-medium text-[0.75rem] sm:text-[0.825rem] text-[#363636]">{label}</p>
            <p className="text-[1.125rem] sm:text-[2.25rem] text-[black]/60">{value.toLocaleString()}</p>
        </div>
    )
}
