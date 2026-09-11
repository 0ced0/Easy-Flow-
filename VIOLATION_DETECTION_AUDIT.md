# Current Violation-Detection Audit

This is a read-only, source-grounded audit of the current implementation. It describes what the code does today, including incomplete and inconsistent behavior; it does not propose a redesign.

## 1. SYSTEM OVERVIEW

Active production flow per camera:

```text
Capture frame
→ StreamControl.cvLoop()
→ ComputerVisionComponent.inference()
→ YOLO .track(... persist=True, tracker=bytetrack.yaml)
→ tracked boxes with ByteTrack IDs
→ displayVehicle() updates self.allVehicles[track_id]
→ every 30 seconds: illegalParkingDetection()
→ movement comparison against prior parking-check position
→ status 0 → 1 → 2
→ on 1 → 2: annotate full resized frame, JPEG/base64 encode
→ postViolationData()
→ MySQL violations table
→ Flask /get_violation_data
→ dashboard/sidebar evidence display
```

There are four independent stream instances: `stolStream` (camera 1), `stopStream` (camera 2), `stosStream` (camera 3), and `stocStream` (camera 4). Each owns a separate `ComputerVisionComponent`, YOLO model instance, `self.allVehicles`, and violation dictionaries.

Only illegal parking is actively invoked. `StreamControl.violationMonitoringLoop()` calls:

```python
self.CV.illegalParkingDetection()
time.sleep(30)
```

`illegalLoadingUnloadingDetection()` exists in `server/CV.py` but has no production call site. Loading/unloading violations are therefore not currently confirmed or stored.

### Every inference frame

`streamControl.cvLoop()` repeatedly copies the latest captured frame and calls `ComputerVisionComponent.inference()`.

`inference()` increments `self.frameCount`, stores `self.frameTime = time.perf_counter()`, resizes the frame to half its original width and height, stores that resized frame as `self.frame`, and runs:

```python
results = self.model.track(
    frame,
    conf=0.4,
    persist=True,
    tracker=byteTrack,
    device=0,
    verbose=False
)
```

For every returned tracked box with `box.id`, `displayVehicle()` updates `self.allVehicles`. No violation status is evaluated on every frame.

### Every 30 seconds

Two independent threads use 30-second sleeps:

- `violationMonitoringLoop()` calls `illegalParkingDetection()`.
- `saveIntervalLoop()` calls `saveInterval()`, which calls `newInterval()`.

`newInterval()` resets:

```python
self.vehicleCount = 0
self.allVehicles = {}
self.intervalStart = datetime.now()
```

It does not directly clear `self.illegalParkingList` or `self.illegalLoadingUnloadingList`.

## 2. RELEVANT FILES

- `server/CV.py`

  - Main active violation implementation.
  - Loads YOLO and ByteTrack configuration.
  - Updates `self.allVehicles`.
  - Implements `illegalParkingDetection()` and unused `illegalLoadingUnloadingDetection()`.
  - Calculates movement in `getTrafficMovement()`.
  - Encodes evidence in `encodeFrame()`.
  - Calls `databaseConnector.postViolationData()`.

- `server/streamControl.py`

  - Creates one stream controller per camera.
  - Runs capture, inference, parking monitoring, and interval saving in separate threads.
  - Calls parking detection every 30 seconds.
  - Creates `violationDetectionArea` polygons, but the active violation implementation never uses them.

- `models/training/bytetrack.yaml`

  - ByteTrack configuration used by YOLO tracking.

- `models/training/yoloModels/sModels/trainingBatch2/best.pt`

  - Active YOLO model loaded by `ComputerVisionComponent`.

- `models/training/trainingData/mainData.yaml`

  - Training class reference: `Tricycle`, `Motorcycle`, `Car`, `Van`, `Jeepney`, `Bus`, `Truck`.

- `server/database/databaseConnector.py`

  - `postViolationData()` inserts confirmed violations.
  - `dbGetViolationData()` retrieves recent stored violations with evidence.
  - `dbGetAllViolationData()` retrieves all violation metadata without evidence.

- `server/violationData.py`

  - Flask routes that expose saved violations.
  - Decodes stored frame values back to a base64 string for the frontend.

- `server/app.py`

  - Registers the violation blueprint.

- `client/src/hooks/api.js`

  - Calls `/get_violation_data` and `/get_all_violation_data`.

- `client/src/pages/mainDashboard.jsx`, `client/src/components/violationMonitoring.jsx`, and `client/src/components/violationDataDisplay.jsx`

  - Poll, display, select, and render recent saved violations/evidence.

