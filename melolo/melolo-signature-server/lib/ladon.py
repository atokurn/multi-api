"""
X-Ladon Signature Implementation
Based on reverse-engineered ByteDance algorithm
"""

import hashlib
import time
import struct
from typing import Optional

# Ladon constants
LADON_MAGIC = b'\x01\x02'  # Magic bytes
LADON_VERSION = 1

def xor_encrypt(data: bytes, key: bytes) -> bytes:
    """XOR encrypt/decrypt data with key"""
    result = bytearray(len(data))
    key_len = len(key)
    for i, byte in enumerate(data):
        result[i] = byte ^ key[i % key_len]
    return bytes(result)

def generate_ladon(
    url: str,
    timestamp: Optional[int] = None,
    device_id: str = "",
    app_id: str = "645713"
) -> str:
    """
    Generate X-Ladon signature (simplified implementation)
    
    Args:
        url: Request URL
        timestamp: Unix timestamp
        device_id: Device ID
        app_id: Application ID
    
    Returns:
        Base64-encoded X-Ladon signature
    """
    import base64
    
    if timestamp is None:
        timestamp = int(time.time())
    
    # Build payload
    payload_parts = [
        str(timestamp),
        app_id,
        device_id,
        hashlib.md5(url.encode()).hexdigest()[:16]
    ]
    payload = "|".join(payload_parts)
    
    # XOR encrypt with key derived from timestamp
    key = struct.pack(">Q", timestamp)  # 8-byte key from timestamp
    encrypted = xor_encrypt(payload.encode('utf-8'), key)
    
    # Add magic and version
    result = LADON_MAGIC + bytes([LADON_VERSION]) + encrypted
    
    # Base64 encode
    return base64.b64encode(result).decode('utf-8')

def generate_ladon_simple(timestamp: Optional[int] = None) -> str:
    """
    Generate simplified X-Ladon for basic requests
    
    This is a fallback when full ladon is not needed
    """
    import base64
    import random
    import string
    
    if timestamp is None:
        timestamp = int(time.time())
    
    # Generate random padding
    padding = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
    
    # Simple format: base64(timestamp + padding)
    data = f"{timestamp}:{padding}"
    return base64.b64encode(data.encode()).decode()
