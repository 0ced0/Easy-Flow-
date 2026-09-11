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
modelPath = Path(base_dir/"../models/training/yoloModels/sModels/trainingBatch2/best.pt")
byteTrack = Path(base_dir/"../models/training/bytetrack.yaml")
capLock = threading.Lock()

# Violation thresholds operate on road points in the 50%-resized inference frame.
# STATIONARY_DISTANCE_THRESHOLD is an empirical YOLO-box-jitter tolerance and should
# be tuned with recorded footage for each camera setup.
VIOLATION_CHECK_INTERVAL = 1.0
STATIONARY_DISTANCE_THRESHOLD = 20
LOADING_UNLOADING_MIN_SECONDS = 10
ILLEGAL_PARKING_MIN_SECONDS = 120
VIOLATION_TRACK_TIMEOUT_SECONDS = 5

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
        # self.forecastingModel = AGCRN 
        self.start = time.perf_counter() 
        self.intervalLock = threading.Lock()
        self.allVehicles = {}
        self.nextIntervalData = {}
        self.illegalParkingList = {}
        self.illegalLoadingUnloadingList = {}
        self.violationTracks = {}
        self.violationTracksLock = threading.Lock()

    def encodeFrame(self, frame):
        success, buffer = cv2.imencode(
            ".jpg",
            frame,
            [cv2.IMWRITE_JPEG_QUALITY, 60]
        )
    
        if not success:
            return None

        encodedFrame = base64.b64encode(buffer).decode("utf-8")

        return encodedFrame            

        
    def calculateFlow(self):
        vehicleCount = self.vehicleCount
        timeInterval = 30

        flow = (vehicleCount/timeInterval) * 3600
        return flow

    def updateViolationTrack(self, trackId, vehicleName, bbox, vehicleCenter, roadPoint, violationDetectionArea):
        contour = np.asarray(violationDetectionArea, dtype=np.int32).reshape((-1, 1, 2))
        insideViolationArea = cv2.pointPolygonTest(contour, roadPoint, False) >= 0
        now = time.perf_counter()

        with self.violationTracksLock:
            track = self.violationTracks.get(trackId)
            if track is None:
                self.violationTracks[trackId] = {
                    "trackId": trackId,
                    "vehicleName": vehicleName,
                    "bbox": bbox,
                    "center": vehicleCenter,
                    "roadPoint": roadPoint,
                    "lastSeen": now,
                    "anchorPosition": roadPoint if insideViolationArea else None,
                    "stationarySince": None,
                    "insideViolationArea": insideViolationArea,
                    "wasInsideViolationArea": False,
                    "loadingCandidate": False,
                    "loadingCandidateEvidence": None,
                    "parkingRecorded": False,
                }
                return

            track.update({
                "vehicleName": vehicleName,
                "bbox": bbox,
                "center": vehicleCenter,
                "roadPoint": roadPoint,
                "lastSeen": now,
                "insideViolationArea": insideViolationArea,
            })

    def captureViolationEvidence(self, bbox):
        if self.frame is None:
            return None

        x1, y1, x2, y2 = bbox
        evidenceFrame = self.frame.copy()
        cv2.rectangle(evidenceFrame, (x1, y1), (x2, y2), (0, 0, 255), 2)
        return self.encodeFrame(evidenceFrame)

    def resetStopEvent(self, track, anchorPosition):
        track.update({
            "anchorPosition": anchorPosition,
            "stationarySince": None,
            "loadingCandidate": False,
            "loadingCandidateEvidence": None,
            "parkingRecorded": False,
        })

    def finishStopEvent(self, track, now, reason, pendingViolations):
        stationarySince = track["stationarySince"]
        if stationarySince is None:
            self.resetStopEvent(track, track["roadPoint"])
            return

        stationaryDuration = now - stationarySince
        if (
            track["loadingCandidate"]
            and not track["parkingRecorded"]
            and LOADING_UNLOADING_MIN_SECONDS <= stationaryDuration < ILLEGAL_PARKING_MIN_SECONDS
        ):
            evidence = track["loadingCandidateEvidence"]
            if evidence is not None:
                pendingViolations.append((track["trackId"], track["vehicleName"], 1, evidence, stationaryDuration))
                print(f"[Violation] ID {track['trackId']} loading/unloading confirmed: {stationaryDuration:.1f}s ({reason})")

        if track["stationarySince"] is not None:
            print(f"[Violation] ID {track['trackId']} stop reset ({reason})")
        self.resetStopEvent(track, track["roadPoint"])

    def updateViolationStates(self):
        now = time.perf_counter()
        pendingViolations = []

        with self.violationTracksLock:
            staleTrackIds = [
                trackId
                for trackId, track in self.violationTracks.items()
                if now - track["lastSeen"] > VIOLATION_TRACK_TIMEOUT_SECONDS
            ]
            for trackId in staleTrackIds:
                del self.violationTracks[trackId]
                print(f"[Violation] ID {trackId} stale track removed")

            for track in self.violationTracks.values():
                if not track["insideViolationArea"]:
                    if track["wasInsideViolationArea"]:
                        self.finishStopEvent(track, now, "left ROI", pendingViolations)
                    track["wasInsideViolationArea"] = False
                    track["anchorPosition"] = None
                    continue

                if not track["wasInsideViolationArea"]:
                    self.resetStopEvent(track, track["roadPoint"])
                    track["wasInsideViolationArea"] = True
                    continue

                anchorPosition = track["anchorPosition"]
                if anchorPosition is None:
                    track["anchorPosition"] = track["roadPoint"]
                    continue

                distanceMoved = math.dist(track["roadPoint"], anchorPosition)
                if distanceMoved > STATIONARY_DISTANCE_THRESHOLD:
                    self.finishStopEvent(track, now, "movement detected", pendingViolations)
                    continue

                if track["stationarySince"] is None:
                    track["stationarySince"] = now
                    print(f"[Violation] ID {track['trackId']} stop started")
                    continue

                stationaryDuration = now - track["stationarySince"]
                if (
                    stationaryDuration >= LOADING_UNLOADING_MIN_SECONDS
                    and not track["loadingCandidate"]
                    and not track["parkingRecorded"]
                ):
                    track["loadingCandidate"] = True
                    track["loadingCandidateEvidence"] = self.captureViolationEvidence(track["bbox"])
                    print(f"[Violation] ID {track['trackId']} loading candidate: {stationaryDuration:.1f}s")

                if stationaryDuration >= ILLEGAL_PARKING_MIN_SECONDS and not track["parkingRecorded"]:
                    evidence = self.captureViolationEvidence(track["bbox"])
                    if evidence is not None:
                        pendingViolations.append((track["trackId"], track["vehicleName"], 2, evidence, stationaryDuration))
                        track["parkingRecorded"] = True
                        track["loadingCandidate"] = False
                        track["loadingCandidateEvidence"] = None
                        print(f"[Violation] ID {track['trackId']} parking confirmed: {stationaryDuration:.1f}s")

        for trackId, vehicleName, violationType, evidence, stationaryDuration in pendingViolations:
            violationData = {
                "cameraId": self.cameraId,
                "vehicle": vehicleName,
                "violationType": violationType,
                "timeStamp": datetime.now(ZoneInfo("Asia/Manila")).strftime("%I:%M %p"),
                "frame": evidence,
            }
            databaseConnector.postViolationData(violationData)

    # Illegal loading/unloading is an operational short-stop proxy. The current
    # vehicle-only model does not visually verify passengers or cargo activity.
    def illegalParkingDetection(self):
        self.updateViolationStates()

    def illegalLoadingUnloadingDetection(self):
        self.updateViolationStates()

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
    
    def displayVehicle(self, frame, boxes, countingLine, allVehicles, vehicleCount, startLine, endLine, frameCount, crossValidation, violationDetectionArea):
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
            roadPoint = (int((x1 + x2) / 2), int(y2))

            self.updateViolationTrack(
                currentVehicleId,
                vehicleName,
                (x1, y1, x2, y2),
                vehicleCenter,
                roadPoint,
                violationDetectionArea,
            )

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
            "message" : "success",
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
            density = round(density)
            
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
        self.frameTime = time.perf_counter()
        if self.frameCount % 1 == 0:

            frame = cv2.resize(frame,(newWidth, newHeight))
            self.frame = frame
            results = self.model.track(frame, conf=0.4, persist=True, tracker=byteTrack, device=0, verbose=False)
            boxes = results[0].boxes
            
            if (boxes != None and len(boxes) > 0):
                frame, allVehicles, vehicleCount = self.displayVehicle(frame, boxes, countingLine, self.allVehicles, self.vehicleCount, startLine, endLine, self.frameCount, crossValidation, violationDetectionArea)

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

