from flask import Blueprint, Response
from pathlib import Path;
from CV import ComputerVisionComponent;
import cv2
import threading 
import time
import numpy as np

# VIDEO VARIABLES
base_dir = Path(__file__).resolve().parent
stream = Blueprint('stream', __name__)
previousFrame = None

# stolVideoPath = "rtsp://admin:Stacruz@2022@172.1.5.78/live"
# stopVideoPath = "rtsp://admin:Stacruz@2022@172.1.5.82/live"
# stosVideoPath = "rtsp://admin:Stacruz@2022@172.1.5.92/live"
# stocVideoPath = "rtsp://admin:Stacruz@2022@172.1.5.77/live"


stolVideoPath = Path(base_dir/"videoData/sambat_to_lspu.mp4")
stopVideoPath = Path(base_dir/"videoData/sambat_to_patimbao.mp4")
stosVideoPath = Path(base_dir/"videoData/sambat_to_sunstar.mp4")
stocVideoPath = Path(base_dir/"videoData/sambat_to_complex.mp4")

# DEBUG ERROR LIST
# 
# SYSTEM BREAKDOWN ERROR 1 (FRONTEND WAS NOT GETTING THE SAME DATA FROM THE BACKEND)

# AN ERROR OCCURED WHERE IF THE COMPUTER VISION COMPONENT WAS USED IN THE FRONTEND, THE DATA WAS NOT CONSISTENT WITH WHAT WAS SHOWN IN THE VIDEO
# THE PROBLEM WAS THAT BOTH THE RAWFRAME FUNCTION AND THE INFERENCE FUNCTION WAS MODIFYING THE SAME RESOURCE, FORCING THE BACKEND TO SKIP FRAMES WHEN THE RAWFRAMES WAS 
# ADVANCING THE CAP TOO MUCH


# ENGINEERING DESIGN


class streamControl:
    def __init__(self, videoPath, lineFunction, crossValidation, cameraId):
        # VIDEO VARIABLES
        self.videoPath = videoPath
        self.cap = cv2.VideoCapture(videoPath)
        self.videoPath = videoPath
        self.CV = ComputerVisionComponent(cameraId)
        self.frame = None
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

        # LINE LOGIC VARIABLES
        self.lineFunction = lineFunction
        self.crossValidation = crossValidation

    def capLoop(self):

        with self.capLock:
        
            fps = self.cap.get(cv2.CAP_PROP_FPS)

            frameInterval = 1/fps if fps > 0 else 1/25
            
        while self.running:
            
            with self.capLock:

                intervalStartTime = time.perf_counter()
                success, frame = self.cap.read()



            if not success or frame is None:
                print("capture failed, reconnecting")

                with self.capLock:
                    self.cap.release()
                    self.cap = cv2.VideoCapture(self.videoPath)
            
                continue

            with self.frameLock:
                self.frame = frame
                
            elapsedTime = time.perf_counter() - intervalStartTime
            sleepTime = max(0, frameInterval - elapsedTime)

            time.sleep(sleepTime)
            
    def violationMonitoringLoop(self):
        while self.running:
            self.CV.illegalParkingDetection()
            time.sleep(30)

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
        newWidth, newHeight, countingLine, startLine, endLine, violationDetectionArea = self.lineFunction(frame)

        response = self.CV.inference(frame, newWidth, newHeight, countingLine, startLine, endLine, self.crossValidation, violationDetectionArea)
    
        
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

    def mjpegGenerator(self):
        while True:

            with self.frameLock:
                frame = None if self.frame is None else self.frame.copy()

            success, buffer = cv2.imencode(".jpg", frame)
            if not success:
                return{
                    "message" : "error converting frame"
                }

            frame = buffer.tobytes()

            if frame is None:
                time.sleep(0.05)
                continue
                
            yield(
                b'--frame\r\n'
                b'content-type:image/jpeg\r\n\r\n' +
                frame +
                b'\r\n'
            )

            time.sleep(0.03)
    
    def getStats(self):
        return self.CV.returnStats()
    
    def updateFrontend(self):
        data = self.CV.returnIntervalData()
        return data
    

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

    polygonLines = np.array([
        [int(newWidth * 0.53), int(newHeight * 0.25)], 
        [int(newWidth * 0), int(newHeight * 0.6)], 
        [int(newWidth * 0), int(newHeight * 1)],
        [int(newWidth * 1), int(newHeight * 1)],
        [int(newWidth * 1), int(newHeight * 0.5)], 
        [int(newWidth * 0.75), int(newHeight * 0.28)]])

    violationDetectionArea = polygonLines

    return (newWidth, newHeight, countingLine, startLine, endLine, violationDetectionArea)

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

    polygonLines = np.array([
        [int(newWidth * 0.53), int(newHeight * 0.25)], 
        [int(newWidth * 0), int(newHeight * 0.6)], 
        [int(newWidth * 0), int(newHeight * 1)],
        [int(newWidth * 1), int(newHeight * 1)],
        [int(newWidth * 1), int(newHeight * 0.5)], 
        [int(newWidth * 0.75), int(newHeight * 0.28)]])
    
    violationDetectionArea = polygonLines

    return (newWidth, newHeight, countingLine, startLine, endLine, violationDetectionArea)       

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

    polygonLines = np.array([
        [int(newWidth * 0.3), int(newHeight * 0.2)], 
        [int(newWidth * 0.001), int(newHeight * 0.5)], 
        [int(newWidth * 0), int(newHeight * 1)],
        [int(newWidth * 1), int(newHeight * 1)],
        [int(newWidth * 1), int(newHeight * 0.7)], 
        [int(newWidth * 0.53), int(newHeight * 0.18)]])

    violationDetectionArea = polygonLines
    return (newWidth, newHeight, countingLine, startLine, endLine, violationDetectionArea)

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

    polygonLines = np.array([
        [int(newWidth * 0.53), int(newHeight * 0.25)], 
        [int(newWidth * 0), int(newHeight * 0.6)], 
        [int(newWidth * 0), int(newHeight * 1)],
        [int(newWidth * 1), int(newHeight * 1)],
        [int(newWidth * 1), int(newHeight * 0.5)], 
        [int(newWidth * 0.75), int(newHeight * 0.28)]])

    violationDetectionArea = polygonLines

    return (newWidth, newHeight, countingLine, startLine, endLine, violationDetectionArea)

