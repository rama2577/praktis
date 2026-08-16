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
