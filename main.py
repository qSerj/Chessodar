import json
import chess
import chess.engine
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

# --- 1. Конфигурация (аналог App.config или .ini) ---
with open('config.json') as f:
    config = json.load(f)

# --- 2. Глобальное состояние (Singletons) ---
board = chess.Board()
engine_instance = None  # Ссылка на процесс движка


# --- 3. Жизненный цикл (аналог конструктора/деструктора приложения или RAII) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine_instance
    # Выполняется при старте сервера (Startup)
    engine_instance = chess.engine.SimpleEngine.popen_uci(config['stockfish_path'])
    yield
    print("Остановка Stockfish...")
    if engine_instance:
        try:
            # Пытаемся закрыть вежливо
            engine_instance.quit()
        except (chess.engine.EngineTerminatedError, Exception):
            # Если он уже "мертв" или произошла ошибка связи — это не критично при выходе
            print("Stockfish уже был завершен или не ответил.")

app = FastAPI(lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")


class MoveModel(BaseModel):
    move: str  # UCI формат, например "e2e4"


# --- 4. Вспомогательные функции ---
def get_history_san():
    """
    Надежно формирует список ходов в SAN (например, ['e4', 'e5', 'Nf3']).
    Мы создаем временную доску и 'проигрываем' партию с нуля,
    чтобы получить правильную нотацию для каждого шага.
    """
    temp_board = chess.Board()
    san_history = []

    for move in board.move_stack:
        # Сначала получаем SAN-строку (например, 'e4')
        san_move = temp_board.san(move)
        san_history.append(san_move)
        # Потом реально делаем этот ход на временной доске
        temp_board.push(move)

    return san_history

# --- 5. Эндпоинты (API) ---

@app.get("/", response_class=HTMLResponse)
async def get_index():
    with open("index.html", encoding="utf-8") as f:
        return f.read()


@app.get("/status")
async def get_status():
    """
    Основной поток данных для фронтенда.
    Аналог GetState() в десктопном приложении.
    """
    # Анализ позиции (ограничен по времени для отзывчивости UI)
    info = engine_instance.analyse(board, chess.engine.Limit(time=0.1))

    # Обработка оценки (Score)
    score_obj = info["score"].relative
    if score_obj.is_mate():
        # Если мат — выставляем полярные значения
        score = 100.0 if score_obj.mate() > 0 else -100.0
    else:
        score = score_obj.score() / 100.0

    # Инвертируем оценку для шкалы (чтобы белые всегда были '+')
    display_score = score if board.turn == chess.WHITE else -score

    return {
        "fen": board.fen(),
        "turn": "w" if board.turn == chess.WHITE else "b",
        "history": get_history_san(),
        "score": display_score,
        "is_game_over": board.is_game_over(),
        "next_best_move": info["pv"][0].uci() if info.get("pv") else None
    }


@app.post("/make_move")
async def make_move(data: MoveModel):
    """ Принимает ход от игрока (Drag-and-Drop в браузере) """
    try:
        move = chess.Move.from_uci(data.move)
        if move in board.legal_moves:
            board.push(move)
            return {"status": "ok"}
        return {"status": "illegal"}
    except:
        return {"status": "error"}


@app.post("/stockfish_move")
async def stockfish_move():
    """ Ход за компьютер. Тот самый участок, который теперь не падает. """
    if board.is_game_over():
        return {"status": "game_over"}

    try:
        # Просим движок сделать ход
        result = engine_instance.play(board, chess.engine.Limit(depth=config['depth']))
        board.push(result.move)
        return {"status": "ok"}
    except Exception as e:
        # Аналог throw new Exception(...)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reset")
async def reset():
    global board
    board = chess.Board()
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=config['host'], port=config['port'])