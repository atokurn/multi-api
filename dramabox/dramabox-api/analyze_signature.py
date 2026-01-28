import hashlib
import hmac
import base64
import urllib.parse

# Samples from Sansekai response
samples = [
    {
        "url": "https://zshipricf.farsunpteltd.com/playlet-hls-ims/hls_ims_1761364508_258451_10_0_94654.mp4",
        "verify_ts": "1768095331",
        "verify_sig": "neWf99b48IdnCkSSIMfPRdIMjEYgMV6rXHSGK0OjoHQ="
    },
    {
        "url": "https://zshipricf.farsunpteltd.com/playlet-hls-ims/hls_ims_1761364509_258452_11_0_82686.mp4",
        "verify_ts": "1768095331",
        "verify_sig": "okWdKdS2AxbIzbAqHAqaEKn4xLuJTNR+AmRNWlQz/Y0="
    }
]

# Known keys/salts (candidates)
keys = [
    "nW8GqjbdSYRI", # API Sign Salt
    "XBUAU2eC0gF6VbgJuZx5ipXCFUoN79w0", # ShortMax key (just in case)
    "farsunpteltd",
    "zshipricf",
    "123456",
    "12345678"
]

def try_verify():
    for sample in samples:
        path = urllib.parse.urlparse(sample["url"]).path
        target_sig = sample["verify_sig"]
        ts = sample["verify_ts"]
        
        # Decode target sig to bytes
        try:
            target_bytes = base64.b64decode(target_sig)
        except:
            print(f"Failed to base64 decode: {target_sig}")
            continue

        print(f"Testing URL: {path}")
        print(f"TS: {ts}")
        print(f"Target Sig (b64): {target_sig}")
        
        found = False
        
        for key in keys:
            key_bytes = key.encode('utf-8')
            
            # Possible data formats
            formats = [
                f"{path}-{ts}",
                f"{path}{ts}",
                f"{ts}{path}",
                f"{path}?verify={ts}",
                f"{path}{ts}key={key}" # Akamai/AliCDN style sometimes
            ]
            
            for fmt in formats:
                data_bytes = fmt.encode('utf-8')
                
                # Try HMAC-SHA256
                h = hmac.new(key_bytes, data_bytes, hashlib.sha256)
                if h.digest() == target_bytes:
                    print(f"SUCCESS! HMAC-SHA256")
                    print(f"Key: {key}")
                    print(f"Format: {fmt}")
                    found = True
                    break
                    
                # Try SHA256(fmt + key)
                h2 = hashlib.sha256((fmt + key).encode('utf-8'))
                if h2.digest() == target_bytes:
                    print(f"SUCCESS! SHA256(Data+Key)")
                    print(f"Key: {key}")
                    print(f"Format: {fmt} + key")
                    found = True
                    break
                    
            if found: break
        
        if not found:
            print("No match found for this sample.\n")
        else:
            print("-" * 20)

try_verify()
