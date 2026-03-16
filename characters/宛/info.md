# 中文字源紀錄：宛 (wǎn)

## 1. 基本資訊
- **字形**：宛
- **讀音**：wǎn
- **構造**：會意兼形聲字。從「宀」（房屋），從「夗」（彎曲、轉身）。

## 2. 字源演變
- **甲骨文/金文**：字形由屋頂（宀）和一個側臥彎曲的人（夗）組成。最初可能表示人縮在房屋內，引申為房屋深邃、狹小或彎曲的樣子。
- **小篆**：延續了「宀」下「夗」的構造。《說文解字》釋為：「屈草自覆也」，意指彎曲草木覆蓋自身，強調「彎曲」的動態感。
- **演變邏輯**：屋內空間的深邃或彎曲 -> 抽象的彎曲、曲折（宛轉）-> 心理上的轉折、彷彿（宛如）。

## 3. 核心義項
1. **彎曲、曲折**：如「委宛」、「宛延」。
2. **彷彿、好像**：如「宛如」、「宛若」（意指事情轉折或呈現出的樣子就像真的一樣）。
3. **深邃、深遠**：指宮室或地勢的深邃。

## 4. 繪製風格分析 (Style Analysis - 參考 wan_etymology_v1)
- **藝術風格**：傳統中國工筆重彩與現代數位繪法的結合。線條優雅精細，色彩層次豐富且具有手繪質感。
- **色彩基調**：古雅的沈穩色調。主色包括：青瓦綠、溫潤的古籍紙張黃、古樸的石磚灰、以及舒適的暗紅色（衣著）。色調和諧，飽和度適中。
- **光影與氛圍**：柔和、朦朧的擴散光（Diffused Light）。帶有晨霧感，營造出寧靜、優雅且富有禪意的氛圍。
- **構圖特徵**：圓框式（Moon Gate style）構圖，將核心敘事集中於中心的圓型空間內，背景的山巒與古建築則隱沒於雲煙霧氣中，拉開空間深度。
- **線條細節**：具有毛筆運筆質感的細緻鉤勒，並結合流動的雲煙線條穿插於畫面中，增加靈動感。

## 5. 視覺開發建議 (Prompt 構構)
- **畫面中心**：一座帶有優美曲線屋頂（宀）的古式深宅，迴廊蜿蜒曲折。
- **光影表現**：半遮半掩的晨霧，營造出「宛如」夢境的朦朧美感。
- **色彩基調**：古雅的青瓦紅牆，點綴些許金色線條。

## 6. 生成提示詞 (Prompts Record) - 階梯式生成流程
為了確保構圖精準且完全消除草圖痕跡，本資產採用兩階段生成：

### 第一階段：黑白結構素描 (wan_character_card_v1_structural.png)
- **參考影像**：`sketch_1772758194651.png` (彩色佈局圖，以下簡稱 **參考圖**)
- **中文提示詞**：一張高品質的 2D 中國風遊戲資產**黑白結構素描**。請精確遵循 **參考圖** (Reference Image) 的區域：1. 頂部白色 -> 線條洗練的傳統建築屋頂。2. 左側灰色 -> 極簡新月。3. 右側紅色 -> 姿態優雅的蜷臥睡覺人物。風格為純粹的黑白線條手繪素描，強調結構與比例，不帶任何色彩。
- **English Prompt**: A high-quality 2D Chinese game asset **structural B&W sketch**. Follow the layout of the **Reference Image** (參考圖) exactly: 1. White -> Clean-lined traditional Chinese roof. 2. Grey -> Minimalist crescent moon. 3. Red -> Elegantly posed sleeping person. Style: Pure B&W line art sketch, focusing on structure, proportions, and zero color.

### 第二階段：最終水墨風格圖 (wan_character_card_v1_final.png)
- **參考影像**：`wan_character_card_v1_structural.png` (第一階段生成的黑像素描)
- **中文提示詞**：一張高品質 2D 中國風遊戲資產。**【風格解構重繪】以黑白素描為結構，嚴格依照 Section 4 的風格分析進行水墨重彩渲染：1. 構圖 -> 「圓框式（Moon Gate style）」構圖，核心物件聚焦於中心，背景山巒隱沒於雲煙。2. 色彩 -> 使用青瓦綠屋頂、暗紅色漢服、古樸石磚灰與溫潤古籍紙張黃。3. 質感 -> 工筆畫毛筆勾勒感，穿插流動雲煙線條。**
- **English Prompt**: A high-quality 2D Chinese game asset. **[STYLE ALIGNED REDRAW] Using the B&W sketch as structural base, strictly follow Section 4 style analysis: 1. Composition: Apply "Moon Gate style" circular framing, centering all elements. Background mountain/buildings fade into heavy mist. 2. Colors: Antique green tiles, dark red Hanfu, rustic stone grey, warm ancient paper yellow tones. 3. Texture: Fine Gongbi brushwork and ink outlines, interwoven with flowing ink-style cloud and mist lines.**
