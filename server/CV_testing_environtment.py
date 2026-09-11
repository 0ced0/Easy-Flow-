
from dataclasses import dataclass, field
from collections import deque
from pathlib import Path
import math
import time

import cv2
import numpy as np
from ultralytics import YOLO


# ============================================================
# EASY-FLOW COMPUTER VISION TESTING ENVIRONMENT V2
# ============================================================
#
# Purpose:
#   - Test all four approaches without opening the full dashboard.
#   - Mirror production more closely: one tracker/model per camera.
#   - Visualize counting line, speed lines, ROI, track IDs, road points.
#   - Exercise a defense-ready stop-event violation state machine.
#
# IMPORTANT:
#   The geometry below is normalized (0.0 - 1.0), so it scales with
#   the resized frame. Replace the placeholder geometry for each
#   approach with the ACTUAL production geometry from streamControl.py.
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
    violation_roi: tuple


@dataclass(frozen=True)
class ApproachConfig:
    camera_id: int
    name: str
    video_filename: str
    geometry: CameraGeometry


# Production geometry copied from streamControl.py.
# These values are kept normalized because the production functions derive
# every coordinate from newWidth/newHeight after resizing each frame to 50%.

LSPU_GEOMETRY = CameraGeometry(
    counting_line=((0.20, 0.55), (0.70, 0.85)),
    speed_start_line=((0.56, 0.32), (0.62, 0.33)),
    speed_end_line=((0.05, 0.65), (0.30, 0.85)),
    violation_roi=(
        (0.53, 0.25),
        (0.00, 0.60),
        (0.00, 1.00),
        (1.00, 1.00),
        (1.00, 0.50),
        (0.75, 0.28),
    ),
)

PATIMBAO_GEOMETRY = CameraGeometry(
    counting_line=((0.10, 0.97), (0.68, 0.40)),
    speed_start_line=((0.04, 0.42), (0.14, 0.36)),
    speed_end_line=((0.10, 0.98), (0.70, 0.40)),

    # Camera 2 - Patimbao
    # Road-surface ROI calibrated from the diagnostic camera view.
    # The polygon follows the visible roadway from the far intersection
    # toward the foreground while avoiding most sidewalk/building areas.
    violation_roi=(
        # Extended upward/left to include more of the far-left roadway.
        (0.00, 0.40),
        (0.08, 0.35),
        (0.20, 0.31),
        (0.38, 0.30),
        (0.58, 0.30),
        (0.78, 0.34),
        (0.94, 0.42),
        (1.00, 0.48),
        (1.00, 1.00),
        (0.00, 1.00),
    ),
)

SUNSTAR_GEOMETRY = CameraGeometry(
    counting_line=((0.10, 0.50), (0.38, 0.50)),
    speed_start_line=((0.33, 0.20), (0.40, 0.20)),
    speed_end_line=((0.03, 0.51), (0.40, 0.51)),
    violation_roi=(
        (0.30, 0.20),
        (0.001, 0.50),
        (0.00, 1.00),
        (1.00, 1.00),
        (1.00, 0.70),
        (0.53, 0.18),
    ),
)

