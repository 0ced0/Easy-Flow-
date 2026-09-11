import mysql.connector
from mysql.connector import Error
from datetime import datetime
from zoneinfo import ZoneInfo
import statistics

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

def dbGetMonthlyData(cameraId, month=None):
    db = None
    cursor = None

    try:
        db = mysql.connector.connect(**DB_CONFIG)
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

        cursor.execute(query, values)

        data = cursor.fetchall()
        return data
    
    except ValueError as error:
        print(error)

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
    db = None
    cursor = None

    if date is None:
        date = datetime.now(ZoneInfo("Asia/Manila")).date()

    try:
        db = mysql.connector.connect(**DB_CONFIG)
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

        cursor.execute(query, values)

        data = cursor.fetchall()
        return data
    
    except Error as error:
        print(error)

def dbGetDailyData(cameraId, page, dateFilter):
        offset = (page - 1) * 6
        db = None
        cursor = None

        try:
            db = mysql.connector.connect(**DB_CONFIG)
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

            cursor.execute(query, values)
            response = cursor.fetchall()
            return response
        
        except Error as error:
            print(error)

def dbGetDataTable(cameraId=None, page=None, dateFilter=None):
    db = None
    cursor = None

    try:
        db = mysql.connector.connect(**DB_CONFIG)
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
                frame
            FROM violations
            ORDER BY time_stamp DESC
            LIMIT 40
        """
        cursor.execute(query)

        data = cursor.fetchall()

        return data
    except Error as error:
        print(error)
