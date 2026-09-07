from database.databaseConnector import dbGetViolationData
from flask import Blueprint
import cv2
import base64

violationTable = Blueprint("violationTable", __name__)

@violationTable.route("/get_violation_data")
def getViolationData():
    data = dbGetViolationData()
    for row in data:
        row["frame"] = bytes(row["frame"]).decode("utf-8")
    return data