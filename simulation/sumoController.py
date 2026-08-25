import traci
import os
import sys
import time

class SumoController:

    def __init__(self):
        self.tlsId = "J0"
        self.started = False

        self.greenStates = {
            "D": "GGGrrrrrrrrr",
            "A": "rrrGGGrrrrrr",
            "B": "rrrrrrGGGrrr",
            "C": "rrrrrrrrrGGG"
        }

        self.yellowStates = {
            "D": "yyyrrrrrrrrr",
            "A": "rrryyyrrrrrr",
            "B": "rrrrrryyyrrr",
            "C": "rrrrrrrrryyy"
        }

        self.allRed = "rrrrrrrrrrrr"

    def start(self):
        sumoBinary = os.path.join(
            os.environ["SUMO_HOME"],
            "bin",
            "sumo-gui.exe"
        )

        configFile = os.path.abspath(
            os.path.join(
                os.path.dirname(__file__),
                "sambat.sumocfg"
            )
        )

        traci.start([
            sumoBinary,
            "-c",
            configFile,
            "--start",
            "--step-length",
            "0.1",
            "--quit-on-end"
        ])

        self.started = True

    def setLight(self, approach, state):

        if state == "green":
            signal = self.greenStates[approach]

        elif state == "yellow":
            signal = self.yellowStates[approach]

        elif state == "red":
            signal = self.allRed

        else:
            raise ValueError(f"Unknown signal state: {state}")

        traci.trafficlight.setRedYellowGreenState(
            self.tlsId,
            signal
        )

    def step(self):
        for _ in range(10):
            traci.simulationStep()
            time.sleep(0.1)

    def close(self):
        if self.started:
            traci.close()
            self.started = False
SC = SumoController()