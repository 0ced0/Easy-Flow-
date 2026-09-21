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
        const controller = new AbortController()
        let active = true
        const loadViolations = async () => {
            setIsLoading(true)
            setError('')
            try {
                const response = await getPaginatedViolationData(page, search, typeFilter, controller.signal, false)
                if (!response?.ok) throw new Error('Unable to load violation records.')
                const data = await response.json()
                if (!active) return
                setViolations(data.violations)
                setSelectedViolation(data.violations[0] || null)
                setTotalViolations(data.total)
                setCounts(data.counts)
            } catch (requestError) {
                if (requestError.name !== 'AbortError' && active) setError(requestError.message)
            } finally {
                if (active) setIsLoading(false)
            }
        }

        loadViolations()
        return () => {
            active = false
            controller.abort()
        }
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
        <div className="flex min-h-screen w-full flex-col bg-[#eaf1f6] p-[0.1875rem] pb-15 md:h-[99vh] md:flex-row md:pb-[0.1875rem]">
            <SideBar compact />
            <main className="w-full min-w-0 py-[0.5625rem] px-[0.5625rem] sm:px-[1.125rem] md:py-[0.75rem] lg:px-[1.875rem] overflow-y-auto">
                <div className="relative mb-[0.5625rem] flex flex-wrap items-center justify-between gap-1.5 md:mb-[0.375rem]">
                    <h1 className="w-full text-[0.9375rem] font-semibold text-[#17324c] sm:w-auto sm:text-[1.275rem]">Traffic Violation History</h1>
                    <p className="text-[0.75rem] text-[#54708a]">All violations recorded by the monitoring system</p>
                </div>

                <section className="h-auto rounded-lg border border-[#cfdeea] bg-[#edf4f9] p-1.5 shadow-[0_8px_20px_rgba(28,72,109,0.08)] sm:p-3 md:h-[clamp(160px,22dvh,210px)]" aria-label="Detected violation summary">
                    <ViolationSummaryCard totalCount={counts.total} />
                </section>

                <section className="mt-[0.5625rem] flex min-h-[24rem] flex-col overflow-hidden rounded-lg border border-[#cfdeea] bg-[#f9fcff] shadow-[0_8px_20px_rgba(28,72,109,0.08)]">
                    <div className="flex flex-col gap-[0.5625rem] border-b border-[#cfdeea] p-[0.5625rem] sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-[0.75rem] font-medium text-[#17324c] sm:text-[0.9rem]">Recorded Violations</h2>
                        <div className="flex flex-col gap-1.5 sm:flex-row">
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => updateSearch(event.target.value)}
                                placeholder="Search vehicle, camera, or time"
                                className="rounded-md border border-[#cfdeea] bg-[#f9fcff] px-3 py-1.5 text-[0.75rem] text-[#214766] outline-none shadow-[0_6px_14px_rgba(28,72,109,0.08)] placeholder:text-[#7891a7] focus:border-[#1c5f9f]"
                            />
                            <select value={typeFilter} onChange={(event) => updateTypeFilter(event.target.value)} className="rounded-md border border-[#cfdeea] bg-[#f9fcff] px-3 py-1.5 text-[0.75rem] text-[#214766] outline-none shadow-[0_6px_14px_rgba(28,72,109,0.08)] focus:border-[#1c5f9f]">
                                <option value="all">All Violation Types</option>
                                <option value="1">Illegal Loading/Unloading</option>
                                <option value="2">Illegal Parking</option>
                            </select>
                        </div>
                    </div>

                    {showInitialLoading && <p className="p-6 text-center text-[0.75rem] text-[#54708a]">Loading violation records...</p>}
                    {error && <p className="p-6 text-[0.75rem] text-center text-red-600">{error}</p>}
                    {!showInitialLoading && !error && (
                        <>
                            <p className="border-b border-[#cfdeea] px-[0.5625rem] py-[0.5625rem] text-[0.5625rem] text-[#54708a] sm:px-[0.9375rem] sm:text-[0.75rem]">Showing {firstRecord}-{lastRecord} of {totalViolations} recorded violations</p>
                            <div className="flex flex-col lg:flex-row flex-1 min-h-0">
                                <div className="overflow-x-auto flex-1 min-w-0">
                                    <table className="w-full min-w-[31.5rem] text-left">
                                        <thead className="border-b border-[#cfdeea] bg-[#f2f7fb] text-[0.5625rem] text-[#54708a] sm:text-[0.75rem]">
                                            <tr>
                                                <th className="px-[0.5625rem] sm:px-[0.9375rem] py-[0.5625rem] font-medium">Vehicle</th>
                                                <th className="px-[0.5625rem] sm:px-[0.9375rem] py-[0.5625rem] font-medium">Violation</th>
                                                <th className="px-[0.5625rem] sm:px-[0.9375rem] py-[0.5625rem] font-medium">Approach</th>
                                                <th className="px-[0.5625rem] sm:px-[0.9375rem] py-[0.5625rem] font-medium">Recorded At</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {violations.map((violation, index) => (
                                                <tr key={`${violation.vehicle}-${violation.time_stamp}-${index}`} onClick={() => setSelectedViolation(violation)} className={`cursor-pointer border-b border-[#e2edf5] text-[0.5625rem] text-[#214766] hover:bg-[#edf4f9] sm:text-[0.6rem] ${selectedViolation === violation ? 'bg-[#dcebf7]' : ''}`}>
                                                    <td className="px-[0.5625rem] sm:px-[0.9375rem] py-3 font-medium">{violation.vehicle || 'Unknown vehicle'}</td>
                                                    <td className={`px-[0.5625rem] sm:px-[0.9375rem] py-3 font-bold ${violation.violation_type === 2 ? 'text-red-600' : 'text-orange-500'}`}>{violationTypes[violation.violation_type] || 'Unknown violation'}</td>
                                                    <td className="px-[0.5625rem] sm:px-[0.9375rem] py-3">{approaches[violation.camera_id] || `Camera ${violation.camera_id}`}</td>
                                                    <td className="px-[0.5625rem] sm:px-[0.9375rem] py-3">{violation.time_stamp}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <aside className="flex min-h-48 flex-col overflow-hidden border-t border-[#cfdeea] bg-[#f2f7fb] lg:min-h-0 lg:w-[clamp(18rem,28vw,26rem)] lg:shrink-0 lg:border-t-0 lg:border-l">
                                    <p className="shrink-0 border-b border-[#cfdeea] px-[0.5625rem] py-[0.375rem] text-[0.5625rem] font-medium text-[#54708a]">Selected violation</p>
                                    {selectedViolation ? <div className="flex-1 min-h-0"><ViolationDataDisplay violationDisplay={selectedViolation} compact /></div> : <p className="p-[1.125rem] text-center text-[0.75rem] text-[#54708a]">Select a recorded violation to view its evidence.</p>}
                                </aside>
                            </div>
                            {violations.length === 0 && <p className="p-6 text-center text-[0.75rem] text-[#54708a]">No violation records match the current filters.</p>}
                            {totalViolations > 0 && (
                                <nav className="flex items-center justify-between gap-[0.5625rem] border-t border-[#cfdeea] px-[0.5625rem] py-[0.5625rem] sm:px-[0.9375rem]" aria-label="Violation history pages">
                                    <button type="button" onClick={() => setPage(page - 1)} disabled={page === 1} className="rounded-md border border-[#cfdeea] bg-[#f9fcff] px-[0.5625rem] py-[0.375rem] text-[0.75rem] text-[#214766] hover:bg-[#edf4f9] disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                                    <span className="text-[0.5625rem] text-[#54708a] sm:text-[0.75rem]">Page {page} of {totalPages}</span>
                                    <button type="button" onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="rounded-md border border-[#cfdeea] bg-[#f9fcff] px-[0.5625rem] py-[0.375rem] text-[0.75rem] text-[#214766] hover:bg-[#edf4f9] disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                                </nav>
                            )}
                        </>
                    )}
                </section>
            </main>
        </div>
    )
}

function ViolationSummaryCard({totalCount}) {
    return (
        <article className="flex h-full min-h-24 flex-col overflow-hidden rounded-md border border-[#cfdeea] bg-[#f9fcff] shadow-[0_6px_14px_rgba(28,72,109,0.08)] md:min-h-0">
            <header className="flex shrink-0 items-center justify-between border-b border-[#cfdeea] px-3 py-2 sm:px-[0.9375rem]">
                <div>
                    <h2 className="text-[0.75rem] font-medium text-[#17324c] sm:text-[0.825rem]">Detected violation summary</h2>
                    <p className="mt-0.5 text-[0.5625rem] text-[#54708a]">All violation types currently monitored by the system</p>
                </div>
            </header>
            <div className="flex min-h-0 flex-1 items-center justify-between gap-3 px-3 py-2 sm:px-[0.9375rem]">
                <div className="min-w-0">
                    <p className="text-[0.75rem] font-medium text-[#17324c] sm:text-[0.825rem]">Illegal Parking / Illegal Loading and Unloading</p>
                    <p className="mt-0.5 text-[0.5625rem] text-[#54708a]">Recorded incidents</p>
                </div>
                <p className="shrink-0 text-[1.5rem] font-semibold text-[#1c5f9f] sm:text-[2.5rem]">{totalCount.toLocaleString()}</p>
            </div>
        </article>
    )
}
