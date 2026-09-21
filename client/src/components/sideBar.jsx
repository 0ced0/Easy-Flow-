import {NavLink} from 'react-router-dom'

const navigationItems = [
    {to: '/dashboard', label: 'Monitor', icon: <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />},
    {to: '/data_table_page', label: 'Analytics', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v18m0-1.5h16.5M7.5 16.5l3-3 2.25 1.5 4.5-6" />},
    {to: '/violation_records', label: 'Alerts', icon: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 3 21 20.25H3L12 3Z" /><path strokeLinecap="round" d="M12 9v5m0 3.25h.01" /></>},
    {to: '/traffic_light_controls_page', label: 'Signals', icon: <><rect x="7" y="2" width="10" height="16" rx="2" /><circle cx="12" cy="6" r="1.25" fill="currentColor" /><circle cx="12" cy="10" r="1.25" fill="currentColor" /><circle cx="12" cy="14" r="1.25" fill="currentColor" /><path strokeLinecap="round" d="M12 18v4m-3 0h6" /></>},
]

export default function SideBar({compact = false}) {
    const railSize = compact ? 'h-14 md:h-full md:w-13' : 'h-16 md:h-full md:w-16'

    return (
        <nav className={`fixed inset-x-0 bottom-0 z-[500] flex w-full shrink-0 items-center justify-around border border-[#cfdeea] bg-[#f9fcff] px-1.5 shadow-[0_-8px_24px_rgba(28,72,109,0.12)] md:static md:inset-auto md:self-stretch md:flex-none md:flex-col md:justify-start md:gap-2 md:rounded-lg md:px-1.5 md:py-2.5 md:shadow-[4px_0_18px_rgba(28,72,109,0.08)] ${railSize}`} aria-label="Easy Flow navigation">
            <NavLink to="/landing" className="hidden md:grid md:size-9 md:place-items-center md:rounded-md md:bg-[#1c5f9f] md:text-white md:transition-transform md:hover:-translate-x-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c5f9f]" aria-label="Back to system portal" title="Back to system portal">
                <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
                    <path d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </NavLink>
            <div className="hidden w-6 border-t border-[#cfdeea] md:block" />
            {navigationItems.map((item) => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    className={({isActive}) => `group flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-[0.6rem] font-medium text-[#54708a] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c5f9f] md:flex-none md:gap-0 md:px-0 md:py-0 ${isActive ? 'bg-[#dcebf7] text-[#1c5f9f] shadow-[inset_3px_0_0_#1c5f9f] md:size-10' : 'hover:bg-[#edf4f9] hover:text-[#17324c] md:size-10'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.65" stroke="currentColor" className={`size-5 shrink-0 ${compact ? 'md:size-[1.35rem]' : 'md:size-6'}`} aria-hidden="true">
                        {item.icon}
                    </svg>
                    <span className="truncate md:sr-only">{item.label}</span>
                </NavLink>
            ))}
            <div className="hidden md:mt-auto md:flex md:items-center md:justify-center" title="System online">
                <span className="size-2 rounded-full bg-[#16a36b] shadow-[0_0_0_4px_rgba(22,163,107,0.12)]" />
            </div>
        </nav>
    )
}
