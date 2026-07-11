from flask import Blueprint, Response
from pathlib import Path;
from CV import ComputerVisionComponent;
import cv2
import threading 
import time

# VIDEO VARIABLES
base_dir = Path(__file__).resolve().parent
videoPath = Path(base_dir/"videoData/sambat_to_patimbao.mp4")
capLock = threading.Lock()
patimbaoStream = Blueprint('patimbaoStream', __name__)
previousFrame = None


# DEBUG ERROR LIST
# 
# SYSTEM BREAKDOWN ERROR 1 (FRONTEND WAS NOT GETTING THE SAME DATA FROM THE BACKEND)

# AN ERROR OCCURED WHERE IF THE COMPUTER VISION COMPONENT WAS USED IN THE FRONTEND, THE DATA WAS NOT CONSISTENT WITH WHAT WAS SHOWN IN THE VIDEO
# THE PROBLEM WAS THAT BOTH THE RAWFRAME FUNCTION AND THE INFERENCE FUNCTION WAS MODIFYING THE SAME RESOURCE, FORCING THE BACKEND TO SKIP FRAMES WHEN THE RAWFRAMES WAS 
# ADVANCING THE CAP TOO MUCH

class streamControl:
    def __init__(self):
        self.cap = cv2.VideoCapture(videoPath)
        self.stopCV = ComputerVisionComponent()
        self.frame = None
        self.frameCount = 0
        self.previousFrame = None

        self.running = False
        self.threadCvLoop = None
        self.threadFrameLoop = None

    def cvLoop(self):
        
        while self.running:
            with capLock:
                ret, frame = self.cap.read()

            if not ret:
                return {
                    "message" : "failed to load video"
                }
            
            self.frame = frame
            self.frameCount += 1
            if self.frameCount % 1 == 0:
                response = self.stopCV.inference(frame)
                self.previousFrame = response
                # return response
            
            else: 
                return {
                    "message" : "skip"
                }
            
            time.sleep(0.01)
        
    def startCV(self):
        if self.running:
            return
        
        self.running = True

        self.threadCvLoop = threading.Thread(
            target = self.cvLoop,
            daemon = True
        )

        self.threadFrameLoop = threading.Thread(
            target = self.mjpegGenerator,
            daemon = True
        )

        self.threadCvLoop.start()
        self.threadFrameLoop.start()

    def mjpegGenerator(self):
        while True:

            frame = self.stopCV.returnFrame()
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
        return self.stopCV.returnStats()
    
    def updateFrontend(self):
        data = self.stopCV.updateFrontend()
        self.stopCV.newInterval()
        return data
            


stopStream = streamControl()

@patimbaoStream.route('/stop_stream_video')
def stopDisplay():
    return Response(
        stopStream.mjpegGenerator(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

@patimbaoStream.route("/stop_get_stat_data")
def stopStatData():
    return stopStream.getStats()
    
@patimbaoStream.route('/stop_update_frontend')
def stopUpdate():
    return stopStream.updateFrontend()

def stopStartBackend():
    stopDisplay()
    stopStream.startCV()


