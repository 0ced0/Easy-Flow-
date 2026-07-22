from flask import Response;
import numpy as np;
import cv2;
import threading;
from pathlib import Path;
from ultralytics import YOLO;


# TARGET FEATURES

# Per camera / per interval:
# - flow
# - average_speed_green
# - discharge_speed
# - right_turn_flow
# - occupancy_proxy
# - density_proxy


base_dir = Path(__file__).resolve().parent
modelPath = Path(base_dir/"../models/training/yoloModels/sModels/batch1Final/best.pt")
byteTrack = Path(base_dir/"../models/training/bytetrack.yaml")
model = YOLO(modelPath)
capLock = threading.Lock()

# FOR VIDEO TESTING
base_dir = Path(__file__).resolve().parent
videoPath = Path(base_dir/"videoData/sambat_to_lspu.mp4")
cap = cv2.VideoCapture(videoPath)



def speedEstimation(startFrame, endFrame, vehicle):
    overallFrames = endFrame - startFrame
    time = overallFrames / 25
    speed = 17/time
    return speed

def speedEstimationArea(frame, startLine, endLine, vehicleCenter, frameCount, allVehicles, currentVehicleId, startFrame, endFrame, speed):

    startCP = trackVehicle(frame, vehicleCenter, startLine)[1]
    endCP = trackVehicle(frame, vehicleCenter, endLine)[1]


    for vehicle in allVehicles:

        if currentVehicleId == vehicle:

            startFrame = allVehicles[vehicle]["startFrame"]
            endFrame = allVehicles[vehicle]["endFrame"]
            previousStartCP = allVehicles[vehicle]["startCrossProduct"]
            previousEndCP = allVehicles[vehicle]["endCrossProduct"]
            currentStartCP = startCP
            currentEndCP = endCP

            if (startFrame and endFrame):
                speed = speedEstimation(startFrame, endFrame, vehicle)

            if previousStartCP < 0 and currentStartCP > 0:
                startFrame = frameCount

            if previousEndCP < 0 and currentEndCP > 0:
                endFrame = frameCount

    return startCP, endCP, startFrame, endFrame, speed

def VehicleCounterPosition(allVehicles, crossProduct ,crossProductReference, currentVehicleId, vehicleCount):

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

def trackVehicle(frame, vehicleCenter, line):
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

def displayVehicle(frame, boxes, countingLine, allVehicles, vehicleCount, startLine, endLine, frameCount):
    crossProductReference = "counterCrossProduct"


    # DISPLAYING ALL VEHICLES
    for box in boxes:
        if box.id == None:
            continue
        
        # VEHICLE CHARACTERISTICS
        vehicleClass = int(box.cls[0])
        vehicleName = model.names[vehicleClass]
        currentVehicleId = int(box.id[0])

        # VEHICLE COORDINATES
        x1,y1,x2,y2 = map(int, box.xyxy[0])
        boxStart = (x1,y1)
        boxEnd = (x2,y2)
        cx = (x1+x2) // 2
        cy = (y1+y2) // 2
        vehicleCenter = (cx,cy)

        cv2.rectangle(
            frame,
            boxStart,
            boxEnd,
            (0,255,255),
            1
        )

        frame, crossProduct = trackVehicle(frame, vehicleCenter, countingLine)

        startFrame = None
        endFrame = None
        speed = None
        startCrossProduct, endCrossProduct, startFrame, endFrame, vehicleSpeed = speedEstimationArea(frame, startLine, endLine, vehicleCenter, frameCount, allVehicles, currentVehicleId, startFrame, endFrame, speed)

        counterCrossProduct = 0
        if len(allVehicles) > 0:
            counterCrossProduct, vehicleCount = VehicleCounterPosition(allVehicles, crossProduct, crossProductReference, currentVehicleId, vehicleCount)

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

        cv2.putText(
            frame,
            f"{allVehicles[currentVehicleId]["name"]}",
            boxStart,
            cv2.FONT_HERSHEY_COMPLEX,
            0.5,
            (0,0,0),
            1
        )

    #     cv2.putText(
    #         frame,
    #         f"{endFrame}",
    #         boxEnd,
    #         cv2.FONT_HERSHEY_COMPLEX,
    #         0.5,
    #         (0,0,0),
    #         1
    #     )

    cv2.putText(
        frame,
        f"VEHICLE COUNT: {vehicleCount}",
        (100,100),
        cv2.FONT_HERSHEY_COMPLEX,
        0.4,
        (0,0,0),
        1
    )

    cv2.line(
        frame,
        startLine[0],
        startLine[1],
        (0,700,0),
        1
    )

    cv2.line(
        frame,
        endLine[0],
        endLine[1],
        (0,700,0),
        1
    )

    return frame, allVehicles, vehicleCount

