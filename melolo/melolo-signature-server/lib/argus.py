"""
X-Argus Signature Implementation
Combines Simon cipher, SM3 hash, and Protobuf encoding
"""

import struct
import time
import base64
import hashlib
from typing import Optional, Dict

# Import local modules
try:
    from lib.simon import simon_encrypt
    from lib.sm3 import sm3_hash
except ImportError:
    from .simon import simon_encrypt
    from .sm3 import sm3_hash

# X-Argus version and constants
ARGUS_VERSION = 0x04
ARGUS_MAGIC = b'\xac\xec'

def _generate_device_token(device_id: str, install_id: str, app_id: str) -> bytes:
    """Generate device token from identifiers"""
    token_data = f"{device_id}|{install_id}|{app_id}".encode('utf-8')
    return hashlib.md5(token_data).digest()

def _build_argus_payload(
    url: str,
    timestamp: int,
    device_id: str,
    install_id: str,
    app_id: str,
    random_bytes: bytes
) -> bytes:
    """
    Build X-Argus protobuf-like payload
    
    This is a simplified implementation based on reverse engineering.
    The actual format may vary between app versions.
    """
    # Payload structure (simplified):
    # [2 bytes: version] [4 bytes: timestamp] [16 bytes: url_hash]
    # [16 bytes: device_token] [8 bytes: random]
    
    url_hash = hashlib.md5(url.encode('utf-8')).digest()
    device_token = _generate_device_token(device_id, install_id, app_id)
    
    payload = struct.pack('>HI', ARGUS_VERSION, timestamp)
    payload += url_hash
    payload += device_token
    payload += random_bytes[:8].ljust(8, b'\x00')
    
    return payload

def _derive_key(device_id: str, timestamp: int) -> bytes:
    """Derive encryption key from device_id and timestamp"""
    key_material = f"{device_id}:{timestamp}".encode('utf-8')
    # Use SM3 hash to derive 16-byte key
    key_hash = sm3_hash(key_material)
    return key_hash[:16]

def generate_argus(
    url: str,
    timestamp: Optional[int] = None,
    device_id: str = "",
    install_id: str = "",
    app_id: str = "645713"
) -> str:
    """
    Generate X-Argus signature
    
    Args:
        url: Full request URL
        timestamp: Unix timestamp (auto-generated if None)
        device_id: Device ID
        install_id: Install ID
        app_id: Application ID
    
    Returns:
        Base64-encoded X-Argus signature
    """
    import os
    
    if timestamp is None:
        timestamp = int(time.time())
    
    # Generate random bytes
    random_bytes = os.urandom(16)
    
    # Build payload
    payload = _build_argus_payload(
        url, timestamp, device_id, install_id, app_id, random_bytes
    )
    
    # Derive key
    key = _derive_key(device_id, timestamp)
    
    # Encrypt with Simon cipher
    encrypted = simon_encrypt(payload, key)
    
    # Add magic header
    result = ARGUS_MAGIC + encrypted
    
    # Base64 encode
    return base64.b64encode(result).decode('utf-8')

def generate_all_signatures(
    url: str,
    body: Optional[str] = None,
    cookie: Optional[str] = None,
    timestamp: Optional[int] = None,
    device_id: str = "",
    install_id: str = "",
    app_id: str = "645713"
) -> Dict[str, str]:
    """
    Generate all ByteDance security headers
    
    Args:
        url: Full request URL
        body: Request body (for POST requests)
        cookie: Cookie string
        timestamp: Unix timestamp
        device_id: Device ID
        install_id: Install ID
        app_id: Application ID
    
    Returns:
        Dictionary with all security headers
    """
    try:
        from lib.gorgon import (
            generate_gorgon, generate_khronos, generate_ss_stub, hash_url_params
        )
        from lib.ladon import generate_ladon
    except ImportError:
        from .gorgon import (
            generate_gorgon, generate_khronos, generate_ss_stub, hash_url_params
        )
        from .ladon import generate_ladon
    
    if timestamp is None:
        timestamp = int(time.time())
    
    # Generate individual signatures
    url_hash = hash_url_params(url)
    body_hash = generate_ss_stub(body) if body else None
    cookie_hash = hashlib.md5(cookie.encode()).hexdigest() if cookie else None
    
    headers = {
        'X-Khronos': generate_khronos(timestamp),
        'X-Gorgon': generate_gorgon(url_hash, body_hash, cookie_hash, timestamp),
        'X-Ladon': generate_ladon(url, timestamp, device_id, app_id),
        'X-Argus': generate_argus(url, timestamp, device_id, install_id, app_id)
    }
    
    if body_hash:
        headers['X-SS-STUB'] = body_hash
    
    return headers
