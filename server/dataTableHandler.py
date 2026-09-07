from database.databaseConnector import dbGetHourlyData
from database.databaseConnector import dbGetDataTable
from database.databaseConnector import dbGetMonthlyData
from database.databaseConnector import dbGetDailyData
from database.databaseConnector import dbGetWeeklyData
from flask import Blueprint, request
import statistics
dataRequest = Blueprint("dataRequest",__name__)
def getHourlyData(cameraId, date):
    try:
        cameraId += 1
        response = dbGetHourlyData(cameraId, date)
        return response
    except ValueError as error:
        print(error)

def getAllRows(cameraId, page, date):
    try:
        allRows = []
        if cameraId is not None:
            cameraId += 1
        response = dbGetDataTable(cameraId, page, date)

        for row in response:
            responseDate = row.get("created_at").strftime("%m-%d-%Y")
            time = row.get("created_at").strftime("%I:%M %p")
            vehicleCount = row.get("vehicle_count")
            flow = row.get("traffic_flow")
            density = row.get("spatial_density")
            id = row.get("camera_id")
            data = {
                "approach" : id,
                "date" : responseDate,
                "time" : time,
                "vehicleCount" : vehicleCount,
                "flow" : flow,
                "density" : density
            }
            allRows.append(data)
        return allRows
    except ValueError as error:
        print(error)


def getMonthlyData(cameraId, month):
    cameraId += 1
    response = dbGetMonthlyData(cameraId, month)

    if response[0].get("total_vehicle_count") is None or response[0].get("average_flow") is None or response[0].get("average_density") is None:
        return {
            "message" : "No Data Available"
        }
    totalVehicleCount = int(response[0].get("total_vehicle_count"))
    averageVehicleFlow = int(response[0].get("average_flow"))
    averageSpatialDensity = int(response[0].get("average_density"))
    
    return {
        "totalVehicleCount" : totalVehicleCount,
        "averageVehicleFlow" : averageVehicleFlow,
        "averageDensity" : averageSpatialDensity
    }

def getDailyData(cameraId, page, month):
    allRows = []
    cameraId += 1
    response = dbGetDailyData(cameraId, page, month)
    for row in response:
        
        allRows.append({
            "camera_id" : row.get("camera_id"),
            "vehicleCount" : row.get("total_vehicle_count"),
            "date" : row.get("date").strftime("%m-%d-%Y"),
            "averageFlow" : int(row.get("average_flow")),
            "averageDensity" : int(row.get("average_density"))
        })
    return allRows

def getWeeklyData(cameraId, month):
    weeklyData = []
    cameraId += 1
    response = dbGetWeeklyData(cameraId, month)

    for row in response:
        weeklyData.append({
            "weekNumber" : int(row.get("week_number")),
            "totalVehicleCount" : int(row.get("total_vehicle_count")),
            "averageFlow" : int(row.get("average_flow")),
            "averageDensity" : int(row.get("average_density"))
        })

    return weeklyData

@dataRequest.route("/get_weekly_data")
def get_weekly_data():
    cameraId = int(request.args.get("camera_id"))
    month = request.args.get("dateFilter")
    response = getWeeklyData(cameraId, month)
    return response

@dataRequest.route("/get_daily_data")
def get_daily_data():
    cameraId = int(request.args.get("camera_id"))
    page = int(request.args.get("page"))
    month = request.args.get("dateFilter")
    response = getDailyData(cameraId, page, month)
    return response

@dataRequest.route("/get_monthly_data")
def get_monthly_data():
    cameraId = int(request.args.get("camera_id"))
    month = request.args.get("dateFilter")
    data = getMonthlyData(cameraId, month)
    return data

@dataRequest.route("/get_hourly_data")
def handleRequest():
    camera_id = int(request.args.get("camera_id"))
    date = request.args.get("dateFilter")
    response = getHourlyData(camera_id, date)
    return response

@dataRequest.route("/get_all_rows")
def get_all_rows():
    cameraId = int(request.args.get("camera_id"))
    page = int(request.args.get("page"))
    date = request.args.get("dateFilter")
    data = getAllRows(cameraId, page, date)
    return data

@dataRequest.route("/get_summary_data")
def get_summary_data():
    lspuFlow = []
    lspuDensity = []

    patimbaoFlow = []
    patimbaoDensity = []

    sunstarFlow = []
    sunstarDensity = []

    complexFlow = []
    complexDensity = []

    date = request.args.get("dateFilter")
    response = getAllRows(None, None, date)
    if len(response) > 0:
        for row in response:
            cameraId = int(row.get("approach"))
            if cameraId == 1:
                lspuFlow.append(row.get("flow"))
                lspuDensity.append(row.get("density"))
            elif cameraId == 2:
                patimbaoFlow.append(row.get("flow"))
                patimbaoDensity.append(row.get("density"))
            elif cameraId == 3:
                sunstarFlow.append(row.get("flow"))
                sunstarDensity.append(row.get("density"))
            elif cameraId == 4:
                complexFlow.append(row.get("flow"))
                complexDensity.append(row.get("density"))

        lspuAverageFlow = int(statistics.mean(lspuFlow))
        lspuAverageDensity = int(statistics.mean(lspuDensity))

        patimbaoAverageFlow = int(statistics.mean(patimbaoFlow))
        patimbaoAverageDensity = int(statistics.mean(patimbaoDensity))

        sunstarAverageFlow = int(statistics.mean(sunstarFlow))
        sunstarAverageDensity = int(statistics.mean(sunstarDensity))

        complexAverageFlow = int(statistics.mean(complexFlow))
        complexAverageDensity = int(statistics.mean(complexDensity))

        data = {
            "lspuAverageFlow" : lspuAverageFlow,
            "lspuAverageDensity" : lspuAverageDensity,
            "patimbaoAverageFlow" : patimbaoAverageFlow,
            "patimbaoAverageDensity" : patimbaoAverageDensity,
            "sunstarAverageFlow" : sunstarAverageFlow,
            "sunstarAverageDensity" : sunstarAverageDensity,
            "complexAverageFlow" : complexAverageFlow,
            "complexAverageDensity" : complexAverageDensity,
            "date" : response[0].get("date")
        }
    else:
        data = []

    return data

