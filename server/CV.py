from flask import Response;
import numpy as np;
import cv2;
import threading;
from pathlib import Path;
from ultralytics import YOLO;
import base64

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

    def __init__(self):
        self.frameCount = 0
        self.allVehicles = {}
        self.vehicleCount = 0
        self.timer = 0
        self.frame = None
        self.chartData = []
        self.model = YOLO(modelPath)

    def calculateFlow(self):
        vehicleCount = self.vehicleCount
        timeInterval = 30

        flow = (vehicleCount/timeInterval) * 3600
        return flow
        
    def calculateDensity(self, vehicleFlow, averageSpeed):
        density = None
    
        if averageSpeed:
            density = vehicleFlow/averageSpeed
        
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
        density = self.calculateDensity(vehicleFlow, averageSpeed)

        if (density):
            density = round(density, 2)
            
        with capLock:
            finalCount =  self.vehicleCount
            finalVehicles = self.allVehicles
            self.timer += 30
        
        self.chartData.append(
            {"time" : self.timer, "vehicleCount" : finalCount}
        )

        return {
            "message" : "success",
            # "finalCount" : finalCount,
            # "timer" : int(self.timer),
            "chartData" : self.chartData[-10:],
            "vehicleData" : allVehicles,
            "averageVehicleSpeed" : averageSpeed,
            "speedList" : speedList,
            "vehicleFlow" : vehicleFlow,
            "density":density
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

    def inference(self, frame):
        self.frameCount += 1
        self.frame = frame

        if self.frameCount % 2 == 0:

            
            height, width = frame.shape[:2]

            newHeight = int(height * 0.5)
            newWidth = int(width * 0.5)

            # COUNTING LINE
            lineX1 = int(newWidth * 0.2)
            lineY1 = int(newHeight*0.55)
            lineX2 = int(newWidth*0.7)
            lineY2 = int(newHeight*0.85)

            A = (lineX1,lineY1)
            B = (lineX2,lineY2)

            countingLine = (A,B)

            # SPEED ESTIMATION START LINE
            lineX1 = int(newWidth * 0.56)
            lineY1 = int(newHeight * 0.32)
            lineX2 = int(newWidth * 0.62)
            lineY2 = int(newHeight * 0.33)


            slA = (lineX1, lineY1)
            slB = (lineX2, lineY2)

            startLine = (slA,slB)


            # SPEED ESTIMATION END LINE
            lineX1 = int(newWidth * 0.05)
            lineY1 = int(newHeight * 0.65)
            lineX2 = int(newWidth * 0.3)
            lineY2 = int(newHeight * 0.85)

            elA = (lineX1, lineY1)
            elB = (lineX2, lineY2)

            endLine = (elA, elB)

            frame = cv2.resize(frame,(newWidth, newHeight))

            results = self.model.track(frame, conf=0.4, persist=True, tracker=byteTrack)

            boxes = results[0].boxes
            
            if (boxes != None and len(boxes) > 0):
                frame, allVehicles, vehicleCount = self.displayVehicle(frame, boxes, countingLine, self.allVehicles, self.vehicleCount, startLine, endLine, self.frameCount)        
                
                with capLock:
                    self.vehicleCount = vehicleCount
                

                speedList = []
                for vehicle in self.allVehicles:
                    
                    speed = self.allVehicles[vehicle]["speed"]
                    if speed != None:
                        speedList.append(speed)


    def speedEstimation(self, startFrame, endFrame, vehicle):
        frameRate = 25
        msTOkmh = 3.6

        overallFrames = endFrame - startFrame
        time = overallFrames / frameRate
        speed = (17/time) * msTOkmh

        return speed

    def speedEstimationArea(self, frame, startLine, endLine, vehicleCenter, frameCount, allVehicles, currentVehicleId, startFrame, endFrame, speed):

        startCP = self.trackVehicle(frame, vehicleCenter, startLine)[1]
        endCP = self.trackVehicle(frame, vehicleCenter, endLine)[1]

        for vehicle in allVehicles:

            if currentVehicleId == vehicle:

                startFrame = allVehicles[vehicle]["startFrame"]
                endFrame = allVehicles[vehicle]["endFrame"]
                previousStartCP = allVehicles[vehicle]["startCrossProduct"]
                previousEndCP = allVehicles[vehicle]["endCrossProduct"]
                currentStartCP = startCP
                currentEndCP = endCP

                if (startFrame and endFrame):
                    speed = self.speedEstimation(startFrame, endFrame, vehicle)

                if previousStartCP < 0 and currentStartCP > 0:
                    startFrame = frameCount

                if previousEndCP < 0 and currentEndCP > 0:
                    endFrame = frameCount

        return startCP, endCP, startFrame, endFrame, speed

    def VehicleCounterPosition(self, allVehicles, crossProduct ,crossProductReference, currentVehicleId, vehicleCount):

        for vehicle in allVehicles:

            if currentVehicleId == vehicle:

                previousCrossProduct = allVehicles[vehicle][crossProductReference]
                currentPosition = crossProduct
                if previousCrossProduct < 0 and currentPosition > 0:
                    vehicleCount += 1
                    crossProduct = currentPosition
                    return crossProduct, vehicleCount
                
                crossProduct = currentPosition
                return crossProduct, vehicleCount

        
        crossProduct = crossProduct
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

    def displayVehicle(self, frame, boxes, countingLine, allVehicles, vehicleCount, startLine, endLine, frameCount):
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

            startFrame = None
            endFrame = None
            speed = None
            startCrossProduct, endCrossProduct, startFrame, endFrame, vehicleSpeed = self.speedEstimationArea(frame, startLine, endLine, vehicleCenter, frameCount, allVehicles, currentVehicleId, startFrame, endFrame, speed)

            counterCrossProduct = 0
            if len(allVehicles) > 0:
                counterCrossProduct, vehicleCount = self.VehicleCounterPosition(allVehicles, crossProduct, crossProductReference, currentVehicleId, vehicleCount)

            allVehicles[currentVehicleId] = {
                "name" : vehicleName,
                "crossProduct" : crossProduct,
                "counterCrossProduct" : counterCrossProduct,
                "startCrossProduct" : startCrossProduct,
                "endCrossProduct" : endCrossProduct,
                "startFrame" : startFrame,
                "endFrame" : endFrame,
                "speed" : vehicleSpeed,
            }
            
        return frame, allVehicles, vehicleCount

