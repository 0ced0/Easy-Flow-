from database.databaseConnector import dbGetAllViolationData, dbGetViolationData, dbGetViolationPage
from flask import Blueprint, request
import cv2
import base64

violationTable = Blueprint("violationTable", __name__)

@violationTable.route("/get_violation_data")
def getViolationData():
    data = dbGetViolationData()
    for row in data:
        row["frame"] = bytes(row["frame"]).decode("utf-8")
    return data

@violationTable.route("/get_all_violation_data")
def getAllViolationData():
    return dbGetAllViolationData()

@violationTable.route("/get_paginated_violation_data")
def getPaginatedViolationData():
    try:
        page = max(int(request.args.get("page", 1)), 1)
        pageSize = min(max(int(request.args.get("page_size", 10)), 1), 100)
    except ValueError:
        page = 1
        pageSize = 10

    rawViolationType = request.args.get("violation_type")
    violationType = int(rawViolationType) if rawViolationType in ("1", "2") else None
    data = dbGetViolationPage(page, pageSize, request.args.get("search", "").strip(), violationType)
    for row in data["violations"]:
        if isinstance(row.get("frame"), (bytes, bytearray)):
            row["frame"] = bytes(row["frame"]).decode("utf-8")
    return data
