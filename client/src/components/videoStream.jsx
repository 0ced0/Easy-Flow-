import { useEffect, useState } from 'react'
import { streamVideo } from '../hooks/api'

export const VideoStream = () => {

    // STATE VARIABLES
    const [frame, setFrame] = useState(null)

    useEffect(() => {
        const loadImage = async () => {
            const response = await streamVideo()
            const data = await response.blob()
            const frameUrl = URL.createObjectURL(data)

            setFrame(previousFrame => {
                if (previousFrame) {
                    URL.revokeObjectURL(previousFrame)
                }
                return frameUrl
            })

        }

        loadImage()

        const loop = setInterval(
            loadImage,
            40
        )

        return () => {
            clearInterval(loop),
                setFrame((previousFrame) => {
                    if (previousFrame) {
                        URL.revokeObjectURL(previousFrame)
                    }
                    return null
                })
        }
    }, [])

    return (
        <div className="grid h-[11rem] overflow-hidden">
            <div className="grid grid-cols-2 gap-0 overflow-hidden">
                <img src={frame} className="h-full" />
                <img src={frame} className="h-full" />
            </div>
            <div className="grid grid-cols-2 gap-0 overflow-hidden">
                <img src={frame} className="h-full" />
                <img src={frame} className="h-full" />
            </div>
        </div>
    )
}