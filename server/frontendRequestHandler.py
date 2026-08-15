from database.databaseConnector import getForecastIntervals
from flask import Blueprint

dataRequest = Blueprint('dataRequest', __name__)

class dataTable:
    def __init__(self):
        self.allRows = {}

    def getAllRows(self):
        rows = getForecastIntervals(12)
        for row in rows:
            self.allRows[row["camera_id"]] = {
                "date" : row["time_step"].strftime("%m-%d-%Y"),
                "time" : row["time_step"].strftime("%H:%M:%S"),
                "vehicleCount" : row["vehicle_count"],
                "flow" : row["traffic_flow"],
                "density" : row["spatial_density"],
            }

        return self.allRows

DT = dataTable()
@dataRequest.route('/get_data_table')
def showAllRows():
    return DT.getAllRows()

