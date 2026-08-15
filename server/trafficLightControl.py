from database.databaseConnector import getForecastIntervals
import time
from flask import Blueprint
import threading
import os

intersectionTimers = Blueprint("intersectionTimers", __name__)

def trafficThresholds(traffic):

    if traffic <= 200:
        return 0

    elif traffic >= 201 and traffic <= 500:
        return 1

    elif traffic >= 501:
        return 2

def timerCompiler(stolTraffic, stopTraffic, stosTraffic, stocTraffic):

    stolCondition = trafficThresholds(stolTraffic)
    stopCondition = trafficThresholds(stopTraffic)
    stosCondition = trafficThresholds(stosTraffic)
    stocCondition = trafficThresholds(stocTraffic)

    print("this is the stopcondition: ", stopCondition)
    stolTimers = [41, 0, 0]
    stopTimers = [71, 151, 0]
    stocTimers = [36, 0, 0]
    stosTimers = [51, 0, 0]

    greenLightTimers = [stolTimers[stolCondition], stopTimers[stopCondition], stocTimers[stocCondition], stosTimers[stosCondition]]

    return greenLightTimers


class trafficLightControls:

    def __init__(self):
        self.lspuTrafficData = None
        self.patimbaoTrafficData = None
        self.sunstarTrafficData = None
        self.complexTrafficData = None
        self.intersectionData = {}
        self.currentCycle = timerCompiler(1,1,1,1)
        self.adaptedCycle = timerCompiler(1,1,1,1)
        self.trafficLightData = []
        self.threadTrafficLightLoop = None
        self.allowedApproach = "A"
        self.trafficStates = (1,1,1,1)
            
    def getIntersectionData(self):
        self.intersectionData = getForecastIntervals(lag=6)
        interval = 1
        for row in self.intersectionData:
            if int(row["camera_id"]) == 1:
                print(f"INTERVAL {interval}")
                interval += 1
            print("CAMERA: ", row["camera_id"], "FLOW: ", row["traffic_flow"])

    def trafficLightLoop(self):
        
        timerApproachA = ["green", 36, "A"]
        timerApproachB = ["red", 42, "B"]
        timerApproachC = ["red", 149, "C"]
        timerApproachD = ["red", 191, "D"]
        clearance = False
        transition = False
        cycle = True

        approaches = [timerApproachA, timerApproachB, timerApproachC, timerApproachD] 
        
        while True:
            while cycle:
                if transition:
                    while not clearance:
                        approaches, clearance = self.clearance(self.allowedApproach, approaches, clearance, self.trafficStates)
                        approaches, transition = self.timeStep(approaches, transition, self.allowedApproach, steps=3)
                
                    approaches, self.allowedApproach, transition, clearance, cycle = self.transition(approaches, self.allowedApproach, transition, clearance, cycle)

                approaches, transition = self.timeStep(approaches, transition, self.allowedApproach)

            cycle = self.calculateNextCycle(cycle)

    def transition(self, approaches, allowedApproach, transition, clearance, cycle):
        match allowedApproach:
            case "A":
                approaches[1][0] = "green"
                allowedApproach = "B"
                approaches[1][1] = self.currentCycle[1]

            case "B":
                approaches[2][0] = "green"
                allowedApproach = "C"
                approaches[2][1] = self.currentCycle[2]


            case "C":
                approaches[3][0] = "green"
                allowedApproach = "D"
                approaches[3][1] = self.currentCycle[3]
                cycle = False

            case "D":
                approaches[0][0] = "green"
                allowedApproach = "A"
                approaches[0][1] = self.currentCycle[0]

        transition = False
        clearance = False
        return approaches, allowedApproach, transition, clearance, cycle

    def clearance(self, allowedApproach, approaches, clearance, trafficStates):

        currentCycle = self.currentCycle.copy()
        adaptedCycle = self.adaptedCycle.copy()

        if allowedApproach == "A":

            match approaches[0][0]:
                case "green":
                    approaches[0][0] = "yellow"
                    approaches[0][1] = 4

                case "yellow":
                    approaches[0][0] = "red"
                    approaches[0][1] = currentCycle[1] + currentCycle[2] + currentCycle[3] + (7*3)
                    clearance = True


        elif allowedApproach == "B":

            match approaches[1][0]:
                case "green":
                    approaches[1][0] = "yellow"
                    approaches[1][1] = 4

                case "yellow":
                    approaches[1][0] = "red"
                    approaches[1][1] = adaptedCycle[0] + currentCycle[2] + currentCycle[3] + (7*3)
                    clearance = True

        elif allowedApproach == "C":

            match approaches[2][0]:
                case "green":
                    approaches[2][0] = "yellow"
                    approaches[2][1] = 4

                case "yellow":
                    approaches[2][0] = "red"
                    approaches[2][1] = adaptedCycle[0] + adaptedCycle[1] + currentCycle[3] + (7*3)
                    clearance = True

        elif allowedApproach == "D":

            match approaches[3][0]:
                case "green":
                    approaches[3][0] = "yellow"
                    approaches[3][1] = 4

                case "yellow":
                    approaches[3][0] = "red"
                    approaches[3][1] = currentCycle[1] + currentCycle[2] + currentCycle[0] + (7*3)
                    clearance = True

        return approaches, clearance

    def calculateNextCycle(self, cycle):
        self.currentCycle = self.adaptedCycle.copy()
        self.adaptedCycle = timerCompiler(1,400,1,1)
        cycle=True
        return cycle
    
    def timeStep(self, approaches, transition, allowedApproach, steps=None):

        if steps == None:
            steps = 1

        for _ in range(steps):        

            for index, approach in enumerate(approaches):

                approach[1] = max(0, approach[1] - 1) 

            if next((approach[1] for approach in approaches if approach[2] == allowedApproach)) == 0:
                transition = True

            self.trafficLightData = approaches
            time.sleep(1)
        return approaches, transition 

    def returnTrafficLightData(self):
        trafficLightData = self.trafficLightData
        allowedApproach = self.allowedApproach
        return{
            "message" : "success",
            "trafficLightData" : trafficLightData,
            "allowedApproach" : allowedApproach
        }

    def startTrafficLightControl(self):
        self.threadTrafficLightLoop = threading.Thread(
            target=self.trafficLightLoop,
            daemon=True
        )

        self.threadTrafficLightLoop.start()

    # def postGreenLightTimers(self):



TLC = trafficLightControls()

@intersectionTimers.route('/get_intersection_timers')
def get_intersection_timers():
    response = TLC.returnTrafficLightData()    
    return response

