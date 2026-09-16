from flask import Blueprint, Response, jsonify, request
from pathlib import Path;
import cv2
import threading 
import time
import os
import atexit
from urllib.parse import quote
from environment import validateEnvironment;

environmentConfig = validateEnvironment()

from CV import ComputerVisionComponent, VIOLATION_CHECK_INTERVAL;
from parkingRois import PARKING_ROIS, parkingROIsForCamera;
from trafficForecast import forecastingComponent;
from trafficLightControl import TLC;
from simulation.sumoController import SC;


# VIDEO VARIABLES
base_dir = Path(__file__).resolve().parent
stream = Blueprint('stream', __name__)
previousFrame = None

cctvEnvironmentNames = (
    "STOL_CCTV_USERNAME", "STOL_CCTV_PASSWORD",
    "STOP_CCTV_USERNAME", "STOP_CCTV_PASSWORD",
    "STOS_CCTV_USERNAME", "STOS_CCTV_PASSWORD",
    "STOC_CCTV_USERNAME", "STOC_CCTV_PASSWORD",
)
cctvEnvironment = {name: os.environ.get(name) for name in cctvEnvironmentNames}
missingCctvEnvironmentNames = [
    name for name, value in cctvEnvironment.items() if not value
]

videoSource = environmentConfig["videoSource"]

if videoSource == "local":
    localVideoPaths = environmentConfig["localVideoPaths"]
    stolVideoPath = localVideoPaths["STOL"]
    stopVideoPath = localVideoPaths["STOP"]
    stosVideoPath = localVideoPaths["STOS"]
    stocVideoPath = localVideoPaths["STOC"]
elif videoSource == "live":
    if missingCctvEnvironmentNames:
        raise RuntimeError(
            "Missing required CCTV environment variables: "
            + ", ".join(missingCctvEnvironmentNames)
        )

    def cctvCredentials(cameraPrefix):
        return (
            f"{quote(cctvEnvironment[f'{cameraPrefix}_CCTV_USERNAME'], safe='')}:"
            f"{quote(cctvEnvironment[f'{cameraPrefix}_CCTV_PASSWORD'], safe='')}"
        )

    stolVideoPath = f"rtsp://{cctvCredentials('STOL')}@127.0.0.1:18554/Streaming/Channels/101"
    stopVideoPath = f"rtsp://{cctvCredentials('STOP')}@127.0.0.1:18555/Streaming/Channels/101"
    stosVideoPath = f"rtsp://{cctvCredentials('STOS')}@127.0.0.1:18556/Streaming/Channels/101"
    stocVideoPath = f"rtsp://{cctvCredentials('STOC')}@127.0.0.1:18557/Streaming/Channels/101"
else:
    raise RuntimeError("EASYFLOW_VIDEO_SOURCE must be either 'local' or 'live'.")

DRAW_PARKING_ROI = False
PERF_LOGGING = os.environ.get("EASYFLOW_PERF_LOGGING", "").strip().lower() == "true"
JPEG_PROFILES = {
    "main": {"max_fps": 12, "quality": 82, "width": None},
    "thumbnail": {"max_fps": 4, "quality": 70, "width": 400},
}

# DEBUG ERROR LIST
# 
# SYSTEM BREAKDOWN ERROR 1 (FRONTEND WAS NOT GETTING THE SAME DATA FROM THE BACKEND)

# AN ERROR OCCURED WHERE IF THE COMPUTER VISION COMPONENT WAS USED IN THE FRONTEND, THE DATA WAS NOT CONSISTENT WITH WHAT WAS SHOWN IN THE VIDEO
# THE PROBLEM WAS THAT BOTH THE RAWFRAME FUNCTION AND THE INFERENCE FUNCTION WAS MODIFYING THE SAME RESOURCE, FORCING THE BACKEND TO SKIP FRAMES WHEN THE RAWFRAMES WAS 
# ADVANCING THE CAP TOO MUCH


# ENGINEERING DESIGN


