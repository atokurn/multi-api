"""
SM3 Hash Implementation
SM3 is a Chinese cryptographic hash function (国家密码管理局)
Used in X-Argus signature generation
"""

import struct

# SM3 Constants
IV = [
    0x7380166f, 0x4914b2b9, 0x172442d7, 0xda8a0600,
    0xa96f30bc, 0x163138aa, 0xe38dee4d, 0xb0fb0e4e
]

T = [0x79cc4519] * 16 + [0x7a879d8a] * 48

def _rotl(x, n):
    """Rotate left"""
    n = n % 32
    return ((x << n) | (x >> (32 - n))) & 0xffffffff

def _ff(x, y, z, j):
    if j < 16:
        return x ^ y ^ z
    return (x & y) | (x & z) | (y & z)

def _gg(x, y, z, j):
    if j < 16:
        return x ^ y ^ z
    return (x & y) | ((~x & 0xffffffff) & z)

def _p0(x):
    return x ^ _rotl(x, 9) ^ _rotl(x, 17)

def _p1(x):
    return x ^ _rotl(x, 15) ^ _rotl(x, 23)

def _cf(v, b):
    """Compression function"""
    w = [struct.unpack('>I', b[i*4:(i+1)*4])[0] for i in range(16)]
    w.extend([0] * 52)
    
    for j in range(16, 68):
        w[j] = _p1(w[j-16] ^ w[j-9] ^ _rotl(w[j-3], 15)) ^ _rotl(w[j-13], 7) ^ w[j-6]
    
    w_ = [w[j] ^ w[j+4] for j in range(64)]
    
    a, b, c, d, e, f, g, h = v
    
    for j in range(64):
        ss1 = _rotl((_rotl(a, 12) + e + _rotl(T[j], j % 32)) & 0xffffffff, 7)
        ss2 = ss1 ^ _rotl(a, 12)
        tt1 = (_ff(a, b, c, j) + d + ss2 + w_[j]) & 0xffffffff
        tt2 = (_gg(e, f, g, j) + h + ss1 + w[j]) & 0xffffffff
        d = c
        c = _rotl(b, 9)
        b = a
        a = tt1
        h = g
        g = _rotl(f, 19)
        f = e
        e = _p0(tt2)
    
    return [a ^ v[0], b ^ v[1], c ^ v[2], d ^ v[3],
            e ^ v[4], f ^ v[5], g ^ v[6], h ^ v[7]]

def sm3_hash(message: bytes) -> bytes:
    """
    Compute SM3 hash of message
    
    Args:
        message: Input bytes to hash
    
    Returns:
        32-byte hash digest
    """
    # Padding
    msg_len = len(message)
    msg = bytearray(message)
    msg.append(0x80)
    
    # Pad to 56 mod 64
    while len(msg) % 64 != 56:
        msg.append(0x00)
    
    # Append length in bits (big endian, 64-bit)
    msg.extend(struct.pack('>Q', msg_len * 8))
    
    # Process blocks
    v = list(IV)
    for i in range(0, len(msg), 64):
        v = _cf(v, bytes(msg[i:i+64]))
    
    # Output
    return b''.join(struct.pack('>I', x) for x in v)

def sm3_hex(message: bytes) -> str:
    """Compute SM3 hash and return as hex string"""
    return sm3_hash(message).hex()
