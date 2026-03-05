const deck = document.getElementById('deck');
const hand = document.getElementById('hand');
const resetBtn = document.getElementById('resetBtn');
const scene = document.querySelector('.scene');
const focusOverlay = document.getElementById('focusOverlay');

let isDrawing = false;
let drawnCards = [];
let focusedCard = null;

deck.addEventListener('click', () => {
    if (isDrawing || drawnCards.length > 0) return;
    drawThreeCards();
});

resetBtn.addEventListener('click', resetTest);

focusOverlay.addEventListener('click', () => {
    if (focusedCard) blurCard(focusedCard);
});

async function drawThreeCards() {
    isDrawing = true;

    // 隱藏提示
    document.querySelector('.deck-hint').style.opacity = '0';

    for (let i = 0; i < 3; i++) {
        await drawOneCard(i);
        await sleep(200); // 抽取間隔
    }

    await sleep(400); // 等待抽取動畫完成
    fanOutCards();
    isDrawing = false;
}

function drawOneCard(index) {
    return new Promise((resolve) => {
        const card = document.createElement('div');
        card.className = 'drawn-card';

        // 初始位置在牌堆（遠處）
        card.style.transform = `rotateX(60deg) rotateZ(-10deg) translateZ(-50px) scale(0.6)`;

        card.innerHTML = `
            <div class="card-inner">
                <div class="face face-front"></div>
                <div class="face face-back"></div>
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (isDrawing) return;
            e.stopPropagation();
            if (focusedCard === card) {
                blurCard(card);
            } else {
                focusCard(card);
            }
        });

        hand.appendChild(card);
        drawnCards.push(card);

        // 強制 reflow
        card.offsetHeight;

        // 抽取效果：移動到中心上方
        card.style.opacity = '1';
        card.style.transform = `translateY(-150px) translateZ(100px) rotateX(0deg) scale(1)`;

        setTimeout(resolve, 800);
    });
}

function focusCard(card) {
    if (focusedCard && focusedCard !== card) blurCard(focusedCard);

    focusedCard = card;
    card.classList.add('focused');
    scene.classList.add('has-focus');
}

function blurCard(card) {
    card.classList.remove('focused');
    scene.classList.remove('has-focus');
    focusedCard = null;
}

function fanOutCards() {
    const cardData = [
        { x: -100, rotate: -15, y: 30 },
        { x: 0, rotate: 0, y: 0 },
        { x: 100, rotate: 15, y: 30 }
    ];

    drawnCards.forEach((card, i) => {
        const data = cardData[i];
        // 最終展開狀態：扇形，面向我
        card.style.transform = `translateX(${data.x}px) translateY(${data.y}px) translateZ(150px) rotateZ(${data.rotate}deg) rotateX(0deg) scale(1.3)`;
    });
}

function resetTest() {
    if (isDrawing) return;

    drawnCards.forEach(card => card.remove());
    drawnCards = [];
    document.querySelector('.deck-hint').style.opacity = '1';
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
