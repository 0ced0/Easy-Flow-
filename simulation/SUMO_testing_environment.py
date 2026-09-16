"""Run an isolated SUMO GUI to inspect Easy-Flow signal timings.

This does not import the server controller or start Flask/CV/database work. It
opens its own SUMO process and applies the same A -> B -> C -> D green order,
with Easy-Flow's three-second yellow and all-red clearances.

Example (use the active green durations from the timer configuration):
    python simulation/SUMO_testing_environment.py --timers 42 36 48 30
"""

import argparse
import json
import os
from pathlib import Path
import time
from urllib.error import URLError
from urllib.request import urlopen

try:
    import traci
except ImportError as error:
    raise SystemExit(
        "SUMO Python tools are unavailable. Set SUMO_HOME and use the Python "
        "environment supplied with SUMO."
    ) from error


TLS_ID = "J0"
YELLOW_SECONDS = 3
ALL_RED_SECONDS = 3
STEP_LENGTH_SECONDS = 0.1

GREEN_STATES = {
    "A": "rrrGGGrrrrrr",
    "B": "rrrrrrGGGrrr",
    "C": "rrrrrrrrrGGG",
    "D": "GGGrrrrrrrrr",
}
YELLOW_STATES = {
    "A": "rrryyyrrrrrr",
    "B": "rrrrrryyyrrr",
    "C": "rrrrrrrrryyy",
    "D": "yyyrrrrrrrrr",
}
ALL_RED_STATE = "rrrrrrrrrrrr"


def parse_arguments():
    simulation_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(
        description="Visualize Easy-Flow timer behavior in an isolated SUMO GUI."
    )
    parser.add_argument(
        "--timers",
        nargs=4,
        type=int,
        metavar=("A", "B", "C", "D"),
        default=(42, 42, 42, 42),
        help="Green seconds for approaches A B C D (default: 42 each).",
    )
    parser.add_argument(
        "--cycles",
        type=int,
        default=0,
        help="Number of A-to-D cycles; 0 runs until the SUMO scenario ends.",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=simulation_dir / "sambat.sumocfg",
        help="SUMO configuration file (default: simulation/sambat.sumocfg).",
    )
    parser.add_argument(
        "--follow-url",
        help=(
            "Read-only Easy-Flow timer endpoint to mirror, for example "
            "http://127.0.0.1:5000/get_intersection_timers. "
            "When set, --timers and --cycles are ignored."
        ),
    )
    arguments = parser.parse_args()
    if any(timer <= 0 for timer in arguments.timers):
        parser.error("all green timers must be positive integers")
    if arguments.cycles < 0:
        parser.error("--cycles must be zero or a positive integer")
    if not arguments.config.is_file():
        parser.error(f"SUMO configuration was not found: {arguments.config}")
    return arguments


def sumo_gui_binary():
    sumo_home = os.environ.get("SUMO_HOME")
    if not sumo_home:
        raise SystemExit("Set SUMO_HOME before running this visualizer.")

    binary_name = "sumo-gui.exe" if os.name == "nt" else "sumo-gui"
    binary = Path(sumo_home) / "bin" / binary_name
    if not binary.is_file():
        raise SystemExit(f"SUMO GUI binary was not found: {binary}")
    return str(binary)


def step_for_one_second():
    for _ in range(int(1 / STEP_LENGTH_SECONDS)):
        traci.simulationStep()
        time.sleep(STEP_LENGTH_SECONDS)


def run_phase(approach, phase, seconds):
    signal_state = {
        "green": GREEN_STATES[approach],
        "yellow": YELLOW_STATES[approach],
        "all-red": ALL_RED_STATE,
    }[phase]
    traci.trafficlight.setRedYellowGreenState(TLS_ID, signal_state)

    for remaining in range(seconds, 0, -1):
        print(f"{approach} {phase}: {remaining}s remaining")
        step_for_one_second()


def read_controller_state(url):
    with urlopen(url, timeout=2) as response:
        if response.status != 200:
            raise URLError(f"HTTP {response.status}")
        payload = json.load(response)

    phase = payload.get("controller_phase")
    approach = payload.get("allowedApproach")
    if phase not in ("green", "yellow", "all-red") or approach not in GREEN_STATES:
        raise ValueError("endpoint did not return a complete traffic-light state")
    return payload


def follow_controller(url):
    """Mirror website state using GET requests only; never changes Easy-Flow."""
    last_version = None
    connection_error_reported = False
    while True:
        try:
            payload = read_controller_state(url)
            connection_error_reported = False
            approach = payload["allowedApproach"]
            phase = payload["controller_phase"]
            signal_state = {
                "green": GREEN_STATES[approach],
                "yellow": YELLOW_STATES[approach],
                "all-red": ALL_RED_STATE,
            }[phase]
            traci.trafficlight.setRedYellowGreenState(TLS_ID, signal_state)

            version = payload.get("state_version")
            if version != last_version:
                timers = payload.get("trafficLightData", [])
                timer_text = " ".join(
                    f"{row[2]}={row[1]}s" for row in timers if len(row) >= 3
                )
                print(
                    f"Website: {approach} {phase} | "
                    f"phase remaining={payload.get('phase_remaining_seconds')}s | "
                    f"{timer_text}"
                )
                last_version = version
        except (URLError, ValueError, json.JSONDecodeError) as error:
            if not connection_error_reported:
                print(f"Waiting for Easy-Flow timer endpoint: {error}")
                connection_error_reported = True

        step_for_one_second()


def main():
    arguments = parse_arguments()
    durations = dict(zip("ABCD", arguments.timers))
    command = [
        sumo_gui_binary(),
        "-c", str(arguments.config.resolve()),
        "--start",
        "--step-length", str(STEP_LENGTH_SECONDS),
        "--quit-on-end",
    ]

    print("Starting isolated SUMO timer visualizer.")
    traci.start(command, label="easyflow-timer-visualizer")

    try:
        if arguments.follow_url:
            print(f"Following website timers read-only: {arguments.follow_url}")
            traci.trafficlight.setRedYellowGreenState(TLS_ID, ALL_RED_STATE)
            follow_controller(arguments.follow_url)
        else:
            print(f"Green timers: {durations}; yellow/all-red: {YELLOW_SECONDS}s each.")
            completed_cycles = 0
            while arguments.cycles == 0 or completed_cycles < arguments.cycles:
                for approach in "ABCD":
                    run_phase(approach, "green", durations[approach])
                    run_phase(approach, "yellow", YELLOW_SECONDS)
                    run_phase(approach, "all-red", ALL_RED_SECONDS)
                completed_cycles += 1
    except traci.exceptions.FatalTraCIError:
        print("SUMO scenario ended.")
    except KeyboardInterrupt:
        print("\nVisualizer stopped.")
    finally:
        try:
            traci.close()
        except traci.exceptions.FatalTraCIError:
            pass


if __name__ == "__main__":
    main()
