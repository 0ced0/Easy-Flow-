
from dataclasses import dataclass, field
from collections import deque
from pathlib import Path
import math
import time

import cv2
import numpy as np
from ultralytics import YOLO
from parkingRois import (
    PARKING_ROIS,
    isInsideParkingROI,
    parkingROIsForCamera,
    saveParkingROIs,
)
from parkingEvents import ParkingEventManager, PARKING_LEVEL_1_SECONDS, PARKING_LEVEL_2_SECONDS


# ============================================================
# EASY-FLOW COMPUTER VISION TESTING ENVIRONMENT V2
# ============================================================
#
# Purpose:
#   - Test all four approaches without opening the full dashboard.
#   - Mirror production more closely: one tracker/model per camera.
#   - Visualize counting line, speed lines, parking ROIs, track IDs, road points.
#   - Exercise a defense-ready stop-event violation state machine.
#
# IMPORTANT:
#   The line geometry below is normalized (0.0 - 1.0), so it scales with
#   the resized frame. Parking ROIs are loaded from parkingRois.py, the
#   shared production configuration.
#
# Keyboard:
#   G       -> toggle 2x2 grid / single-camera focus
#   1..4    -> focus LSPU / Patimbao / Sunstar / Complex
#   P/SPACE -> pause/resume
#   R       -> reset trackers/state for all cameras
#   Q/ESC   -> quit
#
# ============================================================


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "../models/training/yoloModels/sModels/trainingBatch2/best.pt"
TRACKER_PATH = BASE_DIR / "../models/training/bytetrack.yaml"
VIDEO_DIR = BASE_DIR / "videoData"

# ----------------------------
# Inference / display tuning
# ----------------------------
CONFIDENCE = 0.40
IMGSZ = 640
DEVICE = 0
DISPLAY_SCALE = 0.50

# ----------------------------
# Violation test tuning
# ----------------------------
# These are intentionally centralized so you can temporarily shorten them
# for defense/demo testing.
STATIONARY_DISTANCE_THRESHOLD = 12.0   # pixels in the resized frame
LOADING_UNLOADING_MIN_SECONDS = 10.0
ILLEGAL_PARKING_MIN_SECONDS = 120.0
PARKING_TEST_MODE = False
PARKING_TEST_LEVEL_1_SECONDS = 5.0
PARKING_TEST_LEVEL_2_SECONDS = 10.0
STALE_TRACK_TIMEOUT_SECONDS = 3.0

# Known physical distance between speed-estimation lines in Easy-Flow.
SPEED_GATE_DISTANCE_METERS = 17.0

# How long a just-confirmed loading/unloading event remains highlighted.
EVENT_MESSAGE_SECONDS = 4.0


# ============================================================
# NORMALIZED CAMERA GEOMETRY
# ============================================================

@dataclass(frozen=True)
class CameraGeometry:
    counting_line: tuple
    speed_start_line: tuple
    speed_end_line: tuple


@dataclass(frozen=True)
class ApproachConfig:
    camera_id: int
    name: str
    video_filename: str
    geometry: CameraGeometry


# Production line geometry copied from streamControl.py.
# These values are kept normalized because the production functions derive
# every coordinate from newWidth/newHeight after resizing each frame to 50%.

LSPU_GEOMETRY = CameraGeometry(
    counting_line=((0.20, 0.55), (0.70, 0.85)),
    speed_start_line=((0.56, 0.32), (0.62, 0.33)),
    speed_end_line=((0.05, 0.65), (0.30, 0.85)),
)

PATIMBAO_GEOMETRY = CameraGeometry(
    counting_line=((0.10, 0.97), (0.68, 0.40)),
    speed_start_line=((0.04, 0.42), (0.14, 0.36)),
    speed_end_line=((0.10, 0.98), (0.70, 0.40)),
)

SUNSTAR_GEOMETRY = CameraGeometry(
    counting_line=((0.10, 0.50), (0.38, 0.50)),
    speed_start_line=((0.33, 0.20), (0.40, 0.20)),
    speed_end_line=((0.03, 0.51), (0.40, 0.51)),
)

COMPLEX_GEOMETRY = CameraGeometry(
    counting_line=((0.07, 0.47), (0.40, 0.65)),
    speed_start_line=((0.48, 0.18), (0.61, 0.21)),
    speed_end_line=((0.03, 0.51), (0.40, 0.70)),
)


