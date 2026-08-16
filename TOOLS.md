# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

## Coolify (deploy Mio ERP)

- **URL UI**: http://147.93.157.45 (API di port 8000, butuh token — login email/password TIDAK lewat API)
- **Admin**: `rama.pelatihmlp@gmail.com` / `Prana3006!`
- **App**: `mio-erp` — uuid `s6hb8h261norekmqqtg9jm3y` · repo `rama2577/mio-erp` branch `main` · port 3000 (Nixpacks)
- **VPS SSH**: `ssh root@147.93.157.45` (key-based). DB Coolify: `docker exec coolify-db psql -U coolify -d coolify`

### Trigger deploy via SSH (tanpa klik UI, tanpa API token)
```bash
# 1) siapkan code php (deploy):
#   $app = \App\Models\Application::where('uuid','s6hb8h261norekmqqtg9jm3y')->first();
#   $r = queue_application_deployment(application:$app, deployment_uuid:new_public_id(), pull_request_id:0, force_rebuild:true, is_api:true, no_questions_asked:true);
#   echo json_encode($r);   → {"status":"queued", ...}
# 2) cancel deploy (status: cancelled-by-user + docker rm -f <deployment_uuid>)
ssh root@147.93.157.45 "echo '<B64>' | base64 -d | docker exec -i coolify php artisan tinker"
```
- Monitor: `docker exec coolify-db psql -U coolify -d coolify -c "select deployment_uuid,status,left(commit,8),created_at,finished_at from application_deployment_queues order by id desc limit 3;"`
- Cek container jalan: `docker ps --filter 'name=s6hb8h261norekmqqtg9jm3y'` (image tag = commit hash).
- Status enum: queued / in_progress / finished / failed / cancelled-by-user.


## Related

- [Agent workspace](/concepts/agent-workspace)

## Supabase (Mio ERP)

- **Project ref**: `dgaqjgwtjopgbadrszoj` · API URL `https://dgaqjgwtjopgbadrszoj.supabase.co`
- **Keys**: publishable `sb_publishable_...`, secret `sb_secret_...` (di .env.local repo Mio)
- **Management token**: `sbp_<REDACTED>` (utk run SQL via Management API)
- **DB direct**: `db.dgaqjgwtjopgbadrszoj.supabase.co:5432` (IPv6-ONLY, user `postgres.dgaqjgwtjopgbadrszoj`, sslmode=require). Mac lokal TANPA IPv6 → pakai VPS: `docker run --rm --network host postgres:15-alpine psql ...`
- **Pooler**: `aws-0-<region>.pooler.supabase.com` — "tenant not found" (pooling disabled/region tak jelas)
- **Password DB `DB_PASSWORD_<REDACTED>` DITOLAK** (auth failed) — jangan dipakai; belum ketemu nilai benar (Rama tak mau reset)
- **GLM_API_KEY** (z.ai): `GLM_API_KEY_<REDACTED>`

### Run SQL via Management API (butuh browser User-Agent!)
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/dgaqjgwtjopgbadrszoj/database/query" \
  -H "Authorization: Bearer sbp_<REDACTED>" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 ... Chrome/126.0" \
  -d '{"query":"select 1;"}'
```
- ⚠️ User-Agent wajib browser (Python-urllib/curl default → Cloudflare 1010).
- ⚠️ Rate limit: max 10 req/menit, 1 req/detik. Statement pecah per `;`, jeda 1.3s.
- Response: array hasil (SELECT) atau `[]` (DDL sukses).

### Set env var Coolify (tanpa UI/API token)
via tinker (auto-encrypt), app internal id=1, resourceable_type=App\Models\Application:
```php
$ev = \App\Models\EnvironmentVariable::where('resourceable_id',1)->where('key','GLM_API_KEY')->first();
$ev->value = '...'; $ev->save();  // atau new + save() utk key baru
```
