var board = null;

async function updateUI() {
    const res = await fetch('/status');
    const data = await res.json();

    board.position(data.fen);
    updateEvalBar(data.score);
    renderHistory(data.history);
    highlightBestMove(data.next_best_move);

    document.getElementById('fen-display').innerText = data.fen;
}

function highlightBestMove(move) {
    // Удаляем старую подсветку со всех клеток
    // Chessboard.js добавляет класс .square-XXXX к каждой клетке
    $('.square-55d63').removeClass('highlight-hint');

    if (!move) return;

    // Парсим UCI строку (например, "e2e4")
    const from = move.slice(0, 2); // "e2"
    const to = move.slice(2, 4);   // "e4"

    // Добавляем класс нужным клеткам через jQuery
    // (chessboard.js помечает клетки как .square-e2, .square-e4)
    $(`.square-${from}`).addClass('highlight-hint');
    $(`.square-${to}`).addClass('highlight-hint');
}

function updateEvalBar(score) {
    let displayScore = Math.max(-5, Math.min(5, score));
    let percentage = ((displayScore + 5) / 10) * 100;

    document.getElementById('eval-bar-fill').style.height = percentage + '%';
    document.getElementById('eval-score-text').innerText = score.toFixed(1);
    document.getElementById('eval-score-text').style.color = percentage > 50 ? 'black' : 'white';
}

function renderHistory(history) {
    let html = "";
    for (let i = 0; i < history.length; i += 2) {
        let moveNum = Math.floor(i/2) + 1;
        html += `<div><span>${moveNum}.</span> ${history[i]} ${history[i+1] || ''}</div>`;
    }
    const container = document.getElementById('move-list');
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

function onDrop (source, target) {
    let moveUci = source + target;
    fetch('/make_move', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({move: moveUci})
    }).then(() => updateUI());
}

async function makeAiMove() {
    await fetch('/stockfish_move', {method: 'POST'});
    updateUI();
}

async function resetGame() {
    await fetch('/reset', {method: 'POST'});
    updateUI();
}

// Инициализация
$(document).ready(function () {
    board = Chessboard('board', {
        draggable: true,
        position: 'start',
        onDrop: onDrop,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    });
    updateUI();
});