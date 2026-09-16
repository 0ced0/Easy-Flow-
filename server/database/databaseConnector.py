import mysql.connector
import os
import time
from mysql.connector import Error
from datetime import datetime
from zoneinfo import ZoneInfo
import statistics
from environment import validateEnvironment

environmentConfig = validateEnvironment()

dbUser = os.environ.get("DB_USER") or (
    "root" if environmentConfig["environment"] == "local" else None
)
dbPassword = os.environ.get("DB_PASSWORD", "")

if not dbUser or (
    environmentConfig["environment"] == "live" and not dbPassword
):
    raise RuntimeError("LIVE requires non-empty DB_USER and DB_PASSWORD.")

DB_CONFIG = {
    "host" : os.environ.get("DB_HOST", "127.0.0.1"),
    "user" : dbUser,
    "password" : dbPassword,
    "database" : environmentConfig["databaseName"],
    }

PERF_LOGGING = os.environ.get("EASYFLOW_PERF_LOGGING", "").strip().lower() == "true"

def logDbPerf(name, started, connectDuration, queryDuration):
    if not PERF_LOGGING:
        return

    totalDuration = time.perf_counter() - started
    print(
        f"[DB PERF] {name} connect={connectDuration * 1000:.1f}ms "
        f"query={queryDuration * 1000:.1f}ms total={totalDuration * 1000:.1f}ms"
    )

def saveTrafficInterval(data: dict) -> bool:
    db = None
    cursor = None



    try:
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor()

        query = """
            INSERT INTO traffic_interval (
                camera_id,
                interval_start,
                interval_end,
                vehicle_count,
                traffic_flow,
                average_speed,
                speedMeasurementCount,
                spatial_density
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """

        values = (
            data["cameraId"],
            data["intervalStart"],
            data["intervalEnd"],
            data["vehicleCount"],
            data["trafficFlow"],
            data["averageSpeed"],
            data["speedMeasurementCount"],
            data["spatialDensity"]
        )

        cursor.execute(query, values)
        db.commit()

        return True

    except Error as error:
        print(f"Database error: {error}")

        if db is not None and db.is_connected():
            db.rollback()

        return False

    finally:
        if cursor is not None:
            cursor.close()

        if db is not None and db.is_connected():
            db.close()



def getForecastIntervals(lag: int | None = 12):
    db = None
    cursor = None

    try:
        db = mysql.connector.connect(**DB_CONFIG)

        cursor = db.cursor(dictionary=True)

        limit_clause = ""
        params = ()

        if lag is not None:
            limit_clause = "LIMIT %s"
            params = (lag,)

        query = f"""
            SELECT
                grouped.time_step,
                traffic.camera_id,
                traffic.vehicle_count,
                traffic.traffic_flow,
                traffic.spatial_density
            FROM traffic_interval AS traffic

            INNER JOIN (
                SELECT
                    FROM_UNIXTIME(
                        FLOOR(
                            UNIX_TIMESTAMP(interval_start) / 30
                        ) * 30
                    ) AS time_step
                FROM traffic_interval
                GROUP BY time_step
                HAVING COUNT(DISTINCT camera_id) = 4
                ORDER BY time_step DESC
                {limit_clause}
            ) AS grouped
                ON FROM_UNIXTIME(
                    FLOOR(
                        UNIX_TIMESTAMP(traffic.interval_start) / 30
                    ) * 30
                ) = grouped.time_step

            WHERE traffic.camera_id IN (1, 2, 3, 4)

            ORDER BY
                grouped.time_step ASC,
                traffic.camera_id ASC
        """

        cursor.execute(query, params)
        rows = cursor.fetchall()
        return rows

    except Error as error:
        print(f"Database retrieval error: {error}")
        return []

    finally:
        if cursor is not None:
            cursor.close()

        if db is not None and db.is_connected():
            db.close()

