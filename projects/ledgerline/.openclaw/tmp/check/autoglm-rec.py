#!/usr/bin/env python3
import sys, json, hashlib, time, urllib.request, uuid, mimetypes, os

APP_ID = "100003"
APP_KEY = "38d2391985e2369a5fb8227d8e6cd5e5"
BASE = "https://autoglm-api.autoglm.ai/agentdr/v1/assistant"
TOKEN_URL = "http://127.0.0.1:18432/get_token"

def token():
    with urllib.request.urlopen(TOKEN_URL) as r:
        t = r.read().decode().strip()
    return t if t.lower().startswith("bearer ") else f"Bearer {t}"

def headers():
    ts = str(int(time.time()))
    sign = hashlib.md5(f"{APP_ID}&{ts}&{APP_KEY}".encode()).hexdigest()
    return {
        "Authorization": token(),
        "Content-Type": "application/json",
        "X-Auth-Appid": APP_ID,
        "X-Auth-TimeStamp": ts,
        "X-Auth-Sign": sign,
    }

def upload(path):
    fn = os.path.basename(path)
    mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
    data = open(path, "rb").read()
    b = f"----W{ uuid.uuid4().hex[:16] }"
    body = (f"--{b}\r\nContent-Disposition: form-data; name=\"files\"; filename=\"{fn}\"\r\nContent-Type: {mime}\r\n\r\n").encode() + data + f"\r\n--{b}--\r\n".encode()
    h = headers()
    h["Content-Type"] = f"multipart/form-data; boundary={b}"
    req = urllib.request.Request(f"{BASE}/upload-mix", data=body, headers=h, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode())

def recognize(url, prompt):
    payload = json.dumps({"prompt": prompt, "image_url": url}).encode()
    req = urllib.request.Request(f"{BASE}/skills/image-recognition", data=payload, headers=headers(), method="POST")
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read().decode())

if __name__ == "__main__":
    path = sys.argv[1]
    up = upload(path)
    oss = up.get("data", {}).get("oss_info", [{}])[0].get("oss_url", "")
    print("UPLOAD:", up.get("code"), oss)
    if not oss:
        print(json.dumps(up, ensure_ascii=False)[:800]); sys.exit(1)
    prompt = sys.argv[2] if len(sys.argv) > 2 else "Describe the image"
    res = recognize(oss, prompt)
    print(json.dumps(res, ensure_ascii=False))
