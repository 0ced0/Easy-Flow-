from database.databaseConnector import getForecastIntervals, dbPostTimerConfig, dbGetGreenLightTimers, dbPostDensityConfig, dbGetDensityConfig, dbPostFlowConfiguration, dbGetFlowConfiguration
from simulation.sumoController import SC
import time
from flask import Blueprint, request, jsonify
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

trafficLightStates = {
    "D" : "GGGrrrrrrrrr",
    "A" : "rrrGGGrrrrrr", 
    "B" : "rrrrrrGGGrrr", 
    "C" : "rrrrrrrrrGGG"
}


# DIn = E2
# DOut = -E2

# AIn = E1
# AOut = -E1

# BIn = -E0
# BOut =  E0

# CIn = E3
# Cout = -E3

class trafficLightControls:

    def __init__(self):
        self.lspuTrafficData = None
        self.patimbaoTrafficData = None
        self.sunstarTrafficData = None
        self.complexTrafficData = None
        self.intersectionData = {}
        self.currentConfiguration = {}
        self.updateConfiguration()
        self.trafficLightData = []
        self.currentCycle = self.timerCompiler()
        self.adaptedCycle = self.timerCompiler()
        self.threadTrafficLightLoop = None
        self.allowedApproach = "A"
        self.states

    def updateConfiguration(self):
        response = self.getTimerConfiguration()
        freeflowTimers = []
        slowdownTimers = []
        congestedTimers = []

        for row in response:
            freeflowTimers.append(row["freeflow"])
            slowdownTimers.append(row["slowdown"])
            congestedTimers.append(row["congested"])

        self.currentConfiguration ={
            "freeflow" : freeflowTimers,
            "slowdown" : slowdownTimers,
            "congested" : congestedTimers,
        }

    def timerCompiler(self):

        densityConfiguration = self.getDensityConfiguration()
        intersectionData = self.getIntersectionData()
        timers = {}
        approach = 0
        freeflowTimers = self.currentConfiguration["freeflow"]
        slowdownTimers = self.currentConfiguration["slowdown"]
        congestedTimers = self.currentConfiguration["congested"]

        for row in intersectionData:
            density = int(row["spatial_density"])
            timerAllocation = 0
            trafficState = None
            if  density <= densityConfiguration[approach]["freeflow_max"]:
                timerAllocation = freeflowTimers[approach]
                trafficState = "freeflow"

            elif density >= densityConfiguration[approach]["freeflow_max"] + 1 and density <= densityConfiguration[approach]["slowdown_max"]:
                timerAllocation = slowdownTimers[approach]
                trafficState = "slowdown"

            elif density >= densityConfiguration[approach]["slowdown_max"] + 1:
                timerAllocation = congestedTimers[approach]
                trafficState = "congested"

            timers[approach] = {
                "timerAllocation" : timerAllocation,
                "trafficState" : trafficState 
                }
            approach += 1

        cycle = [timers[0]["timerAllocation"], timers[1]["timerAllocation"], timers[2]["timerAllocation"], timers[3]["timerAllocation"]] 
        self.states = [timers[0]["trafficState"], timers[1]["trafficState"], timers[2]["trafficState"], timers[3]["trafficState"]]

        return cycle
        
    def getIntersectionData(self):
        self.intersectionData = getForecastIntervals(lag=1)
        stolApproach = self.intersectionData[0]
        stopApproach = self.intersectionData[1]
        stosApproach = self.intersectionData[2]
        stocApproach = self.intersectionData[3]

        compiledDensity = [stolApproach, stopApproach, stosApproach, stocApproach] 
        return compiledDensity

    def initializeTimers(self):

        timerA, timerB, timerC, timerD = self.currentCycle

        approachA = ["green", (timerA), "A"]
        approachB = ["red" , (timerA + 6), "B"]
        approachC = ["red", (timerA + timerB + (6*2)), "C"]
        approachD = ["red", (timerA + timerB + timerC + (6*3)), "D"]

        approaches = [approachA, approachB, approachC, approachD]
        return approaches

    def trafficLightLoop(self):

        SC.start()
        SC.setLight(self.allowedApproach, "green")
        SC.step()
        approaches = self.initializeTimers()
        clearance = False
        transition = False
        cycle = True
        while True:
            while cycle:
                if transition:
                    while not clearance:
                        approaches, clearance = self.clearance(self.allowedApproach, approaches, clearance)
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


        SC.setLight(allowedApproach, "green")
        transition = False
        clearance = False
        return approaches, allowedApproach, transition, clearance, cycle

    def clearance(self, allowedApproach, approaches, clearance):

        currentCycle = self.currentCycle.copy()
        adaptedCycle = self.adaptedCycle.copy()
        state = None
        approach = None
        if allowedApproach == "A":
            approach = "A"
            match approaches[0][0]:
                case "green":
                    approaches[0][0] = "yellow"
                    approaches[0][1] = 4
                    state = "yellow"

                case "yellow":
                    approaches[0][0] = "red"
                    approaches[0][1] = currentCycle[1] + currentCycle[2] + currentCycle[3] + (7*3)
                    clearance = True
                    state = "red"

        elif allowedApproach == "B":
            approach = "B"
            match approaches[1][0]:
                case "green":
                    approaches[1][0] = "yellow"
                    approaches[1][1] = 4
                    state = "yellow"

                case "yellow":
                    approaches[1][0] = "red"
                    approaches[1][1] = adaptedCycle[0] + currentCycle[2] + currentCycle[3] + (7*3)
                    clearance = True
                    state = "red"

        elif allowedApproach == "C":
            approach = "C"
            match approaches[2][0]:
                case "green":
                    approaches[2][0] = "yellow"
                    approaches[2][1] = 4
                    state = "yellow"

                case "yellow":
                    approaches[2][0] = "red"
                    approaches[2][1] = adaptedCycle[0] + adaptedCycle[1] + currentCycle[3] + (7*3)
                    clearance = True
                    state = "red"

        elif allowedApproach == "D":
            approach = "D"
            match approaches[3][0]:
                case "green":
                    approaches[3][0] = "yellow"
                    approaches[3][1] = 4
                    state = "yellow"

                case "yellow":
                    approaches[3][0] = "red"
                    approaches[3][1] = currentCycle[1] + currentCycle[2] + currentCycle[0] + (7*3)
                    clearance = True
                    state = "red"

        SC.setLight(approach, state)
        return approaches, clearance

    def calculateNextCycle(self, cycle):
        self.currentCycle = self.adaptedCycle.copy()
        self.adaptedCycle = self.timerCompiler()
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
            SC.step()
        return approaches, transition 

    def returnTrafficLightData(self):
        trafficLightData = self.trafficLightData
        allowedApproach = self.allowedApproach
        return{
            "message" : "success",
            "trafficLightData" : trafficLightData,
            "allowedApproach" : allowedApproach,
            "currentConfiguration" : self.currentConfiguration,
            "state" : self.states
        }

    def startTrafficLightControl(self):
        self.threadTrafficLightLoop = threading.Thread(
            target=self.trafficLightLoop,
            daemon=True
        )

        self.threadTrafficLightLoop.start()

    def getTimerConfiguration(self):
        response = dbGetGreenLightTimers()
        return response

    def getDensityConfiguration(self):
        response = dbGetDensityConfig()
        return response

    def getFlowConfiguration(self):
        response = dbGetFlowConfiguration()
        return response


