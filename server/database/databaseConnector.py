import mysql.connector
from mysql.connector import Error

def saveTrafficInterval(data: dict) -> bool:
    db = None
    cursor = None

    db = mysql.connector.connect(
    host = "localhost",
    user = "root",
    password = "",
    database = "easyflow",
    )


    try:
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

        print(f'Saved interval for {data["cameraId"]}')
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