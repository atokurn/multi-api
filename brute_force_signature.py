
import hashlib
import hmac
import base64
import urllib.parse

# Known valid data from Sansekai response
VIDEO_PATH = "/playlet-hls-ims/hls_ims_1761364508_258451_10_0_94654.mp4"
TIMESTAMP = "1768095331"
TARGET_SIGNATURE_B64 = "neWf99b48IdnCkSSIMfPRdIMjEYgMV6rXHSGK0OjoHQ="

# Decode target signature to bytes
try:
    TARGET_SIGNATURE_BYTES = base64.b64decode(TARGET_SIGNATURE_B64)
except Exception as e:
    print(f"Error decoding signature: {e}")
    exit(1)

print(f"Target Signature (Hex): {TARGET_SIGNATURE_BYTES.hex()}")
print(f"Target Signature Length: {len(TARGET_SIGNATURE_BYTES)} bytes (32 bytes = SHA256)")

# Candidate Keys
KEYS = [
    "nW8GqjbdSYRI", # API Salt
    "signSalt=nW8GqjbdSYRI",
    "farsunpteltd",
    "zhangwan",
    "shortplay",
    "zshipricf",
    "dramabox",
    "flickreels",
    "123456",
    "12345678",
    "zhangwandj",
    "farsun",
    "FarsunPteLtd",
    "Android",
    "android",
    "kb.b",
    "HmacSHA256",
    # Common Default Keys
    "secret",
    "key",
    "aliyun",
    "cdn",
    "aliyuncdn",
]

# Variations of keys (e.g. combined)
COMBO_KEYS = []
for k in KEYS:
    COMBO_KEYS.append(k)
    COMBO_KEYS.append(k.upper())
    COMBO_KEYS.append(k.lower())
    COMBO_KEYS.append(hashlib.md5(k.encode()).hexdigest())

KEYS = list(set(COMBO_KEYS))

def check_sha256(data_str, key_str=None):
    # Try basic SHA256 of data
    try:
        if key_str:
             # Try HMAC-SHA256
            h = hmac.new(key_str.encode('utf-8'), data_str.encode('utf-8'), hashlib.sha256).digest()
            if h == TARGET_SIGNATURE_BYTES:
                return f"MATCH FOUND (HMAC-SHA256)! Key: '{key_str}', Data: '{data_str}'"
            
            # Try appending key
            s = hashlib.sha256((data_str + key_str).encode('utf-8')).digest()
            if s == TARGET_SIGNATURE_BYTES:
                return f"MATCH FOUND (SHA256 Append)! Key: '{key_str}', Data: '{data_str}'"
                
            # Try prepending key
            s = hashlib.sha256((key_str + data_str).encode('utf-8')).digest()
            if s == TARGET_SIGNATURE_BYTES:
                return f"MATCH FOUND (SHA256 Prepend)! Key: '{key_str}', Data: '{data_str}'"

        else:
            # Just SHA256 of data
            s = hashlib.sha256(data_str.encode('utf-8')).digest()
            if s == TARGET_SIGNATURE_BYTES:
                 return f"MATCH FOUND (SHA256)! Data: '{data_str}'"
                 
    except Exception as e:
        pass
    return None

print("Starting brute force...")

# Formats to try
# Common CDN patterns:
# path-timestamp-rand-uid-md5hash (Aliyun Type A) - but usually MD5. We have SHA256.
# Maybe: path + "-" + timestamp
# Maybe: path + timestamp
# Maybe: timestamp + path

formats = [
    f"{VIDEO_PATH}-{TIMESTAMP}",
    f"{VIDEO_PATH}{TIMESTAMP}",
    f"{TIMESTAMP}{VIDEO_PATH}",
    f"{VIDEO_PATH}-{TIMESTAMP}-0-0", # Aliyun Type A with uid=0, rand=0
    f"{VIDEO_PATH}-{TIMESTAMP}-0-0-", # Aliyun Type A with uid=0, rand=0
]

for fmt in formats:
    # Check without key (just hash)
    res = check_sha256(fmt)
    if res:
        print(res)
        exit(0)
        
    for k in KEYS:
        res = check_sha256(fmt, k)
        if res:
            print(res)
            exit(0)

# Try with just filename
FILENAME = "hls_ims_1761364508_258451_10_0_94654.mp4"
formats_fn = [
    f"/{FILENAME}-{TIMESTAMP}",
    f"/{FILENAME}{TIMESTAMP}",
    f"{TIMESTAMP}/{FILENAME}",
    f"/{FILENAME}-{TIMESTAMP}-0-0"
]

for fmt in formats_fn:
    for k in KEYS:
        res = check_sha256(fmt, k)
        if res:
            print(res)
            exit(0)

print("No match found.")
