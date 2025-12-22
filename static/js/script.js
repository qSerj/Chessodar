var board = null;
var currentHint = null;

const App = {
    mode: 'play',
    showHints: true,
    autoPlay: false,
    board: null,
    blockAutoPlay: false // Наш новый предохранитель
};

// Функция переключения табов
window.openTab = function(evt, tabId) {
    $('.tab-content').removeClass('active');
    $('.tab-btn').removeClass('active');
    $(`#${tabId}`).addClass('active');
    $(evt.currentTarget).addClass('active');
};

window.updateUI = async function() {
    const res = await fetch('/status');
    const data = await res.json();

    board.position(data.fen);

    currentHint = data.next_best_move;

    // Обновление шкалы
    let displayScore = Math.max(-5, Math.min(5, data.score));
    let percentage = ((displayScore + 5) / 10) * 100;
    $('#eval-bar-fill').css('height', percentage + '%');
    $('#eval-score-text').text(data.score.toFixed(1));

    highlightBestMove(null);

    // Авто-ход
    const canAutoPlay = $('#auto-play-check').is(':checked') && data.turn === 'b' && !data.is_game_over && !App.blockAutoPlay;

    if (canAutoPlay) {
        setTimeout(makeAiMove, 600);
    }

    App.blockAutoPlay = false;

    // Текст статуса
    let statusText = data.is_game_over ? "Игра окончена" : (data.turn === 'w' ? "Ход белых" : "Ход черных");
    $('#game-status-line').text(statusText);
};

window.makeAiMove = async function() {
    await fetch('/stockfish_move', { method: 'POST' });
    updateUI();
};

window.resetGame = async function() {
    await fetch('/reset', { method: 'POST' });
    updateUI();
};

window.undoMove = async function() {
    App.blockAutoPlay = true;
    await fetch('/undo', { method: 'POST' });
    updateUI();
};

// Функция для кнопки "Подсказка"
window.showHint = function() {
    if (currentHint) {
        highlightBestMove(currentHint);
    } else {
        console.log("Подсказка еще не готова или партия окончена");
    }
};

// Исправленная функция подсветки
function highlightBestMove(move) {
    // Очищаем все подсвеченные клетки (универсальный способ)
    $('.highlight-hint').removeClass('highlight-hint');

    if (!move) return;

    const from = move.slice(0, 2);
    const to = move.slice(2, 4);

    // Добавляем подсветку
    $(`.square-${from}`).addClass('highlight-hint');
    $(`.square-${to}`).addClass('highlight-hint');
}

function onDrop(source, target) {
    fetch('/make_move', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({move: source + target})
    }).then(() => updateUI());
}

// Старт
$(document).ready(function () {
    board = Chessboard('board', {
        draggable: true,
        position: 'start',
        onDrop: onDrop,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    });
    updateUI();
});