stolStream = streamControl(stolVideoPath, stolLines, 1, 1)
stopStream = streamControl(stopVideoPath, stopLines, 1, 2)
stosStream = streamControl(stosVideoPath, stosLines, 1, 3)
stocStream = streamControl(stocVideoPath, stocLines, 1, 4)


# SAMBAT TO LSPU APIS
@stream.route('/stol_stream_video')
def stolDisplay():
    return Response(
        stolStream.mjpegGenerator(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

@stream.route("/stol_get_stat_data")
def stolStatData():
    return stolStream.getStats()
    
@stream.route('/stol_update_frontend')
def stolUpdate():
    return stolStream.updateFrontend()

# SAMBAT TO PATIMBAO APIS
@stream.route("/stop_stream_video")
def stopDisplay():
    return Response(
        stopStream.mjpegGenerator(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

@stream.route("/stop_get_stat_data")
def getStopStatData():
    return stopStream.getStats()

@stream.route('/stop_update_frontend')
def stopUpdate():
    return stopStream.updateFrontend()




# SAMBAT TO SUNSTAR APIS
@stream.route("/stos_stream_video")
def stosDisplay():
    return Response(
        stosStream.mjpegGenerator(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

@stream.route("/stos_get_stat_data")
def getStosStatData():
    return stosStream.getStats()

@stream.route('/stos_update_frontend')
def stosUpdate():
    return stosStream.updateFrontend()





# SAMBAT TO COMPLEX APIS
@stream.route("/stoc_stream_video")
def stocDisplay():
    return Response(
        stocStream.mjpegGenerator(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

@stream.route("/stoc_get_stat_data")
def getStocStatData():
    return stocStream.getStats()

@stream.route('/stoc_update_frontend')
def stocUpdate():
    return stocStream.updateFrontend()






# SYSTEM START TRIGGER
def startBackend():
    stosStream.startCV()
    stolStream.startCV()
    stopStream.startCV()
    stocStream.startCV()
    print("SYSTEM START!")