class streamControl:
    def __init__(self, videoPath, lineFunction, crossValidation, cameraId, cameraName):

        # SYSTEM COMPONENTS
        self.CV = ComputerVisionComponent(cameraId)

        # VIDEO VARIABLES
        self.videoPath = videoPath
        self.cameraName = cameraName
        self.isLocalVideo = videoSource == "local"
        self.cap = self.openCapture()
        self.videoPath = videoPath
        self.frame = None
        self.processedFrame = None
        self.frameCount = 0
        self.previousFrame = None

        # THREADING VARIABLES
        self.running = False
        self.capLock = threading.Lock()
        self.frameLock = threading.Lock()
        self.threadCvLoop = None
        self.threadCapLoop = None
        self.threadSaveIntervalLoop = None
        self.threadViolationMonitoringLoop = None
        self.timer = 0
        self.processedFrameSequence = 0
        self.jpegCondition = threading.Condition()
        self.jpegCaches = {name: {"sequence": 0, "bytes": None} for name in JPEG_PROFILES}
        self.lastJpegEncodeAt = {name: 0.0 for name in JPEG_PROFILES}
        self.clientCounts = {name: 0 for name in JPEG_PROFILES}
        self.perfLock = threading.Lock()
        self.perfStarted = time.perf_counter()
        self.perfCvFrames = 0
        self.perfProfiles = {
            name: {"encodes": 0, "encode_seconds": 0.0, "bytes": 0, "sends": 0}
            for name in JPEG_PROFILES
        }

        # LINE LOGIC VARIABLES
        self.lineFunction = lineFunction
        self.crossValidation = crossValidation

    def openCapture(self):
        cap = cv2.VideoCapture(str(self.videoPath))
        if self.isLocalVideo:
            if not cap.isOpened():
                cap.release()
                raise RuntimeError(
                    f"{self.cameraName} could not open simulation video: {self.videoPath}"
                )
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            print(f"[LOCAL VIDEO] {self.cameraName} opened: {width}x{height} @ {fps:.2f} FPS")

        return cap

    def currentApproachSignalState(self):
        # Controller phases follow the physical approach order: 1, 2, 4, 3.
        approachByCamera = {1: "A", 2: "B", 3: "D", 4: "C"}
        approach = approachByCamera.get(self.CV.cameraId)
        for light in TLC.trafficLightData:
            if len(light) >= 3 and light[2] == approach:
                return light[0]
        return "unknown"

    def recordJpegEncode(self, variant, duration, byteCount):
        with self.perfLock:
            profile = self.perfProfiles[variant]
            profile["encodes"] += 1
            profile["encode_seconds"] += duration
            profile["bytes"] += byteCount

    def reportVideoPerformance(self):
        if not PERF_LOGGING:
            return
        with self.perfLock:
            elapsed = time.perf_counter() - self.perfStarted
            if elapsed < 10:
                return
            profileSummary = []
            for variant, profile in self.perfProfiles.items():
                encodes = profile["encodes"]
                averageKb = profile["bytes"] / encodes / 1024 if encodes else 0
                averageMs = profile["encode_seconds"] / encodes * 1000 if encodes else 0
                profileSummary.append(
                    f"{variant}_encode_fps={encodes / elapsed:.1f} "
                    f"{variant}_avg_kb={averageKb:.1f} "
                    f"{variant}_encode_avg_ms={averageMs:.1f} "
                    f"{variant}_send_fps={profile['sends'] / elapsed:.1f} "
                    f"{variant}_clients={self.clientCounts[variant]}"
                )
            print(
                f"[VIDEO PERF] {self.cameraName} cv_fps={self.perfCvFrames / elapsed:.1f} "
                + " ".join(profileSummary)
            )
            self.perfStarted = time.perf_counter()
            self.perfCvFrames = 0
            self.perfProfiles = {
                name: {"encodes": 0, "encode_seconds": 0.0, "bytes": 0, "sends": 0}
                for name in JPEG_PROFILES
            }

    def publishProcessedFrame(self, processedFrame):
        now = time.perf_counter()
        with self.jpegCondition:
            self.processedFrameSequence += 1
            sequence = self.processedFrameSequence
            activeProfiles = [
                (variant, profile)
                for variant, profile in JPEG_PROFILES.items()
                if self.clientCounts[variant] > 0
                and now - self.lastJpegEncodeAt[variant] >= 1 / profile["max_fps"]
            ]

        encodedFrames = []
        for variant, profile in activeProfiles:
            outputFrame = processedFrame
            width = profile["width"]
            if width and processedFrame.shape[1] > width:
                height = round(processedFrame.shape[0] * width / processedFrame.shape[1])
                outputFrame = cv2.resize(processedFrame, (width, height), interpolation=cv2.INTER_AREA)
            started = time.perf_counter()
            success, buffer = cv2.imencode(
                ".jpg", outputFrame, [cv2.IMWRITE_JPEG_QUALITY, profile["quality"]]
            )
            if success:
                encodedFrames.append((variant, buffer.tobytes(), started))

        with self.jpegCondition:
            for variant, jpeg, started in encodedFrames:
                self.jpegCaches[variant] = {"sequence": sequence, "bytes": jpeg}
                self.lastJpegEncodeAt[variant] = now
                self.recordJpegEncode(variant, time.perf_counter() - started, len(jpeg))
            self.jpegCondition.notify_all()

    def capLoop(self):
        with self.capLock:
            fps = self.cap.get(cv2.CAP_PROP_FPS)
            frameInterval = 1/fps if fps > 0 else 1/25

        if self.isLocalVideo:
            nextFrameTime = time.perf_counter()
            while self.running:
                sleepTime = nextFrameTime - time.perf_counter()
                if sleepTime > 0:
                    time.sleep(sleepTime)

                with self.capLock:
                    success, frame = self.cap.read()
                    if not success or frame is None:
                        print(f"[LOCAL VIDEO] {self.cameraName} reached EOF; looping.")
                        if not self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0):
                            self.cap.release()
                            self.cap = self.openCapture()
                        nextFrameTime = time.perf_counter() + frameInterval
                        continue

                with self.frameLock:
                    self.frame = frame

                nextFrameTime += frameInterval
                if nextFrameTime < time.perf_counter():
                    nextFrameTime = time.perf_counter()
            return

        while self.running:
            
            with self.capLock:

                intervalStartTime = time.perf_counter()
                success, frame = self.cap.read()



            if not success or frame is None:
                print("capture failed, reconnecting")

                with self.capLock:
                    self.cap.release()
                    self.cap = self.openCapture()
            
                continue

            with self.frameLock:
                self.frame = frame
                
            elapsedTime = time.perf_counter() - intervalStartTime
            sleepTime = max(0, frameInterval - elapsedTime)

            time.sleep(sleepTime)
            
    def violationMonitoringLoop(self):
        while self.running:
            self.CV.setSignalState(self.currentApproachSignalState())
            self.CV.updateViolationStates()
            time.sleep(VIOLATION_CHECK_INTERVAL)

    def cvLoop(self):
        
       while self.running:

        with self.frameLock:
            if self.frame is None:
                frame = None
            else:
                frame = self.frame.copy()

        if frame is None:
            time.sleep(0.01)
            continue
        
        # print("cv loop running!")
        newWidth, newHeight, countingLine, startLine, endLine = self.lineFunction(frame)
        parkingViolationAreas = parkingROIsForCamera(
            self.CV.cameraId, newWidth, newHeight
        )

        processedFrame = self.CV.inference(
            frame, newWidth, newHeight, countingLine, startLine, endLine,
            self.crossValidation, parkingViolationAreas, DRAW_PARKING_ROI,
        )
        if processedFrame is not None:
            with self.frameLock:
                self.processedFrame = processedFrame
            with self.perfLock:
                self.perfCvFrames += 1
            self.publishProcessedFrame(processedFrame)
            self.reportVideoPerformance()
    
        
        time.sleep(0.01)

    def saveIntervalLoop(self):

        while self.running:
            self.CV.saveInterval()
            time.sleep(30)

    def startCV(self):
        if self.running:
            return
        
        self.running = True

        self.threadCvLoop = threading.Thread(
            target = self.cvLoop,
            daemon = True
        )

        self.threadCapLoop = threading.Thread(
            target = self.capLoop,
            daemon=True
        )

        self.threadViolationMonitoringLoop = threading.Thread(
            target = self.violationMonitoringLoop,
            daemon = True
        )

        self.threadSaveIntervalLoop = threading.Thread(
            target= self.saveIntervalLoop,
            daemon = True
        )

        self.threadCapLoop.start()
        self.threadCvLoop.start()
        self.threadViolationMonitoringLoop.start()
        self.threadSaveIntervalLoop.start()

    def mjpegGenerator(self, variant):
        lastSentSequence = 0
        with self.jpegCondition:
            self.clientCounts[variant] += 1
        try:
            while self.running:
                with self.jpegCondition:
                    self.jpegCondition.wait_for(
                        lambda: self.jpegCaches[variant]["bytes"] is not None
                        and self.jpegCaches[variant]["sequence"] > lastSentSequence,
                        timeout=1.0,
                    )
                    cache = self.jpegCaches[variant]
                    if cache["bytes"] is None or cache["sequence"] <= lastSentSequence:
                        continue
                    lastSentSequence = cache["sequence"]
                    jpeg = cache["bytes"]
                with self.perfLock:
                    self.perfProfiles[variant]["sends"] += 1
                yield (
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' + jpeg + b'\r\n'
                )
        finally:
            with self.jpegCondition:
                self.clientCounts[variant] = max(0, self.clientCounts[variant] - 1)
    
    def getStats(self):
        return self.CV.returnStats()

    def getCurrentSnapshot(self):
        vehicleCount = self.CV.vehicleCount
        available = self.running and (self.frame is not None or self.processedFrame is not None)
        return {
            "available": available,
            "vehicleCount": vehicleCount if available else None,
        }
    
    def updateFrontend(self):
        data = self.CV.returnIntervalData()
        return data

