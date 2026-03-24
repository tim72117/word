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

        // 動態生成解說圖片（改從 componentExplanations 提取，與步驟 1:1 綁定）
        let elementsHtml = '';
        const rootUrl = `characters/${charName}`;
        if (config && config.componentExplanations && config.componentExplanations.length > 0) {
            elementsHtml = config.componentExplanations.map((step, sIdx) => {
                if (!step.image) return '';

                const style = `
                    left: ${step.left || '0px'};
                    top: ${step.top || '0px'};
                    width: ${step.width || '100%'};
                    height: ${step.height || 'auto'};
                    position: absolute;
                    opacity: 1;
                    pointer-events: none;
                    z-index: 100;
                    transition: all 0.6s cubic-bezier(0.19, 1, 0.22, 1);
                `;
                const className = 'etymology-image';
                const filenameData = `data-filename="${step.image}"`;
                const stepIndexData = `data-step-index="${sIdx}"`;

                return `<img src="${rootUrl}/${step.image}" class="${className}" style="${style}" ${filenameData} ${stepIndexData}>`;
            }).join('');
        }

        card.innerHTML = `
            <div class="card-inner">
                <div class="face face-front">
                    <div class="stage-container">
                        <img src="${bgImg}" class="bg-layer" alt="Background" onerror="this.src='card_face.png'">
                        <div class="component-highlight"></div>
                        <img src="${rootUrl}/ink.png" class="ink-layer" alt="Ink" onerror="this.style.display='none'">
                        <img src="${rootUrl}/ink_phono.png" class="ink-layer phono-ink" onerror="this.style.display='none'">
                        <img src="${rootUrl}/brush.png" class="brush-layer" alt="Brush" onerror="this.style.display='none'">
                        ${elementsHtml}
                    </div>
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
        }

        // 分步解說邏輯
        let currentStep = -1;
        const explanations = config?.componentExplanations || [];
        const panelTitle = document.getElementById('cardInfoTitle');
        const panelDesc = document.getElementById('cardInfoDesc');

        card.addEventListener('click', (e) => {
            if (isDrawing) return;
            e.stopPropagation();

            currentStep++;
            if (currentStep >= explanations.length) {
                // 回到總結
                currentStep = -1;
                card.classList.remove('in-explanation');
                scene.classList.add('show-info');
                
                panelTitle.textContent = config?.charName || charName;
                panelDesc.textContent = config?.evolution || "字源解釋結束。";

                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    const uttr = new SpeechSynthesisUtterance(config?.evolution || "");
                    uttr.lang = 'zh-TW';
                    window.speechSynthesis.speak(uttr);
                }
            } else {
                // 分步解說
                card.classList.add('in-explanation');
                scene.classList.add('show-info');
                
                const step = explanations[currentStep];
                panelTitle.textContent = step.label;
                panelDesc.textContent = step.explanation;

                const imgEls = card.querySelectorAll('.etymology-image');
                const highlightBox = card.querySelector('.component-highlight');

                // 更新高亮背影位置
                if (step.image) {
                    highlightBox.style.left = step.left;
                    highlightBox.style.top = step.top;
                    highlightBox.style.width = step.width;
                    highlightBox.style.height = step.height;
                    highlightBox.style.opacity = '1';
                } else {
                    highlightBox.style.opacity = '0';
                }

                // 精確匹配當前步驟的圖片
                imgEls.forEach(el => {
                    const stepIndex = parseInt(el.dataset.stepIndex);
                    if (stepIndex === currentStep) {
                        el.style.opacity = '1';
                    } else {
                        el.style.opacity = '0.3'; // 半透明保留位置感
                    }
                });

                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    const uttr = new SpeechSynthesisUtterance(step.explanation);
                    uttr.lang = 'zh-TW';
                    window.speechSynthesis.speak(uttr);
                }
            }
        });

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

        // 自動將卡牌移至中心並朗讀
        setTimeout(() => {
            if ('speechSynthesis' in window && config?.evolution) {
                window.speechSynthesis.cancel();
                const uttr = new SpeechSynthesisUtterance(`${charName}。點擊卡牌進入字源解析。`);
                uttr.lang = 'zh-TW';
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
