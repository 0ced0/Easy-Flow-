import json
from pathlib import Path
import shutil

import cv2
import numpy as np


# Parking ROI coordinates use the 960x540 inference frame produced from the
# bundled 1920x1080 CCTV recordings.  They are scaled for other input sizes.
#
PARKING_ROI_REFERENCE_SIZE = (960, 540)
PARKING_ROI_BOUNDARY_TOLERANCE = 3
PARKING_ROIS_PATH = Path(__file__).with_name("parking_rois.json")
PARKING_ROIS_BACKUP_PATH = Path(__file__).with_name("parking_rois_backup.json")


def _loadParkingROIs():
    data = json.loads(PARKING_ROIS_PATH.read_text(encoding="utf-8"))
    return {
        int(cameraId): [[tuple(point) for point in polygon]
                        for polygon in polygons]
        for cameraId, polygons in data.items()
    }


PARKING_ROIS = _loadParkingROIs()


def saveParkingROIs():
    """Persist the current calibration, preserving the original file once."""
    if not PARKING_ROIS_BACKUP_PATH.exists():
        shutil.copyfile(PARKING_ROIS_PATH, PARKING_ROIS_BACKUP_PATH)

    data = {str(cameraId): [[list(point) for point in polygon]
                            for polygon in polygons]
            for cameraId, polygons in PARKING_ROIS.items()}
    temporaryPath = PARKING_ROIS_PATH.with_suffix(".json.tmp")
    temporaryPath.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    temporaryPath.replace(PARKING_ROIS_PATH)


def parkingROIsForCamera(cameraId, width, height):
    """Return this camera's parking polygons in the current inference size."""
    referenceWidth, referenceHeight = PARKING_ROI_REFERENCE_SIZE
    scaleX = width / referenceWidth
    scaleY = height / referenceHeight
    return [[(round(x * scaleX), round(y * scaleY)) for x, y in polygon]
            for polygon in PARKING_ROIS.get(cameraId, [])]


def isInsideParkingROI(roadPoint, parkingViolationAreas):
    """Use the production parking ROI boundary tolerance for a road point."""
    return any(
        cv2.pointPolygonTest(
            np.asarray(parkingArea, dtype=np.int32).reshape((-1, 1, 2)),
            roadPoint,
            True,
        ) >= -PARKING_ROI_BOUNDARY_TOLERANCE
        for parkingArea in parkingViolationAreas
    )


def parkingROIIndex(roadPoint, parkingViolationAreas):
    for index, parkingArea in enumerate(parkingViolationAreas):
        if isInsideParkingROI(roadPoint, [parkingArea]):
            return index
    return None