# RUN INFERENCE FOR BACKEND
def runStream(cap):
    allVehicles = {}
    vehicleCount = 0
    counter = 0
    frameCount = 0  

    while(True):

        ret, frame = cap.read()

        if not ret:
            return {
                "message" : "The video failed to load"
            }
            break 
        
        frameCount += 1
        if frameCount % 2 == 0:

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


            frame = cv2.resize(frame,(newWidth,newHeight))

            results = model.track(frame, conf=0.25, persist=True, tracker=byteTrack)

            boxes = results[0].boxes

            frame, allVehicles, counter = displayVehicle(frame, boxes, countingLine, allVehicles, counter, startLine, endLine, frameCount)

            frame = cv2.line(
                frame,    
                countingLine[0],
                countingLine[1],
                (255,0,0),
                1
            )

            cv2.imshow('Sambat to LSPU', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
        
    cap.release()
    cv2.destroyAllWindows()
    return {
        "message" : "PROCESS RAN SUCCESFULLY",
        "data" : vehicleCount
    }

# RUN THE STREAM IN THE FRONTEND
def streamVideo(frame, frameCount):
    allVehicles = {}
    counter = 0
    
    results = model.track(frame, conf=0.4, persist=True, tracker=byteTrack)
    

    newHeight = 700
    newWidth = 1150

    # COUNTING LINE
    lineX1 = int(newWidth * 0.2)
    lineY1 = int(newHeight*0.55)
    lineX2 = int(newWidth*0.7)
    lineY2 = int(newHeight*0.85)

    A = (lineX1,lineY1)
    B = (lineX2,lineY2)

    countingLine = (A,B)


    # SPEED ESTIMATION START LINE
    lineX1 = int(newWidth * 0.5)
    lineY1 = int(newHeight * 0.5)
    lineX2 = int(newWidth * 0.3)
    lineY2 = int(newHeight * 0.3)


    A = (lineX1, lineY1)
    B = (lineX2, lineY2)

    startLine = (A,B)


     # SPEED ESTIMATION END LINE
    lineX1 = int(newWidth * 0.05)
    lineY1 = int(newHeight * 0.65)
    lineX2 = int(newWidth * 0.3)
    lineY2 = int(newHeight * 0.85)

    elA = (lineX1, lineY1)
    elB = (lineX2, lineY2)

    endLine = (elA, elB)

    boxes = results[0].boxes
    # frame, allVehicles, counter = displayVehicle(frame, boxes, countingLine, allVehicles, counter, startLine, endLine, frameCount)

    success, buffer = cv2.imencode('.jpg', frame)
    if not success:
        return {
            "message" : "ERROR CONVERTING FRAMES"
        }
    
    image = buffer.tobytes()

    return Response(
        image, 
        mimetype="image/jpeg"
    )

def homography(cap):
    while (True):
        ret, frame = cap.read()

        height, width = frame.shape[:2]
        newWidth = int(width // 1.8)
        newHeight = int(height // 1.8)

        frame = cv2.resize(frame, (newWidth, newHeight))



        # SOURCE POINTS

        topLeft = (int(newWidth // 1.52), int(newHeight // 3.7))
        topRight = (int(newWidth // 1.37), int(newHeight // 3.6))
        bottomRight = (int(newWidth // 1.4), int(newHeight // 1.3))
        bottomLeft = (int(newWidth//4), int(newHeight // 1.55))


        cv2.circle(
            frame,
            topLeft,
            3,
            (0,0,255),
            -1
        )

        cv2.circle(
            frame,
            topRight,
            3,
            (0,255,0),
            -1
        )

        cv2.circle(
            frame,
            bottomRight,
            3,
            (0,255,0),
            -1
        )

        cv2.circle(
            frame,
            bottomLeft,
            3,
            (255,0,0),
            -1
        )

        sourcePoints = np.float32([
            topLeft,
            topRight,
            bottomLeft,
            bottomRight
        ])

        sourceDestination = np.float32([
            [400, 100],
            [600, 100],
            [300, int(newHeight//1.3)],
            [800, int(newHeight//1.3)]
        ])


        cv2.imshow('test',frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

runStream(cap)