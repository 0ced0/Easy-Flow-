import cv2
import urllib.parse as u

username = "admin"
password = "Stacruz@2022"

url = (
    f"rtsp://{u.quote(username, safe='')}:{u.quote(password, safe='')}"
    "@172.1.5.92:554/Streaming/Channels/101"
)

cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)

print("Opened:", cap.isOpened())

ok, frame = cap.read()
print("Frame:", ok)
print("Shape:", None if frame is None else frame.shape)

cap.release()