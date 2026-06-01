# Supabase 结构快照 — 2026-05-31(动「两系统重构」前)

> 项目 ref:`qjnagbzqhoansixqharb`。本次重构**不碰后端**,此快照为安全网。
> 数据行 / 函数源码因工具限制(CLI 无法 headless 登录 + MCP 输出被打码)未能在此自动落盘;
> 完整 dump 步骤见末尾。

## public schema 表清单(12)

| 表 | RLS | 备注 |
|---|---|---|
| `messages` | ✅ | id, room_id, user_id, role, content, created_at, type, attachments, channel, source, lesson_session_id |
| `model_usage` | ✅ | token 计费 |
| `rooms` | ✅ | 各系统单例房间(product 区分) |
| `memories` | — | |
| `profiles` | — | 含 `system`(speak2go/essay/korean/well2go 路由) |
| `agent_keys` | — | |
| `room_members` | — | |
| `expert_todo_templates` | — | |
| `expert_material_folders` | — | |
| `room_invites` | — | |
| `lesson_sessions` | — | |
| `glossary_state` | — | 单词卡按账号同步的 jsonb |

## Edge Functions(8,ACTIVE)

`chat-ai`(v6, jwt) · `agent-auth`(v7) · `speak2go-ingest`(v6) · `speak2go-chat`(v3) ·
`chat2go-ingest`(v2, jwt) · `glossary-grade`(v1) · `chat-translate`(v1) · `glossary-lookup`(v3)

## 关键 room IDs(systems.js)

- speak2go(英语课):`5b622bc4-88b4-47c1-9aa6-643c4b1e0f96`
- essay(作文):`01c240c3-9b94-472f-953b-d27584749008`
- korean(韩语,本次前端删除、后端暂留):`f015f5d5-2163-490f-bf99-92a2ffa45bdd`
- well2go:`8980e7e0-e24a-44c4-b542-47c8e9105947`

## 已版本化(无需额外备份)

- 迁移文件:chat2go repo `supabase/migrations/`(git)。
- Edge Function 源码:chat2go repo `supabase/functions/`(部分)+ 线上 deployed(可 `supabase functions download`)。
- 前端:speak2go repo(git)+ tag `speak2go-20260531-eod` / `speak2go-v1.0`。

## 完整 dump 步骤(需交互登录一次)

```bash
# 在你自己的终端(或本会话用 ! 前缀)跑:
supabase login                       # 一次性交互登录
cd /Users/dami2026/chat2go           # 后端代码所在 repo
supabase link --project-ref qjnagbzqhoansixqharb
supabase db dump -f docs/backup/2026-05-31/db-schema.sql           # 结构
supabase db dump --data-only -f docs/backup/2026-05-31/db-data.sql # 数据
supabase functions download <slug>   # 逐个拉函数源码
```
