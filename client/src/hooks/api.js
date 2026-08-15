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
export const getAllRows = async () => {
    try{
        return await fetch('http://127.0.0.1:5000/get_data_table')
    }catch(error){  
        console.error(error)
    }
}





//TRAFFIC LIGHT DATA API
export const getTrafficLightData = async () => {
    try{
        return await fetch('http://127.0.0.1:5000/get_intersection_timers')
    }catch(error){
        console.error(error)
    }
}