def dbGetMonthlyData(cameraId, month=None):
    started = time.perf_counter()
    connectDuration = 0
    queryDuration = 0
    db = None
    cursor = None

    try:
        connectStarted = time.perf_counter()
        db = mysql.connector.connect(**DB_CONFIG)
        connectDuration = time.perf_counter() - connectStarted
        cursor = db.cursor(dictionary=True)

        query="""
            SELECT
                SUM(vehicle_count) AS total_vehicle_count,
                AVG(traffic_flow) AS average_flow,
                AVG(spatial_density) AS average_density
                FROM traffic_interval
                WHERE camera_id = %s
                AND created_at >= STR_TO_DATE(CONCAT(%s, '-01'), '%Y-%m-%d')
                AND created_at < DATE_ADD(
                    STR_TO_DATE(CONCAT(%s, '-01'), '%Y-%m-%d'),
                    INTERVAL 1 MONTH
            )
        """
        values=[cameraId, month, month]

        queryStarted = time.perf_counter()
        cursor.execute(query, values)
        data = cursor.fetchall()
        queryDuration = time.perf_counter() - queryStarted
        return data
    
    except ValueError as error:
        print(error)
    finally:
        if cursor is not None:
            cursor.close()
        if db is not None and db.is_connected():
            db.close()
        logDbPerf("dbGetMonthlyData", started, connectDuration, queryDuration)

def dbGetWeeklyData(cameraId, month):
    db = None
    cursor = None

    try:
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor(dictionary=True)

        query = """
            SELECT
                FLOOR((DAY(created_at) - 1) / 7) + 1 AS week_number,
                SUM(vehicle_count) AS total_vehicle_count,
                AVG(traffic_flow) AS average_flow,
                AVG(spatial_density) AS average_density
            FROM traffic_interval
            WHERE camera_id = %s
            AND created_at >= STR_TO_DATE(CONCAT(%s, '-01'), '%Y-%m-%d')
            AND created_at < DATE_ADD(
                STR_TO_DATE(CONCAT(%s, '-01'), '%Y-%m-%d'),
                INTERVAL 1 MONTH
            )
            GROUP BY FLOOR((DAY(created_at) - 1) / 7) + 1
            ORDER BY week_number
        """
        values = [cameraId, month, month]

        cursor.execute(query, values)
        return cursor.fetchall()

    except Error as error:
        print(f"Database retrieval error: {error}")
        return []

    finally:
        if cursor is not None:
            cursor.close()

        if db is not None and db.is_connected():
            db.close()

def dbGetHourlyData(cameraId, date=None):
    started = time.perf_counter()
    connectDuration = 0
    queryDuration = 0
    db = None
    cursor = None

    if date is None:
        date = datetime.now(ZoneInfo("Asia/Manila")).date()

    try:
        connectStarted = time.perf_counter()
        db = mysql.connector.connect(**DB_CONFIG)
        connectDuration = time.perf_counter() - connectStarted
        cursor = db.cursor(dictionary=True)

        query = """
            SELECT
                HOUR(created_at) AS hour,
                AVG(traffic_flow) AS average_flow
            FROM traffic_interval
            WHERE camera_id = %s
            AND created_at >= %s
            AND created_at < DATE_ADD(%s, INTERVAL 1 DAY)
            GROUP BY HOUR(created_at)
            ORDER BY HOUR(created_at)
        """
        values=[cameraId, date, date]

        queryStarted = time.perf_counter()
        cursor.execute(query, values)

        data = cursor.fetchall()
        queryDuration = time.perf_counter() - queryStarted
        return data
    
    except Error as error:
        print(error)

    finally:
        if cursor is not None:
            cursor.close()
        if db is not None and db.is_connected():
            db.close()
        logDbPerf("dbGetHourlyData", started, connectDuration, queryDuration)

