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

    // 1. 取得可用字清單 (僅限準備好的字)
    let folders = [];
    try {
        const response = await fetch('prepared_words.json');
        folders = await response.json();
    } catch (e) {
        console.error("無法讀取 prepared_words.json", e);
    }

    if (folders.length === 0) {
        console.warn("清單為空，無法抽卡");
        isDrawing = false;
        return;
    }

    const targetChar = folders[Math.floor(Math.random() * folders.length)];

    // 2. 取得該字設定
    let config = null;
    try {
        const configResp = await fetch(`characters/${targetChar}/.sketch_config.json`);
        config = await configResp.json();
    } catch (e) { console.warn("找不到設定檔，將嘗試預設路徑"); }

    await drawOneCard(targetChar, config);

    await sleep(400); // 等待抽取動畫完成
    centerCard(targetChar, config);
    isDrawing = false;
}

function drawOneCard(charName, config) {
    return new Promise((resolve) => {
        const card = document.createElement('div');
        card.className = 'drawn-card';
        card.dataset.char = charName;

        // 初始位置在牌堆（遠處），使用極小縮放配合 768px 物理尺寸
        card.style.transform = `rotateX(60deg) rotateZ(-10deg) translateZ(-50px) scale(0.13)`;

        // 3D 旋轉效果
        let rotationCss = '';
        if (config && config.elements && config.elements.length > 0) {
            const el = config.elements[0];
            rotationCss = `rotateX(${el.rotateX || 0}deg) rotateY(${el.rotateY || 0}deg) rotateZ(${el.rotateZ || 0}deg)`;
        }

        // 判斷底圖
        const bgImg = config && config.bgFilename
            ? `characters/${charName}/${config.bgFilename}`
            : `characters/${charName}/${charName}_01.png`; // 備援

        // 動態生成文字元件
        let elementsHtml = '';
        if (config && config.elements && config.elements.length > 0) {
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

        card.innerHTML = `
            <div class="card-inner">
                <div class="face face-front">
                    <img src="${bgImg}" class="bg-layer" alt="Background">
                    <img src="characters/${charName}/ink.png" class="ink-layer" alt="Ink">
                    <img src="characters/${charName}/ink_phono.png" class="ink-layer phono-ink" onerror="this.style.display='none'">
                    <img src="characters/${charName}/brush.png" class="brush-layer" alt="Brush">
                    ${elementsHtml}
                </div>
                <div class="face face-back"></div>
            </div>
        `;

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
                    const uttr = new SpeechSynthesisUtterance(phonoText || charName);
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

                // 點擊卡片切換說明時同步朗讀
                if (isShowing && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    const uttr = new SpeechSynthesisUtterance(config.evolution);
                    uttr.lang = 'zh-TW';
                    uttr.rate = 0.9;
                    window.speechSynthesis.speak(uttr);
                }
            });
        }

        // 原本的 focusCard/blurCard 邏輯已移除

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
    // 邏輯已被停用
}

async function centerCard(charName, config) {
    if (drawnCards.length > 0) {
        const card = drawnCards[0];
        // 最終狀態：位居正中，微微上移騰出空間給底部文字面板
        card.style.transform = `translateX(0px) translateY(-40px) translateZ(300px) rotateZ(0deg) rotateX(0deg) scale(0.33)`;

        // 從 config 中讀取資演變邏輯，不再讀取 info.md
        const title = config?.charName || charName;
        const desc = config?.evolution || "尚無演變邏輯說明。";

        document.getElementById('cardInfoTitle').textContent = title;
        document.getElementById('cardInfoDesc').textContent = desc;

        // 動畫結束後浮現說明面板並自動朗讀
        setTimeout(() => {
            scene.classList.add('show-info');
            if ('speechSynthesis' in window && config?.evolution) {
                window.speechSynthesis.cancel();
                const uttr = new SpeechSynthesisUtterance(config.evolution);
                uttr.lang = 'zh-TW';
                uttr.rate = 0.9;
                window.speechSynthesis.speak(uttr);
            }
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
