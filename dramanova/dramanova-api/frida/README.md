# DramaNova Frida Intercept

Script untuk intercept API traffic dari app DramaNova resmi (com.udrama.ruiqilin).

## Requirements

- Rooted Android device / Emulator
- Frida server running di device
- USB debugging enabled
- DramaNova app (resmi, bukan mod) terinstall

## Setup

### 1. Start Frida Server di Device

```bash
adb shell
su
/data/local/tmp/frida-server &
```

### 2. Run Script

**Spawn mode** (recommended — auto-start app):
```bash
frida -U -f com.udrama.ruiqilin -l dramanova-intercept.js --no-pause
```

**Attach mode** (app sudah running):
```bash
frida -U com.udrama.ruiqilin -l dramanova-intercept.js
```

## Yang Di-capture

| Hook | Data |
|---|---|
| `EncryptUtil.generateAesKey` | AES key yang di-generate |
| `EncryptUtil.encryptWithRsa` | AES key sebelum & sesudah RSA encrypt |
| `EncryptUtil.encryptWithAes` | Request body (plaintext → encrypted) |
| `EncryptUtil.decryptWithAes` | Response body (encrypted → plaintext) |
| `OkHttp Interceptor` | URL, method, headers, body |
| `LoginHelper` | Token set/get |
| `GuestHelper` | Guest username generation |
| `Gson.toJson` | Object serialization |

## Output yang Diharapkan

Buka app → browse drama → klik detail drama → output:

```
[🔑 AES KEY] Generated: NTExYmJjMmY4OGEzNGMwMw==
[🔐 RSA ENCRYPT] Input (AES key): NTExYmJjMmY4OGEzNGMwMw==
║ GET https://playsverse.com/api/drama/1234567890
║ encrypt-key: xxxxx...
║ clientId: 8aaa2824912e16e799e82203b89668df
║ Authorization: Bearer eyJ...
[📥 AES DECRYPT] Decrypted body:
{"code":200,"data":{"title":"...","videos":[{"videoUrl":"https://..."}]}}
[🎬 VIDEO DATA DETECTED!]
```

## RPC Commands (di Frida console)

```javascript
// Ambil semua request yang tercapture
rpc.exports.getCaptured()

// Clear data
rpc.exports.clearCaptured()

// Ambil response drama detail terakhir (yang ada video URLs)
rpc.exports.getLastDetail()
```

## Troubleshooting

- **App crash saat launch**: Coba attach mode instead of spawn mode
- **No hooks active**: Pastikan Frida server versi sama dengan Frida client
- **SSL errors**: Script sudah include SSL bypass, tapi kalau tetap error, coba tambahkan `--realm=emulated`
