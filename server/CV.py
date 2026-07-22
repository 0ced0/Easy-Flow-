from flask import Response;
import numpy as np;
import cv2;
import threading;
from pathlib import Path;
from ultralytics import YOLO;
import time
from datetime import datetime
from database import databaseConnector


# TARGET FEATURES

# Per camera / per interval:
# - flow (check)
# - average_speed_green
# - occupancy_proxy
# - density_proxy
# - discharge_speed
# - right_turn_flow




# BUG LIST TO FIX

# WHENEVER THE FRONTEND RESTARTS AND CALLS THE UPDATEFRONTEND FUNCTION, REGARDLESS OF TIME, IT ADDS ANOTHER ITEM TO THE CHARTDATA LIST 
# WHICH RUINS THE CHART IN THE FRONTEND, NEED TO MAKE THE CHARTDATA INDEPENDENT AND USE REAL TIMER

base_dir = Path(__file__).resolve().parent
modelPath = Path(base_dir/"../models/training/yoloModels/sModels/batch1Final/best.pt")
byteTrack = Path(base_dir/"../models/training/bytetrack.yaml")
capLock = threading.Lock()

# FOR VIDEO TESTING
base_dir = Path(__file__).resolve().parent
videoPath = Path(base_dir/"sambat_to_lspu.mp4")
cap = cv2.VideoCapture(videoPath)



