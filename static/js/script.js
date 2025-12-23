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

    renderHistory(data.history);

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

window.renderHistory = function(history) {
    let html = "";
    // Проходим по массиву, объединяя ходы в пары (1. e4 e5)
    for (let i = 0; i < history.length; i += 2) {
        let moveNum = Math.floor(i / 2) + 1;
        let whiteMove = history[i];
        let blackMove = history[i + 1] || ""; // Если черные еще не сходили, будет пусто

        html += `<div class="move-row">
                    <span class="move-num">${moveNum}.</span>
                    <span class="move-val">${whiteMove}</span>
                    <span class="move-val">${blackMove}</span>
                 </div>`;
    }

    const container = document.getElementById('move-list');
    if (container) {
        container.innerHTML = html;
        // Автоматическая прокрутка вниз к последнему ходу (аналог AutoScroll)
        container.scrollTop = container.scrollHeight;
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

// Входим в режим редактора
window.enterEditorMode = function() {
    $('#editor-controls').css('display', 'flex');
    $('button[onclick="enterEditorMode()"]').hide();

    // Пересоздаем доску с запасными фигурами
    const config = {
        draggable: true,
        dropOffBoard: 'trash', // Фигуры можно выбрасывать с доски
        sparePieces: true,     // Появляются кнопки с фигурами под доской
        position: board.position(),
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };

    // Уничтожаем старую доску и создаем "редакторскую"
    board.destroy();
    board = Chessboard('board', config);
};

// Выход из редактора без сохранения
window.exitEditorMode = function() {
    $('#editor-controls').hide();
    $('button[onclick="enterEditorMode()"]').show();

    // Возвращаем обычную доску
    initNormalBoard();
    updateUI();
};

// Очистка доски
window.clearBoard = async function() {
    await fetch('/clear_board', { method: 'POST' });
    board.clear(false); // false означает "без анимации"
};

// Начальная позиция
window.setStartPosition = function() {
    board.start(false);
};

// Сохранение позиции
window.saveEditorPosition = async function() {
    const fen = board.fen() + " w KQkq - 0 1"; // Добавляем стандартные хвосты FEN
    const res = await fetch('/set_fen', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ fen: fen })
    });

    if (res.ok) {
        exitEditorMode();
    } else {
        alert("Ошибка: Некорректная расстановка фигур!");
    }
};

// Вспомогательная функция для инициализации обычной игры
function initNormalBoard() {
    if (board) board.destroy();
    board = Chessboard('board', {
        draggable: true,
        position: 'start',
        onDrop: onDrop,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    });
}

// Старт
$(document).ready(function () {
    initNormalBoard(); // Используем общую функцию инициализации
    updateUI();
});