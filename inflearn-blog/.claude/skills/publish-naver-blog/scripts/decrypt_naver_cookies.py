#!/usr/bin/env python3
"""
Decrypt the logged-in NAVER session cookies from the local Chrome profile so a
headless/automation browser can reuse the login WITHOUT anyone typing a password.

Why this exists: Chrome keeps the live NAVER session (NID_AUT / NID_SES) as
persistent cookies on disk, but the values are AES-encrypted with a key held in
the macOS Keychain ("Chrome Safe Storage"). We read that key (the OS may show a
one-time "allow" prompt), decrypt only the *.naver.com cookies, and write them to
a JSON file that publish_naver.mjs injects into a clean Playwright browser.

macOS only. Requires: python3 with the `cryptography` package.

Usage:
    python3 decrypt_naver_cookies.py [OUT_JSON]     # default: ./naver_cookies.json
"""
import json, os, sys, sqlite3, subprocess, shutil, hashlib, glob, tempfile

try:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.backends import default_backend
except ImportError:
    sys.exit("Missing dependency: pip3 install cryptography")

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.getcwd(), "naver_cookies.json")
CHROME_DIR = os.path.expanduser("~/Library/Application Support/Google/Chrome")
if not os.path.isdir(CHROME_DIR):
    sys.exit(f"Chrome data dir not found: {CHROME_DIR} (this script is macOS-only)")


def count_naver(cookies_path):
    tmp = tempfile.mktemp(suffix=".db")
    try:
        shutil.copy(cookies_path, tmp)
        con = sqlite3.connect(tmp)
        n = con.execute("SELECT count(*) FROM cookies WHERE host_key LIKE '%naver%'").fetchone()[0]
        con.close()
        return n
    except Exception:
        return -1
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


# 1) find the profile with the most naver cookies (that's the one that's logged in)
candidates = []
for cookies_path in glob.glob(os.path.join(CHROME_DIR, "*", "Cookies")):
    prof = os.path.basename(os.path.dirname(cookies_path))
    if prof == "Guest Profile":
        continue
    candidates.append((count_naver(cookies_path), prof, cookies_path))
candidates.sort(reverse=True)
if not candidates or candidates[0][0] <= 0:
    sys.exit("No NAVER cookies found in any Chrome profile. Log into naver.com in Chrome first "
             "(with '로그인 상태 유지' checked so the session persists to disk).")
n, prof, cookies_path = candidates[0]
print(f"[decrypt] using profile '{prof}' with {n} naver cookies", file=sys.stderr)

# 2) get the Keychain key and derive the AES-128 key (macOS v10 scheme)
try:
    pw = subprocess.check_output(
        ["security", "find-generic-password", "-w", "-s", "Chrome Safe Storage"],
        stderr=subprocess.DEVNULL).strip()
except subprocess.CalledProcessError:
    sys.exit("Could not read 'Chrome Safe Storage' from Keychain. If a prompt appeared, click Allow and retry.")
key = hashlib.pbkdf2_hmac("sha1", pw, b"saltysalt", 1003, 16)


def decrypt(ev):
    if not ev:
        return None
    if ev[:3] not in (b"v10", b"v11"):
        try:
            return ev.decode("utf-8", "ignore")
        except Exception:
            return None
    d = Cipher(algorithms.AES(key), modes.CBC(b" " * 16), backend=default_backend()).decryptor()
    pt = d.update(ev[3:]) + d.finalize()
    if pt:  # strip PKCS7 padding
        pad = pt[-1]
        if 1 <= pad <= 16:
            pt = pt[:-pad]

    def is_text(b):
        try:
            b.decode("utf-8"); return True
        except Exception:
            return False
    # newer Chrome prepends a 32-byte sha256 domain hash before the value
    if len(pt) >= 32 and not is_text(pt[:1]) and is_text(pt[32:]):
        return pt[32:].decode("utf-8")
    if is_text(pt):
        return pt.decode("utf-8")
    return pt[32:].decode("utf-8", "ignore")


# 3) decrypt only naver cookies -> JSON for Playwright addCookies
tmp = tempfile.mktemp(suffix=".db")
shutil.copy(cookies_path, tmp)
con = sqlite3.connect(tmp); con.text_factory = bytes
rows = con.execute(
    "SELECT name,host_key,path,expires_utc,is_secure,is_httponly,encrypted_value "
    "FROM cookies WHERE host_key LIKE '%naver%'").fetchall()
con.close(); os.remove(tmp)

out = []
for name, host, path, exp, sec, http, ev in rows:
    name, host, path = name.decode(), host.decode(), path.decode()
    val = decrypt(ev)
    if val is None:
        continue
    c = {"name": name, "value": val, "domain": host, "path": path,
         "secure": bool(sec), "httpOnly": bool(http)}
    if exp and exp > 0:
        c["expires"] = exp / 1_000_000 - 11644473600
    out.append(c)

with open(OUT, "w") as f:
    json.dump(out, f, ensure_ascii=False)

have = {c["name"] for c in out}
print(f"[decrypt] wrote {len(out)} cookies -> {OUT}", file=sys.stderr)
if not ({"NID_AUT", "NID_SES"} & have):
    print("[decrypt] WARNING: NID_AUT/NID_SES not found — the session may not be logged in.", file=sys.stderr)
