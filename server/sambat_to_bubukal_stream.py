from flask import Blueprint, Response
from pathlib import Path;
from computerVisionComponent import streamVideo;
import cv2
import threading 

# VIDEO VARIABLES
base_dir = Path(__file__).resolve().parent
videoPath = Path(base_dir/"sambat_to_lspu.mp4")
cap = cv2.VideoCapture(videoPath)
frameCount = 0
capLock = threading.Lock()
stream = Blueprint('stream', __name__)
previousFrame = None


def callCV(frameCount):
    with capLock:
        ret, frame = cap.read()
    
    if not ret:
        return {
            "message" : "failed to load video"
        }
    
    frameCount += 1
    if frameCount % 1 == 0:
        response = streamVideo(frame, frameCount)
        previousFrame = response
        print("if happened",response)
        return response

    else:
        response = streamVideo(frame, frameCount)
        print("Else happened: ",response)
        return Response(
            previousFrame,
            mimetype="image/jpeg"
            )
    


def rawVideo(frameCount, previousFrame):
    frameCount += 1
    with capLock:
        ret, frame = cap.read()

        ret, buffer = cv2.imencode(".jpg", frame)
        if not ret:
            return {
                "message" : "error converting image"
            }

        frame = buffer.tobytes()

    if frameCount % 1 == 0:
        previousFrame = frame
        return Response(
            frame,
            mimetype="image/jpeg"

        )
    
    # return Response(
    #     previousFrame,
    #     mimetype = "image/jpeg"
    # )

@stream.route('/stream_video')
# SAMBAT TO LSPU DISPLAY
# def stolDisplay():
#     response = callCV(frameCount)
#     return response

def stolDisplay():
    response = rawVideo(frameCount, previousFrame)
    return response