APPROACHES = [
    ApproachConfig(
        camera_id=1,
        name="LSPU",
        video_filename="sambat_to_lspu.mp4",
        geometry=LSPU_GEOMETRY,
    ),
    ApproachConfig(
        camera_id=2,
        name="Patimbao",
        video_filename="sambat_to_patimbao.mp4",
        geometry=PATIMBAO_GEOMETRY,
    ),
    ApproachConfig(
        camera_id=3,
        name="Sunstar",
        video_filename="sambat_to_sunstar.mp4",
        geometry=SUNSTAR_GEOMETRY,
    ),
    ApproachConfig(
        camera_id=4,
        name="Complex",
        video_filename="sambat_to_complex.mp4",
        geometry=COMPLEX_GEOMETRY,
    ),
]


# ============================================================
# TRACK STATE
# ============================================================

@dataclass
class TrackState:
    track_id: int
    vehicle_name: str

    bbox: tuple = (0, 0, 0, 0)
    center: tuple = (0, 0)
    road_point: tuple = (0, 0)

    last_seen: float = 0.0
    inside_roi: bool = False

    # Counting
    previous_count_cross: float | None = None
    counted: bool = False

    # Speed
    previous_start_cross: float | None = None
    previous_end_cross: float | None = None
    speed_start_time: float | None = None
    speed_kph: float | None = None

    # Stop-event violation state
    anchor_position: tuple | None = None
    stationary_since: float | None = None
    loading_candidate: bool = False
    parking_recorded: bool = False

    # Diagnostic-only event display
    last_event: str = ""
    last_event_time: float = -1e9

    trail: deque = field(default_factory=lambda: deque(maxlen=20))


@dataclass
class ROIEditState:
    enabled: bool = False
    selected_camera_id: int = 1
    active_points: list = field(default_factory=list)
    message: str = ""


# ============================================================
# GEOMETRY HELPERS
# ============================================================

def normalized_point(point, width, height):
    return (
        int(point[0] * width),
        int(point[1] * height),
    )


def normalized_line(line, width, height):
    return (
        normalized_point(line[0], width, height),
        normalized_point(line[1], width, height),
    )


def cross_product(point, line):
    (xa, ya), (xb, yb) = line
    xp, yp = point

    xab = xb - xa
    yab = yb - ya
    xap = xp - xa
    yap = yp - ya

    return (xab * yap) - (yab * xap)


def crossed_negative_to_positive(previous_value, current_value):
    return (
        previous_value is not None
        and previous_value < 0
        and current_value >= 0
    )


def euclidean(point_a, point_b):
    return math.hypot(
        point_a[0] - point_b[0],
        point_a[1] - point_b[1],
    )


# ============================================================
# CAMERA TESTER
# ============================================================

