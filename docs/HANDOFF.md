# speak2go — Handoff(2026-05-30）

> 接手这个项目先读这份。讲清楚:**是什么、部署在哪、怎么改、当前真实状态、坑、待办**。
> 详细历史看 `git log` 与 `~/.claude/projects/-Users-dami2026-chat2go/memory/`(跨会话记忆)。

---

## 1. 一句话定位

speak2go 是从 chat2go 长出来的 **AI 语言学习平台**:学生上传课堂录音 → 云端 ASR 转写 + LLM 提炼生词/句式/批改 → 学生在「超级单词卡」里用艾宾浩斯复习 + 默写/拼读/造句/跟读多种主动回忆练习。

**单入口、多系统**:一个登录页按用户身份路由到三个**互相独立**的前端(英语课 / 英文作文 / 韩语),后端共享一套 Supabase,按 `rooms.product` 隔离。

---

## 2. 部署与仓库

| 项 | 值 |
|---|---|
| 线上域名 | **speak2go.ai**(GitHub Pages,`CNAME` 文件里写死) |
| Git 仓库 | `github.com/tototo1999/speak2go`(独立 repo,跟 chat2go 分开) |
| 本地路径 | `/Users/dami2026/speak2go` |
| 默认分支 | `main`(push main 即部署,GH Pages 自动构建 ~1–2 分钟) |
| 后端 | Supabase(PostgreSQL + Auth + Realtime + Storage + Edge Functions) |

**注意**:这是**纯静态前端**(无框架、无构建步骤),HTML/CSS/JS 直接托管。JS 依赖本地化在 `vendor/`。

`well2go.ai` 是另一个独立 repo(`tototo1999/well2go`),跑旧版 chat.html,**不在本仓库内**;改本仓库不影响它,但若日后同步新代码过去要连 `assets/systems.js` 一起拷(见坑 §6)。

---

## 3. 目录结构(前端各系统独立)

```
speak2go/
├── index.html            # 落地页
├── login.html            # 单入口登录 → 读 profiles.system → 路由到对应系统
├── assets/systems.js     # ⭐ 多系统配置表(label / path / roomId / product)
├── chat.html             # 调试室(老主界面,6390 行;主要给老 speak2go 流程用)
│
├── glossary/index.html   # ⭐⭐ 英语课「超级单词卡」— 词库唯一真文件(4169 行)
├── essay/index.html      # 英文作文系统前端(独立一份,444 行)
├── korean/index.html     # 韩语系统前端(独立一份,3834 行,从 glossary fork 韩化)
│
├── glossary.html         # 死链:重定向到 /glossary/(legacy,别再开发)
├── vendor/               # 本地化 JS 依赖(supabase-js / marked / html2pdf)
├── glass-demo/           # Mentra 眼镜 demo — HOLD(设备没到货,别动)
├── wow-fridge/           # wooooow 社区相关实验
└── docs/                 # 设计文档 / 本 handoff
    └── superpowers/specs/  # brainstorm 产出的设计稿
```

### 三系统配置(`assets/systems.js`)

| system | label | path | product | roomId |
|---|---|---|---|---|
| speak2go | English lesson | `/glossary/` | `speak2go` | `5b622bc4-88b4-47c1-9aa6-643c4b1e0f96` |
| essay | English essay | `/essay/` | `essay` | `01c240c3-9b94-472f-953b-d27584749008` |
| korean | Korean lesson | `/korean/` | `korean` | `f015f5d5-2163-490f-bf99-92a2ffa45bdd` |
| well2go | 健康健身 | (well2go.ai 独立 repo) | `well2go` | `8980e7e0-e24a-44c4-b542-47c8e9105947` |

实际配置在 `assets/systems.js`(`window.SYSTEMS`),每条带 `product / label / brand / glossaryLang / essayMode / industry / roomId`。

