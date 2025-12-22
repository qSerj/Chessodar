import chess
import chess.engine

class ChessBrain:
    def __init__(self, stockfish_path):
        # Запускаем движок
        self.engine = chess.engine.SimpleEngine.popen_uci(stockfish_path)
        self.board = chess.Board()

    def get_analysis(self, depth=15):
        """Возвращает оценку позиции и лучший ход"""
        info = self.engine.analyse(self.board, chess.engine.Limit(depth=depth))
        return {
            "score": info["score"].relative.score(mate_score=10000) / 100,
            "best_move": info.get("pv")[0].uci() if info.get("pv") else None
        }

    def make_move(self, move_uci):
        """Делает ход (например, 'e2e4')"""
        move = chess.Move.from_uci(move_uci)
        if move in self.board.legal_moves:
            self.board.push(move)
            return True
        return False

    def get_fen(self):
        return self.board.fen()

    def __del__(self):
        self.engine.quit()
