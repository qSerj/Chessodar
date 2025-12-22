import cv2
import numpy as np
import json

# Список для хранения координат 4 углов
points = []


def click_event(event, x, y, flags, params):
    if event == cv2.EVENT_LBUTTONDOWN:
        points.append([x, y])
        cv2.circle(params['frame'], (x, y), 5, (0, 255, 0), -1)
        cv2.imshow("Calibration", params['frame'])
        if len(points) == 4:
            print("Все 4 точки получены!")


def calibrate():
    cap = cv2.VideoCapture(0)
    ret, frame = cap.read()
    if not ret:
        print("Не удалось подключиться к камере")
        return

    params = {'frame': frame.copy()}
    cv2.imshow("Calibration", frame)
    cv2.setMouseCallback("Calibration", click_event, params)

    print("Кликни по 4 углам доски (ВЛ -> ВП -> НП -> НЛ)")

    while len(points) < 4:
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Сохраняем точки в файл config.json
    with open('config.json', 'w') as f:
        json.dump(points, f)

    # Считаем матрицу трансформации для проверки
    pts1 = np.float32(points)
    pts2 = np.float32([[0, 0], [800, 0], [800, 800], [0, 800]])
    matrix = cv2.getPerspectiveTransform(pts1, pts2)

    while True:
        ret, frame = cap.read()
        # Применяем трансформацию в реальном времени
        warped = cv2.warpPerspective(frame, matrix, (800, 800))

        # Рисуем сетку 8x8 для проверки
        for i in range(1, 8):
            cv2.line(warped, (i * 100, 0), (i * 100, 800), (255, 0, 0), 1)
            cv2.line(warped, (0, i * 100), (800, i * 100), (255, 0, 0), 1)

        cv2.imshow("Result (Warped)", warped)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    calibrate()