def dbGetDailyData(cameraId, page, dateFilter):
    started = time.perf_counter()
    connectDuration = 0
    queryDuration = 0
    offset = (page - 1) * 6
    db = None
    cursor = None

    try:
        connectStarted = time.perf_counter()
        db = mysql.connector.connect(**DB_CONFIG)
        connectDuration = time.perf_counter() - connectStarted
        cursor = db.cursor(dictionary=True)

        query = """
            SELECT
                camera_id,
                DATE(created_at) AS date,
                DAY(created_at) AS day,

                COALESCE(SUM(vehicle_count), 0) AS total_vehicle_count,
                COALESCE(AVG(traffic_flow), 0) AS average_flow,
                COALESCE(AVG(spatial_density), 0) AS average_density

            FROM traffic_interval

            WHERE camera_id = %s

            AND created_at >= STR_TO_DATE(
                CONCAT(%s, '-01'),
                '%Y-%m-%d'
            )

            AND created_at < DATE_ADD(
                STR_TO_DATE(
                    CONCAT(%s, '-01'),
                    '%Y-%m-%d'
                ),
                INTERVAL 1 MONTH
            )

            GROUP BY DATE(created_at)

            ORDER BY DATE(created_at)
            LIMIT 6
            OFFSET %s
        """
        values=[cameraId, dateFilter, dateFilter, offset]

        queryStarted = time.perf_counter()
        cursor.execute(query, values)
        response = cursor.fetchall()
        queryDuration = time.perf_counter() - queryStarted
        return response
    except Error as error:
        print(error)
    finally:
        if cursor is not None:
            cursor.close()
        if db is not None and db.is_connected():
            db.close()
        logDbPerf("dbGetDailyData", started, connectDuration, queryDuration)

def dbGetDataTable(cameraId=None, page=None, dateFilter=None):
    started = time.perf_counter()
    connectDuration = 0
    queryDuration = 0
    db = None
    cursor = None

    try:
        connectStarted = time.perf_counter()
        db = mysql.connector.connect(**DB_CONFIG)
        connectDuration = time.perf_counter() - connectStarted
        cursor = db.cursor(dictionary=True)

        if not dateFilter:
            dateFilter = datetime.now(ZoneInfo("Asia/Manila")).strftime("%Y-%m-%d")
            if not cameraId:
                query = """
                    SELECT 
                        camera_id,
                        vehicle_count,
                        traffic_flow,
                        spatial_density,
                        created_at
                    FROM traffic_interval 
                    WHERE created_at >= %s
                    AND created_at < DATE_ADD(%s, INTERVAL 1 DAY) 
                    ORDER BY created_at DESC
                """
                values=[dateFilter, dateFilter]
            else:
                query = """
                    SELECT 
                        camera_id,
                        vehicle_count,
                        traffic_flow,
                        spatial_density,
                        created_at
                    FROM traffic_interval 
                    WHERE camera_id = %s   
                    AND created_at >= %s
                    AND created_at < DATE_ADD(%s, INTERVAL 1 DAY) 
                    ORDER BY created_at DESC
                """
                values=[cameraId, dateFilter, dateFilter]

        elif not page:
            if not cameraId:
                query = """
                    SELECT 
                        camera_id,
                        vehicle_count,
                        traffic_flow,
                        spatial_density,
                        created_at
                    FROM traffic_interval 
                    WHERE created_at >= %s
                    AND created_at < DATE_ADD(%s, INTERVAL 1 DAY) 
                    ORDER BY created_at DESC
                """
                values=[dateFilter, dateFilter]

            else:
                query = """
                    SELECT 
                        camera_id,
                        vehicle_count,
                        traffic_flow,
                        spatial_density,
                        created_at
                    FROM traffic_interval 
                    WHERE camera_id = %s   
                    AND created_at >= %s
                    AND created_at < DATE_ADD(%s, INTERVAL 1 DAY) 
                    ORDER BY created_at DESC
                """
                values=[cameraId, dateFilter, dateFilter]

        else:
            offset = (page - 1) * 6

            query = """
                SELECT 
                    camera_id,
                    vehicle_count,
                    traffic_flow,
                    spatial_density,
                    created_at
                FROM traffic_interval 
                WHERE camera_id = %s   
                AND created_at >= %s
                AND created_at < DATE_ADD(%s, INTERVAL 1 DAY) 
                ORDER BY created_at DESC
                LIMIT 6
                OFFSET %s

            """
            values=[cameraId, dateFilter, dateFilter, offset]

        queryStarted = time.perf_counter()
        cursor.execute(query, values)
        response = cursor.fetchall()
        queryDuration = time.perf_counter() - queryStarted
        return response
    except Error as error:
        print(error)
    finally:
        if cursor is not None:
            cursor.close()
        if db is not None and db.is_connected():
            db.close()
        logDbPerf("dbGetDataTable", started, connectDuration, queryDuration)

