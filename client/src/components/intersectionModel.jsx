// import React from 'react';
import { useState, useEffect, useRef } from 'react'
import { Stage, Layer, Rect, Line } from 'react-konva'


export default function IntersectionModel() {
    const modelContainer = useRef(null);
    const [modelHeight, setModelHeight] = useState(0)
    const [modelWidth, setModelWidth] = useState(0)

    useEffect(() => {
        if (!modelContainer.current)
            return;
        const handleResize = () => {
            setModelHeight(modelContainer.current.offsetHeight)
            setModelWidth(modelContainer.current.offsetWidth)
        }

        addEventListener("resize", handleResize);
        handleResize()
    }, [])

    return (
        <div className="w-full h-full" ref={modelContainer}>
            <Stage width={window.innerWidth} height={window.innerHeight}>
                <Layer>
                    {/* <Text text={modelHeight} fontSize={25} />
                    <Text text={`test ${modelWidth}`} fontSize={25} y={30} /> */}
                    <Rect
                        x={modelWidth / 2.7}
                        y={0}
                        height={modelHeight}
                        width={modelWidth / 4}
                        fill="#353C45"
                    />

                    <Rect
                        x={0}
                        y={modelHeight / 2.6}
                        height={modelHeight / 4.5}
                        width={modelWidth}
                        fill="#353C45"

                    />
                </Layer>
                <Layer>
                    <Line
                        points={[modelWidth / 2.005, 2.5, modelWidth / 2.005, modelHeight]}
                        stroke="white"
                        strokeWidth={modelWidth / 50}
                        dash={[modelHeight / 45, modelHeight / 35]}
                    />
                    <Line
                        points={[2.5, modelHeight / 2, modelWidth, modelHeight / 2]}
                        stroke="white"
                        strokeWidth={modelWidth / 50}
                        dash={[modelHeight / 45, modelHeight / 35]}
                    />
                </Layer>
                <Layer>
                    <Rect
                        x={modelWidth / 2.4}
                        y={modelHeight / 2.25}
                        height={modelHeight / 9.5}
                        width={modelWidth / 6.4}
                        fill="#353C45"
                    // fill="red"
                    />
                </Layer>

            </Stage>

        </div>
    )
}