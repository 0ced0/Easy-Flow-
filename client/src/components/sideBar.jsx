import {NavLink} from 'react-router-dom'

export default function SideBar ({compact = false}) {
    return(
        <div className={compact ? "fixed inset-x-0 bottom-0 z-[500] h-12 w-full bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] p-1.5 flex flex-row items-center justify-around gap-3 md:static md:h-full md:self-stretch md:flex-none md:shrink-0 md:min-h-0 md:w-[clamp(2.25rem,2.25vw,2.625rem)] md:p-[0.1875rem] md:flex-col md:justify-start md:gap-4.5" : "fixed inset-x-0 bottom-0 z-[500] h-16 w-full bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] p-2 flex flex-row items-center justify-around gap-4 md:static md:h-full md:self-stretch md:flex-none md:shrink-0 md:min-h-0 md:w-[clamp(3rem,3vw,3.5rem)] md:p-1 md:flex-col md:justify-start md:gap-6"}>
            <NavLink to={"/"}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`sideBarIcons ${compact ? 'size-6 md:size-[1.6875rem]' : 'size-8 md:size-9'} hover:bg-black/20`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
            </NavLink>

            <NavLink to={"/data_table_page"}>
                <div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`sideBarIcons ${compact ? 'size-6 md:size-[1.6875rem]' : 'size-8 md:size-9'} hover:bg-black/20`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
                    </svg>
                </div>
            </NavLink>
            <NavLink to={"/violation_records"}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`sideBarIcons ${compact ? 'size-6 md:size-[1.6875rem]' : 'size-8 md:size-9'} hover:bg-black/20`} aria-label="Traffic violation history">
                    <title>Traffic violation history</title>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 21 20.25H3L12 3Z" />
                    <path strokeLinecap="round" d="M12 9v5" />
                    <path strokeLinecap="round" d="M12 17.25h.01" />
                </svg>
            </NavLink>
            <NavLink to={"/traffic_light_controls_page"}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`sideBarIcons ${compact ? 'size-6 md:size-[1.6875rem]' : 'size-8 md:size-9'} shrink-0 hover:bg-black/20`} aria-label="Traffic light controls">
                    <title>Traffic light controls</title>
                    <rect x="7" y="2" width="10" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="12" cy="6" r="1.75" fill="#DC2626" />
                    <circle cx="12" cy="10" r="1.75" fill="#F59E0B" />
                    <circle cx="12" cy="14" r="1.75" fill="#16A34A" />
                    <path d="M12 18v4M9 22h6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            </NavLink>
        </div>
    )
}