- `client/src/pages/violationRecordsPage.jsx`

  - Displays all saved violation metadata.

- `server/CV_testing_environtment.py`

  - Experimental/test tracking and speed-estimation code; not imported by `server/app.py`, so it is not active production logic.

## 3. VEHICLE TRACKING STATE

### `ComputerVisionComponent` state

```python
self.cameraId
self.frameCount
self.vehicleCount
self.timer                 # Initialized but not used by violation logic
self.frameTime
self.intervalStart
self.intervalEnd
self.frame
self.trafficMovement       # Initialized but not used
self.allVehicles
self.nextIntervalData
self.illegalParkingList
self.illegalLoadingUnloadingList
```

### Per-track state: `self.allVehicles[currentVehicleId]`

Created and updated by `displayVehicle()`:

```python
{
    "name": vehicleName,
    "crossProduct": crossProduct,
    "counterCrossProduct": counterCrossProduct,
    "startCrossProduct": startCrossProduct,
    "endCrossProduct": endCrossProduct,
    "speed": vehicleSpeed,
    "startTime": startTime,
    "endTime": endTime,
    "lastFrameCount": self.frameCount,
    "vehicleCenter": vehicleCenter,
}
```

The persistent tracker key is:

```python
currentVehicleId = int(box.id.item())
```

`vehicleCenter` is the center of the YOLO bounding box:

```python
cx = (x1 + x2) // 2
cy = (y1 + y2) // 2
vehicleCenter = (cx, cy)
```

No YOLO confidence, box corners, box dimensions, complete position history, stationary-start time, last-seen wall-clock time, violation timer, or last violation-check timestamp is stored per vehicle.

### Per-track parking state: `self.illegalParkingList[vehicle]`

Initial entry:

```python
{
    "cameraId": self.cameraId,
    "vehicle": allVehicles.get(vehicle).get("name"),
    "violationType": 2,
    "motion": True,
    "violationStatus": 0,
    "vehicleCenter": allVehicles.get(vehicle).get("vehicleCenter"),
    "frame": None,
}
```

Later entry:

```python
{
    "cameraId": self.cameraId,
    "vehicle": vehicleName,
    "motion": motion,
    "violationType": 2,
    "violationStatus": violationStatus,
    "distanceMoved": distanceMoved,
    "vehicleCenter": vehicleCenter,
    "timeStamp": timeStamp,
    "frame": frame,
}
```

### Per-track loading/unloading state: `self.illegalLoadingUnloadingList[vehicleId]`

```python
{
    "cameraId": self.cameraId,
    "vehicleName": allVehicles.get(vehicleId).get("name"),
    "violationStatus": violationStatus,
    "vehicleCenter": allVehicles.get(vehicleId).get("vehicleCenter"),
}
```

It has no frame, timestamp, elapsed-time value, movement history, or database insertion field.

## 4. MOVEMENT CALCULATION

`ComputerVisionComponent.getTrafficMovement()` computes:

```python
currentLoc = allVehicles.get(vehicleId).get("vehicleCenter")
lastLoc = violationList.get(vehicleId).get("vehicleCenter")

vector = (
    currentLoc[0] - lastLoc[0],
    currentLoc[1] - lastLoc[1]
)
movement = math.hypot(vector[0], vector[1])
```

This is Euclidean displacement in pixels:

```text
sqrt((current_x - previous_x)^2 + (current_y - previous_y)^2)
```

- Point used: YOLO bounding-box center.
- Metric: Euclidean displacement.
- Not cumulative movement, average speed, or velocity.
- Not frame-to-frame: it compares the current center with the center saved in a violation dictionary at the previous violation check, normally about 30 seconds earlier.
- No position-history list or smoothing exists.
- No camera-perspective adjustment exists.
- Frames are resized to 50%, so thresholds are evaluated in half-resolution pixel coordinates.

The median is only calculated when more than four records overlap:

```python
medianTrafficMovement = (
    statistics.median(trafficMovement)
    if len(vehicleMovements) > 4
    else None
)
```

Current thresholds:

- Individual stationary threshold: `< 100` pixels.
- Parking median guard: `None` or `>= 10` pixels.
- Loading/unloading median guard: `>= 100` pixels.

## 5. ILLEGAL PARKING LOGIC

Active function: `ComputerVisionComponent.illegalParkingDetection()`.

### First observation

