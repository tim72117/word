const deck = document.getElementById('deck');
const hand = document.getElementById('hand');
const resetBtn = document.getElementById('resetBtn');
const scene = document.querySelector('.scene');
const focusOverlay = document.getElementById('focusOverlay');

let isDrawing = false;
let drawnCards = [];
let focusedCard = null;

let preparedWords = [];

// 初始化時取得準備好的字
async function initPreparedWords() {
    try {
        const response = await fetch('prepared_words.json');
        preparedWords = await response.json();
    } catch (e) {
        console.warn("無法讀取 prepared_words.json，將使用預設卡牌", e);
    }
}
initPreparedWords();

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
    return new Promise(async (resolve) => {
        const card = document.createElement('div');
        card.className = 'drawn-card';

        // 初始位置在牌堆（遠處），配合 768px 基礎尺寸調小縮放
        card.style.transform = `rotateX(60deg) rotateZ(-10deg) translateZ(-50px) scale(0.13)`;

        let cardContent = `
            <div class="card-inner">
                <div class="face face-front">
                    <img src="card_face.png" alt="Card Face" loading="eager" class="bg-layer">
                </div>
                <div class="face face-back"></div>
            </div>
        `;

        if (preparedWords.length > 0) {
            const randomWord = preparedWords[Math.floor(Math.random() * preparedWords.length)];
            const rootUrl = `characters/${randomWord}`;

            let config = null;
            // 嘗試取得該字的設定
            try {
                const configResp = await fetch(`${rootUrl}/.sketch_config.json`);
                config = await configResp.json();

                const bgImg = config.bgFilename ? `${rootUrl}/${config.bgFilename}` : 'card_face.png';

                // 動態生成文字元件
                let elementsHtml = '';
                if (config.elements && config.elements.length > 0) {
                    elementsHtml = config.elements.map(el => {
                        const style = `
                            left: ${el.left};
                            top: ${el.top};
                            font-size: ${el.fontSize};
                            font-family: ${el.fontFamily};
                            color: ${el.color};
                            transform: rotateX(${el.rotateX || 0}deg) rotateY(${el.rotateY || 0}deg) rotateZ(${el.rotateZ || 0}deg);
                        `;
                        return `<span class="char-element" style="${style}">${el.text}</span>`;
                    }).join('');
                }

                cardContent = `
                    <div class="card-inner">
                        <div class="face face-front">
                            <img src="${bgImg}" alt="Card Face" loading="eager" class="bg-layer">
                            <img src="${rootUrl}/ink.png" alt="Ink Layer" class="ink-layer">
                            <img src="${rootUrl}/ink_phono.png" alt="Phonetic Ink" class="ink-layer phono-ink" onerror="this.style.display='none'">
                            <img src="${rootUrl}/brush.png" alt="Brush Layer" class="brush-layer">
                            ${elementsHtml}
                        </div>
                        <div class="face face-back"></div>
                    </div>
                `;
            } catch (e) {
                console.warn(`載入 ${randomWord} 設定時出錯:`, e);
                // 標配備援
                cardContent = `
                    <div class="card-inner">
                        <div class="face face-front">
                            <img src="card_face.png" alt="Card Face" loading="eager" class="bg-layer">
                            <img src="${rootUrl}/ink.png" alt="Ink Layer" class="ink-layer">
                            <img src="${rootUrl}/brush.png" alt="Brush Layer" class="brush-layer">
                            ${elementsHtml}
                        </div>
                        <div class="face face-back"></div>
                    </div>
                `;
            }
        }

        card.innerHTML = cardContent;

        // 如果有聲符範圍，則加入動作按鈕
        if (config && config.phonoRange) {
            const r = config.phonoRange;
            const btn = document.createElement('button');
            btn.className = 'phono-action-btn';
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:100%; height:100%;">
                    <path d="M11 5L6 9H2V15H6L11 19V5Z"></path>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
            `;
            const left = ((r.x + r.width) / 768 * 100);
            const top = (r.y / 1344 * 100);
            btn.style.left = `${left}%`;
            btn.style.top = `${top}%`;
            btn.style.transform = 'translate(-50%, -50%) translateZ(5px)';

            // 加入聲符發光提示
            const glow = document.createElement('div');
            glow.className = 'phono-glow';
            glow.style.left = `${r.x / 768 * 100}%`;
            glow.style.top = `${r.y / 1344 * 100}%`;
            glow.style.width = `${r.width / 768 * 100}%`;
            glow.style.height = `${r.height / 1344 * 100}%`;
            card.querySelector('.face-front').appendChild(glow);

            btn.onclick = (e) => {
                e.stopPropagation();
                if ('speechSynthesis' in window) {
                    const phonoText = config.elements.find(el => el.isPhonetic)?.text || "";
                    const uttr = new SpeechSynthesisUtterance(phonoText || (typeof randomWord !== 'undefined' ? randomWord : ""));
                    uttr.lang = 'zh-TW';
                    window.speechSynthesis.speak(uttr);
                }
            };
            card.querySelector('.face-front').appendChild(btn);
        }

        // 如果有演變邏輯，則加入資訊面板
        if (config && config.evolution) {
            const info = document.createElement('div');
            info.className = 'char-info-panel';
            info.innerHTML = `
                <div class="info-title">字源演變邏輯</div>
                <div>${config.evolution}</div>
            `;
            card.querySelector('.face-front').appendChild(info);

            card.addEventListener('click', (e) => {
                if (isDrawing) return;
                e.stopPropagation();
                const isShowing = card.classList.toggle('show-info');

                // 點擊開啟說明時同步朗讀文字
                if (isShowing && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel(); // 停止之前的朗讀
                    const uttr = new SpeechSynthesisUtterance(config.evolution);
                    uttr.lang = 'zh-TW';
                    uttr.rate = 0.9; // 稍微放慢一點點以便聽得清演變邏輯
                    window.speechSynthesis.speak(uttr);
                }
            });
        }

        // 保持卡片可點擊（但不放大），如果需要其他點擊邏輯可在此添加
        // 原本的 focusCard/blurCard 邏輯已移除

        hand.appendChild(card);
        drawnCards.push(card);

        // 強制 reflow
        card.offsetHeight;

        // 抽取效果：移動到中心上方
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

function fanOutCards() {
    const cardData = [
        { x: -100, rotate: -15, y: 30 },
        { x: 0, rotate: 0, y: 0 },
        { x: 100, rotate: 15, y: 30 }
    ];

    drawnCards.forEach((card, i) => {
        const data = cardData[i];
        // 最終展開狀態：扇形，因基礎寬度 768px，需縮小至約 150px 的視覺大小
        card.style.transform = `translateX(${data.x}px) translateY(${data.y}px) translateZ(150px) rotateZ(${data.rotate}deg) rotateX(0deg) scale(0.2)`;
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
