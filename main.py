import json
import chess
import chess.engine
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from fastapi.responses import HTMLResponse

with open('config.json') as f:
    config = json.load(f)

app = FastAPI()
board = chess.Board()


class MoveModel(BaseModel):
    move: str


@app.get("/", response_class=HTMLResponse)
async def get_index():
    with open("index.html", encoding="utf-8") as f:
        return f.read()


def get_history_san():
    """Преобразует историю ходов в список строк (e2e4 -> e4)"""
    temp_board = chess.Board()
    san_history = []
    for move in board.move_stack:
        san_history.append(temp_board.san(move))
        temp_board.push(move)
    return san_history


@app.get("/status")
async def get_status():
    # Быстрый анализ для шкалы (ограничим время 0.1 сек, чтобы не лагало)
    engine = chess.engine.SimpleEngine.popen_uci(config['stockfish_path'])
    info = engine.analyse(board, chess.engine.Limit(time=0.1))

    # Получаем оценку в пешках (centipawns)
    score = info["score"].relative.score(mate_score=10000)
    # Если ход черных, инвертируем для абсолютной оценки (белые + / черные -)
    if board.turn == chess.BLACK:
        score = -score

    engine.quit()

    return {
        "fen": board.fen(),
        "turn": "w" if board.turn == chess.WHITE else "b",
        "history": get_history_san(),
        "score": score / 100.0,  # Превращаем 150 в 1.5
        "is_game_over": board.is_game_over()
    }


@app.post("/make_move")
async def make_move(data: MoveModel):
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
    engine = chess.engine.SimpleEngine.popen_uci(config['stockfish_path'])
    result = engine.play(board, chess.engine.Limit(depth=config['depth']))
    board.push(result.move)
    engine.quit()
    return {"status": "ok"}


@app.post("/reset")
async def reset():
    global board
    board = chess.Board()
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=config['host'], port=config['port'])