When a current track ID is not in `self.illegalParkingList`, a record with `violationStatus: 0` is created and the function immediately `continue`s. It cannot be classified during this first check.

### Qualifying condition

```python
distanceMoved < 100
and (medianTrafficMovement is None or medianTrafficMovement >= 10)
and (vehicleFlow > 200)
```

`vehicleFlow` comes from `self.nextIntervalData.get("vehicleFlow")`, populated by the interval-saving thread.

### Status meaning

| `violationStatus` | Actual behavior |
| --- | --- |
| `0` | Initial state. First qualifying check changes it to `1`. |
| `1` | One qualifying check occurred. Next qualifying check changes it to `2` and inserts a violation. |
| `2` | Confirmed/stored. No `case 2` exists, so it remains confirmed without another insert while the entry remains. |

### State behavior

- `0 → 1`: one qualifying parking check.
- `1 → 2`: another qualifying check, then evidence/database insertion.
- `2`: remains confirmed.
- A non-qualifying check does not reset `violationStatus`.
- `motion` is stored but not used to drive future state.
- A vehicle moving again does not reset status `1` or `2`.

### Confirmation

For status `1`, a qualifying result changes status to `2`, copies `self.frame`, draws a red rectangle, encodes the whole frame, then calls `databaseConnector.postViolationData()`.

### Parking pseudocode

```text
every 30 seconds:
    cleanParkingListAgainst(allVehicles)
    movementByTrack, medianMovement =
        getTrafficMovement(allVehicles, illegalParkingList)

    for each track ID in allVehicles:
        if track ID is new to illegalParkingList:
            store status 0 and current vehicleCenter
            continue

        distanceMoved = displacement between current center
                        and stored parking-check center
        status = stored violationStatus

        if distanceMoved < 100
           and (medianMovement is None or medianMovement >= 10)
           and vehicleFlow > 200:
            motion = false

            if status == 0:
                status = 1
            if status == 1:
                status = 2
                capture full self.frame with fixed 100×100 marker
                base64 encode JPEG
                insert violation_type 2 into database
        else:
            motion = true
            # status is intentionally not reset

        overwrite parking dictionary entry with new center and status
```

## 6. ILLEGAL LOADING / UNLOADING LOGIC

Defined by `ComputerVisionComponent.illegalLoadingUnloadingDetection()`, but not called from the active production pipeline.

Its qualifying branch is:

```python
elif vehicleMovement < 100 and medianTrafficMovement >= 100:
```

Unlike parking, loading/unloading requires a defined median, which requires more than four overlapping vehicle movement records.

| `violationStatus` | Actual behavior |
| --- | --- |
| `0` | Qualifying check becomes `1`. |
| `1` | Next qualifying check becomes `2`. |
| `2` | Next qualifying check becomes `3`. |
| `3` | Remains `3`. |
| Non-qualifying movement | Resets to `0`. |
| `medianTrafficMovement is None` | `pass`; state remains unchanged. |

There is no database insertion, evidence capture, timestamp, or violation-type persistence at status `3`.

### Loading/unloading pseudocode

```text
if this function were called:
    cleanLoadingListAgainst(allVehicles)
    movementByTrack, medianMovement =
        getTrafficMovement(allVehicles, illegalLoadingUnloadingList)

    for each track in allVehicles:
        if new:
            store status 0 and current center
            continue

        if medianMovement is None:
            leave status unchanged
        elif vehicleMovement < 100 and medianMovement >= 100:
            status 0 → 1 → 2 → 3 → 3
        else:
            status = 0

        store status and current center
```

## 7. TIMING LOGIC

| Variable / mechanism | Duration / basis | Purpose | Start/reset |
| --- | --- | --- | --- |
| `violationMonitoringLoop()` | 30 seconds | Runs parking logic | Runs while stream is active |
| `saveIntervalLoop()` | 30 seconds | Saves traffic interval and clears `allVehicles` | Runs while stream is active |
| `frameCount` | +1 per inference call | Track/density bookkeeping | Never reset in `newInterval()` |
| `self.frameTime` | `time.perf_counter()` per inference | Vehicle speed timing only | Overwritten every inference |
| `startTime`, `endTime` | Monotonic timestamps | Speed between line crossings | Per current track |
| `track_buffer` | 60 tracker frames | ByteTrack lost-track retention | Internal to ByteTrack |
| capture `frameInterval` | `1 / FPS`, fallback `1/25` | Capture pacing | Per stream initialization |
| CV-loop sleep | 0.01 seconds | CV-loop pacing | Every loop |
| `self.intervalStart` / `intervalEnd` | 30-second data interval | Traffic persistence | Reset by `newInterval()` |
| `timeStamp` | Manila `%I:%M %p` | Stored violation display time | Created per parking check |

