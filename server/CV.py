from flask import Response;
import numpy as np;
import cv2;
import threading;
from pathlib import Path;
from ultralytics import YOLO;
import time
from datetime import datetime
from database import databaseConnector
from zoneinfo import ZoneInfo
import math
import statistics


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
modelPath = Path(base_dir/"../models/training/yoloModels/sModels/trainingBatch2/best.pt")
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
        self.vehicleCount = 0
        self.timer = 0
        self.frameTime = 0
        self.averageSpeed = 0
        self.intervalStart = 0
        self.intervalEnd = 0
        self.frame = None
        self.chartData = []
        self.trafficMovement = []
        self.model = YOLO(modelPath)    
        self.start = time.perf_counter() 
        self.intervalLock = threading.Lock()
        self.allVehicles = {}
        self.nextIntervalData = {}
        self.illegalParkingList = {}
        self.illegalLoadingUnloadingList = {}

    def calculateFlow(self):
        vehicleCount = self.vehicleCount
        timeInterval = 30

        flow = (vehicleCount/timeInterval) * 3600
        return flow

    def cleanIllegalParkingList(self):
        allVehicles = list(self.allVehicles.keys())
        violationList = list(self.illegalParkingList.keys())

        for vehicleId in violationList:
            if vehicleId not in allVehicles:
                del self.illegalParkingList[vehicleId] 

    def cleanIllegalLoadingUnloadingList(self):
        allVehicles = list(self.allVehicles.keys())
        violationList = list(self.illegalLoadingUnloadingList.keys())

        for vehicleId in violationList:
            if vehicleId not in allVehicles:
                del self.illegalLoadingUnloadingList[vehicleId]

    def illegalParkingDetection(self):
        allVehicles = self.allVehicles
        violationList = self.illegalParkingList
        timeStamp = datetime.now(ZoneInfo("Asia/Manila")).strftime("%I:%M %p")
        vehicleFlow = self.nextIntervalData.get("vehicleFlow")
        self.cleanIllegalParkingList()
        medianTrafficMovement, vehicleMovements = self.getTrafficMovement(allVehicles, violationList)

        for vehicle in allVehicles:
            motion = True
            if vehicle not in violationList:
                self.illegalParkingList[vehicle] = {
                    "cameraId" : self.cameraId,
                    "violationType" : 2,
                    "vehicle" : allVehicles.get(vehicle).get("name"),
                    "motion" : motion,
                    "violationStatus" : 0,
                    "vehicleCenter" : allVehicles.get(vehicle).get("vehicleCenter")
                }
                continue  

            vehicleCenter = allVehicles.get(vehicle).get("vehicleCenter")
            distanceMoved = vehicleMovements.get(vehicle).get("movement")
            violationStatus = violationList.get(vehicle).get("violationStatus")

            if distanceMoved < 100 and (medianTrafficMovement is None or medianTrafficMovement >= 10) and (vehicleFlow > 200):
                    
                motion = False
                match violationStatus:
                    case 1:
                        violationStatus = 2
                    case 0:
                        violationStatus = 1


            self.illegalParkingList[vehicle] = {
                "cameraId" : self.cameraId,
                "violationType" : 2,
                "vehicle" : allVehicles.get(vehicle).get("name"),
                "motion" : motion,
                "violationStatus" : violationStatus,
                "distanceMoved" : distanceMoved,
                "vehicleCenter" : vehicleCenter,
                "timeStamp" : timeStamp
            }

    def illegalLoadingUnloadingDetection(self):
        allVehicles = self.allVehicles
        violationList = self.illegalLoadingUnloadingList
        timeStamp = datetime.now(ZoneInfo("Asia/Manila")).strftime("%I:%M %p")

        self.cleanIllegalLoadingUnloadingList()
        medianTrafficMovement, vehicleMovements = self.getTrafficMovement(allVehicles, violationList)

        for vehicleId in allVehicles:
            if vehicleId not in violationList:
                self.illegalLoadingUnloadingList[vehicleId] = {
                    "cameraId" : self.cameraId,
                    "vehicleName" : allVehicles.get(vehicleId).get("name"),
                    "violationStatus" : 0,
                    "vehicleCenter" : allVehicles.get(vehicleId).get("vehicleCenter")
                }
                continue

            vehicleMovement = vehicleMovements.get(vehicleId).get("movement")
            violationStatus = self.illegalLoadingUnloadingList.get(vehicleId).get("violationStatus")

            if medianTrafficMovement is None:
                pass

            elif vehicleMovement < 100 and medianTrafficMovement >= 100:

                match violationStatus:
                    case 0:
                        violationStatus = 1
                    case 1:
                        violationStatus = 2
                    case 2:
                        violationStatus = 3
                    case 3:
                        violationStatus =3
            else:
                violationStatus = 0

            self.illegalLoadingUnloadingList[vehicleId] = {
                "cameraId" : self.cameraId,
                "vehicleName" : allVehicles.get(vehicleId).get("name"),
                "violationStatus" : violationStatus,
                "vehicleCenter" : allVehicles.get(vehicleId).get("vehicleCenter")
            }

    def getTrafficMovement(self, allVehicles, violationList):
        trafficMovement = []
        vehicleMovements = {}
        for vehicleId in allVehicles:
            if vehicleId not in violationList:
                continue

            currentLoc = allVehicles.get(vehicleId).get("vehicleCenter")
            lastLoc = violationList.get(vehicleId).get("vehicleCenter")

            vector = ((currentLoc[0] - lastLoc[0]), (currentLoc[1] - lastLoc[1]))
            movement = math.hypot(vector[0], vector[1])
            trafficMovement.append(movement)
            vehicleMovements[vehicleId] = {
                "movement" : movement 
            }

        medianTrafficMovement = statistics.median(trafficMovement) if len(vehicleMovements) > 4 else None
        return medianTrafficMovement, vehicleMovements
    
    def displayVehicle(self, frame, boxes, countingLine, allVehicles, vehicleCount, startLine, endLine, frameCount, crossValidation):
        crossProductReference = "counterCrossProduct"

        # DISPLAYING ALL VEHICLES
        for box in boxes:
            
            if box.id is None:
                continue

            #LOGIC VARIABLES
            startTime = None
            endTime = None
            speed = None
            movement = None

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

            startCrossProduct, endCrossProduct, vehicleSpeed, startTime, endTime = self.speedEstimationArea(frame, startLine, endLine, vehicleCenter, frameCount, allVehicles, currentVehicleId, speed, startTime, endTime)

            counterCrossProduct = 0
            if len(allVehicles) > 0:
                counterCrossProduct, vehicleCount = self.VehicleCounterPosition(allVehicles, crossProduct, crossProductReference, currentVehicleId, vehicleCount, crossValidation)
    
            allVehicles[currentVehicleId] = {
                "name" : vehicleName,
                "crossProduct" : crossProduct,
                "counterCrossProduct" : counterCrossProduct,
                "startCrossProduct" : startCrossProduct,
                "endCrossProduct" : endCrossProduct,
                "speed" : vehicleSpeed,
                "startTime" : startTime,
                "endTime" : endTime,
                "lastFrameCount" : self.frameCount,
                "vehicleCenter" : vehicleCenter,
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

    def returnIntervalData(self):
        with self.intervalLock:
            newInterval = self.nextIntervalData
            
        return{
            "message" : "the fix is working!",
            "finalCount" : newInterval.get("finalCount"),
            "chartData" : newInterval.get("chartData"),
            "vehicleData" : newInterval.get("vehicleData"),
            "averageVehicleSpeed" : newInterval.get("averageVehicleSpeed"),
            "speedList" : newInterval.get("speedList"),
            "vehicleFlow" : newInterval.get("vehicleFlow"),
            "density": newInterval.get("density"),
            "clock" : newInterval.get("clock"),
            "illegalParkingList" : newInterval.get("illegalParkingList"),
            "illegalLoadingUnloadingList" : newInterval.get("illegalLoadingUnloadingList")        
        }

    def saveInterval(self):

        allVehicles = self.allVehicles
        illegalParkingList = self.illegalParkingList
        illegalLoadingUnloadingList = self.illegalLoadingUnloadingList

        vehicleFlow = self.calculateFlow()
        speedList, averageSpeed = self.calculateAverageSpeed()
        speedMeasurementCount = 0

        intervalStart = self.intervalStart
        intervalEnd = datetime.now()
        timeStamp = datetime.now(ZoneInfo("Asia/Manila")).strftime("%H:%M")


        if (averageSpeed):
            self.averageSpeed = averageSpeed

        density = self.calculateDensity(vehicleFlow, averageSpeed)
        clock = self.start - time.perf_counter()

        if (density):
            density = round(density, 2)
            
        with capLock:
            finalCount =  self.vehicleCount
        
        self.chartData.append(
            {"time" : timeStamp, "vehicleFlow" : vehicleFlow}
        )

        if len(speedList) > 0:
            speedMeasurementCount = len(speedList)



        #Data for Database
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


        #Data for frontend
        with self.intervalLock:
            self.nextIntervalData = {
                "finalCount" : finalCount,
                "chartData" : self.chartData[-20:],
                "vehicleData" : allVehicles,
                "averageVehicleSpeed" : averageSpeed,
                "speedList" : speedList,
                "vehicleFlow" : vehicleFlow,
                "density":density,
                "clock" : clock,
                "illegalParkingList" : illegalParkingList,
                "illegalLoadingUnloadingList" : illegalLoadingUnloadingList
            }

        self.newInterval()
    
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
            "vehicleSpeeds" : speedList,
            "allVehicles" : self.allVehicles
        }
    
    def newInterval(self):
        self.vehicleCount = 0
        self.allVehicles = {}
        self.intervalStart = datetime.now()

    def inference(self, frame, newWidth, newHeight, countingLine, startLine, endLine, crossValidation, violationDetectionArea):
        self.frameCount += 1
        self.frame = frame
        self.frameTime = time.perf_counter()
        if self.frameCount % 1 == 0:

            frame = cv2.resize(frame,(newWidth, newHeight))

            results = self.model.track(frame, conf=0.4, persist=True, tracker=byteTrack, device=0, verbose=False)
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
       
                previousCrossProduct = allVehicles.get(vehicle).get(crossProductReference)
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