TLC = trafficLightControls()

@intersectionTimers.route('/get_intersection_timers')
def get_intersection_timers():
    response = TLC.returnTrafficLightData()    
    return response

@intersectionTimers.route('/get_density_configuration')
def get_density_configuration():
    response = TLC.getDensityConfiguration()
    return response

@intersectionTimers.route('/get_flow_configuration')
def get_flow_configuration():
    response = TLC.getFlowConfiguration()
    return response

@intersectionTimers.route("/update_traffic_light_config", methods=["POST"])
def updateTrafficLightConfig():

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "No configuration received"
        }), 400

    configs = data.get("configs")

    if not configs:
        return jsonify({
            "success": False,
            "message": "No traffic light configurations received"
        }), 400

    for config in configs:

        requiredFields = [
            "approach_id",
            "approach_name",
            "freeflow",
            "slowdown",
            "congested"
        ]

        for field in requiredFields:
            if field not in config:
                return jsonify({
                    "success": False,
                    "message": f"Missing field: {field}"
                }), 400

        try:
            freeflow = int(config["freeflow"])
            slowdown = int(config["slowdown"])
            congested = int(config["congested"])

        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "message": "Timers must be integers"
            }), 400

        if freeflow <= 0 or slowdown <= 0 or congested <= 0:
            return jsonify({
                "success": False,
                "message": "Timers must be greater than 0"
            }), 400

        config["freeflow"] = freeflow
        config["slowdown"] = slowdown
        config["congested"] = congested

    success = dbPostTimerConfig(configs)

    if success:
        TLC.updateConfiguration()
        return jsonify({
            "success": True,
            "message": "Traffic light configuration updated"
        }), 200

    return jsonify({
        "success": False,
        "message": "Failed to update traffic light configuration"
    }), 500


