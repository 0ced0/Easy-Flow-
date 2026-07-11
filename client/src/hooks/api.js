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





// // SAMBAT TO BUBUKAL/LSPU APIS

export const getStobStatData = async () => {
    try{
        return await fetch('http://127.0.0.1:5000/stob_get_stat_data')
    }catch(error){
        console.error(error)
    }
}

export const stobUpdateFrontend = async () => {
    try{
        return await fetch('http://127.0.0.1:5000/stob_update_frontend')
    }catch(error){
        console.error(error)
    }
}