class trafficForecast:

    def __init__(self):
        self.FCC = forecastingComponent()
        self.forecast = None
        self.running = False
        self.trafficForecastThread = None

    def trafficForecastLoop(self):

        while self.running:
            self.forecast = self.FCC.produceForecast()
            time.sleep(30)

    def startTrafficForecasting(self):

        if self.running:
            return

        self.running = True

        self.trafficForecastThread = threading.Thread(
            target = self.trafficForecastLoop,
            daemon = True
        )

        self.trafficForecastThread.start()

    def getTrafficForecast(self):
        return {
            "message" : "success",
            "trafficForecast" : self.forecast,
        }



# SAMBAT TO BUBUKAL LINES
def stolLines(frame):

    height, width = frame.shape[:2]

    newHeight = int(height*0.5)
    newWidth = int(width*0.5)


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

    return (newWidth, newHeight, countingLine, startLine, endLine)

# SAMBAT TO PATIMBAO LINES
def stopLines(frame):

    height, width = frame.shape[:2]

    newHeight = int(height*0.5)
    newWidth = int(width*0.5)

    # COUNTING LINE
    lineX1 = int(newWidth * 0.1)
    lineY1 = int(newHeight*0.97)
    lineX2 = int(newWidth*0.68)
    lineY2 = int(newHeight*0.4)

    clA = (lineX1,lineY1)
    clB = (lineX2,lineY2)

    countingLine = (clA,clB)


    # SPEED ESTIMATION START LINE
    lineX1 = int(newWidth * 0.04)
    lineY1 = int(newHeight * 0.42)
    lineX2 = int(newWidth * 0.14)
    lineY2 = int(newHeight * 0.36)


    slA = (lineX1, lineY1)
    slB = (lineX2, lineY2)

    startLine = (slA,slB)


    # SPEED ESTIMATION END LINE
    lineX1 = int(newWidth * 0.1)
    lineY1 = int(newHeight*0.98)
    lineX2 = int(newWidth * 0.7)
    lineY2 = int(newHeight * 0.4)

    elA = (lineX1, lineY1)
    elB = (lineX2, lineY2)

    endLine = (elA, elB)

    return (newWidth, newHeight, countingLine, startLine, endLine)

