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



def getForecastIntervals(lag: int = 12):
    db = None
    cursor = None

    try:
        db = mysql.connector.connect(**DB_CONFIG)

        cursor = db.cursor(dictionary=True)

        query = """
            SELECT
                grouped.time_step,
                traffic.camera_id,
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
                LIMIT %s
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

        cursor.execute(query, (lag,))
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



getForecastIntervals()