COMPLEX_GEOMETRY = CameraGeometry(
    counting_line=((0.07, 0.47), (0.40, 0.65)),
    speed_start_line=((0.48, 0.18), (0.61, 0.21)),
    speed_end_line=((0.03, 0.51), (0.40, 0.70)),

    # Camera 4 - Complex
    # Road-surface ROI calibrated from the diagnostic camera view.
    # It follows the perspective of the main roadway and keeps most
    # building/sidewalk areas outside the violation region.
    violation_roi=(
        # Extended leftward and upward so the monitored road area reaches
        # closer to the speed-start region and covers more of the left lane.
        (0.00, 0.48),
        (0.10, 0.40),
        (0.24, 0.30),
        (0.40, 0.21),
        (0.55, 0.18),
        (0.70, 0.20),
        (0.84, 0.30),
        (0.95, 0.44),
        (1.00, 0.56),
        (1.00, 1.00),
        (0.00, 1.00),
    ),
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


def normalized_polygon(points, width, height):
    return np.array(
        [normalized_point(point, width, height) for point in points],
        dtype=np.int32,
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


def inside_polygon(point, polygon):
    return cv2.pointPolygonTest(polygon, point, False) >= 0


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

    def _update_stop_event(self, track: TrackState, now: float):
        """
        Diagnostic version of the proposed stop-event logic.

        It does NOT write to the database.
        It only shows what the classifier WOULD call the event.
        """

        # Outside the ROI:
        # - end a short stop as loading/unloading if eligible
        # - reset the event
        if not track.inside_roi:
            self._finish_stop_event(track, now, reason="ROI EXIT")
            return

        # First frame in a new stop/motion segment.
        if track.anchor_position is None:
            track.anchor_position = track.road_point
            track.stationary_since = now
            track.loading_candidate = False
            track.parking_recorded = False
            return

        distance = euclidean(track.anchor_position, track.road_point)

        # Significant movement means the previous stop event is over.
        if distance > STATIONARY_DISTANCE_THRESHOLD:
            self._finish_stop_event(track, now, reason="MOVED")

            # Begin measuring again from the new position.
            track.anchor_position = track.road_point
            track.stationary_since = now
            track.loading_candidate = False
            track.parking_recorded = False
            return

        # Still within the stationary radius.
        if track.stationary_since is None:
            track.stationary_since = now

        duration = max(0.0, now - track.stationary_since)

        if (
            duration >= LOADING_UNLOADING_MIN_SECONDS
            and not track.loading_candidate
            and not track.parking_recorded
        ):
            track.loading_candidate = True
            track.last_event = f"LOADING CANDIDATE ({duration:.1f}s)"
            track.last_event_time = now

        if (
            duration >= ILLEGAL_PARKING_MIN_SECONDS
            and not track.parking_recorded
        ):
            track.parking_recorded = True
            track.loading_candidate = False
            track.last_event = f"PARKING CONFIRMED ({duration:.1f}s)"
            track.last_event_time = now

    def _finish_stop_event(self, track: TrackState, now: float, reason: str):
        if track.stationary_since is None:
            track.anchor_position = None
            return

        duration = max(0.0, now - track.stationary_since)

        if (
            duration >= LOADING_UNLOADING_MIN_SECONDS
            and duration < ILLEGAL_PARKING_MIN_SECONDS
            and not track.parking_recorded
        ):
            track.last_event = (
                f"LOAD/UNLOAD CONFIRMED {duration:.1f}s ({reason})"
            )
            track.last_event_time = now

        track.anchor_position = None
        track.stationary_since = None
        track.loading_candidate = False
        track.parking_recorded = False

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

        roi = normalized_polygon(
            self.config.geometry.violation_roi,
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
            track.inside_roi = inside_polygon(road_point, roi)
            track.trail.append(road_point)

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
            self._update_stop_event(track, now)

        self._cleanup_stale_tracks(now)

        annotated = self._draw_diagnostics(
            frame,
            counting_line,
            speed_start_line,
            speed_end_line,
            roi,
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
        roi,
        now,
        seen_this_frame,
    ):
        # Semi-transparent ROI fill.
        overlay = frame.copy()
        cv2.fillPoly(overlay, [roi], (0, 170, 255))
        frame = cv2.addWeighted(overlay, 0.12, frame, 0.88, 0)

        # ROI outline.
        cv2.polylines(frame, [roi], True, (0, 170, 255), 2)

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
        loading_candidates = 0
        parking_count = 0

        for track_id, track in self.tracks.items():
            if track_id not in seen_this_frame:
                continue

            visible_tracks += 1

            if track.inside_roi:
                inside_count += 1

            if track.loading_candidate:
                loading_candidates += 1

            if track.parking_recorded:
                parking_count += 1

            x1, y1, x2, y2 = track.bbox

            if track.parking_recorded:
                box_color = (0, 0, 255)
            elif track.loading_candidate:
                box_color = (0, 165, 255)
            elif track.inside_roi:
                box_color = (0, 255, 0)
            else:
                box_color = (0, 255, 255)

            cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
            cv2.circle(frame, track.road_point, 4, box_color, -1)

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

            stop_duration = 0.0
            if track.stationary_since is not None and track.inside_roi:
                stop_duration = max(0.0, now - track.stationary_since)

            state = "OUT ROI"

            if track.inside_roi:
                state = f"STOP {stop_duration:.1f}s"

            if track.loading_candidate:
                state = f"LOAD? {stop_duration:.1f}s"

            if track.parking_recorded:
                state = f"PARKING {stop_duration:.1f}s"

            speed_text = ""
            if track.speed_kph is not None:
                speed_text = f" | {track.speed_kph:.1f} km/h"

            label = (
                f"ID {track.track_id} {track.vehicle_name} | "
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
                f"TRACKS {visible_tracks} | IN ROI {inside_count}"
            ),
            (
                f"LOAD CAND {loading_candidates} | "
                f"PARKING {parking_count}"
            ),
            (
                f"STOP <= {STATIONARY_DISTANCE_THRESHOLD:.0f}px | "
                f"LOAD >= {LOADING_UNLOADING_MIN_SECONDS:.0f}s | "
                f"PARK >= {ILLEGAL_PARKING_MIN_SECONDS:.0f}s"
            ),
        ]

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

    print("")
    print("Easy-Flow CV Testing Environment V2")
    print("-----------------------------------")
    print("G       : grid/focus")
    print("1..4    : focus camera")
    print("P/SPACE : pause")
    print("R       : reset all videos + trackers")
    print("Q/ESC   : quit")
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

        if grid_mode:
            display = make_grid(rendered_frames)
        else:
            display = fit_to_cell(
                rendered_frames[focus_index],
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

        cv2.imshow(window_name, display)

        key = cv2.waitKey(1) & 0xFF

        if key in (ord("q"), 27):
            break

        if key == ord("g"):
            grid_mode = not grid_mode

        elif key in (ord("p"), ord(" ")):
            paused = not paused

        elif key == ord("r"):
            print("[TEST] Resetting all approaches and tracker state...")
            for tester in testers:
                tester.reset()

        elif key in (ord("1"), ord("2"), ord("3"), ord("4")):
            focus_index = int(chr(key)) - 1
            grid_mode = False

    for tester in testers:
        tester.close()

    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