# SAMBAT TO SUNSTAR LINES
def stosLines(frame):

    height, width = frame.shape[:2]

    newHeight = int(height*0.5)
    newWidth = int(width*0.5)
    # COUNTING LINE
    lineX1 = int(newWidth * 0.1)
    lineY1 = int(newHeight*0.5)
    lineX2 = int(newWidth*0.38)
    lineY2 = int(newHeight*0.5)

    clA = (lineX1,lineY1)
    clB = (lineX2,lineY2)

    countingLine = (clA,clB)


    # SPEED ESTIMATION START LINE
    lineX1 = int(newWidth * 0.33)
    lineY1 = int(newHeight * 0.2)
    lineX2 = int(newWidth * 0.4)
    lineY2 = int(newHeight * 0.2)


    slA = (lineX1, lineY1)
    slB = (lineX2, lineY2)

    startLine = (slA,slB)


    # SPEED ESTIMATION END LINE
    lineX1 = int(newWidth * 0.03)
    lineY1 = int(newHeight*0.51)
    lineX2 = int(newWidth * 0.4)
    lineY2 = int(newHeight * 0.51)

    elA = (lineX1, lineY1)
    elB = (lineX2, lineY2)

    endLine = (elA, elB)

    return (newWidth, newHeight, countingLine, startLine, endLine)