路由机制:纯函数 `resolveSystemId(hostname, profileSystem)` —— **well2go.ai 域名强制走 `well2go`**(保留旧行为),其它情况按用户 `profiles.system`(默认 `speak2go`)。`login.html` 登录后读 `profiles.system` → 跳对应 `path`。`profiles.system` 迁移 `20260530000000`,对存量 51 用户零影响。

---

## 4. 后端架构(2026-05-26 全云化)

**已 100% serverless,0 个 Hermes/本地 agent 在跑。** 所有产品 `rooms.serverless=true`。

录音处理链路(统一入口):
```
学生上传录音 → chat2go-ingest (Edge Function)
  → 读 rooms.product 选提炼 prompt
  → ASR: ElevenLabs Scribe v2(转写)
  → LLM: Gemini Flash + Claude(分段提炼 / 批改)
  → speak2go_worker / chat2go_worker(按 product 分流)
  → 写回 messages + 生成生词卡 / 作文批改 / 韩语卡
```

按 product 的提炼差异:
- **speak2go**:课堂录音 → 提炼最多 50 生词 + `practice_patterns` 句式 + 真例句。
- **essay**:作文课录音 → `ESSAY_PROMPT`(writing_points + essay_prompts + key_phrases);批改走五维 rubric(`essay-score` trailer)。
- **korean**:`KOREAN_PROMPT`(한글/romaja/中文 + 句式)+ `_build_korean_card`,支持 한글 时间戳;导入深链指向独立 `/korean/`。

SQL 操作默认走 **Supabase MCP**(`execute_sql` / `apply_migration`),DDL/RLS 用 preview-then-go。

---

## 5. 「超级单词卡」(glossary/index.html)核心功能

这是项目最核心、迭代最密的一块(英语课系统)。

- **词库跟账号走**:登录后 `glossary_state`(jsonb)+ RLS,拉/推并集合并(墓碑并集 — 删词不复活、云端空不丢本地)。未登录纯本地 localStorage。换浏览器不丢词。
- **艾宾浩斯复习**:词有 `review_stage`(0→6)+ `next_due_at`;到期进复习队列。
- **🎮 游戏(单卡片练习抽屉)**:三步一体 — ① 拼读(切音节 + 标重音 + 填罗马音)② 造句(本地 `gradeTranslation` 评分,离线可用)③ 跟读(听例句/课堂原声 → 复述 → 比对)。本轮三项满 300 自动通关打钩。**全保留。**
- **📝 测验** *(2026-05-30 改)*:整库随机抽 10 词,**只做默写**(看中文拼英文,字母格提示),出总分 + 错词清单 + 再来一组。
- **📚 复习**:到期词**只做默写**一遍,按对错推进艾宾浩斯阶段。
- **默写自动播例句**:进默写题自动朗读真例句(听音默写)。
- **联网查词**:`glossary-lookup` / Gemini 补音标 + 例句。

> **测验/复习 = 纯默写**(2026-05-30 砍掉了原来的「默写→拼读→造句」三阶段,只游戏保留多题型)。这是当前最新形态,别误以为测验还有拼读/造句。

---

## 6. 坑 / 注意事项

1. **`glossary/index.html` 含 4 个 NUL 字节**(第 1462/1466 行附近,历史遗留)。直接 `grep` 会被当二进制,要加 `-a`;或先 `tr -d '\000'` 出干净副本再读。Edit 工具正常可用。
2. **词库唯一真文件 = `glossary/index.html`**。`glossary.html` 是重定向,`romanizer.html` 已弃用,`chat2go/` 仓库里的 glossary 是死副本 —— 所有词库/测验/题卡需求**只改 `glossary/index.html`**。
3. **三系统前端独立**:改 glossary 不动 essay/korean,反之亦然。但**后端 schema 共享** —— 改表结构要意识到三系统都受影响。
4. **RLS 还没硬隔离**(见 §7 待办):目前系统间隔离只在前端,DB 层 `USING(true)` 的洞还在,任何登录用户用 API 能摸到别系统房间。**安全敏感,改前务必在 Supabase 分支测。**
5. **`glass-demo/` HOLD**:Mentra 眼镜没到货,别碰。
6. **well2go systems.js 同步隐患**:well2go 独立 repo 跑旧 chat.html 不受影响;但谁日后同步新 chat.html 过去**必须连 `assets/systems.js` 一起拷**,否则报 `Cannot read undefined 'speak2go'`。
7. **online-first 工作流**:默认改线上 → push main → 轮询 speak2go.ai 验。给用户的链接用线上绝对 URL。
8. **录音公开链**:已改永久公开链(`dd65619`),不再 24h 后 403。

