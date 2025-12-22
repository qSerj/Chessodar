import cv2
import numpy as np


def get_board_corners(frame):
    """
    Пытается найти шахматную доску.
    На этом этапе мы просто выводим изображение.
    В идеале — кликнуть по 4 углам вручную один раз при запуске.
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    # Поиск углов (можно использовать адаптивный порог)
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)

    return thresh


# Тестовый запуск захвата
def start_vision_test():
    cap = cv2.VideoCapture(0)  # 0 - твоя вебкамера
    while True:
        ret, frame = cap.read()
        if not ret: break

        # Для начала просто отображаем картинку
        cv2.imshow('Chess Vision Test', frame)

        # Нажми 'q' для выхода
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    start_vision_test()