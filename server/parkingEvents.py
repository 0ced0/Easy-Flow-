"""Shared parking-event continuity logic for production and diagnostics."""
from collections import deque
import math


PARKING_LEVEL_1_SECONDS = 30.0
PARKING_LEVEL_2_SECONDS = 60.0
STATIONARY_DISTANCE_THRESHOLD = 12.0
STATIONARY_CONFIRM_CHECKS = 3
PARKING_REASSOCIATION_GRACE_SECONDS = 5.0
PARKING_REASSOCIATION_DISTANCE_THRESHOLD = 36.0


def _distance(a, b):
    return math.dist(a, b)


class ParkingEventManager:
    def __init__(self, cameraId, level1Seconds=PARKING_LEVEL_1_SECONDS,
                 level2Seconds=PARKING_LEVEL_2_SECONDS, logToTerminal=False):
        self.cameraId = cameraId
        self.level1Seconds = level1Seconds
        self.level2Seconds = level2Seconds
        self.trackStates = {}
        self.events = {}
        self.nextEventId = 1
        self.eventLog = deque(maxlen=10)
        self.logToTerminal = logToTerminal

    def _log(self, text):
        self.eventLog.append(text)
        if self.logToTerminal:
            print(text)

    def _level(self, seconds):
        return 2 if seconds >= self.level2Seconds else 1 if seconds >= self.level1Seconds else 0

    def _end(self, event, reason, now):
        if event["status"] == "ENDED":
            return
        event["status"] = "ENDED"
        event["endReason"] = reason
        event["lastSeenAt"] = now
        self._log(f"[PARK END] CAM={self.cameraId} EVENT=P{event['eventId']} reason={reason}")

    def _candidates(self, vehicleClass, roiIndex, roadPoint, now):
        candidates = [event for event in self.events.values()
                      if event["status"] == "OCCLUDED"
                      and event["vehicleClass"] == vehicleClass
                      and event["parkingROIIndex"] == roiIndex
                      and now - event["lastSeenAt"] <= PARKING_REASSOCIATION_GRACE_SECONDS
                      and _distance(roadPoint, event["lastRoadPoint"])
                      <= PARKING_REASSOCIATION_DISTANCE_THRESHOLD]
        return candidates

    def _start_or_reassociate(self, trackId, vehicleClass, roiIndex, roadPoint, bbox, now):
        candidates = self._candidates(vehicleClass, roiIndex, roadPoint, now)
        if len(candidates) == 1:
            event = candidates[0]
            oldTrackId = event["currentTrackId"]
            gap = now - event["lastSeenAt"]
            distance = _distance(roadPoint, event["lastRoadPoint"])
            event.update({"currentTrackId": trackId, "status": "ACTIVE",
                          "lastRoadPoint": roadPoint, "lastBBox": bbox,
                          "lastSeenAt": now, "lastCountedAt": now})
            event["previousTrackIds"].append(trackId)
            self._log(f"[PARK REASSOC] CAM={self.cameraId} EVENT=P{event['eventId']} "
                      f"OLD_TRACK={oldTrackId} NEW_TRACK={trackId} GAP={gap:.1f}s DISTANCE={distance:.1f}px")
            return event
        if len(candidates) > 1:
            self._log(f"[PARK END] CAM={self.cameraId} TRACK={trackId} reason=AMBIGUOUS REASSOCIATION")

        event = {"eventId": self.nextEventId, "currentTrackId": trackId,
                 "previousTrackIds": [trackId], "vehicleClass": vehicleClass,
                 "parkingROIIndex": roiIndex, "firstStationaryAt": now,
                 "parkedSeconds": 0.0, "lastCountedAt": now,
                 "lastRoadPoint": roadPoint, "lastBBox": bbox, "lastSeenAt": now,
                 "parkingLevel": 0, "parkingRecorded": False, "status": "ACTIVE",
                 "endReason": None, "reassociated": False}
        self.events[self.nextEventId] = event
        self.nextEventId += 1
        self._log(f"[PARK START] CAM={self.cameraId} EVENT=P{event['eventId']} TRACK={trackId}")
        return event

    def observe(self, trackId, vehicleClass, bbox, roadPoint, insideROI, roiIndex, now):
        state = self.trackStates.setdefault(trackId, {"lastRoadPoint": None,
            "lastSeenAt": now, "stationaryChecks": 0, "anchorPosition": None,
            "movement": None, "eventId": None, "insideROI": insideROI})
        previous = state["lastRoadPoint"]
        movement = _distance(roadPoint, previous) if previous is not None else None
        state.update({"lastRoadPoint": roadPoint, "lastSeenAt": now,
                      "movement": movement, "insideROI": insideROI})
        event = self.events.get(state["eventId"])

        if not insideROI:
            if event is not None:
                self._end(event, "LEFT ROI", now)
                state["eventId"] = None
            state.update({"stationaryChecks": 0, "anchorPosition": None})
            return

        if movement is None or movement > STATIONARY_DISTANCE_THRESHOLD:
            if event is not None:
                self._end(event, "MOVED AWAY", now)
                state["eventId"] = None
            state.update({"stationaryChecks": 0, "anchorPosition": roadPoint})
            return

        if state["anchorPosition"] is None:
            state["anchorPosition"] = roadPoint
        if _distance(roadPoint, state["anchorPosition"]) > STATIONARY_DISTANCE_THRESHOLD:
            if event is not None:
                self._end(event, "MOVED AWAY", now)
                state["eventId"] = None
            state.update({"stationaryChecks": 0, "anchorPosition": roadPoint})
            return

        state["stationaryChecks"] += 1
        if state["stationaryChecks"] < STATIONARY_CONFIRM_CHECKS:
            return
        if event is None:
            event = self._start_or_reassociate(trackId, vehicleClass, roiIndex, roadPoint, bbox, now)
            state["eventId"] = event["eventId"]
        elif event["status"] == "OCCLUDED":
            event["status"] = "ACTIVE"
            event["lastCountedAt"] = now
        delta = max(0.0, now - event["lastCountedAt"])
        event["parkedSeconds"] += delta
        event.update({"lastCountedAt": now, "lastSeenAt": now, "lastRoadPoint": roadPoint,
                      "lastBBox": bbox, "status": "ACTIVE", "currentTrackId": trackId})
        oldLevel = event["parkingLevel"]
        event["parkingLevel"] = self._level(event["parkedSeconds"])
        if oldLevel != event["parkingLevel"]:
            self._log(f"[PARK LEVEL] CAM={self.cameraId} EVENT=P{event['eventId']} "
                      f"L{oldLevel}->L{event['parkingLevel']} parked={event['parkedSeconds']:.1f}s")

    def advance(self, now):
        for event in self.events.values():
            if event["status"] == "ACTIVE" and now - event["lastSeenAt"] > 0.5:
                event["status"] = "OCCLUDED"
                self._log(f"[PARK OCCLUDED] CAM={self.cameraId} EVENT=P{event['eventId']} parked={event['parkedSeconds']:.1f}s")
            elif event["status"] == "OCCLUDED" and now - event["lastSeenAt"] > PARKING_REASSOCIATION_GRACE_SECONDS:
                self._end(event, "OCCLUSION TIMEOUT", now)

    def confirmationEvents(self):
        return [event for event in self.events.values()
                if event["status"] == "ACTIVE" and event["parkingLevel"] == 2
                and not event["parkingRecorded"]]

    def markRecorded(self, event):
        event["parkingRecorded"] = True
        self._log(f"[PARK RECORDED] CAM={self.cameraId} EVENT=P{event['eventId']}")

    def snapshot(self):
        tracks = {trackId: dict(state) for trackId, state in self.trackStates.items()}
        events = [dict(event) for event in self.events.values() if event["status"] != "ENDED"]
        return {"tracks": tracks, "events": events, "eventLog": list(self.eventLog)}