---

## 7. 待办 / 下一步(按优先级)

### 🔴 高优先 / 有风险
- [ ] **RLS 硬隔离(Phase 1)**:① 固化 speak2go 单例房间 RLS 策略进迁移(现仅存在线上 DB、无迁移)② `products_for_system()` helper + 系统作用域的 rooms/room_members/templates 策略 ③ `profiles.system` 防自改触发器。验收:3 测试用户各只见自己系统、跨系统 join 被拒。**先在 Supabase 分支测再合。**
- [ ] **韩语 lesson 胶囊 slug 不含 한글 的边界 bug**:`autoImportFromUrl` slug 正则 `[^a-z0-9一-鿿]` 没含谚文 Unicode 块 → 纯 한글 标签 slug 成空 `lesson-`,多个纯韩标签课会撞进同一 catId。修:正则加 `가-힣`。

### 🟡 验收 / 收尾
- [ ] **韩语端到端实测**:用真韩语录音传 korean 房间 → 提炼卡 → 点深链 → 한글 导入 + 朗读 + 测验。
- [ ] **英文作文录音→写作要点端到端实测**:`_build_essay_card` 已单测,真录音链路还没跑过。
- [ ] **绑定真实用户 + room_members**:给韩语/作文各绑一个真用户(`admin_set_user_system` RPC)+ 加 `room_members`;现在只有 `iamarobot` 绑了 essay。

### 🟢 体验增强(选做)
- [ ] **造句游戏接 lesson 的 `practice_patterns`**(现在只用通用 SENTENCE_BANK);造句结果回写艾宾浩斯。
- [ ] **「已记住」毕业词库 tab**:stage 6 的词从活跃复习毕业归档。
- [ ] **句型库**:把 worker 产出的 `practice_patterns` 持久化成可滚动积累的句式资产(现在只渲染进 summary 卡片,一次性)。
- [ ] **不规则动词三态专项练习**。
- [ ] **PWA / 单文件打包离线版**。
- [ ] **韩语听写题**(ko-KR TTS 播 → 打 한글),phase ② 现在对韩语跳过。

---

## 8. 最近改动(近 5 个 commit）

```
dd65619 fix(chat): 语音录音改用永久公开链,不再 24h 后 403
cd791f1 fix(glossary): 跟读「原句」录音加载失败时 TTS 兜底,不再变哑钮
ae7dcd1 feat(glossary): 内置词库 70 词补例句 → 也能跟读 🎙
d5caea9 fix(glossary): 跟读 🎙 改挂例句而非仅课堂录音 + 撤掉误加的例句 🔊
1ce4907 feat(glossary): 测验/复习只保留默写 — 去掉自然拼读+造句两阶段
```

---

## 9. 常用命令

```bash
# 改完推送(online-first)
cd /Users/dami2026/speak2go
git add -A && git commit -m "类型(scope): 描述" && git push origin main
# 然后轮询 speak2go.ai 验证部署(GH Pages ~1-2 分钟)

# 读含 NUL 的 glossary 文件
tr -d '\000' < glossary/index.html > /tmp/gloss.html   # 干净副本
grep -an "关键字" glossary/index.html                   # 直接 grep 要加 -a
```

提交信息约定:中文,`类型(scope): 描述`(feat/fix/ui/docs)。