There is no per-vehicle parking timer, stationary-start timestamp, loading timer, duration accumulator, or elapsed-time check.

## 8. STATUS / STATE MACHINE

### Illegal Parking

```text
New ByteTrack ID
    ↓
Dictionary entry created: status 0
    ↓
Qualifying parking check
    ↓
status 0 → 1
    ↓
Another qualifying check
    ↓
status 1 → 2
capture evidence + insert DB row
    ↓
status 2 remains 2

Non-qualifying check:
motion becomes True, but status does not reset.
```

### Illegal Loading / Unloading

```text
New ByteTrack ID
    ↓
Dictionary entry created: status 0
    ↓
movement < 100 and median >= 100
    ↓
0 → 1 → 2 → 3 → 3

Non-qualifying movement: any state → 0
median None: state remains unchanged

Not called by production code.
```

## 9. EVIDENCE CAPTURE

Parking-only confirmation captures evidence with:

```python
cx, cy = vehicleCenter
boxStart = (int(cx - 50), int(cy - 50))
boxEnd = (int(cx + 50), int(cy + 50))

frame = self.frame.copy()
frame = cv2.rectangle(frame, boxStart, boxEnd, (0, 0, 255), 1)
frame = self.encodeFrame(frame)
```

- Source: the current `self.frame`, which is a resized inference frame.
- Whole frame is retained; it is not cropped to the vehicle.
- The marker is fixed at 100×100 pixels, not the YOLO box dimensions.
- Rectangle is red BGR `(0, 0, 255)`, thickness `1`.
- JPEG quality is `60`.
- JPEG bytes are base64 encoded to UTF-8 text.
- Track ID is not included in evidence or persistence.
- Stored timestamp is only hour/minute plus AM/PM; no date or seconds.

Inserted data structure:

```python
{
    "cameraId": self.cameraId,
    "vehicle": vehicleName,
    "violationType": 2,
    "timeStamp": timeStamp,
    "frame": frame,
}
```

## 10. DATABASE FLOW

No table schema or migration for `violations` exists in the repository. SQL column types, primary key, indexes, and exact frame type cannot be verified from source.

### Insert

`postViolationData()` runs:

```sql
INSERT INTO violations(
    camera_id,
    vehicle,
    violation_type,
    time_stamp,
    frame
)
values(%s, %s, %s, %s, %s)
```

### Latest evidence retrieval

`dbGetViolationData()` runs:

```sql
SELECT
    camera_id,
    vehicle,
    violation_type,
    time_stamp,
    frame
FROM violations
ORDER BY time_stamp DESC
LIMIT 40
```

`GET /get_violation_data` converts `frame` using:

```python
row["frame"] = bytes(row["frame"]).decode("utf-8")
```

The dashboard renders it as:

```jsx
<img src={`data:image/jpeg;base64,${violationDisplay.frame}`} />
```

### Full metadata retrieval

`dbGetAllViolationData()` retrieves `camera_id`, `vehicle`, `violation_type`, and `time_stamp` from every row, ordered by `time_stamp DESC`, without the frame. `GET /get_all_violation_data` powers the full history page.

Persisted active type: `2`, illegal parking. Type `1` is intended for illegal loading/unloading in frontend mappings but is not actively inserted by the backend.

## 11. TRACK LOSS / CLEANUP

ByteTrack is configured with:

```yaml
track_buffer: 60
```

The application cleanup is based only on whether an ID remains a key in `self.allVehicles`:

```python
for vehicleId in violationList:
    if vehicleId not in allVehicles:
        del self.illegalParkingList[vehicleId]
```

`self.allVehicles` is not a current-frame registry. A vehicle that disappears remains there until `newInterval()` clears the entire map every 30 seconds. `lastFrameCount` exists but is only used in density calculation, not cleanup.

### ID switch

- New ByteTrack ID gets a new status `0`.
- Progression is not transferred from the old ID.
- Old ID remains until cleanup.
- Database rows do not store track ID.

### Stream interruption

On capture failure, the capture object is recreated. YOLO/ByteTrack state, `allVehicles`, parking list, loading list, and statuses are not explicitly reset.

## 12. EDGE CASES IN THE CURRENT IMPLEMENTATION

