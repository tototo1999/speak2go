# 超级单词卡 — 词典跟账号走(Supabase 同步)

> 2026-05-30 设计。解决:词典数据只存浏览器 localStorage,换浏览器/设备就读不到。
> 改成 **per-account 存 Supabase**,顺带把用户散落在某个浏览器里的词自动找回。

## 问题

`glossary/index.html` 把词典全部只写 localStorage(per-browser),从不入账号:

| key | 内容 |
|---|---|
| `glossary-user-terms` | 用户加的词 `{catId: [{en,zh,hint}]}` |
| `glossary-deleted` | 硬删墓碑 `["catId::en"]` |
| `glossary-deleted-cats` | 删掉的分类 `["catId"]` |
| `glossary-dynamic-cats` | 自定义分类 `[{id,title}]` |
| `glossary-cat-titles` | 分类改名 `{catId: title}` |
| `glossary-edits` | 每词编辑/做题记录 `{catId::en: {quizLog,sentences,note,phonetic}}` |
| `glossary-favorites` | 收藏 `["catId::en"]` |

页面虽连 Supabase,但仅用匿名 key 调 edge function(查词 / AI 评分),从未存账号数据。

## 方案(已与用户确认)

**数据模型:整份 JSON 一行 per account。**(不做规范化多表 — 个人词库属过度设计)

```sql
create table public.glossary_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.glossary_state enable row level security;
-- 只能读写自己那行
create policy glossary_state_select on public.glossary_state for select using (auth.uid() = user_id);
create policy glossary_state_insert on public.glossary_state for insert with check (auth.uid() = user_id);
create policy glossary_state_update on public.glossary_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

`data` = 上表 7 个 key 打包:`{userTerms, deleted, deletedCats, dynamicCats, catTitles, edits, favorites}`。

**登录要求:不登录用本地、登录就同步。** 未登录照常走 localStorage;有 session 才拉/推云端。

## 客户端

- 页面新增 `<script src="/vendor/supabase.js" onerror=cdn-fallback>`(沿用 login.html 写法)。
- `const _sb = window.supabase.createClient(_GLOSSARY_SB_URL, _GLOSSARY_ANON)` —— 默认 storage key 与现有 `sb-…-auth-token` 一致,自动复用登录态 + 自动刷新 JWT。用 `_sb` 命名避开 UMD 全局 `supabase` 冲突。

## 同步流程

**加载(`_syncPull`,有 session 才跑):**
1. `_sb.from('glossary_state').select('data').eq('user_id', uid)` 取云端 blob。
2. 与当前 localStorage 7 个 key **合并**(见下)。
3. 合并结果写回 localStorage 7 个 key。
4. 调 `reloadFromStorage()` 重渲整页(已有函数,会处理增/删/改名/用户词变化)。
5. 把合并结果 `upsert` 回云端(让云端也收敛到并集)。

**变更(`_syncPush`,防抖 ~1.2s):** 收集 7 个 key → `upsert({user_id, data, updated_at})`。
触发点:监听 `localStorage.setItem`(仅白名单 `glossary-` key)。`_syncPull` 写回时用 `_syncApplying` 标志抑制,避免回环。

## 合并规则(关键:保证"删掉的词不复活")

删除恒留墓碑(`state.deleted.add(catId::en)`,行 2628/3843),`getMergedTerms`(行 1241-1243)对内置词+用户词一起按墓碑过滤。所以**并集 + 墓碑并集**安全:被删词即使条目并回,也被墓碑压住,不复活。

| 字段 | 合并 |
|---|---|
| `userTerms` | 按 catId,按 `en`(小写)去重并集;同 en 冲突本地优先(本机为当前编辑设备) |
| `deleted` / `deletedCats` / `favorites` | 集合并集 |
| `dynamicCats` | 按 id 并集,title 取非空、本地优先 |
| `catTitles` | `{...server, ...local}` 本地优先 |
| `edits` | 按 key:`quizLog` 按 `at` 合并去重、`sentences` 并集、`note`/`phonetic` 本地非空优先 |

**迁移/找回自动达成:** 上线后用有词的浏览器打开一次 → 本地非空、云端空 → 并集=本地 → 推上账号。空浏览器:本地空、云端有 → 并集=云端 → 重渲出词。无需手动导出。

## 边界 / 容错

- 无 session / supabase-js 没加载成功 → 纯本地模式,功能不受影响。
- 拉/推失败 → `try/catch` 静默,localStorage 仍是真相,下次再同步。
- blob 大小:个人词库几百词,JSON 几十 KB,jsonb 一行完全够。
- 跨设备并发(同账号两端同时改)→ 加载时合并收敛;单用户场景冲突极少,并集 + 墓碑保证不丢删、不复活。

## 验证

1. Supabase MCP 建表 + RLS(preview-then-go)。
2. Playwright 本地起 http:
   - 空 localStorage + 登录 → 写一行假 blob 到云 → 刷新 → 词出现。
   - 加词/删词/改名 → 等防抖 → 查云端 blob 已更新。
   - 删词后刷新(从云拉)→ 删的词不复活。
   - 未登录 → 纯本地仍可用,不报错。
3. `node --check` 抽出的内联脚本。

## 关联
- [[project_glossary_active_file]] 词库唯一真文件 = glossary/index.html。
- [[project_speak2go_testbed_isolation]] Supabase 后端 speak2go.ai / chat2go.ai 共用 → 新表对两站都生效,但 RLS 限本人,无副作用。