# SAMBAT TO BUBUKAL
def stocLines(frame):
    height, width = frame.shape[:2]

    newHeight = int(height * 0.5)
    newWidth = int(width * 0.5)

    # COUNTING LINE
    lineX1 = int(newWidth * 0.07)
    lineY1 = int(newHeight*0.47)
    lineX2 = int(newWidth*0.4)
    lineY2 = int(newHeight*0.65)

    clA = (lineX1,lineY1)
    clB = (lineX2,lineY2)

    countingLine = (clA,clB)


    # SPEED ESTIMATION START LINE
    lineX1 = int(newWidth * 0.48)
    lineY1 = int(newHeight * 0.18)
    lineX2 = int(newWidth * 0.61)
    lineY2 = int(newHeight * 0.21)


    slA = (lineX1, lineY1)
    slB = (lineX2, lineY2)

    startLine = (slA,slB)


    # SPEED ESTIMATION END LINE
    lineX1 = int(newWidth * 0.03)
    lineY1 = int(newHeight*0.51)
    lineX2 = int(newWidth * 0.4)
    lineY2 = int(newHeight * 0.7)

    elA = (lineX1, lineY1)
    elB = (lineX2, lineY2)

    endLine = (elA, elB)

    return (newWidth, newHeight, countingLine, startLine, endLine)


fcc = trafficForecast()
stolStream = streamControl(stolVideoPath, stolLines, 1, 1, "STOL")
stopStream = streamControl(stopVideoPath, stopLines, 1, 2, "STOP")
stosStream = streamControl(stosVideoPath, stosLines, 1, 3, "STOS")
stocStream = streamControl(stocVideoPath, stocLines, 1, 4, "STOC")
    

def streamResponse(cameraStream):
    variant = request.args.get("variant", "main").lower()
    if variant not in JPEG_PROFILES:
        variant = "main"
    return Response(
        cameraStream.mjpegGenerator(variant),
        mimetype='multipart/x-mixed-replace; boundary=frame',
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", "Pragma": "no-cache"},
    )


@stream.route('/dashboard_snapshot')
def dashboardSnapshot():
    started = time.perf_counter()
    snapshot = {
        "server_timestamp": time.time(),
        "cameras": {
            "STOL": stolStream.getCurrentSnapshot(),
            "STOP": stopStream.getCurrentSnapshot(),
            "STOS": stosStream.getCurrentSnapshot(),
            "STOC": stocStream.getCurrentSnapshot(),
        },
        "traffic_lights": TLC.returnDashboardSnapshot(),
    }
    response = jsonify(snapshot)
    if PERF_LOGGING:
        print(
            f"[API PERF] dashboard_snapshot total={(time.perf_counter() - started) * 1000:.1f}ms "
            f"size={response.content_length / 1024:.1f}KB"
        )
    return response


# SAMBAT TO LSPU APIS
@stream.route('/stol_stream_video')
def stolDisplay():
    return streamResponse(stolStream)
@stream.route("/stol_get_stat_data")
def stolStatData():
    return stolStream.getStats() 
@stream.route('/stol_update_frontend')
def stolUpdate():
    return stolStream.updateFrontend()

# SAMBAT TO PATIMBAO APIS
@stream.route("/stop_stream_video")
def stopDisplay():
    return streamResponse(stopStream)
@stream.route("/stop_get_stat_data")
def getStopStatData():
    return stopStream.getStats()
@stream.route('/stop_update_frontend')
def stopUpdate():
    return stopStream.updateFrontend()




# SAMBAT TO SUNSTAR APIS
@stream.route("/stos_stream_video")
def stosDisplay():
    return streamResponse(stosStream)
@stream.route("/stos_get_stat_data")
def getStosStatData():
    return stosStream.getStats()
@stream.route('/stos_update_frontend')
def stosUpdate():
    return stosStream.updateFrontend()





# SAMBAT TO COMPLEX APIS
@stream.route("/stoc_stream_video")
def stocDisplay():
    return streamResponse(stocStream)
@stream.route("/stoc_get_stat_data")
def getStocStatData():
    return stocStream.getStats()
@stream.route('/stoc_update_frontend')
def stocUpdate():
    return stocStream.updateFrontend()


# TRAFFIC FORECAST API
@stream.route('/get_traffic_forecast')
def getTrafficForecast():
    response = fcc.getTrafficForecast()
    return response


# SYSTEM START TRIGGER
def startBackend():
    stosStream.startCV()
    stolStream.startCV()
    stopStream.startCV()
    stocStream.startCV()
    fcc.startTrafficForecasting()
    TLC.startTrafficLightControl()
    print("SYSTEM START!")



