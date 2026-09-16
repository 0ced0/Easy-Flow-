from database.databaseConnector import getForecastIntervals, dbPostTimerConfig, dbGetGreenLightTimers, dbPostDensityConfig, dbGetDensityConfig, dbPostFlowConfiguration, dbGetFlowConfiguration
from simulation.sumoController import SC
import time
from flask import Blueprint, request, jsonify
import threading
import os


CONTROLLER_TICK_SECONDS = 1.0
YELLOW_SECONDS = 3
ALL_RED_SECONDS = 3
CLEARANCE_SECONDS = YELLOW_SECONDS + ALL_RED_SECONDS
assert CLEARANCE_SECONDS == 6
TLC_TRACE = os.environ.get("EASYFLOW_TLC_TRACE", "").strip().lower() == "true"

# Database camera IDs remain stable. Controller phases use the physical
# intersection order rather than numeric camera-ID order.
CONTROLLER_CAMERA_IDS = (1, 2, 4, 3)

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
        self.stateLock = threading.RLock()
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
        self.controllerPhase = "green"
        self.phaseRemainingSeconds = 0
        # This changes only when the controller changes a signal phase.  Timer
        # ticks deliberately do not affect it, so clients can distinguish a
        # resync from a light transition.
        self.stateVersion = 0
        self.states

    def advanceStateVersion(self):
        with self.stateLock:
            self.stateVersion += 1

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

    def refreshAdaptedCycle(self):
        # Preserve the active cycle. Enforcer edits become the next cycle.
        self.adaptedCycle = self.timerCompiler()

    def timerCompiler(self):

        densityConfiguration = self.getDensityConfiguration()
        intersectionData = self.getIntersectionData()
        timers = {}
        approach = 0
        freeflowTimers = self.currentConfiguration["freeflow"]
        slowdownTimers = self.currentConfiguration["slowdown"]
        congestedTimers = self.currentConfiguration["congested"]

        if len(intersectionData) != len(CONTROLLER_CAMERA_IDS):
            with self.stateLock:
                self.states = ["Unavailable"] * len(CONTROLLER_CAMERA_IDS)
            return [freeflowTimers[cameraId - 1] for cameraId in CONTROLLER_CAMERA_IDS]

        for approach, row in enumerate(intersectionData):
            cameraId = CONTROLLER_CAMERA_IDS[approach]
            configurationIndex = cameraId - 1
            density = int(row["spatial_density"])
            timerAllocation = 0
            trafficState = None
            if  density <= densityConfiguration[configurationIndex]["freeflow_max"]:
                timerAllocation = freeflowTimers[configurationIndex]
                trafficState = "FREE FLOW"

            elif density >= densityConfiguration[configurationIndex]["freeflow_max"] + 1 and density <= densityConfiguration[configurationIndex]["slowdown_max"]:
                timerAllocation = slowdownTimers[configurationIndex]
                trafficState = "SLOWDOWN"

            elif density >= densityConfiguration[configurationIndex]["slowdown_max"] + 1:
                timerAllocation = congestedTimers[configurationIndex]
                trafficState = "CONGESTED"

            timers[approach] = {
                "timerAllocation" : timerAllocation,
                "trafficState" : trafficState 
                }
        cycle = [timers[0]["timerAllocation"], timers[1]["timerAllocation"], timers[2]["timerAllocation"], timers[3]["timerAllocation"]] 
        with self.stateLock:
            self.states = [timers[0]["trafficState"], timers[1]["trafficState"], timers[2]["trafficState"], timers[3]["trafficState"]]

        return cycle
        
    def getIntersectionData(self):
        self.intersectionData = getForecastIntervals(lag=1)
        dataByCameraId = {
            row["camera_id"]: row for row in self.intersectionData
        }
        if not all(cameraId in dataByCameraId for cameraId in CONTROLLER_CAMERA_IDS):
            return []
        return [dataByCameraId[cameraId] for cameraId in CONTROLLER_CAMERA_IDS]

    def initializeTimers(self):

        timerA, timerB, timerC, timerD = self.currentCycle

        approachA = ["green", (timerA), "A"]
        approachB = ["red" , (timerA + CLEARANCE_SECONDS), "B"]
        approachC = ["red", (timerA + timerB + (CLEARANCE_SECONDS * 2)), "C"]
        approachD = ["red", (timerA + timerB + timerC + (CLEARANCE_SECONDS * 3)), "D"]

        approaches = [approachA, approachB, approachC, approachD]
        return approaches

    def nextGreenTimer(self, approach, clearanceCount):
        """Return real schedule seconds to approach's next green.

        currentCycle is still being executed; adaptedCycle is the following
        A→B→C→D cycle.  There are exactly three six-second clearances between
        a just-cleared approach and its next green.
        """
        currentA, currentB, currentC, currentD = self.currentCycle
        adaptedA, adaptedB, adaptedC, _ = self.adaptedCycle
        clearanceTime = CLEARANCE_SECONDS * clearanceCount

        if approach == "A":
            return currentB + currentC + currentD + clearanceTime
        if approach == "B":
            return adaptedA + currentC + currentD + clearanceTime
        if approach == "C":
            return adaptedA + adaptedB + currentD + clearanceTime
        return adaptedA + adaptedB + adaptedC + clearanceTime

    def trafficLightLoop(self):

        SC.start()
        SC.setLight(self.allowedApproach, "green")
        SC.step()
        approaches = self.initializeTimers()
        with self.stateLock:
            self.trafficLightData = approaches
            self.controllerPhase = "green"
            self.phaseRemainingSeconds = approaches[0][1]
            self.advanceStateVersion()
        transition = False
        while True:
            if transition:
                approaches = self.clearance(self.allowedApproach, approaches, "yellow")
                approaches, transition = self.timeStep(
                    approaches, transition, self.allowedApproach,
                    steps=YELLOW_SECONDS, clearancePhase=True,
                )
                approaches = self.clearance(self.allowedApproach, approaches, "all-red")
                approaches, transition = self.timeStep(
                    approaches, transition, self.allowedApproach,
                    steps=ALL_RED_SECONDS, clearancePhase=True,
                )
                approaches, self.allowedApproach, transition = self.transition(
                    approaches, self.allowedApproach,
                )

            approaches, transition = self.timeStep(approaches, transition, self.allowedApproach)

    def transition(self, approaches, allowedApproach):
        if allowedApproach == "D":
            # Compiling the next adaptive cycle can read configuration and
            # forecast data. Keep snapshot reads available while it runs.
            self.calculateNextCycle()
        with self.stateLock:
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

                case "D":
                    # D is the final green in currentCycle. Promote only after D
                    # has physically cleared, before the next A starts green.
                    approaches[0][0] = "green"
                    allowedApproach = "A"
                    approaches[0][1] = self.currentCycle[0]


            SC.setLight(allowedApproach, "green")
            self.allowedApproach = allowedApproach
            self.controllerPhase = "green"
            self.phaseRemainingSeconds = next(
                approach[1] for approach in approaches if approach[2] == allowedApproach
            )
            self.advanceStateVersion()
        return approaches, allowedApproach, False

    def clearance(self, allowedApproach, approaches, phase):
        with self.stateLock:
            approach = approaches["ABCD".index(allowedApproach)]
            if phase == "yellow":
                # The just-expired green gets its own yellow countdown before its
                # next-green (red) timer is calculated.
                approach[1] = YELLOW_SECONDS
                approach[0] = "yellow"
                self.controllerPhase = "yellow"
                self.phaseRemainingSeconds = YELLOW_SECONDS
                SC.setLight(allowedApproach, "yellow")
            else:
                # At the beginning of all-red, include the remaining all-red
                # seconds plus the three complete downstream clearances.  The
                # normal per-second decrement keeps this timer continuous.
                approach[1] = (
                    self.nextGreenTimer(allowedApproach, clearanceCount=3)
                    + ALL_RED_SECONDS
                )
                approach[0] = "red"
                self.controllerPhase = "all-red"
                self.phaseRemainingSeconds = ALL_RED_SECONDS
                SC.setLight(allowedApproach, "red")
            self.advanceStateVersion()
        return approaches

    def calculateNextCycle(self):
        self.currentCycle = self.adaptedCycle.copy()
        self.adaptedCycle = self.timerCompiler()
    
    def timeStep(self, approaches, transition, allowedApproach, steps=None, clearancePhase=False):

        if steps == None:
            steps = 1

        for _ in range(steps):
            tickStarted = time.perf_counter()
            if clearancePhase:
                # Publish the physical phase duration before consuming its
                # wall-clock second. Approach schedule timers are decremented
                # together only after that second has elapsed.
                with self.stateLock:
                    self.trafficLightData = approaches
                if TLC_TRACE:
                    timers = " ".join(f"{approach[2]}={approach[1]}" for approach in approaches)
                    print(
                        f"[TLC TRACE] t={time.strftime('%H:%M:%S')} "
                        f"version={self.stateVersion} phase={self.controllerPhase} "
                        f"phase_remaining={self.phaseRemainingSeconds} "
                        f"allowed={allowedApproach} {timers} "
                        f"current={self.currentCycle} adapted={self.adaptedCycle}"
                    )
                remainingSleep = CONTROLLER_TICK_SECONDS - (time.perf_counter() - tickStarted)
                if remainingSleep > 0:
                    time.sleep(remainingSleep)
            with self.stateLock:
                for approach in approaches:
                    approach[1] = max(0, approach[1] - 1)

                if clearancePhase:
                    self.phaseRemainingSeconds = max(0, self.phaseRemainingSeconds - 1)
                    self.trafficLightData = approaches
                    continue
                elif next((approach[1] for approach in approaches if approach[2] == allowedApproach)) == 0:
                    transition = True

                self.trafficLightData = approaches
                self.phaseRemainingSeconds = next(
                    approach[1] for approach in approaches if approach[2] == allowedApproach
                )
            SC.step()
            if TLC_TRACE:
                timers = " ".join(
                    f"{approach[2]}={approach[1]}" for approach in approaches
                )
                print(
                    f"[TLC TRACE] t={time.strftime('%H:%M:%S')} "
                    f"version={self.stateVersion} "
                    f"phase={self.controllerPhase} phase_remaining={self.phaseRemainingSeconds} "
                    f"allowed={allowedApproach} {timers} "
                    f"current={self.currentCycle} adapted={self.adaptedCycle}"
                )

            remainingSleep = CONTROLLER_TICK_SECONDS - (time.perf_counter() - tickStarted)
            if remainingSleep > 0:
                time.sleep(remainingSleep)
        return approaches, transition 

    def returnTrafficLightData(self):
        # Keep the legacy rows while also publishing absolute timing anchors.
        # Every row's timer is the controller's own countdown-to-expiry value;
        # a red row is not assumed to mean the same event as green or yellow.
        trafficLightData = [list(approach) for approach in self.trafficLightData]
        allowedApproach = self.allowedApproach
        serverTimestamp = time.time()
        approaches = [
            {
                "approach": approach[2],
                "state": approach[0],
                "remaining_seconds": approach[1],
                "ends_at": serverTimestamp + approach[1],
                "countdown_event": "controller_timer_expiry",
            }
            for approach in trafficLightData
            if len(approach) >= 3
        ]
        return{
            "message" : "success",
            "trafficLightData" : trafficLightData,
            "allowedApproach" : allowedApproach,
            "currentConfiguration" : self.currentConfiguration,
            "state" : self.states,
            "server_timestamp": serverTimestamp,
            "state_version": self.stateVersion,
            "controller_phase": self.controllerPhase,
            "phase_remaining_seconds": self.phaseRemainingSeconds,
            "approaches": approaches,
        }

    def returnDashboardSnapshot(self):
        with self.stateLock:
            serverTimestamp = time.time()
            approaches = [
                {
                    "approach": approach[2],
                    "state": approach[0],
                    "remaining_seconds": approach[1],
                    "ends_at": serverTimestamp + approach[1],
                    "countdown_event": "controller_timer_expiry",
                }
                for approach in self.trafficLightData
                if len(approach) >= 3
            ]
            return {
                "server_timestamp": serverTimestamp,
                "state_version": self.stateVersion,
                "allowed_approach": self.allowedApproach,
                "controller_phase": self.controllerPhase,
                "phase_remaining_seconds": self.phaseRemainingSeconds,
                "approaches": approaches,
                "traffic_states": list(self.states),
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
        TLC.refreshAdaptedCycle()
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
        TLC.refreshAdaptedCycle()
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
