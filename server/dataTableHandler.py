from database.databaseConnector import dbGetDataTable
from flask import Blueprint, request

dataRequest = Blueprint('dataRequest', __name__)

class dataTable:
    def __init__(self):
        self.none = None

    def getAllRows(self, camera_id, page, dateFilter):
        rows = dbGetDataTable(camera_id, int(page), dateFilter)
        allRows = []
        for row in rows:
            allRows.append({
                "cameraId" : row["camera_id"],
                "date" : row["created_at"].strftime("%m-%d-%Y"),
                "time" : row["created_at"].strftime("%H:%M"),
                "vehicleCount" : row["vehicle_count"],
                "flow" : row["traffic_flow"],
                "density" : row["spatial_density"],
            })

        return allRows

DT = dataTable()
@dataRequest.route('/get_data_table')
def showAllRows():
    camera_id = request.args.get("camera_id")
    page = request.args.get("page")
    dateFilter = request.args.get("dateFilter")
    return DT.getAllRows(camera_id, page, dateFilter)