def dbPostTimerConfig(timerData):
    db = None
    cursor = None

    try:
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor()

        query = """
            INSERT INTO traffic_light_config (
                approach_id,
                approach_name,
                freeflow,
                slowdown,
                congested
            )
            VALUES (%s, %s, %s, %s, %s)

            ON DUPLICATE KEY UPDATE
                approach_name = VALUES(approach_name),
                freeflow = VALUES(freeflow),
                slowdown = VALUES(slowdown),
                congested = VALUES(congested)
        """

        values = []

        for config in timerData:
            values.append((
                config["approach_id"],
                config["approach_name"],
                config["freeflow"],
                config["slowdown"],
                config["congested"]
            ))

        cursor.executemany(query, values)

        db.commit()

        return True

    except Error as error:
        print("Database error:", error)

        if db:
            db.rollback()

        return False

    finally:
        if cursor:
            cursor.close()

        if db and db.is_connected():
            db.close()

def dbPostDensityConfig(densityConfigData):
    db = None
    cursor = None

    try:
        db = mysql.connector.connect(**DB_CONFIG)

        cursor = db.cursor(dictionary=True)

        query = """
            INSERT INTO density_config (
                approach_id,
                approach_name,
                freeflow_max,
                slowdown_max    
            )
            VALUES (%s, %s, %s, %s)

            ON DUPLICATE KEY UPDATE
                approach_name = VALUES(approach_name),
                freeflow_max = VALUES(freeflow_max),
                slowdown_max = VALUES(slowdown_max)
        """

        values = []

        for config in densityConfigData:
            values.append((
                config["approach_id"],
                config["approach_name"],
                config["freeflow_max"],
                config["slowdown_max"]
            ))

        cursor.executemany(query, values)

        db.commit()

        return True
    except Error as error:
        print(error)

        if db:
            db.rollback()

        return False

    finally:
        if cursor:
            cursor.close()

        if db and db.is_connected:
            db.close()

def dbPostFlowConfiguration(flowConfigData):
    db = None

    cursor = None

    try:
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor(dictionary=True)

        query = """
            INSERT INTO flow_config(
                approach_id,
                approach_name,
                freeflow_max,
                slowdown_max
            )
            VALUES (%s, %s, %s, %s)

            ON DUPLICATE KEY UPDATE
                approach_name = Values(approach_name),
                freeflow_max = Values(freeflow_max),
                slowdown_max = Values(slowdown_max)
        """
        values = []

        for config in flowConfigData:
            values.append((
                config["approach_id"],
                config["approach_name"],
                config["freeflow_max"],
                config["slowdown_max"]
            ))

        cursor.executemany(query, values)

        db.commit()
        return True

    except Error as error:
        print(error)
        return []

    finally:
        if cursor:
            cursor.close()

        if db and db.is_connected:
            db.close()

def postViolationData(violationData):
    db = None
    cursor = None

    try:
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor(dictionary=True)

        query = """
            INSERT INTO violations(
                camera_id,
                vehicle,
                violation_type,
                time_stamp,
                frame
            )
            values(%s, %s, %s, %s, %s)
        """
        values=[]
        values.append((
            violationData["cameraId"],
            violationData["vehicle"],
            violationData["violationType"],
            violationData["timeStamp"],
            violationData["frame"]
        ))

        cursor.executemany(query, values)

        db.commit()
        return True

    except Error as error:
        print(error)   

    finally:
        if db and db.is_connected:
            db.close()

        if cursor:
            cursor.close()

