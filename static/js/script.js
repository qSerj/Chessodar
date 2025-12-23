var board = null;
var currentHint = null;

const App = {
    mode: 'play',
    showHints: true,
    autoPlay: false,
    board: null,
    blockAutoPlay: false, // Наш новый предохранитель
    isAiThinking: false
};

// Функция переключения табов
window.openTab = function(evt, tabId) {
    $('.tab-content').removeClass('active');
    $('.tab-btn').removeClass('active');
    $(`#${tabId}`).addClass('active');
    $(evt.currentTarget).addClass('active');
};

window.updateUI = async function() {
    try {
        const res = await fetch('/status');
        const data = await res.json();

        board.position(data.fen);
        renderHistory(data.history);

        const playerColor = $('#player-color').val();
        const turnColor = (data.turn === 'w' ? 'white' : 'black');
        const autoPlay = $('#auto-play-check').is(':checked');

        // 1. ЛОГИКА АВТО-ХОДА (Очищенная)
        // ИИ ходит только если: включен авто-ход И не ход игрока И игра не закончена И нет блокировки И ИИ еще не думает
        const isItAiTurn = (playerColor !== turnColor);

        if (autoPlay && isItAiTurn && !data.is_game_over && !App.blockAutoPlay && !App.isAiThinking) {
            setTimeout(makeAiMove, 600);
        }
        App.blockAutoPlay = false;

        // 2. ТЕКСТ СТАТУСА (Прозрачная логика)
        let statusText = "";
        if (data.is_game_over) {
            statusText = "🏁 Игра окончена";
        } else {
            // Явное определение базовой надписи
            statusText = (data.turn === 'w' ? "⚪ Ход белых" : "⚫ Ход черных");

            // Добавляем пояснение
            if (turnColor === playerColor) {
                statusText += " — Твой ход";
            } else {
                statusText += " — Думает ИИ...";
            }
        }
        $('#game-status-line').text(statusText);

        // Шкала и прочее...
        let displayScore = Math.max(-5, Math.min(5, data.score));
        $('#eval-bar-fill').css('height', ((displayScore + 5) / 10 * 100) + '%');
        $('#eval-score-text').text(data.score.toFixed(1));

    } catch (err) {
        console.error("UI Update Error:", err);
    }
};

window.makeAiMove = async function() {
    if (App.isAiThinking) return;

    App.isAiThinking = true;
    await fetch('/stockfish_move', { method: 'POST' });
    App.isAiThinking = false;

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

// Смена цвета (Просто переворачивает доску и дергает UI)
window.changeOrientation = function() {
    if (!board) return;
    const color = $('#player-color').val();
    board.orientation(color);
    updateUI();
};

window.updateDepth = async function(val){
    $('depth-value').text(val);
    await fetch('/settings', {
        method: 'POST',
        headers: {'Content-Type' : 'application/json'},
        body: JSON.stringify({ depth: parseInt(val) })
    });
}

// Новая игра (Теперь БЕЗ лишних вызовов makeAiMove)
window.resetGame = async function() {
    App.blockAutoPlay = false;
    App.isAiThinking = false;
    await fetch('/reset', { method: 'POST' });

    // Просто синхронизируем вид и просим сервер дать статус
    const color = $('#player-color').val();
    board.orientation(color);

    updateUI(); // updateUI сам решит, нужно ли ИИ ходить (например, за белых)
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
    changeOrientation();
    updateUI();
});