use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;

pub const DPAPI_PREFIX: &str = "dpapi:";
const ENTROPY_SALT: &[u8] = b"Velmar-MSP-Endpoint-Vault-v1";

/// Encrypts sensitive secrets (e.g. agent tokens) using Windows DPAPI machine scope.
///
/// Under `CRYPTPROTECT_LOCAL_MACHINE`, the ciphertext is tied to this specific Windows
/// installation and motherboard. If copied to another machine, decryption will fail.
#[cfg(windows)]
pub fn protect_machine_secret(plaintext: &str) -> Result<String, String> {
    use std::ptr;
    use windows_sys::Win32::Foundation::LocalFree;
    use windows_sys::Win32::Security::Cryptography::{
        CryptProtectData, CRYPTPROTECT_LOCAL_MACHINE, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };

    if plaintext.trim().is_empty() {
        return Ok(String::new());
    }

    // Don't double encrypt if already dpapi prefixed
    if plaintext.starts_with(DPAPI_PREFIX) {
        return Ok(plaintext.to_string());
    }

    let input_bytes = plaintext.as_bytes();
    let data_in = CRYPT_INTEGER_BLOB {
        cbData: input_bytes.len() as u32,
        pbData: input_bytes.as_ptr() as *mut u8,
    };

    let entropy_blob = CRYPT_INTEGER_BLOB {
        cbData: ENTROPY_SALT.len() as u32,
        pbData: ENTROPY_SALT.as_ptr() as *mut u8,
    };

    let mut data_out = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: ptr::null_mut(),
    };

    let flags = CRYPTPROTECT_LOCAL_MACHINE | CRYPTPROTECT_UI_FORBIDDEN;

    let success = unsafe {
        CryptProtectData(
            &data_in,
            ptr::null(),
            &entropy_blob,
            ptr::null_mut(),
            ptr::null_mut(),
            flags,
            &mut data_out,
        )
    };

    if success == 0 || data_out.pbData.is_null() {
        return Err(format!(
            "CryptProtectData failed with OS error code {}",
            std::io::Error::last_os_error()
        ));
    }

    let encrypted_slice =
        unsafe { std::slice::from_raw_parts(data_out.pbData, data_out.cbData as usize) };
    let encoded = BASE64.encode(encrypted_slice);

    unsafe {
        LocalFree(data_out.pbData as _);
    }

    Ok(format!("{}{}", DPAPI_PREFIX, encoded))
}

#[cfg(not(windows))]
pub fn protect_machine_secret(plaintext: &str) -> Result<String, String> {
    if plaintext.starts_with(DPAPI_PREFIX) {
        Ok(plaintext.to_string())
    } else {
        Ok(format!("{}{}", DPAPI_PREFIX, BASE64.encode(plaintext.as_bytes())))
    }
}

/// Decrypts machine-bound secrets previously protected via `protect_machine_secret`.
///
/// If the ciphertext is in plaintext (legacy format without `dpapi:` prefix),
/// it is returned as-is for backward compatibility.
/// If decryption fails (e.g. key mismatch because file was exfiltrated to another PC),
/// an `Err` is returned.
#[cfg(windows)]
pub fn unprotect_machine_secret(ciphertext: &str) -> Result<String, String> {
    use std::ptr;
    use windows_sys::Win32::Foundation::LocalFree;
    use windows_sys::Win32::Security::Cryptography::{
        CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };

    if ciphertext.trim().is_empty() {
        return Ok(String::new());
    }

    // Backward compatibility: if not prefixed, it's a legacy plaintext token
    if !ciphertext.starts_with(DPAPI_PREFIX) {
        return Ok(ciphertext.to_string());
    }

    let raw_b64 = &ciphertext[DPAPI_PREFIX.len()..];
    let decoded_bytes = BASE64
        .decode(raw_b64)
        .map_err(|e| format!("Corrupted DPAPI payload (invalid base64): {}", e))?;

    let data_in = CRYPT_INTEGER_BLOB {
        cbData: decoded_bytes.len() as u32,
        pbData: decoded_bytes.as_ptr() as *mut u8,
    };

    let entropy_blob = CRYPT_INTEGER_BLOB {
        cbData: ENTROPY_SALT.len() as u32,
        pbData: ENTROPY_SALT.as_ptr() as *mut u8,
    };

    let mut data_out = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: ptr::null_mut(),
    };

    let flags = CRYPTPROTECT_UI_FORBIDDEN;

    let success = unsafe {
        CryptUnprotectData(
            &data_in,
            ptr::null_mut(),
            &entropy_blob,
            ptr::null_mut(),
            ptr::null_mut(),
            flags,
            &mut data_out,
        )
    };

    if success == 0 || data_out.pbData.is_null() {
        return Err(format!(
            "CryptUnprotectData failed (token cannot be decrypted on this device): {}",
            std::io::Error::last_os_error()
        ));
    }

    let decrypted_slice =
        unsafe { std::slice::from_raw_parts(data_out.pbData, data_out.cbData as usize) };
    let decrypted_str = String::from_utf8(decrypted_slice.to_vec())
        .map_err(|e| format!("Decrypted secret is not valid UTF-8: {}", e))?;

    unsafe {
        LocalFree(data_out.pbData as _);
    }

    Ok(decrypted_str)
}

#[cfg(not(windows))]
pub fn unprotect_machine_secret(ciphertext: &str) -> Result<String, String> {
    if !ciphertext.starts_with(DPAPI_PREFIX) {
        return Ok(ciphertext.to_string());
    }
    let raw_b64 = &ciphertext[DPAPI_PREFIX.len()..];
    let bytes = BASE64
        .decode(raw_b64)
        .map_err(|e| format!("Invalid base64: {}", e))?;
    String::from_utf8(bytes).map_err(|e| format!("Invalid UTF-8: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_protect_unprotect_roundtrip() {
        let original = "tok_test_secret_credential_123456";
        let protected = protect_machine_secret(original).expect("protect should succeed");
        assert!(protected.starts_with(DPAPI_PREFIX));
        assert_ne!(protected, original);

        let recovered = unprotect_machine_secret(&protected).expect("unprotect should succeed");
        assert_eq!(recovered, original);
    }

    #[test]
    fn test_unprotect_legacy_plaintext() {
        let legacy = "raw-unencrypted-token-value";
        let result = unprotect_machine_secret(legacy).expect("legacy token should pass through");
        assert_eq!(result, legacy);
    }

    #[test]
    fn test_unprotect_invalid_base64() {
        let corrupted = "dpapi:not-valid-base64!@#$";
        assert!(unprotect_machine_secret(corrupted).is_err());
    }
}
