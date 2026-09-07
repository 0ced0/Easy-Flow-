// SAMBAT TO PATIMBAO APIS

export const getStopStatData = async () => {
    try{
        return await fetch('http://127.0.0.1:5000/stop_get_stat_data')
    }catch(error){
        console.error(error)
    }
}

export const stopUpdateFrontend = async () => {
    try{
        return await fetch('http://127.0.0.1:5000/stop_update_frontend')
    }catch(error){
        console.error(error)
    }
}



// // SAMBAT TO LSPU APIS

export const getStolStatData = async () => {
    try{
        return await fetch('http://127.0.0.1:5000/stol_get_stat_data')
    }catch(error){
        console.error(error)
    }
}

export const stolUpdateFrontend = async () => {
    try{
        return await fetch('http://127.0.0.1:5000/stol_update_frontend')
    }catch(error){
        console.error(error)
    }
}


// SAMBAT TO COMPLEX APIS
export const getStocStatData = async () => {
    try{
        return await fetch('http://127.0.0.1:5000/stoc_get_stat_data')
    }catch(error){
        console.error(error)
    }
}

export const stocUpdateFrontend = async () => {
    try{
        return await fetch('http://127.0.0.1:5000/stoc_update_frontend')
    }catch(error){
        console.error(error)
    }
}




// SAMBAT TO SUNSTAR APIS
export const getStosStatData = async () => {
    try{
        return await fetch('http://127.0.0.1:5000/stos_get_stat_data')
    }catch(error){
        console.error(error)
    }
}

export const stosUpdateFrontend = async () => {
    try{
        return await fetch('http://127.0.0.1:5000/stos_update_frontend')
    }catch(error){
        console.error(error)
    }
}



// TRAFFIC FORECAST API
export const getTrafficForecast = async () => {
    try{
        return await fetch('http://127.0.0.1:5000/get_traffic_forecast')
    }
    catch(error){
        console.error(error)
    }
}




// DATA REQUEST HANDLER API
export const getTrafficData = async (camera_id, dateFilter=null) => {
    try{
        let url = `http://127.0.0.1:5000/get_hourly_data?camera_id=${camera_id}`
        if (dateFilter !== null){
            url += `&dateFilter=${dateFilter}`
        }
        return await fetch(url)
    }catch(error){  
        console.error(error)
    }
}

export const getAllRows = async (camera_id=0, page=null, dateFilter=null) => {
    try{
        let url = `http://127.0.0.1:5000/get_all_rows?camera_id=${camera_id}&page=${page}`
        if (dateFilter !== null){
            url += `&dateFilter=${dateFilter}`
        }

        return await fetch(url)
    }catch(error){
        console.error(error)
    }
}

export const getSummaryData = async (dateFilter=null) => {
    try{

        let url = `http://127.0.0.1:5000/get_summary_data`
        if (dateFilter !== null){
            url += `?dateFilter=${dateFilter}`
        }

        return await fetch(url)
    }
    catch(error){
        console.error(error)
    }
}

export const getDailyData = async (camera_id=0, page, dateFilter=null) => {
    try{
        // console.log(page)
        return await fetch(`http://127.0.0.1:5000/get_daily_data?camera_id=${camera_id}&page=${page}&dateFilter=${dateFilter}`)
    }catch(error){
        console.error
    }
}
export const getMonthlyData = async (camera_id=0, dateFilter=null) => {
    try{
        // console.log(camera_id)
        let url = `http://127.0.0.1:5000/get_monthly_data?camera_id=${camera_id}`
        if (dateFilter !== null){
            url += `&dateFilter=${dateFilter}`
        }

        return await fetch(url)
    }catch(error){
        console.error(error)
    }
}

export const getWeeklyData = async (camera_id=0, dateFilter=null) => {
    try{
        let url = `http://127.0.0.1:5000/get_weekly_data?camera_id=${camera_id}`
        if (dateFilter !== null){
            url += `&dateFilter=${dateFilter}`
        }

        return await fetch(url)
    }catch(error){
        console.error(error)
    }
}


// TRAFFIC LIGHT TIMERS CONFIG API
export const postTrafficTimersConfig = async (timerConfiguration) => {
    try{
        return await fetch('http://127.0.0.1:5000/update_traffic_light_config', {
            method:'POST',
            headers: {"Content-Type": "application/json"},
            body:JSON.stringify({configs:timerConfiguration})
        }
    )
    }catch(error){
        console.error(error)
    }
}

// GET TRAFFIC LIGHT DATA API
export const getTrafficLightData = async () => {
    try{
        return await fetch('http://127.0.0.1:5000/get_intersection_timers')
    }catch(error){
        console.error(error)
    }
}



// DENSITY CONFIG API
export const postDensityConfig = async (densityConfiguration) => {
    try{
        return await fetch('http://127.0.0.1:5000/update_density_config', {
            method:'POST',
            headers: {"Content-Type": "application/json"},
            body:JSON.stringify({configs:densityConfiguration})
        })
    }catch(error){
        console.error(error)
    }
}


// GET DENSITY THRESHOLDS CONFIG API
export const getDensityConfig = async () => {
    try{
        return await fetch("http://127.0.0.1:5000/get_density_configuration")
    }catch(error){
        console.error(error)
    }
}

// FLOW THRESHOLD CONFIG API
export const postFlowConfig = async (flowConfiguration) => {
    try{
        return await fetch("http://127.0.0.1:5000/update_flow_config", {
            method:'POST',
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({configs: flowConfiguration})
        })
    }catch(error){
        console.error(error)
    }
}


// GET FLOW THRESHOLDS API
export const getFlowConfig = async () => {
    try{
        return await fetch("http://127.0.0.1:5000/get_flow_configuration")
    }catch(error){
        console.error(error)
    }
}


// VIOLATION DATA API
export const getViolationData = async () => {
    try{
        return await fetch("http://127.0.0.1:5000/get_violation_data")
    }catch(error){
        console.error(error)
    }
}