def dbGetGreenLightTimers():
    db = None
    cursor = None

    try:
        db = mysql.connector.connect(**DB_CONFIG)

        cursor = db.cursor(dictionary=True)

        query = """
            SELECT
                approach_id,
                approach_name,
                freeflow,
                slowdown,
                congested
            FROM traffic_light_config
            ORDER BY approach_id
        """

        cursor.execute(query)

        configs = cursor.fetchall()

        return configs

    except Error as error:
        print("Error getting traffic light timers:", error)
        return []

    finally:
        if cursor:
            cursor.close()

        if db and db.is_connected():
            db.close()


def dbGetDensityConfig():
    started = time.perf_counter()
    connectDuration = 0
    queryDuration = 0
    db = None
    cursor = None

    try:
        connectStarted = time.perf_counter()
        db = mysql.connector.connect(**DB_CONFIG)
        connectDuration = time.perf_counter() - connectStarted
        cursor = db.cursor(dictionary=True)

        query = """
            SELECT
                approach_id,
                approach_name,
                freeflow_max,
                slowdown_max
            FROM density_config
            ORDER BY approach_id
        """
        queryStarted = time.perf_counter()
        cursor.execute(query)
        configs = cursor.fetchall()
        queryDuration = time.perf_counter() - queryStarted
        return configs
    except Error as error:
        print(error)
        return []
    finally:
        if cursor is not None:
            cursor.close()
        if db is not None and db.is_connected():
            db.close()
        logDbPerf("dbGetDensityConfig", started, connectDuration, queryDuration)

def dbGetFlowConfiguration():
    started = time.perf_counter()
    connectDuration = 0
    queryDuration = 0
    db = None
    cursor = None

    try:
        connectStarted = time.perf_counter()
        db = mysql.connector.connect(**DB_CONFIG)
        connectDuration = time.perf_counter() - connectStarted
        cursor = db.cursor(dictionary=True)

        query = """
            SELECT
                approach_id,
                approach_name,
                freeflow_max,
                slowdown_max
            FROM flow_config
            ORDER BY approach_id
        """
        queryStarted = time.perf_counter()
        cursor.execute(query)
        configs = cursor.fetchall()
        queryDuration = time.perf_counter() - queryStarted
        return configs
    except Error as error:
        print(error)
        return []
    finally:
        if cursor is not None:
            cursor.close()
        if db is not None and db.is_connected():
            db.close()
        logDbPerf("dbGetFlowConfiguration", started, connectDuration, queryDuration)

def dbGetViolationData():
    started = time.perf_counter()
    connectDuration = 0
    queryDuration = 0
    db = None
    cursor = None
    try:
        connectStarted = time.perf_counter()
        db = mysql.connector.connect(**DB_CONFIG)
        connectDuration = time.perf_counter() - connectStarted
        cursor = db.cursor(dictionary=True)

        query = """
            SELECT
                camera_id,
                vehicle,
                violation_type,
                time_stamp,
                frame
            FROM violations
            ORDER BY time_stamp DESC
            LIMIT 40
        """
        queryStarted = time.perf_counter()
        cursor.execute(query)
        data = cursor.fetchall()
        queryDuration = time.perf_counter() - queryStarted
        return data
    except Error as error:
        print(error)
    finally:
        if cursor is not None:
            cursor.close()
        if db is not None and db.is_connected():
            db.close()
        logDbPerf("dbGetViolationData", started, connectDuration, queryDuration)

def dbGetRecentViolationMetadata(limit=40):
    started = time.perf_counter()
    connectDuration = 0
    queryDuration = 0
    db = None
    cursor = None
    try:
        connectStarted = time.perf_counter()
        db = mysql.connector.connect(**DB_CONFIG)
        connectDuration = time.perf_counter() - connectStarted
        cursor = db.cursor(dictionary=True)
        queryStarted = time.perf_counter()
        cursor.execute("""
            SELECT id, camera_id, vehicle, violation_type, time_stamp
            FROM violations
            ORDER BY id DESC
            LIMIT %s
        """, (limit,))
        data = cursor.fetchall()
        queryDuration = time.perf_counter() - queryStarted
        return data
    except Error as error:
        print(f"Database retrieval error: {error}")
        return []
    finally:
        if cursor is not None:
            cursor.close()
        if db is not None and db.is_connected():
            db.close()
        logDbPerf("dbGetRecentViolationMetadata", started, connectDuration, queryDuration)

