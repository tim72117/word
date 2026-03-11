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
    drawSingleCard();
});

resetBtn.addEventListener('click', resetTest);

focusOverlay.addEventListener('click', () => {
    if (focusedCard) blurCard(focusedCard);
});

async function drawSingleCard() {
    isDrawing = true;

    // 隱藏提示
    document.querySelector('.deck-hint').style.opacity = '0';

    await drawOneCard(0);

    await sleep(400); // 等待抽取動畫完成
    centerCard();
    isDrawing = false;
}

function drawOneCard(index) {
    return new Promise((resolve) => {
        const card = document.createElement('div');
        card.className = 'drawn-card';

        // 初始位置在牌堆（遠處），使用極小縮放配合 768px 物理尺寸
        card.style.transform = `rotateX(60deg) rotateZ(-10deg) translateZ(-50px) scale(0.13)`;

        card.innerHTML = `
            <div class="card-inner">
                <div class="face face-front">
                    <img src="card_face.png" alt="Card Face" loading="eager">
                </div>
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

        // 抽取效果：移動到中心上方，視覺維持中等大小
        card.style.opacity = '1';
        card.style.transform = `translateY(-150px) translateZ(100px) rotateX(0deg) scale(0.2)`;

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

function centerCard() {
    if (drawnCards.length > 0) {
        const card = drawnCards[0];
        // 最終狀態：位居正中
        // 配合 768px 物理解像度，將縮放降至 0.33 以確保在 390px 寬的容器中四周皆有間距
        // 只要物理像素足夠 (768px)，縮小顯示能保證絕對銳利
        card.style.transform = `translateX(0px) translateY(0px) translateZ(300px) rotateZ(0deg) rotateX(0deg) scale(0.33)`;
    }
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