- A stopped vehicle in a busy queue or at a red light can satisfy the parking condition when the rest of traffic moves enough.
- A genuinely parked vehicle cannot qualify while `vehicleFlow <= 200`.
- Parking status `1` persists after movement; later stopping can confirm it.
- Stale tracks can produce zero movement because disappeared tracks remain in `allVehicles` until the interval reset.
- `violationDetectionArea` polygons are never enforced, so tracks anywhere in the frame can be considered.
- Fixed 100-pixel thresholds are affected by perspective, camera resolution, vehicle distance, and 50% resizing.
- Bounding-box jitter is not smoothed.
- ID changes restart status and can create false negatives; stale IDs can create false positives.
- Parking, interval saving, and inference access shared maps in separate threads without one shared lock.
- `vehicleFlow` can be `None` before the first saved interval. A qualifying candidate can reach `None > 200`, raise `TypeError`, and terminate the parking-monitoring thread because that loop has no exception handler.
- ByteTrack's 60-frame buffer has a variable real-time duration if inference frame rate changes.
- A vehicle first seen at a parking check only gets seeded; it cannot advance until a later check.
- Loading/unloading has no production invocation, confirmation action, evidence capture, or persistence.

## 13. IMPORTANT CONSTANTS / THRESHOLDS

| Variable / Constant | Current Value | Unit | Purpose | File | Function |
| --- | ---: | --- | --- | --- | --- |
| `conf` | `0.4` | confidence | YOLO tracking detection threshold | `server/CV.py` | `inference()` |
| `persist` | `True` | boolean | Preserve tracker state between calls | `server/CV.py` | `inference()` |
| `device` | `0` | CUDA device index | YOLO inference device | `server/CV.py` | `inference()` |
| frame scale | `0.5` | ratio | Resize before detection, movement, evidence | `server/CV.py` | `inference()` |
| parking movement threshold | `< 100` | resized-frame pixels | Stationary candidate | `server/CV.py` | `illegalParkingDetection()` |
| parking median guard | `None` or `>= 10` | resized-frame pixels | Background-motion guard | `server/CV.py` | `illegalParkingDetection()` |
| parking flow guard | `> 200` | vehicles/hour | Requires high calculated flow | `server/CV.py` | `illegalParkingDetection()` |
| loading movement threshold | `< 100` | resized-frame pixels | Stationary candidate | `server/CV.py` | `illegalLoadingUnloadingDetection()` |
| loading median guard | `>= 100` | resized-frame pixels | Requires surrounding movement | `server/CV.py` | `illegalLoadingUnloadingDetection()` |
| median minimum samples | `len(vehicleMovements) > 4` | tracks | Enables median at 5+ records | `server/CV.py` | `getTrafficMovement()` |
| parking check interval | `30` | seconds | Runs parking logic | `server/streamControl.py` | `violationMonitoringLoop()` |
| interval save cadence | `30` | seconds | Saves traffic data and clears `allVehicles` | `server/streamControl.py` | `saveIntervalLoop()` |
| `track_buffer` | `60` | tracker frames | ByteTrack lost-track retention | `models/training/bytetrack.yaml` | ByteTrack |
| `track_high_thresh` | `0.20` | confidence | First-stage association | `models/training/bytetrack.yaml` | ByteTrack |
| `track_low_thresh` | `0.05` | confidence | Low-score association | `models/training/bytetrack.yaml` | ByteTrack |
| `new_track_thresh` | `0.25` | confidence | New-track threshold | `models/training/bytetrack.yaml` | ByteTrack |
| `match_thresh` | `0.90` | association | Track/detection match threshold | `models/training/bytetrack.yaml` | ByteTrack |
| evidence marker | `100 × 100` | resized-frame pixels | Fixed rectangle around center | `server/CV.py` | `illegalParkingDetection()` |
| JPEG quality | `60` | JPEG quality | Evidence compression | `server/CV.py` | `encodeFrame()` |
| flow interval | `30` | seconds | Count-to-flow normalization | `server/CV.py` | `calculateFlow()` |
| speed distance | `17` | meters | Fixed speed-line distance | `server/CV.py` | `speedEstimation()` |
| CV-loop sleep | `0.01` | seconds | CV-loop pacing | `server/streamControl.py` | `cvLoop()` |
| capture FPS fallback | `25` | FPS | Capture pacing fallback | `server/streamControl.py` | `capLoop()` |
| evidence retrieval limit | `40` | records | Latest violation query limit | `server/database/databaseConnector.py` | `dbGetViolationData()` |