def dbGetViolationEvidence(violationId):
    started = time.perf_counter()
    connectDuration = 0
    queryDuration = 0
    db = None
    cursor = None
    try:
        connectStarted = time.perf_counter()
        db = mysql.connector.connect(**DB_CONFIG)
        connectDuration = time.perf_counter() - connectStarted
        cursor = db.cursor(dictionary=True)
        queryStarted = time.perf_counter()
        cursor.execute("SELECT id, frame FROM violations WHERE id = %s", (violationId,))
        data = cursor.fetchone()
        queryDuration = time.perf_counter() - queryStarted
        return data
    except Error as error:
        print(f"Database retrieval error: {error}")
        return None
    finally:
        if cursor is not None:
            cursor.close()
        if db is not None and db.is_connected():
            db.close()
        logDbPerf("dbGetViolationEvidence", started, connectDuration, queryDuration)

def dbGetAllViolationData():
    started = time.perf_counter()
    connectDuration = 0
    queryDuration = 0
    db = None
    cursor = None
    try:
        connectStarted = time.perf_counter()
        db = mysql.connector.connect(**DB_CONFIG)
        connectDuration = time.perf_counter() - connectStarted
        cursor = db.cursor(dictionary=True)

        query = """
            SELECT
                camera_id,
                vehicle,
                violation_type,
                time_stamp
            FROM violations
            ORDER BY time_stamp DESC
        """
        queryStarted = time.perf_counter()
        cursor.execute(query)
        data = cursor.fetchall()
        queryDuration = time.perf_counter() - queryStarted
        return data
    except Error as error:
        print(error)
        return []
    finally:
        if cursor is not None:
            cursor.close()
        if db is not None and db.is_connected():
            db.close()
        logDbPerf("dbGetAllViolationData", started, connectDuration, queryDuration)
def dbGetViolationPage(page=1, pageSize=10, searchTerm="", violationType=None, includeEvidence=True):
    db = None
    cursor = None
    try:
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor(dictionary=True)

        filters = []
        params = []
        if violationType in (1, 2):
            filters.append("violation_type = %s")
            params.append(violationType)
        if searchTerm:
            filters.append("""
                (
                    LOWER(vehicle) LIKE %s
                    OR LOWER(CAST(time_stamp AS CHAR)) LIKE %s
                    OR CAST(camera_id AS CHAR) LIKE %s
                )
            """)
            searchValue = f"%{searchTerm.lower()}%"
            params.extend([searchValue, searchValue, searchValue])

        whereClause = f"WHERE {' AND '.join(filters)}" if filters else ""
        cursor.execute(f"SELECT COUNT(*) AS total FROM violations {whereClause}", params)
        total = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT
                COUNT(*) AS total,
                COALESCE(SUM(violation_type = 1), 0) AS loadingCount,
                COALESCE(SUM(violation_type = 2), 0) AS parkingCount
            FROM violations
        """)
        counts = cursor.fetchone()

        offset = (page - 1) * pageSize
        evidenceColumn = ", frame" if includeEvidence else ""
        cursor.execute(f"""
            SELECT
                id,
                camera_id,
                vehicle,
                violation_type,
                time_stamp{evidenceColumn}
            FROM violations
            {whereClause}
            ORDER BY time_stamp DESC
            LIMIT %s OFFSET %s
        """, [*params, pageSize, offset])

        return {"violations": cursor.fetchall(), "total": total, "counts": counts}
    except Error as error:
        print(error)
        return {"violations": [], "total": 0, "counts": {"total": 0, "loadingCount": 0, "parkingCount": 0}}
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()