@intersectionTimers.route('/update_density_config', methods=["POST"])
def updateDensityConfig():

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "No configuration received"
        }), 400

    configs = data.get("configs")

    if not configs:
        return jsonify({
            "success": False,
            "message" : "no density configuration",
        }), 400

    for config in configs:

        requiredFields = [
            "approach_id",
            "approach_name",
            "freeflow_max",
            "slowdown_max"
        ]

        for field in requiredFields:
            if field not in config:
                return jsonify({
                    "success" : False,
                    "message" : f"missing field: {field}"
                }), 400

        try:
            freeflow_max = int(config["freeflow_max"])
            slowdown_max = int(config["slowdown_max"])

        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "message": "Timers must be integers"
            }), 400

        if freeflow_max <= 0 or slowdown_max <= 0:
            return jsonify({
                "success": False,
                "message": "thresholds must be greater than 0"
            }), 400

        config["freeflow_max"] = freeflow_max
        config["slowdown_max"] = slowdown_max

    success = dbPostDensityConfig(configs)

    if success:
        return jsonify({
            "success": True,
            "message": "Traffic light configuration updated"
        }), 200

    return jsonify({
        "success": False,
        "message": "Failed to update traffic light configuration"
    }), 500


@intersectionTimers.route('/update_flow_config', methods=["POST"])
def update_flow_config():
    data = request.get_json()

    if not data:
        return jsonify({
            "success" : False,
            "message" : "No configuration recieved"
        }), 400

    configs = data.get("configs")

    if not configs:
        return jsonify({
            "success" : False,
            "message" : "No density COnfiguration recieved"
        }), 400

    for config in configs:
        requiredFields=[
            "approach_id",
            "approach_name",
            "freeflow_max",
            "slowdown_max"
        ]
        for field in requiredFields:
            if field not in config:
                return jsonify({
                    "success" : False,
                    "message" : f"missing required field {field}"
                }), 400

        try:
            freeflow_max = int(config["freeflow_max"])
            slowdown_max = int(config["slowdown_max"])

        except(ValueError, TypeError):
            return jsonify({
                "success" : False,
                "message" : "values must be integer"
            }), 400

        if freeflow_max <= 0 or slowdown_max <= 0:
            return jsonify({
                "success" : False,
                "message" : "values must be greater than zero"
            }), 400

        config["freeflow_max"] = freeflow_max
        config["slowdown_max"] = slowdown_max

    success = dbPostFlowConfiguration(configs)

    if success:
        return({
            "success" : True,
            "message" : "flow configuration updated"
        })

    return jsonify({
        "success" : False,
        "message" : "failed to update flow configuration"
    })

TLC.timerCompiler()