## 14. COMPLETE CURRENT-LOGIC PSEUDOCODE

```text
for each configured camera:
    create streamControl and ComputerVisionComponent
    load YOLO model and ByteTrack config

start capture, CV inference, parking-monitoring, and interval-saving threads

capture thread:
    read source frame
    if failed:
        recreate OpenCV capture
        do not reset tracker or violation state
    save latest raw frame
    pace using source FPS or 25 FPS fallback

CV inference thread:
    copy latest frame
    if no frame: sleep and continue

    calculate camera lines and violation polygon
    # polygon is unused by violation logic

    increment frameCount
    set frameTime = perf_counter()
    resize frame to 50%
    self.frame = resized frame
    YOLO.track(conf=.4, persist=True, tracker=ByteTrack, device=0)

    for each tracked box with box.id:
        read class name and box center
        calculate line-crossing and speed state
        update self.allVehicles[track ID]

parking-monitoring thread, every 30 seconds:
    illegalParkingDetection()

    remove parking IDs not in self.allVehicles
    calculate current-to-prior-check displacement for existing IDs
    calculate median only with >4 movement records

    for each ID:
        if new to parking list:
            store status 0/current center
            continue

        if movement < 100
           and (median None or >=10)
           and vehicleFlow > 200:
            status 0 -> 1
            status 1 -> 2:
                copy full resized frame
                draw red 100×100 center marker
                JPEG quality 60 → base64
                insert violation type 2 to DB
        else:
            do not reset parking status

        overwrite parking state with current center/status

loading/unloading function:
    exists, but no production caller invokes it

interval-saving thread, every 30 seconds:
    save traffic interval
    publish interval data
    clear self.allVehicles and vehicle count
    do not directly clear violation dictionaries
```

## INFORMATION TO SEND TO CHATGPT

Easy Flow currently detects vehicle classes with YOLO `best.pt` and assigns persistent ByteTrack IDs using `models/training/bytetrack.yaml` (`track_buffer=60`, `track_high_thresh=.20`, `track_low_thresh=.05`, `new_track_thresh=.25`, `match_thresh=.90`). Each camera has an independent `ComputerVisionComponent`. Every inference frame is resized to 50%, run through `model.track(conf=.4, persist=True, tracker=bytetrack.yaml, device=0)`, and each `box.id` is stored in `self.allVehicles[track_id]` with class name, box-center `vehicleCenter`, line-crossing values, speed values, and `lastFrameCount`. There is no per-vehicle position-history list, stationary-start time, elapsed parking timer, bounding-box storage, or active violation-area check. Movement is Euclidean pixel displacement between the current box center and the center stored in the parking/loading dictionary from the prior violation check, normally about 30 seconds earlier.

Only `illegalParkingDetection()` is called in production, once every 30 seconds from `StreamControl.violationMonitoringLoop()`. A new track gets parking `violationStatus=0` and is not evaluated that first check. On later checks, parking qualifies if `distanceMoved < 100`, `(medianTrafficMovement is None or >= 10)`, and `vehicleFlow > 200`. Median movement is only available with more than 4 overlapping tracks. A qualifying check advances `0→1`; the next qualifying check advances `1→2`, captures the current full resized frame, draws a fixed 100×100 red rectangle centered on the vehicle, JPEG encodes at quality 60, base64 encodes it, and inserts `camera_id`, YOLO class name, `violation_type=2`, Manila `%I:%M %p` time, and frame into MySQL `violations`. Parking does not reset status when the vehicle moves; a status `1` can survive non-qualifying checks and later confirm. Status `2` remains confirmed without repeated inserts while the entry remains.

`illegalLoadingUnloadingDetection()` exists but is never called. If called, it would require `vehicleMovement < 100` and median movement `>=100`, then advance `0→1→2→3`; non-qualifying checks reset to `0`, but it captures no evidence and writes nothing to the database.

`saveInterval()` also runs every 30 seconds and calls `newInterval()`, which clears `self.allVehicles` but not violation dictionaries. Cleanup only removes violation entries when their IDs are no longer keys in `allVehicles`; there is no last-seen cleanup. This creates race/stale-track risks because inference, parking checks, and interval reset run on separate threads without shared locking. Camera-specific `violationDetectionArea` polygons are calculated but never used. The violations table schema is not in the repository; inserts use `camera_id`, `vehicle`, `violation_type`, `time_stamp`, and base64 `frame`.
