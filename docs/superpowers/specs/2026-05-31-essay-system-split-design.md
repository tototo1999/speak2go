# 设计:作文系统 1:1 独立(从单词系统复刻到 /essay/)

**日期**:2026-05-31
**分支**:`essay-system-split`(验证 OK 再合 main)
**回滚锚点**:`speak2go-pre-essay-split`(动手前已打 tag + push)
**范围**:纯前端复制 + 最小必要改字。不动后端。

---

## 目标

把现在「一个 chat.html 按 `profiles.system` 运行时路由 + iframe 嵌不同卡片页」的共用结构,拆成**两套完全独立、互不依赖**的系统。每套 = 音频输入对话框(chat.html)+ 二级卡片页。1:1 复刻,零逻辑改写,改一套不动另一套。

---

## 铁律:单词系统一点都不能改

- 根 `chat.html`(课堂录音转写/音频输入大模块)**不动**。
- `/glossary/`(超级单词卡)**不动**。
- 这套 = **单词系统**,保持现状,即回滚基线。

## 新增:作文系统 = 单词系统的完整复刻,放 `/essay/`

| | 单词系统(现有,不动) | 作文系统(新建,复刻) |
|---|---|---|
| 音频对话框 | 根 `chat.html` | `/essay/chat.html` |
| 二级卡片页 | `/glossary/` | `/essay/glossary/` |
| 品牌 | 超级单词卡 / Speak2GO | 超级作文卡 |
| product | speak2go | essay |
| room | `5b622bc4…` | `01c240c3…`(essay 批改室) |
| 登录落点 | `profiles.system=speak2go`(现状不变) | `profiles.system=essay` → `/essay/chat.html` |

---

## 实施步骤(分支上)

1. **复制 chat.html → `/essay/chat.html`**,只改:
   - 硬绑 essay 系统:`currentSystem` 初值锁 `window.SYSTEMS.essay`(不再依赖运行时 `profiles.system` 切换),保证独立。
   - 站内指向:`window.open('/glossary/?review=1')` → `/essay/glossary/?review=1`;`window.open('https://speak2go.ai/glossary/')` → `…/essay/glossary/`(chat.html:3684 / 3871)。
   - 品牌字:涉及「单词」的 UI 文案 → 「作文」(标题/tab title 等)。
   - vendor/assets 是绝对路径(`/vendor/`、`/assets/`),子目录下照常工作,不改。
2. **复制 glossary → `/essay/glossary/index.html`**,沿用上一轮 essay-card 的改法:
   - localStorage key 全换 `essaycard-*` 前缀(跟单词卡本地隔离)。
   - `initCloud()` 直接 return → 关闭 `glossary_state` 云同步(纯本地)。
   - 品牌「超级作文卡」(含 `<h1>` 拆 span 的那处,上一轮漏了)。
3. **登录路由**:`systems.js` 的 `essay.path` → `/essay/chat.html`(mirror 单词系统:essay 用户登录落到作文系统的音频对话框)。
4. **清理**:上一轮临时建的 `/essay-card/` 删除(被 `/essay/glossary/` 取代);老退役 `/essay/`(Essay2GO 批改)保持退役、文件留 git。
5. **验证**(真实 Chrome + curl,参 feedback_visual_test_real_chrome):
   - `/essay/chat.html`、`/essay/glossary/` 都 200;根 `chat.html` + `/glossary/` 不变仍 200。
   - 作文系统页面品牌全是「作文」;localStorage 只写 `essaycard-*` 零 `glossary-*`;云同步关闭。
   - 两 chat.html 副本 syntax 0 错;改作文副本不影响单词副本(diff 隔离)。
6. **合并**:分支验证 OK → 合 main → 线上验证。

---

## 不做 / 风险

- 不动后端(两 room 沿用,product 天然隔离)。
- **复刻法 = 两份代码会漂移**:以后单词系统的修复要手动同步到作文系统(用户已知,接受——因为两系统需求要独立演化)。
- `systems.js` 退化为登录分发器(决定送哪个子目录);各 chat.html 副本硬绑自己系统,运行时不再互相依赖。
- well2go 仍用根 chat.html 的 well2go 分支(不受影响)。
