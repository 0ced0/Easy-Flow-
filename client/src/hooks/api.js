export const runInference = async () => {
    try {
        return await fetch('http://127.0.0.1:5000/run_inference')
    }
    catch (error) {
        return ("We got this error: ", error)
    }
}

export const streamVideo = async () => {
    try {
        return await fetch('http://127.0.0.1:5000/stream_video')
    } catch (error) {
        return ("we got this error", error)
    }
}
