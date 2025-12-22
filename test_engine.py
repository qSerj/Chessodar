import chess.engine

# ЗАМЕНИ НА СВОЙ ПУТЬ (например: "C:/chess/stockfish.exe" или "./stockfish")
SF_PATH = "/home/qserj/PycharmProjects/ChessA/stockfish/stockfish-ubuntu-x86-64-avx2"

try:
    engine = chess.engine.SimpleEngine.popen_uci(SF_PATH)
    board = chess.Board()

    # Просим движок подумать 0.1 секунды
    result = engine.play(board, chess.engine.Limit(time=0.1))
    print(f"Стокфиш жив! Его первый ход: {result.move}")

    engine.quit()
except Exception as e:
    print(f"Ошибка запуска: {e}")