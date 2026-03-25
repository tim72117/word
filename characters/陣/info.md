# 中文字源紀錄：陣 (zhèn)

## 1. 基本資訊
- **字形**：陣
- **讀音**：zhèn
- **構造**：形聲字。左從「阜」（阝，形符），右從「車」（聲符/形符）。

## 2. 字源演變
- **本義**：軍隊的行列、排列部署。
- **演變邏輯**：
  - **阜 (阝)**：原意為土山、堆出的土堆。在此象徵地形或險要的防禦工事。
  - **車**：代表戰車、兵車，是古代武力的核心。
- **文化內化**：將戰車與士兵依據地形（阜）有序地排開，形成具備攻守功能的「陣列」。後延伸為戰鬥的場所或一段時間（如：一陣風）。

## 3. 核心義項
1. **軍隊的行列**：部隊的排列形式（如：陣式、布陣）。
2. **戰鬥的場所**：打仗的地方（如：上陣、陣地）。
3. **量詞**：表示段落或次數（如：一陣雨、一陣快感）。

## 4. 繪製風格分析 (Style Analysis)
- **視覺風格**：遵循「高階中國風遊戲美術 (Premium Guofeng Game Art)」規範。
- **色彩基調**：具備威嚴與厚重感。主色包括：
  - **玄鐵黑/蒼藍**：代表冰冷的盔甲與戰車結構。
  - **硃砂紅/軍旗色**：點綴在陣列中的旗幟或將領盔甲，象徵戰意。
  - **土黃/焦赭**：代表戰場的大地與山嶺（阜）。
- **光影與氛圍**：肅穆且具備張力。像是晨霧中隱約現出的千軍萬馬，山河之影與戰車輪廓交織，呈現「不動如山」的壓制感。

## 5. 視覺開發建議 (Layout Design)
- **畫面中心**：展現戰車與山勢的交融。
- **構圖佈局**：
  - **左側 (阜/阝)**：以古樸的水墨勾勒出三層階梯狀的「阜」型，象徵地勢險要。
  - **右側 (車)**：呈現古文字「車」的鳥瞰透視，強調橫軸的車軸與雙圓輪。
- **意境**：依山設障，車甲森嚴。

## 6. 生成提示詞 (Prompts Record) - 階梯式生成流程

### 考古基準底圖 (etymology_base.png)
- **中文提示詞**：中國風考古風格背景圖，畫面上呈現古樸的石碑或宣紙質感。內容為「陣」字的演變示意圖。左側是簡約的古文字「阜」（像台階的符號），右側是古文字「車」（兩輪一軸的鳥瞰示意）。風格：高階國風遊戲插畫，色調典雅，背景有淡淡的煙霧與灑金質感。無現代文字。
- **English Prompt**: Premium Chinese Style (Guofeng) game art background. An archaeological setting showing ancient carved stone or weathered paper textures. It depicts the etymology of the character "陣" (Formation). On the left is the ancient seal script form of "阜" (Steps/Hill), and on the right is the ancient form of "車" (Chariot from top view). Style: Majestic, military strength, with subtle mist and gold leaf textures. Absolutely no modern text.

### 第一階段：阜 - 結構素描 (etymology_hill_struct.png)
- **中文提示詞**：極簡主義幾何結構線稿。一個**由左向右遞增的三級階梯狀構造**，象徵古代的土山或防禦台階。線條洗練且極細。背景為純白色 (#FFFFFF)。絕對禁止出現任何標籤或文字。
- **English Prompt**: Minimalist geometric line art. A **triple-stepped structure rising from left to right**, symbolizing an ancient mound or defensive terrace. Clean, ultra-thin black lines on a pure white background. Absolutely no symbols, text, or labels. Centered composition.

### 第二階段：阜 - 國風渲染 (etymology_hill_ink.png)
- **中文提示詞**：高品質國風藝術渲染圖，呈現「高階中國風」遊戲美學。基於階梯結構線稿，使用**蒼勁的焦墨與乾筆水墨處理，賦予階梯如岩石與厚重山脈般的質感**。背景純白，氣氛嚴肅且具備防禦感。高品質遊戲資產。
- **English Prompt**: High-quality final render in **Chinese Style Game Art Aesthetic**. Based on the stepped structural sketch where **bold charred ink and dry-brush strokes are used to create the texture of rocks and heavy mountains**. Background: Pure white. Atmosphere: solemn and defensive. Premium game asset quality. No text.

### 第一階段：車 - 結構素描 (etymology_chariot_struct.png)
- **中文提示詞**：極簡主義幾何結構線稿。**對稱的鳥瞰視角：中間為一個長方形轎廂，左右各有一個圓形的輪子，由一根平直的橫軸貫穿**。線條洗練、極細。背景為純白色 (#FFFFFF)。絕對禁止出現任何標籤。
- **English Prompt**: Minimalist structural sketch. **Symmetric top-down view of an ancient chariot: A central rectangular carriage with two circular wheels on left and right, connected by a straight horizontal axle**. Clean, ultra-thin black lines on a pure white background. Minimalist geometric line art. Absolutely no text, symbols, or labels. Centered composition.

### 第二階段：車 - 國風渲染 (etymology_chariot_ink.png)
- **中文提示詞**：高品質「車」部國風渲染，呈現「高階中國風」遊戲美學。基於戰車結構線稿，**使用金屬質感的水墨（深灰與古銀色系）渲染車輪與軸線，中間加強墨色深度以顯現動態與對稱美**。背景純白，氣氛強悍且精確。高品質遊戲資產。
- **English Prompt**: High-quality final render in **Chinese Style Game Art Aesthetic**. Based on the chariot structural sketch where **metallic-toned ink (dark grey and ancient silver) renders the wheels and axle, with deep ink intensity in the center to show power and symmetry**. Background: Pure white. Atmosphere: powerful and precise. Premium game asset quality. No text.
