"""
Simon Cipher Implementation
Simon is a lightweight block cipher designed by NSA
Used in X-Argus encryption

Simon 128/128 variant (128-bit block, 128-bit key)
"""

def _rotl64(x, n):
    """Rotate 64-bit value left"""
    n = n % 64
    return ((x << n) | (x >> (64 - n))) & 0xffffffffffffffff

def _rotr64(x, n):
    """Rotate 64-bit value right"""
    n = n % 64
    return ((x >> n) | (x << (64 - n))) & 0xffffffffffffffff

# Simon 128/128 constants
SIMON_ROUNDS = 68
SIMON_WORD_SIZE = 64
SIMON_Z = 0b11011011101011000110010111100000010010001010011100110100001111

def simon_key_schedule(key: bytes) -> list:
    """
    Generate round keys for Simon 128/128
    
    Args:
        key: 16-byte (128-bit) key
    
    Returns:
        List of 68 round keys (64-bit each)
    """
    import struct
    
    # Parse key into two 64-bit words
    k = [struct.unpack('<Q', key[i*8:(i+1)*8])[0] for i in range(2)]
    
    # Extend key schedule
    keys = k[:]
    for i in range(2, SIMON_ROUNDS):
        tmp = _rotr64(keys[i-1], 3)
        tmp ^= keys[i-2]
        tmp ^= _rotr64(tmp, 1)
        
        z_bit = (SIMON_Z >> ((i-2) % 62)) & 1
        keys.append((~keys[i-2] & 0xffffffffffffffff) ^ tmp ^ z_bit ^ 3)
    
    return keys

def simon_encrypt_block(plaintext: bytes, keys: list) -> bytes:
    """
    Encrypt one 128-bit block with Simon cipher
    
    Args:
        plaintext: 16-byte block
        keys: Round keys from key_schedule
    
    Returns:
        16-byte encrypted block
    """
    import struct
    
    # Parse block into two 64-bit words
    x, y = struct.unpack('<QQ', plaintext)
    
    # Feistel rounds
    for i in range(SIMON_ROUNDS):
        tmp = x
        f = (_rotl64(x, 1) & _rotl64(x, 8)) ^ _rotl64(x, 2)
        x = y ^ f ^ keys[i]
        y = tmp
    
    return struct.pack('<QQ', x, y)

def simon_decrypt_block(ciphertext: bytes, keys: list) -> bytes:
    """
    Decrypt one 128-bit block with Simon cipher
    
    Args:
        ciphertext: 16-byte block
        keys: Round keys from key_schedule
    
    Returns:
        16-byte decrypted block
    """
    import struct
    
    x, y = struct.unpack('<QQ', ciphertext)
    
    # Reverse Feistel rounds
    for i in range(SIMON_ROUNDS - 1, -1, -1):
        tmp = y
        f = (_rotl64(y, 1) & _rotl64(y, 8)) ^ _rotl64(y, 2)
        y = x ^ f ^ keys[i]
        x = tmp
    
    return struct.pack('<QQ', x, y)

def simon_encrypt(plaintext: bytes, key: bytes) -> bytes:
    """
    Encrypt data with Simon 128/128 (ECB mode)
    
    Args:
        plaintext: Data to encrypt (will be padded to 16-byte blocks)
        key: 16-byte key
    
    Returns:
        Encrypted data
    """
    # Pad to 16-byte boundary
    pad_len = 16 - (len(plaintext) % 16)
    padded = plaintext + bytes([pad_len] * pad_len)
    
    # Generate keys
    keys = simon_key_schedule(key)
    
    # Encrypt blocks
    result = b''
    for i in range(0, len(padded), 16):
        block = padded[i:i+16]
        result += simon_encrypt_block(block, keys)
    
    return result

def simon_decrypt(ciphertext: bytes, key: bytes) -> bytes:
    """
    Decrypt data with Simon 128/128 (ECB mode)
    
    Args:
        ciphertext: Encrypted data
        key: 16-byte key
    
    Returns:
        Decrypted data (with padding removed)
    """
    keys = simon_key_schedule(key)
    
    result = b''
    for i in range(0, len(ciphertext), 16):
        block = ciphertext[i:i+16]
        result += simon_decrypt_block(block, keys)
    
    # Remove padding
    pad_len = result[-1]
    return result[:-pad_len]
