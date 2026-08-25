import mysql.connector
from mysql.connector import Error

DB_CONFIG = {
    "host" : "localhost",
    "user" : "root",
    "password" : "",
    "database" : "easyflow",
    }

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

def dbGetDataTable(cameraId, page, dateFilter):
    offset = (page - 1) * 10
    db = None
    cursor = None

    print(dateFilter)
    try:
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor(dictionary=True)

        if not dateFilter: 
            query = """
                SELECT 
                    camera_id,
                    vehicle_count,
                    traffic_flow,
                    spatial_density,
                    created_at
                    FROM traffic_interval
                    WHERE camera_id = %s
                    ORDER BY created_at DESC
                    LIMIT 10
                    OFFSET %s
            """
            values = [cameraId, offset]

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
                LIMIT 10
                OFFSET %s

            """
            values=[cameraId, dateFilter, dateFilter, offset]

        cursor.execute(query, values)
        response = cursor.fetchall()
        return response
    except Error as error:
        print(error)


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

        db.commit
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
    db = None
    cursor = None

    try:
        db = mysql.connector.connect(**DB_CONFIG)

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

        cursor.execute(query)

        configs = cursor.fetchall()

        return configs
    except Error as error:
        print(error)
        return []

def dbGetFlowConfiguration():
    db = None
    cursor = None

    try:
        db = mysql.connector.connect(**DB_CONFIG)
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

        cursor.execute(query)

        configs = cursor.fetchall()

        return configs
    except Error as error:
        print(error)
        return []

def dbGetViolationData():
    db = None
    cursor = None
    try:
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor(dictionary=True)

        query = """
            SELECT 
                camera_id,
                vehicle,
                violation_type,
                time_stamp,
                frame, 
                created_at
        """
    except Error as error:
        print(error)