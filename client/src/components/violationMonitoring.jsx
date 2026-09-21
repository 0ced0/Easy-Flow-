const violationDetails = {
    1: {label: 'Loading / unloading', color: 'text-amber-300', icon: '▲'},
    2: {label: 'Illegal parking', color: 'text-red-300', icon: '!'},
}

export default function ViolationMonitoring({violationData, setViolationDisplay, isLoading}) {
    const violations = Object.entries(violationData ?? [])

    return (
        <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f9fcff] text-[#17324c]" aria-label="Live violation alerts">
            <header className="flex shrink-0 items-center justify-between border-b border-[#cfdeea] px-3 py-2.5">
                <div>
                    <h2 className="text-[0.7rem] font-semibold tracking-[0.01em]">Live alerts</h2>
                    <p className="mt-0.5 text-[0.55rem] text-[#54708a]">Detected violations</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf4f9] px-2 py-1 text-[0.55rem] font-medium text-[#214766]">
                    <span className="size-1.5 rounded-full bg-[#16a36b]" />
                    {isLoading ? 'Syncing' : `${violations.length} latest`}
                </span>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-1.5 [scrollbar-color:#b9cedf_transparent] [scrollbar-width:thin]">
                {isLoading ? (
                    <div className="space-y-1.5 animate-pulse">
                        {[1, 2, 3, 4].map((row) => <div key={row} className="h-12 rounded-md bg-[#e6eff6]" />)}
                    </div>
                ) : violations.length ? (
                    <div className="space-y-1">
                        {violations.map(([vehicleId, violationInformation]) => {
                            const details = violationDetails[violationInformation.violation_type] ?? {label: 'Traffic violation', color: 'text-[#214766]', icon: '!'}
                            return (
                                <button
                                    key={vehicleId}
                                    type="button"
                                    onClick={() => setViolationDisplay(violationInformation)}
                                    className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-[#edf4f9] focus-visible:bg-[#dcebf7] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1c5f9f]"
                                >
                                    <span className={`grid size-5 shrink-0 place-items-center rounded-full bg-[#edf4f9] text-[0.6rem] font-bold ${details.color}`} aria-hidden="true">{details.icon}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[0.65rem] font-semibold text-[#17324c]">{violationInformation.vehicle || 'Unknown vehicle'}</span>
                                        <span className={`mt-0.5 block truncate text-[0.55rem] font-medium ${details.color}`}>{details.label}</span>
                                    </span>
                                    <span className="mt-0.5 text-[0.5rem] text-[#54708a]">View</span>
                                </button>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                        <span className="grid size-8 place-items-center rounded-full bg-[#edf4f9] text-[#16835e]">✓</span>
                        <p className="mt-2 text-[0.65rem] font-medium text-[#17324c]">No active alerts</p>
                        <p className="mt-1 text-[0.55rem] leading-relaxed text-[#54708a]">New violations will appear here.</p>
                    </div>
                )}
            </div>
        </section>
    )
}