class ComputerVisionComponent:

    def __init__(self, cameraId): 
        self.cameraId = cameraId
        self.frameCount = 0
        self.allVehicles = {}
        self.vehicleCount = 0
        self.timer = 0
        self.frame = None
        self.chartData = []
        self.model = YOLO(modelPath)    
        self.start = time.perf_counter() 
        self.frameTime = 0
        self.averageSpeed = 0
        self.intervalStart = 0
        self.intervalEnd = 0

    def calculateFlow(self):
        vehicleCount = self.vehicleCount
        timeInterval = 30

        flow = (vehicleCount/timeInterval) * 3600
        return flow
    
    def violationDetection(self, counterCrossProduct, allVehicles, currentVehicleId):
        motion = True

        for vehicle in allVehicles:
            lastCP = allVehicles[currentVehicleId]["lastCp"]

        if lastCP:
        
            currentCP = counterCrossProduct
            cpRangeNegative = lastCP - 100
            cpRangePositive = lastCP + 100
            lastCP = currentCP

            if currentCP > cpRangeNegative and currentCP < cpRangePositive:
                motion = False
                return motion, lastCP
            
            return motion, lastCP

        lastCP = counterCrossProduct
        return motion, lastCP

        




    def displayVehicle(self, frame, boxes, countingLine, allVehicles, vehicleCount, startLine, endLine, frameCount, crossValidation):
        crossProductReference = "counterCrossProduct"

        # DISPLAYING ALL VEHICLES
        for box in boxes:
            
            if box.id is None:
                continue

            # VEHICLE CHARACTERISTICS
            vehicleClass = int(box.cls[0])
            vehicleName = self.model.names[vehicleClass]
            currentVehicleId = int(box.id.item())   

            # VEHICLE COORDINATES
            x1,y1,x2,y2 = map(int, box.xyxy[0])
            boxStart = (x1,y1)
            boxEnd = (x2,y2)
            cx = (x1+x2) // 2
            cy = (y1+y2) // 2
            vehicleCenter = (cx,cy)

            frame, crossProduct = self.trackVehicle(frame, vehicleCenter, countingLine)

            startTime = None
            endTime = None
            speed = None
            startCrossProduct, endCrossProduct, vehicleSpeed, startTime, endTime = self.speedEstimationArea(frame, startLine, endLine, vehicleCenter, frameCount, allVehicles, currentVehicleId, speed, startTime, endTime)

            counterCrossProduct = 0
            if len(allVehicles) > 0:
                counterCrossProduct, vehicleCount = self.VehicleCounterPosition(allVehicles, crossProduct, crossProductReference, currentVehicleId, vehicleCount, crossValidation)

            # self.violationDetection(allVehicles)

            allVehicles[currentVehicleId] = {
                "name" : vehicleName,
                "crossProduct" : crossProduct,
                "counterCrossProduct" : counterCrossProduct,
                "startCrossProduct" : startCrossProduct,
                "endCrossProduct" : endCrossProduct,
                "speed" : vehicleSpeed,
                "startTime" : startTime,
                "endTime" : endTime,
                "lastFrameCount" : self.frameCount
            }
            
        return frame, allVehicles, vehicleCount
            
    def calculateDensity(self, vehicleFlow, averageSpeed):
        allVehicles = self.allVehicles
        vehiclesInArea = 0
        areaLength = 17 / 1000
        
        for vehicle in allVehicles:
            startCp = allVehicles[vehicle]["startCrossProduct"]
            endCp = allVehicles[vehicle]["endCrossProduct"]
            lastFrameCount = allVehicles[vehicle]["lastFrameCount"]

            if (self.frameCount - lastFrameCount <= 5 and startCp > 0 and endCp < 0):
                vehiclesInArea += 1 

        density = vehiclesInArea / areaLength
        
        return density

    def calculateAverageSpeed(self):
        allVehicles = self.allVehicles
        speedList = []
        totalSpeed = 0
        averageSpeed = 0

        for vehicle in allVehicles:
            speed = allVehicles[vehicle]["speed"]

            if speed != None:
                speedList.append(speed)

        for vehicleSpeed in speedList:
            totalSpeed += vehicleSpeed

        if speedList:
            averageSpeed = round(totalSpeed/len(speedList), 2)
        
        else:
            averageSpeed = None

        return (speedList,averageSpeed)

    def updateFrontend(self):
        allVehicles = self.allVehicles
        vehicleFlow = self.calculateFlow()
        speedList, averageSpeed = self.calculateAverageSpeed()
        speedMeasurementCount = 0
        intervalStart = self.intervalStart
        intervalEnd = datetime.now()

        if (averageSpeed):
            self.averageSpeed = averageSpeed

        density = self.calculateDensity(vehicleFlow, averageSpeed)
        clock = self.start - time.perf_counter()

        if (density):
            density = round(density, 2)
            
        with capLock:
            finalCount =  self.vehicleCount
            finalVehicles = self.allVehicles
            self.timer += 30
        
        self.chartData.append(
            {"time" : self.timer, "vehicleFlow" : vehicleFlow}
        )


        if len(speedList) > 0:
            speedMeasurementCount = len(speedList)

        trafficData = {
            "cameraId" : self.cameraId,
            "intervalStart" : intervalStart,
            "intervalEnd" : intervalEnd,
            "vehicleCount" : finalCount,
            "trafficFlow" : vehicleFlow,
            "averageSpeed" : averageSpeed,
            "speedMeasurementCount" : speedMeasurementCount,
            "spatialDensity" : density
        }

        databaseConnector.saveTrafficInterval(trafficData)

        return {
            "message" : "success",
            "finalCount" : finalCount,
            "chartData" : self.chartData[-20:],
            "vehicleData" : allVehicles,
            "averageVehicleSpeed" : averageSpeed,
            "speedList" : speedList,
            "vehicleFlow" : vehicleFlow,
            "density":density,
            "clock" : clock
        }
    
    def returnFrame(self):
        success, buffer = cv2.imencode(".jpg", self.frame)

        if not success:
            return{
                "message" : "error converting frame"
            }

        frame = buffer.tobytes()
        return frame
    
    def returnStats(self):
        speedList = []
        
        for vehicle in self.allVehicles:
            speed = self.allVehicles[vehicle]["speed"]
            if speed != None:
                speedList.append(speed)
        return{
            "message" : "success",
            "vehicleCount" : self.vehicleCount,
            "vehicleSpeeds" : speedList
        }
    
    def newInterval(self):
        self.vehicleCount = 0
        self.allVehicles = {}
        self.intervalStart = datetime.now()

    def inference(self, frame, newWidth, newHeight, countingLine, startLine, endLine, crossValidation):
        self.frameCount += 1
        self.frame = frame
        self.frameTime = time.perf_counter()

        if self.frameCount % 2 == 0:

            frame = cv2.resize(frame,(newWidth, newHeight))

            results = self.model.track(frame, conf=0.4, persist=True, tracker=byteTrack, device=0)
            boxes = results[0].boxes
            
            if (boxes != None and len(boxes) > 0):
                frame, allVehicles, vehicleCount = self.displayVehicle(frame, boxes, countingLine, self.allVehicles, self.vehicleCount, startLine, endLine, self.frameCount, crossValidation)
                
                with capLock:
                    self.vehicleCount = vehicleCount
                

                speedList = []
                for vehicle in self.allVehicles:
                    
                    speed = self.allVehicles[vehicle]["speed"]
                    if speed != None:
                        speedList.append(speed)

    def speedEstimation(self, vehicle, startTime, endTime):
        msTOkmh = 3.6
        
        elapsedTime =  endTime - startTime
        
        speed = (17/elapsedTime) * msTOkmh

        return speed

    def speedEstimationArea(self, frame, startLine, endLine, vehicleCenter, frameCount, allVehicles, currentVehicleId, speed, startTime, endTime):

        startCP = self.trackVehicle(frame, vehicleCenter, startLine)[1]
        endCP = self.trackVehicle(frame, vehicleCenter, endLine)[1]

        for vehicle in allVehicles:

            if currentVehicleId == vehicle:

                startTime = allVehicles[vehicle]["startTime"]
                endTime = allVehicles[vehicle]["endTime"]

                previousStartCP = allVehicles[vehicle]["startCrossProduct"]
                previousEndCP = allVehicles[vehicle]["endCrossProduct"]
                currentStartCP = startCP
                currentEndCP = endCP

                if (startTime and endTime):
                    speed = self.speedEstimation( vehicle, startTime, endTime)

                # DID THE VEHICLE CROSS THE START LINE?
                if previousStartCP < 0 and currentStartCP > 0:
                    startTime = self.frameTime

                # DID THE VEHICLE CROSS THE END LINE?
                if previousEndCP < 0 and currentEndCP > 0:
                    endTime = self.frameTime


        return startCP, endCP, speed, startTime, endTime

    def VehicleCounterPosition(self, allVehicles, crossProduct ,crossProductReference, currentVehicleId, vehicleCount, crossValidation):

        for vehicle in allVehicles:

            if currentVehicleId == vehicle:

                previousCrossProduct = allVehicles[vehicle][crossProductReference]
                currentPosition = crossProduct * crossValidation

                if previousCrossProduct < 0 and currentPosition > 0:
                    vehicleCount += 1
                    crossProduct = currentPosition
                    return crossProduct, vehicleCount
                
                crossProduct = currentPosition
                return crossProduct, vehicleCount

        
        crossProduct = crossProduct * crossValidation
        return crossProduct, vehicleCount
    
    def trackVehicle(self, frame, vehicleCenter, line):

        A,B = line
        P = vehicleCenter

        # CROSS PRODUCT FOR VEHICLE COUNTING
        (Xa, Ya) = A
        (Xb, Yb) = B
        (Xp, Yp) = P

        (Xab, Yab) = (Xb - Xa, Yb - Ya)
        (Xap, Yap) = (Xp - Xa, Yp - Ya)
        
        crossProduct = (Xab*Yap) - (Yab*Xap)

        return frame, crossProduct

