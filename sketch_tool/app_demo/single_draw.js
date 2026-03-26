const deck = document.getElementById('deck');
const hand = document.getElementById('hand');
const resetBtn = document.getElementById('resetBtn');
const scene = document.querySelector('.scene');
const focusOverlay = document.getElementById('focusOverlay');

let isDrawing = false;
let drawnCards = [];
let focusedCard = null;

let wordListPromise = null;
let wordList = [];
let currentIndex = -1;

// 初始化時取得可用字清單 (封裝為 Promise 確保同步)
function initWordList() {
    if (wordListPromise) return wordListPromise;
    
    wordListPromise = fetch('prepared_words.json?t=' + Date.now())
        .then(resp => resp.json())
        .then(data => {
            wordList = data;
            console.log("📜 字元清單載入成功 (Promise):", wordList);
            return wordList;
        })
        .catch(e => {
            console.error("無法讀取 prepared_words.json", e);
            wordListPromise = null;
            return [];
        });
    return wordListPromise;
}

// 預先啟動載入
initWordList();

deck.addEventListener('click', () => {
    if (isDrawing || drawnCards.length > 0) return;
    drawSingleCard();
});

resetBtn.addEventListener('click', () => {
    resetTest();
    currentIndex = -1; // 強制重置索引，下一次抽卡將從 0 開始
    console.log("🔄 重置測試：索引已設回 -1");
});

async function drawSingleCard() {
    isDrawing = true;

    // 隱藏提示
    document.querySelector('.deck-hint').style.opacity = '0';

    if (wordList.length === 0) await initWordList();
    if (wordList.length === 0) {
        console.warn("清單為空，無法抽卡");
        isDrawing = false;
        return;
    }

    // 依照 prepared_words.json 的順序顯示，不再隨機
    if (currentIndex < 0) {
        currentIndex = 0;
    }
    const targetChar = wordList[currentIndex];
    console.log(`🎴 抽卡開始: 索引 ${currentIndex}, 字元: ${targetChar}`);

    // 取得該字設定 (僅使用 production_config)
    let config = null;

    try {
        const prodResp = await fetch(`characters/${targetChar}/production_config.json`);
        if (prodResp.ok) config = await prodResp.json();
    } catch (e) { 
        console.warn("找不到 production_config.json", e);
    }

    await drawOneCard(targetChar, config);
    await sleep(400); 
    centerCard(targetChar, config);
    isDrawing = false;
}

// 手勢辨識
let touchStartX = 0;
let touchStartY = 0;

scene.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

scene.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    // 向右划動 (右翻) 跳到下一個字
    if (dx > 80 && Math.abs(dy) < 100) {
        if (!isDrawing && drawnCards.length > 0) {
            goToNextWord();
        }
    }
}, { passive: true });

async function goToNextWord() {
    isDrawing = true;
    
    // 1. 將舊卡片翻走
    if (drawnCards.length > 0) {
        const oldCard = drawnCards[0];
        oldCard.style.transition = 'all 0.6s cubic-bezier(0.45, 0, 0.55, 1)';
        oldCard.style.transform = 'translateX(600px) translateY(-40px) translateZ(100px) rotateZ(30deg) rotateY(40deg) scale(0.1)';
        oldCard.style.opacity = '0';
        
        setTimeout(() => oldCard.remove(), 600);
        drawnCards = [];
    }

    // 2. 準備下一個字
    if (wordList.length === 0) await initWordList();
    currentIndex = (currentIndex + 1) % wordList.length;
    const targetChar = wordList[currentIndex];

    // 3. 隱藏舊說明
    scene.classList.remove('show-info');

    // 4. 抽新卡 (僅使用 production_config)
    let config = null;

    try {
        const prodResp = await fetch(`characters/${targetChar}/production_config.json`);
        if (prodResp.ok) config = await prodResp.json();
    } catch (e) {
        console.warn("找不到 production_config.json", e);
    }

    await drawOneCard(targetChar, config);
    await sleep(400); 
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
                const imgSource = step.image ? `${rootUrl}/${step.image}` : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                const style = `
                    left: ${step.left || '0px'};
                    top: ${step.top || '0px'};
                    width: ${step.width || '100%'};
                    height: ${step.height || 'auto'};
                    position: absolute;
                    opacity: 0;
                    pointer-events: none;
                    z-index: 100;
                    transition: all 0.6s cubic-bezier(0.19, 1, 0.22, 1);
                `;
                const className = 'etymology-image' + (step.image ? '' : ' no-image');
                const filenameData = step.image ? `data-filename="${step.image}"` : '';
                const stepIndexData = `data-step-index="${sIdx}"`;

                return `<img src="${imgSource}" class="${className}" style="${style}" ${filenameData} ${stepIndexData} onerror="this.style.display='none'">`;
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

                // [MOD] 切換至與 Sketch Tool 一致的動效驅動邏輯
                imgEls.forEach(el => {
                    const stepIndex = parseInt(el.dataset.stepIndex);
                    if (stepIndex === currentStep) {
                        el.classList.remove('effect-appear');
                        void el.offsetWidth; // 強制重繪觸發動畫
                        el.classList.add('effect-appear');
                        el.style.opacity = '1';
                    } else {
                        el.classList.remove('effect-appear');
                        el.style.opacity = '0'; // 完全隱藏非當前步驟的部件
                    }
                });

                if (step.left && step.top) {
                    highlightBox.style.left = step.left;
                    highlightBox.style.top = step.top;
                    highlightBox.style.width = step.width;
                    highlightBox.style.height = step.height;
                    
                    highlightBox.classList.remove('showing');
                    void highlightBox.offsetWidth;
                    highlightBox.classList.add('showing');
                } else {
                    highlightBox.classList.remove('showing');
                }


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
