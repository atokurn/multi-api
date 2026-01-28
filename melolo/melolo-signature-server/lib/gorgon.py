"""
X-Gorgon Signature Implementation
Based on reverse-engineered ByteDance algorithm
"""

import hashlib
import time
from typing import Optional

# Gorgon version constants
GORGON_VERSION = "0404"  # Version identifier

def md5_hex(data: str) -> str:
    """Generate MD5 hash as hex string"""
    return hashlib.md5(data.encode('utf-8')).hexdigest()

def generate_gorgon(
    url_params_hash: str,
    body_hash: Optional[str] = None,
    cookie_hash: Optional[str] = None,
    timestamp: Optional[int] = None
) -> str:
    """
    Generate X-Gorgon signature
    
    Args:
        url_params_hash: MD5 hash of sorted URL query parameters
        body_hash: MD5 hash of request body (X-SS-STUB), or None
        cookie_hash: MD5 hash of cookie string, or None
        timestamp: Unix timestamp, or current time if None
    
    Returns:
        X-Gorgon signature string
    """
    if timestamp is None:
        timestamp = int(time.time())
    
    # Convert timestamp to hex
    ts_hex = format(timestamp, 'x')
    
    # Build gorgon data
    # Format: version + timestamp_hex + hash_data
    gorgon_data = GORGON_VERSION + ts_hex
    
    # Add URL params hash (first 8 chars)
    gorgon_data += url_params_hash[:8] if url_params_hash else "00000000"
    
    # Add body hash (first 8 chars) 
    gorgon_data += body_hash[:8] if body_hash else "00000000"
    
    # Add cookie hash (first 8 chars)
    gorgon_data += cookie_hash[:8] if cookie_hash else "00000000"
    
    # Pad to standard length
    while len(gorgon_data) < 40:
        gorgon_data += "0"
    
    return gorgon_data

def hash_url_params(url: str) -> str:
    """
    Extract and hash URL query parameters
    
    Args:
        url: Full URL with query string
    
    Returns:
        MD5 hash of sorted query parameters
    """
    from urllib.parse import urlparse, parse_qs, urlencode
    
    parsed = urlparse(url)
    if not parsed.query:
        return md5_hex("")
    
    # Parse and sort query params
    params = parse_qs(parsed.query, keep_blank_values=True)
    sorted_params = sorted(params.items())
    
    # Flatten and join
    param_str = "&".join(
        f"{k}={v[0] if isinstance(v, list) and v else v}"
        for k, v in sorted_params
    )
    
    return md5_hex(param_str)

def generate_ss_stub(body: Optional[str] = None) -> Optional[str]:
    """
    Generate X-SS-STUB header (MD5 of request body)
    
    Args:
        body: Request body string
    
    Returns:
        MD5 hash or None if no body
    """
    if not body or body.strip() == "":
        return None
    return md5_hex(body)

def generate_khronos(timestamp: Optional[int] = None) -> str:
    """
    Generate X-Khronos header (Unix timestamp)
    
    Args:
        timestamp: Unix timestamp, or current time if None
    
    Returns:
        Timestamp as string
    """
    if timestamp is None:
        timestamp = int(time.time())
    return str(timestamp)
