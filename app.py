from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import chess
import chess.engine
import uvicorn

app = FastAPI()

# Путь к Стокфишу
SF_PATH = ""
board = chess.Board()

@app.get("/", response_class=HTMLResponse)
async def get_index():
    with open("index.html", "r", encoding="utf-8") as f:
        return f.read()

@app.get("/status")
async def get_status():
    return {
        "fen": board.fen(),
        "is_game_over": board.is_game_over(),
        "turn": "White" if board.turn else "Black"
    }

@app.post("/move")
async def make_move(data: dict):
    move_uci = data.get("move")
    try:
        move = chess.Move.from_uci(move_uci)
        if move in board.legal_moves:
            board.push(move)
            return {"status": "ok", "fen": board.fen()}
        return {"status": "illegal"}
    except:
        return {"status": "error"}

@app.post("/ai_move")
async def ai_move():
    engine = chess.engine.SimpleEngine.popen_uci(SF_PATH)
    result = engine.play(board, chess.engine.Limit(time=0.5))
    board.push(result.move)
    engine.quit()
    return {"move": result.move.uci(), "fen": board.fen()}

@app.post("/reset")
async def reset(data: dict = None):
    global board
    fen = data.get("fen") if data else None
    if fen:
        board = chess.Board(fen)
    else:
        board = chess.Board()
    return {"status": "reset", "fen": board.fen()}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)