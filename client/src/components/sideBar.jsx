import {NavLink} from 'react-router-dom'

export default function SideBar () {
    return(
        <div className="fixed inset-x-0 bottom-0 z-[500] h-16 w-full bg-white shadow-[0px_1px_4px_1px_rgba(0,0,0,0.25)] p-2 flex flex-row items-center justify-around gap-4 md:static md:h-[97.5vh] md:w-[3vw] md:min-w-12 md:p-1 md:flex-col md:justify-start md:gap-6">
            <NavLink to={"/"}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="sideBarIcons size-8 md:size-9 hover:bg-black/20">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
            </NavLink>

            <NavLink to={"/data_table_page"}>
                <div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="sideBarIcons size-8 md:size-9 hover:bg-black/20">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
                    </svg>
                </div>
            </NavLink>
            <NavLink to={"/traffic_light_controls_page"}>
                <svg className="sideBarIcons size-8 md:size-9 shrink-0 fill-current hover:bg-black/20" 
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                <path d="M224 32C188.7 32 160 60.7 160 96L160 448C160 536.4 231.6 608 320 608C408.4 608 480 536.4 480 448L480 96C480 60.7 451.3 32 416 32L224 32zM320 424C350.9 424 376 449.1 376 480C376 510.9 350.9 536 320 536C289.1 536 264 510.9 264 480C264 449.1 289.1 424 320 424zM376 320C376 350.9 350.9 376 320 376C289.1 376 264 350.9 264 320C264 289.1 289.1 264 320 264C350.9 264 376 289.1 376 320zM320 216C289.1 216 264 190.9 264 160C264 129.1 289.1 104 320 104C350.9 104 376 129.1 376 160C376 190.9 350.9 216 320 216z"/></svg>
            </NavLink>
        </div>
    )
}
