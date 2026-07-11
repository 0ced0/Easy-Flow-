import { useEffect, useState } from 'react'

export const VideoStream = () => {

    return (

        <div className="grid max-h-[45vh] overflow-hidden">
            <div className="grid grid-cols-2 gap-0 overflow-hidden">
                <img src={'http://127.0.0.1:5000/stob_stream_video'} className="h-full" />
                <img src={'http://127.0.0.1:5000/stos_stream_video'} className="h-full" />
            </div>
            <div className="grid grid-cols-2 gap-0 overflow-hidden">
                <img src={'http://127.0.0.1:5000/stop_stream_video'} className="h-full" />
                <img src={'http://127.0.0.1:5000/stop_stream_video'} className="h-full" />
            </div>
        </div>
    )
}