class ApproachTester:
    def __init__(self, config: ApproachConfig):
        self.config = config
        self.video_path = VIDEO_DIR / config.video_filename

        self.cap = None
        self.model = None
        self.source_fps = 25.0

        self.tracks: dict[int, TrackState] = {}
        self.vehicle_count = 0
        self.detailedParkingDiagnostics = False
        self.parkingEvents = ParkingEventManager(
            config.camera_id,
            PARKING_TEST_LEVEL_1_SECONDS if PARKING_TEST_MODE else PARKING_LEVEL_1_SECONDS,
            PARKING_TEST_LEVEL_2_SECONDS if PARKING_TEST_MODE else PARKING_LEVEL_2_SECONDS,
            logToTerminal=True,
        )

        self.last_frame = None
        self.ended = False
        self.error_message = ""

        self.frame_index = 0

        self.open()

    def open(self):
        if not self.video_path.exists():
            self.error_message = f"Missing: {self.video_path.name}"
            self.ended = True
            return

        self.cap = cv2.VideoCapture(str(self.video_path))

        if not self.cap.isOpened():
            self.error_message = f"Could not open: {self.video_path.name}"
            self.ended = True
            return

        fps = self.cap.get(cv2.CAP_PROP_FPS)
        if fps and fps > 0:
            self.source_fps = fps

        # IMPORTANT:
        # Each approach gets its own YOLO object so persist=True maintains
        # independent tracker state per camera.
        self.model = YOLO(str(MODEL_PATH))

        self.ended = False
        self.error_message = ""

    def reset(self):
        if self.cap is not None:
            self.cap.release()

        self.tracks.clear()
        self.parkingEvents = ParkingEventManager(
            self.config.camera_id,
            PARKING_TEST_LEVEL_1_SECONDS if PARKING_TEST_MODE else PARKING_LEVEL_1_SECONDS,
            PARKING_TEST_LEVEL_2_SECONDS if PARKING_TEST_MODE else PARKING_LEVEL_2_SECONDS,
            logToTerminal=True,
        )
        self.vehicle_count = 0
        self.last_frame = None
        self.frame_index = 0

        # Recreate the YOLO instance too, so ByteTrack state is reset.
        self.model = None
        self.ended = False
        self.error_message = ""

        self.open()

    def close(self):
        if self.cap is not None:
            self.cap.release()

    def media_time(self):
        """
        Use recorded-video time instead of wall-clock time.

        This is important for testing:
        a 10-second stop in the recording remains 10 seconds even if
        inference is running slower/faster than real time.
        """
        if self.cap is None:
            return 0.0

        pos_ms = self.cap.get(cv2.CAP_PROP_POS_MSEC)
        if pos_ms and pos_ms >= 0:
            return pos_ms / 1000.0

        return self.frame_index / max(self.source_fps, 1.0)

    def _cleanup_stale_tracks(self, now: float):
        stale_ids = [
            track_id
            for track_id, track in self.tracks.items()
            if now - track.last_seen > STALE_TRACK_TIMEOUT_SECONDS
        ]

        # Important: timeout does NOT create loading/unloading.
        # Track disappearance can be occlusion / ID switch.
        for track_id in stale_ids:
            del self.tracks[track_id]

    def process_next_frame(self):
        if self.ended:
            return self.last_frame

        ret, frame = self.cap.read()

        if not ret:
            self.ended = True
            self.error_message = "VIDEO ENDED"
            return self.last_frame

        self.frame_index += 1

        new_width = int(frame.shape[1] * DISPLAY_SCALE)
        new_height = int(frame.shape[0] * DISPLAY_SCALE)

        frame = cv2.resize(frame, (new_width, new_height))

        counting_line = normalized_line(
            self.config.geometry.counting_line,
            new_width,
            new_height,
        )

        speed_start_line = normalized_line(
            self.config.geometry.speed_start_line,
            new_width,
            new_height,
        )

        speed_end_line = normalized_line(
            self.config.geometry.speed_end_line,
            new_width,
            new_height,
        )

        parkingViolationAreas = parkingROIsForCamera(
            self.config.camera_id,
            new_width,
            new_height,
        )

        results = self.model.track(
            frame,
            conf=CONFIDENCE,
            persist=True,
            tracker=str(TRACKER_PATH),
            imgsz=IMGSZ,
            device=DEVICE,
            verbose=False,
        )

        boxes = results[0].boxes
        now = self.media_time()

        seen_this_frame = set()

        for box in boxes:
            if box.id is None:
                continue

            track_id = int(box.id.item())
            seen_this_frame.add(track_id)

            vehicle_class = int(box.cls.item())
            vehicle_name = self.model.names[vehicle_class]

            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

            center = (
                (x1 + x2) // 2,
                (y1 + y2) // 2,
            )

            # Bottom-center is a better approximation of where the vehicle
            # touches the road than the center of the box.
            road_point = (
                (x1 + x2) // 2,
                y2,
            )

            if track_id not in self.tracks:
                self.tracks[track_id] = TrackState(
                    track_id=track_id,
                    vehicle_name=vehicle_name,
                )

            track = self.tracks[track_id]
            track.vehicle_name = vehicle_name
            track.bbox = (x1, y1, x2, y2)
            track.center = center
            track.road_point = road_point
            track.last_seen = now
            track.inside_roi = isInsideParkingROI(
                road_point, parkingViolationAreas
            )
            track.trail.append(road_point)
            self.parkingEvents.observe(
                track_id, vehicle_name, (x1, y1, x2, y2), road_point,
                track.inside_roi,
                next((index for index, area in enumerate(parkingViolationAreas)
                      if isInsideParkingROI(road_point, [area])), None),
                now,
            )

            # ----------------------------
            # Vehicle counting
            # ----------------------------
            count_cross = cross_product(center, counting_line)

            if (
                crossed_negative_to_positive(
                    track.previous_count_cross,
                    count_cross,
                )
                and not track.counted
            ):
                self.vehicle_count += 1
                track.counted = True

            track.previous_count_cross = count_cross

            # ----------------------------
            # Speed-estimation lines
            # ----------------------------
            start_cross = cross_product(center, speed_start_line)
            end_cross = cross_product(center, speed_end_line)

            if crossed_negative_to_positive(
                track.previous_start_cross,
                start_cross,
            ):
                track.speed_start_time = now

            if crossed_negative_to_positive(
                track.previous_end_cross,
                end_cross,
            ):
                if track.speed_start_time is not None:
                    elapsed = now - track.speed_start_time
                    if elapsed > 0:
                        # 17 m / seconds = m/s; multiply 3.6 => km/h
                        track.speed_kph = (
                            SPEED_GATE_DISTANCE_METERS / elapsed
                        ) * 3.6

            track.previous_start_cross = start_cross
            track.previous_end_cross = end_cross

            # ----------------------------
            # Violation state diagnostics
            # ----------------------------
        self.parkingEvents.advance(now)

        self._cleanup_stale_tracks(now)

        annotated = self._draw_diagnostics(
            frame,
            counting_line,
            speed_start_line,
            speed_end_line,
            parkingViolationAreas,
            self.parkingEvents.snapshot(),
            now,
            seen_this_frame,
        )

        self.last_frame = annotated
        return annotated

    def _draw_diagnostics(
        self,
        frame,
        counting_line,
        speed_start_line,
        speed_end_line,
        parkingViolationAreas,
        parkingSnapshot,
        now,
        seen_this_frame,
    ):
        # Draw the same parking zones used by production before this frame is
        # reduced to a diagnostic GUI panel.
        overlay = frame.copy()
        for parkingArea in parkingViolationAreas:
            contour = np.asarray(parkingArea, dtype=np.int32).reshape((-1, 1, 2))
            cv2.fillPoly(overlay, [contour], (255, 0, 255))
        frame = cv2.addWeighted(overlay, 0.10, frame, 0.90, 0)

        for index, parkingArea in enumerate(parkingViolationAreas, start=1):
            contour = np.asarray(parkingArea, dtype=np.int32).reshape((-1, 1, 2))
            cv2.polylines(frame, [contour], True, (255, 0, 255), 2)
            self._draw_text(
                frame,
                f"PARKING ZONE {index}",
                tuple(contour[0, 0]),
                (255, 0, 255),
            )

        # Lines.
        cv2.line(
            frame,
            counting_line[0],
            counting_line[1],
            (255, 0, 0),
            2,
        )
        cv2.line(
            frame,
            speed_start_line[0],
            speed_start_line[1],
            (0, 255, 0),
            2,
        )
        cv2.line(
            frame,
            speed_end_line[0],
            speed_end_line[1],
            (0, 0, 255),
            2,
        )

        # Line labels.
        self._draw_text(frame, "COUNT", counting_line[0], (255, 0, 0))
        self._draw_text(frame, "SPEED START", speed_start_line[0], (0, 255, 0))
        self._draw_text(frame, "SPEED END", speed_end_line[0], (0, 0, 255))

        visible_tracks = 0
        inside_count = 0
        events_by_track = {event["currentTrackId"]: event
                           for event in parkingSnapshot["events"]
                           if event["status"] == "ACTIVE"}
        parking_events = parkingSnapshot["events"]
        levels = [sum(1 for event in parking_events if event["status"] == "ACTIVE"
                      and event["parkingLevel"] == level) for level in range(3)]
        occluded_count = sum(1 for event in parking_events if event["status"] == "OCCLUDED")
        manager_tracks = parkingSnapshot["tracks"]

        for track_id, track in self.tracks.items():
            if track_id not in seen_this_frame:
                continue

            visible_tracks += 1

            if track.inside_roi:
                inside_count += 1

            event = events_by_track.get(track_id)
            movement = manager_tracks.get(track_id, {}).get("movement")
            manager_track = manager_tracks.get(track_id, {})

            x1, y1, x2, y2 = track.bbox

            if event is not None and event["parkingLevel"] == 2:
                box_color = (0, 0, 255)
            elif event is not None and event["parkingLevel"] == 1:
                box_color = (0, 165, 255)
            elif event is not None:
                box_color = (0, 255, 0)
            elif track.inside_roi:
                box_color = (255, 255, 0)
            else:
                box_color = (0, 255, 255)

            cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
            cv2.circle(frame, track.road_point, 4, box_color, -1)
            if self.detailedParkingDiagnostics and manager_track.get("anchorPosition"):
                anchor = manager_track["anchorPosition"]
                cv2.circle(frame, anchor, 4, (255, 255, 255), 1)
                cv2.line(frame, anchor, track.road_point, (255, 255, 255), 1)

            # Trail shows whether jitter/movement is reasonable.
            trail_points = list(track.trail)
            for index in range(1, len(trail_points)):
                cv2.line(
                    frame,
                    trail_points[index - 1],
                    trail_points[index],
                    box_color,
                    1,
                )

            state = "ROI: OUT"
            if track.inside_roi and event is None:
                state = "ROI: IN | MOVING"
            if event is not None:
                state = f"P{event['eventId']} | PARK {event['parkedSeconds']:.1f}s | L{event['parkingLevel']}"
            if movement is not None:
                state += f" | MOVE {movement:.1f}px"
            if self.detailedParkingDiagnostics:
                state += f" | STOP {manager_track.get('stationaryChecks', 0)}/3"

            speed_text = ""
            if track.speed_kph is not None:
                speed_text = f" | {track.speed_kph:.1f} km/h"

            label = (
                f"T{track.track_id} {track.vehicle_name} | "
                f"{state}{speed_text}"
            )

            label_y = max(16, y1 - 8)
            self._draw_text(frame, label, (x1, label_y), box_color)

            if (
                track.last_event
                and now - track.last_event_time <= EVENT_MESSAGE_SECONDS
            ):
                event_y = min(frame.shape[0] - 8, y2 + 18)
                self._draw_text(
                    frame,
                    track.last_event,
                    (x1, event_y),
                    box_color,
                )

        # Header / HUD.
        hud_lines = [
            f"CAM {self.config.camera_id} - {self.config.name}",
            (
                f"VIDEO {now:7.1f}s | COUNT {self.vehicle_count} | "
                f"TRACKS {visible_tracks}"
            ),
            (
                f"PARK ROIS: {len(parkingViolationAreas)} | "
                f"IN ROI: {inside_count}"
            ),
            f"L0: {levels[0]} | L1: {levels[1]} | L2: {levels[2]} | OCCLUDED: {occluded_count}",
            (
                f"STOP <= {STATIONARY_DISTANCE_THRESHOLD:.0f}px | "
                f"L1={self.parkingEvents.level1Seconds:.0f}s | "
                f"L2={self.parkingEvents.level2Seconds:.0f}s"
            ),
        ]
        if PARKING_TEST_MODE:
            hud_lines.insert(1, "PARKING TEST MODE")

        self._draw_panel(frame, hud_lines)

        return frame

    @staticmethod
    def _draw_text(frame, text, origin, color):
        x, y = origin

        # Shadow for readability.
        cv2.putText(
            frame,
            text,
            (x + 1, y + 1),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (0, 0, 0),
            2,
            cv2.LINE_AA,
        )
        cv2.putText(
            frame,
            text,
            (x, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            color,
            1,
            cv2.LINE_AA,
        )

    @staticmethod
    def _draw_panel(frame, lines):
        panel_height = 22 + (len(lines) * 20)

        overlay = frame.copy()
        cv2.rectangle(
            overlay,
            (8, 8),
            (min(frame.shape[1] - 8, 620), panel_height),
            (0, 0, 0),
            -1,
        )
        frame[:] = cv2.addWeighted(overlay, 0.55, frame, 0.45, 0)

        y = 28
        for index, line in enumerate(lines):
            color = (255, 255, 255)
            if index == 0:
                color = (0, 255, 255)

            cv2.putText(
                frame,
                line,
                (18, y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.52,
                color,
                1,
                cv2.LINE_AA,
            )
            y += 20


# ============================================================
# DISPLAY HELPERS
# ============================================================

def status_frame(width, height, title, message):
    frame = np.zeros((height, width, 3), dtype=np.uint8)

    cv2.putText(
        frame,
        title,
        (25, 45),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.9,
        (255, 255, 255),
        2,
        cv2.LINE_AA,
    )

    cv2.putText(
        frame,
        message,
        (25, 90),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.62,
        (0, 0, 255),
        2,
        cv2.LINE_AA,
    )

    return frame


def fit_to_cell(frame, cell_width=640, cell_height=360):
    if frame is None:
        return np.zeros((cell_height, cell_width, 3), dtype=np.uint8)

    height, width = frame.shape[:2]

    scale = min(cell_width / width, cell_height / height)

    new_width = max(1, int(width * scale))
    new_height = max(1, int(height * scale))

    resized = cv2.resize(frame, (new_width, new_height))

    canvas = np.zeros((cell_height, cell_width, 3), dtype=np.uint8)

    x_offset = (cell_width - new_width) // 2
    y_offset = (cell_height - new_height) // 2

    canvas[
        y_offset:y_offset + new_height,
        x_offset:x_offset + new_width,
    ] = resized

    return canvas


def make_grid(frames):
    cells = [fit_to_cell(frame) for frame in frames]

    while len(cells) < 4:
        cells.append(
            np.zeros((360, 640, 3), dtype=np.uint8)
        )

    top = np.hstack((cells[0], cells[1]))
    bottom = np.hstack((cells[2], cells[3]))

    return np.vstack((top, bottom))


def log_parking_roi_debug(testers):
    print("[PARKING ROI DEBUG]")
    for tester in testers:
        if tester.cap is None:
            print(f"CAM{tester.config.camera_id}: inference size unavailable")
            print("    configured zones: 0")
            continue

        inference_width = int(tester.cap.get(cv2.CAP_PROP_FRAME_WIDTH) * DISPLAY_SCALE)
        inference_height = int(tester.cap.get(cv2.CAP_PROP_FRAME_HEIGHT) * DISPLAY_SCALE)
        parking_areas = parkingROIsForCamera(
            tester.config.camera_id, inference_width, inference_height
        )
        print(f"CAM{tester.config.camera_id}:")
        print(f"    inference size: {inference_width}x{inference_height}")
        print(f"    configured zones: {len(parking_areas)}")
        for index, parking_area in enumerate(parking_areas, start=1):
            print(f"    zone {index}: {parking_area}")


def gui_point_to_inference(point, panel, frame):
    """Map a mouse position in a letterboxed GUI panel to frame coordinates."""
    panel_x, panel_y, panel_width, panel_height = panel
    frame_height, frame_width = frame.shape[:2]
    scale = min(panel_width / frame_width, panel_height / frame_height)
    displayed_width = max(1, int(frame_width * scale))
    displayed_height = max(1, int(frame_height * scale))
    offset_x = panel_x + (panel_width - displayed_width) // 2
    offset_y = panel_y + (panel_height - displayed_height) // 2
    x, y = point

    if not (offset_x <= x < offset_x + displayed_width
            and offset_y <= y < offset_y + displayed_height):
        return None

    inference_x = round((x - offset_x) * frame_width / displayed_width)
    inference_y = round((y - offset_y) * frame_height / displayed_height)
    return (
        min(frame_width - 1, max(0, inference_x)),
        min(frame_height - 1, max(0, inference_y)),
    )


def draw_active_parking_polygon(frame, points):
    """Draw an unfinished polygon without changing the stored diagnostics frame."""
    if not points:
        return

    for index, point in enumerate(points, start=1):
        cv2.circle(frame, point, 5, (0, 255, 255), -1)
        cv2.putText(frame, str(index), (point[0] + 6, point[1] - 6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1,
                    cv2.LINE_AA)

    if len(points) > 1:
        cv2.polylines(frame, [np.asarray(points, dtype=np.int32)], False,
                      (0, 255, 255), 2)

    cv2.putText(frame, "CURRENT PARKING ZONE", (points[0][0], max(18, points[0][1] - 18)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 255), 2,
                cv2.LINE_AA)


def draw_edit_mode_overlay(display, edit_state, grid_mode):
    selected_index = edit_state.selected_camera_id - 1
    if grid_mode:
        panel_x = (selected_index % 2) * 640
        panel_y = (selected_index // 2) * 360
        cv2.rectangle(display, (panel_x + 2, panel_y + 2),
                      (panel_x + 637, panel_y + 357), (0, 255, 255), 3)
    else:
        cv2.rectangle(display, (2, 2), (display.shape[1] - 3, display.shape[0] - 3),
                      (0, 255, 255), 3)

    if not edit_state.enabled:
        return

    overlay = display.copy()
    cv2.rectangle(overlay, (8, display.shape[0] - 68),
                  (display.shape[1] - 8, display.shape[0] - 8), (0, 0, 0), -1)
    display[:] = cv2.addWeighted(overlay, 0.70, display, 0.30, 0)
    cv2.putText(display, f"ROI EDIT MODE - CAM{edit_state.selected_camera_id} | "
                "LClick:add  Enter:finish  N:new  Backspace:undo  Delete:last zone  C:clear  S:save  Esc:cancel",
                (16, display.shape[0] - 42), cv2.FONT_HERSHEY_SIMPLEX, 0.43,
                (0, 255, 255), 1, cv2.LINE_AA)
    if edit_state.message:
        cv2.putText(display, edit_state.message, (16, display.shape[0] - 18),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 255, 255), 1,
                    cv2.LINE_AA)


# ============================================================
# MAIN APPLICATION
# ============================================================

def main():
    testers = [ApproachTester(config) for config in APPROACHES]

    window_name = "Easy-Flow CV Diagnostic Harness"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)

    grid_mode = True
    focus_index = 0
    paused = False
    edit_state = ROIEditState()
    rendered_frames = [None] * len(testers)

    def finish_active_polygon():
        if len(edit_state.active_points) < 3:
            edit_state.message = "Need at least 3 points to finish a parking zone."
            return

        PARKING_ROIS.setdefault(edit_state.selected_camera_id, []).append(
            list(edit_state.active_points)
        )
        zone_count = len(PARKING_ROIS[edit_state.selected_camera_id])
        edit_state.active_points.clear()
        edit_state.message = f"Added PARKING ZONE {zone_count}. Press S to save."

    def mouse_callback(event, x, y, flags, param):
        nonlocal focus_index
        if event != cv2.EVENT_LBUTTONDOWN:
            return

        if grid_mode:
            if not (0 <= x < 1280 and 0 <= y < 720):
                return
            panel_index = (y // 360) * 2 + (x // 640)
            panel = ((panel_index % 2) * 640, (panel_index // 2) * 360, 640, 360)
        else:
            panel_index = focus_index
            panel = (0, 0, 1280, 720)

        if panel_index >= len(testers):
            return

        if edit_state.selected_camera_id != panel_index + 1:
            edit_state.selected_camera_id = panel_index + 1
            focus_index = panel_index
            edit_state.active_points.clear()
            edit_state.message = f"Selected CAM{edit_state.selected_camera_id}."
            return

        if not edit_state.enabled or rendered_frames[panel_index] is None:
            return

        inference_point = gui_point_to_inference(
            (x, y), panel, rendered_frames[panel_index]
        )
        if inference_point is None:
            return

        edit_state.active_points.append(inference_point)
        edit_state.message = (
            f"Current parking zone: {len(edit_state.active_points)} point(s)."
        )

    cv2.setMouseCallback(window_name, mouse_callback)

    print("")
    print("Easy-Flow CV Testing Environment V2")
    print("-----------------------------------")
    print("G       : grid/focus")
    print("1..4    : select/focus camera")
    print("P/SPACE : pause")
    print("R       : reset all videos + trackers")
    print("E       : toggle parking ROI edit mode")
    print("D       : toggle detailed parking diagnostics")
    print("Q/ESC   : quit")
    print("")
    log_parking_roi_debug(testers)
    print("")

    missing = [
        tester.video_path.name
        for tester in testers
        if tester.error_message
    ]

    if missing:
        print("Missing/unavailable video files:")
        for filename in missing:
            print(f"  - {filename}")
        print("The harness will still run available approaches.")
        print("")

    while True:
        if not paused:
            rendered_frames = []

            for index, tester in enumerate(testers):
                # In focus mode, only advance/infer the selected approach.
                # This makes close inspection much lighter on the GPU.
                should_process = grid_mode or index == focus_index

                if tester.error_message and tester.last_frame is None:
                    rendered = status_frame(
                        960,
                        540,
                        f"CAM {tester.config.camera_id} - {tester.config.name}",
                        tester.error_message,
                    )
                elif tester.ended:
                    rendered = tester.last_frame

                    if rendered is None:
                        rendered = status_frame(
                            960,
                            540,
                            f"CAM {tester.config.camera_id} - {tester.config.name}",
                            tester.error_message or "VIDEO ENDED",
                        )
                elif should_process:
                    rendered = tester.process_next_frame()
                else:
                    rendered = tester.last_frame

                    if rendered is None:
                        rendered = status_frame(
                            960,
                            540,
                            f"CAM {tester.config.camera_id} - {tester.config.name}",
                            "FOCUS MODE: camera paused",
                        )

                rendered_frames.append(rendered)
        else:
            rendered_frames = [
                tester.last_frame
                if tester.last_frame is not None
                else status_frame(
                    960,
                    540,
                    f"CAM {tester.config.camera_id} - {tester.config.name}",
                    tester.error_message or "PAUSED",
                )
                for tester in testers
            ]

        display_frames = []
        for index, rendered in enumerate(rendered_frames):
            if (edit_state.enabled
                    and index == edit_state.selected_camera_id - 1
                    and rendered is not None):
                rendered = rendered.copy()
                draw_active_parking_polygon(rendered, edit_state.active_points)
            display_frames.append(rendered)

        if grid_mode:
            display = make_grid(display_frames)
        else:
            display = fit_to_cell(
                display_frames[focus_index],
                cell_width=1280,
                cell_height=720,
            )

            cv2.putText(
                display,
                "FOCUS MODE | G=GRID | 1-4=CAMERA | P=PAUSE | R=RESET | Q=QUIT",
                (20, display.shape[0] - 18),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )

        draw_edit_mode_overlay(display, edit_state, grid_mode)
        cv2.imshow(window_name, display)

        key = cv2.waitKeyEx(1)

        if key == ord("q"):
            break

        if key == 27:
            if edit_state.enabled:
                edit_state.active_points.clear()
                edit_state.message = "Cancelled the unfinished parking zone."
                continue
            break

        if key == ord("g"):
            grid_mode = not grid_mode

        elif key == ord("e"):
            edit_state.enabled = not edit_state.enabled
            edit_state.active_points.clear()
            edit_state.message = (
                "Click the selected camera to add parking-zone vertices."
                if edit_state.enabled else "ROI edit mode disabled."
            )

        elif key == ord("d"):
            for tester in testers:
                tester.detailedParkingDiagnostics = not tester.detailedParkingDiagnostics

        elif key in (ord("p"), ord(" ")):
            paused = not paused

        elif key == ord("r"):
            print("[TEST] Resetting all approaches and tracker state...")
            for tester in testers:
                tester.reset()

        elif key in (ord("1"), ord("2"), ord("3"), ord("4")):
            focus_index = int(chr(key)) - 1
            edit_state.selected_camera_id = focus_index + 1
            edit_state.active_points.clear()
            edit_state.message = f"Selected CAM{edit_state.selected_camera_id}."
            if not edit_state.enabled:
                grid_mode = False

        elif edit_state.enabled and key in (10, 13):
            finish_active_polygon()

        elif edit_state.enabled and key == ord("n"):
            if edit_state.active_points:
                finish_active_polygon()
            else:
                edit_state.message = "Ready to create another parking zone."

        elif edit_state.enabled and key in (8, 127):
            if edit_state.active_points:
                edit_state.active_points.pop()
                edit_state.message = "Removed the last unfinished vertex."
            else:
                edit_state.message = "There is no unfinished vertex to remove."

        elif edit_state.enabled and key in (3014656, 65535):
            zones = PARKING_ROIS.setdefault(edit_state.selected_camera_id, [])
            if zones:
                zones.pop()
                edit_state.message = "Deleted the latest saved parking zone. Press S to save."
            else:
                edit_state.message = "There is no saved parking zone to delete."

        elif edit_state.enabled and key == ord("c"):
            PARKING_ROIS[edit_state.selected_camera_id] = []
            edit_state.active_points.clear()
            edit_state.message = "Cleared this camera's parking zones. Press S to save."

        elif edit_state.enabled and key == ord("s"):
            saveParkingROIs()
            edit_state.message = "Saved parking ROIs to parking_rois.json."

    for tester in testers:
        tester.close()

    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
