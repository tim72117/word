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

    // 1. 取得可用字清單
    let folders = ["袁"]; // 預設
    try {
        const listResp = await fetch('http://localhost:8000/list', { method: 'POST' });
        const listData = await listResp.json();
        if (listData.status === 'success') folders = listData.folders;
    } catch (e) { console.error("無法連線至 Sketch Server 取得清單", e); }

    const targetChar = folders[Math.floor(Math.random() * folders.length)];

    // 2. 取得該字設定
    let config = null;
    try {
        const configResp = await fetch(`http://localhost:8000/characters/${targetChar}/.sketch_config.json`);
        config = await configResp.json();
    } catch (e) { console.warn("找不到設定檔，將嘗試預設路徑"); }

    await drawOneCard(targetChar, config);

    await sleep(400); // 等待抽取動畫完成
    centerCard(targetChar);
    isDrawing = false;
}

function drawOneCard(charName, config) {
    return new Promise((resolve) => {
        const card = document.createElement('div');
        card.className = 'drawn-card';
        card.dataset.char = charName;

        // 初始位置在牌堆（遠處），使用極小縮放配合 768px 物理尺寸
        card.style.transform = `rotateX(60deg) rotateZ(-10deg) translateZ(-50px) scale(0.13)`;

        // 判斷底圖
        const bgUrl = config && config.bgFilename
            ? `characters/${charName}/${config.bgFilename}`
            : `characters/${charName}/${charName}_01.png`; // 備援

        card.innerHTML = `
            <div class="card-inner">
                <div class="face face-front">
                    <img src="${bgUrl}" class="bg-layer" alt="Background">
                    <img src="characters/${charName}/ink.png" class="ink-layer" alt="Ink">
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

async function centerCard(charName) {
    if (drawnCards.length > 0) {
        const card = drawnCards[0];
        // 最終狀態：位居正中，微微上移騰出空間給底部文字面板
        card.style.transform = `translateX(0px) translateY(-40px) translateZ(300px) rotateZ(0deg) rotateX(0deg) scale(0.33)`;

        // 嘗試抓取 info.md 內容
        let title = charName;
        let desc = "載入中...";
        try {
            const infoResp = await fetch(`characters/${charName}/info.md`);
            const text = await infoResp.text();
            // 簡單解析 markdown (提取標題與內容)
            const lines = text.split('\n');
            const h1Match = lines.find(l => l.startsWith('# '));
            if (h1Match) title = h1Match.replace('# ', '').trim();
            const pMatch = lines.find(l => l.length > 10 && !l.startsWith('#') && !l.startsWith('!'));
            if (pMatch) desc = pMatch.trim();
        } catch (e) { desc = "尚無說明文字。"; }

        document.getElementById('cardInfoTitle').textContent = title;
        document.getElementById('cardInfoDesc').textContent = desc;

        // 動畫結束後浮現說明面板
        setTimeout(() => {
            scene.classList.add('show-info');
        }, 600);
    }
}

function resetTest() {
    if (isDrawing) return;

    // 隱藏說明面板
    scene.classList.remove('show-info');

    drawnCards.forEach(card => card.remove());
    drawnCards = [];
    document.querySelector('.deck-hint').style.opacity = '1';
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
