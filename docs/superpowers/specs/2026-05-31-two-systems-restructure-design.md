# 设计:砍韩语 → 收敛为「超级单词卡 + 超级作文卡」两系统

**日期**:2026-05-31
**分支**:`restructure-two-systems`(改好验证 OK 再合 main;不打断 v1.0 稳定线上)
**范围**:纯前端 + 路由 + 一次性后端只读备份。**不动后端 schema/RLS/数据。**

---

## 目标

把 speak2go 的学习系统从「英语课 / 英文作文(批改) / 韩语」收敛为**两个并行、同源**的卡片系统:

1. **超级单词卡** = 现有 `glossary/`(不动)。
2. **超级作文卡** = `glossary/` 复制一份到 `essay-card/`,逻辑先一模一样,品牌改成作文卡;以后单独演化。

韩语整套从前端 + 路由删除(后端 korean 残留暂留,以后清)。

---

## 决策(均已与用户确认)

| 项 | 决定 |
|---|---|
| 作文卡落点 | 新目录 `essay-card/`(`/essay-card/`);老 `/essay/`(Essay2GO 批改系统)**退役**:从 `systems.js` + 登录路由摘掉,文件留 git。 |
| 作文卡复用后端 | 沿用 `essay` 的 product + roomId(`systems.js` 的 `essay.path` 改指 `/essay-card/`)。 |
| 作文卡云同步 | **先关掉**(纯本地)。不碰 Supabase `glossary_state`,以免污染单词卡云端那一行。后端以后单独接。 |
| 作文卡本地存储 | localStorage key 全换前缀 `glossary-*` → `essaycard-*`,跟单词卡本地数据隔离。 |
| 删韩语范围 | 前端 + 路由:删 `korean/`、`systems.js` 去 `korean`、`login.html` 路由去韩语。后端 korean room/profile/RLS **暂留**。 |
| 在哪做 | 分支 `restructure-two-systems`。 |
| 备份 | 动手前导出 Supabase schema + `rooms`/`profiles` + Edge Functions 源码到 `docs/backup/2026-05-31/`。 |

---

## 实施步骤

0. **备份**(只读):`list_tables` schema、`rooms`/`profiles` 全量行、各 Edge Function 源码 → `docs/backup/2026-05-31/`,commit。
1. **删韩语**:`rm -rf korean/`;`systems.js` 删 `korean` 条目;`login.html` 去掉指向韩语的路由分支。
2. **复制作文卡**:`cp glossary/index.html essay-card/index.html`,然后在副本里:
   - localStorage key:`glossary-` → `essaycard-`(全局替换,含 review-queue 等)。
   - 关闭 `glossary_state` 云同步(拉/推都短路,改纯本地)。
   - 品牌:标题/页面 brand → 超级作文卡;可选换主题色与作文区分。
   - 其余逻辑保持一致(进度小点 / AB 对照 / 排序 / 全部单词胶囊都带过去)。
3. **路由**:`systems.js` 的 `essay.path` → `/essay-card/`;老 `/essay/` 不再被 systems.js / login 引用。
4. **验证**:`/glossary/` 与 `/essay-card/` 都能开;两者 localStorage 互不串;单词卡云同步不受影响;韩语入口彻底消失;JS 语法 0 错。
5. **收口**:分支验证 OK → 合 main → 线上验。

## 不做 / 风险

- 不动后端(korean room/profile/RLS 残留;作文卡后端以后接)。
- 作文卡内置示例词暂留(以后按作文场景替换)。
- 复制法会让两份代码漂移(以后单词卡的修复要手动同步到作文卡)—— 可接受,因为作文卡之后要单独演化。
