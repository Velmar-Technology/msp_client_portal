use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// How long a pairing code remains valid (in seconds).
pub const PAIRING_TTL_SECS: i64 = 15 * 60;

/// Persistent agent identity & binding state stored as JSON next to the binary.
///
/// - `instance_id` is a stable UUIDv4 identifying this physical agent install.
/// - While unbound, a short-lived 6-digit `pairing_code` lets a portal
///   technician link the device to a subscription slot.
/// - Once the server confirms the bind (`BIND`), `slot_id` + `agent_token`
///   are persisted and the agent stops issuing pairing codes.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AgentState {
    pub instance_id: String,
    #[serde(default)]
    pub slot_id: Option<String>,
    #[serde(default)]
    pub agent_token: Option<String>,
    #[serde(default)]
    pub pairing_code: Option<String>,
    #[serde(default)]
    pub pairing_code_expires_at: Option<String>,
}

impl Default for AgentState {
    fn default() -> Self {
        Self {
            instance_id: uuid::Uuid::new_v4().to_string(),
            slot_id: None,
            agent_token: None,
            pairing_code: None,
            pairing_code_expires_at: None,
        }
    }
}

impl AgentState {
    /// Location of the persistent config file. Overridable via `MSP_AGENT_CONFIG`
    /// (primarily for test harnesses / packaged installs).
    pub fn config_path() -> PathBuf {
        if let Ok(over) = std::env::var("MSP_AGENT_CONFIG") {
            return PathBuf::from(over).join("msp-agent.json");
        }
        let dir = std::env::current_exe()
            .ok()
            .and_then(|exe| exe.parent().map(|p| p.to_path_buf()))
            .unwrap_or_else(|| PathBuf::from("."));
        dir.join("msp-agent.json")
    }

    pub fn load() -> Self {
        Self::load_from(&Self::config_path())
    }

    pub fn load_from(path: &Path) -> Self {
        std::fs::read(path)
            .ok()
            .and_then(|raw| serde_json::from_slice(&raw).ok())
            .unwrap_or_default()
    }

    pub fn save(&self) -> std::io::Result<()> {
        self.save_to(&Self::config_path())
    }

    pub fn save_to(&self, path: &Path) -> std::io::Result<()> {
        let raw = serde_json::to_vec_pretty(self)?;
        std::fs::write(path, raw)
    }

    /// True once the server has persisted a slot binding + secret locally.
    pub fn is_bound(&self) -> bool {
        self.slot_id.is_some() && self.agent_token.is_some()
    }

    /// The currently valid pairing code, if any (still within TTL).
    pub fn active_pairing_code(&self) -> Option<&str> {
        let code = self.pairing_code.as_deref()?;
        if !Self::is_valid_code(code) {
            return None;
        }
        let raw_expiry = self.pairing_code_expires_at.as_deref()?;
        match chrono::DateTime::parse_from_rfc3339(raw_expiry) {
            Ok(expiry) if expiry > chrono::Utc::now() => Some(code),
            _ => None,
        }
    }

    /// Issues a fresh 6-digit code with a new TTL (in-memory only; caller saves).
    pub fn issue_pairing_code(&mut self) -> String {
        let code = generate_pairing_code();
        let expires_at =
            (chrono::Utc::now() + chrono::Duration::seconds(PAIRING_TTL_SECS)).to_rfc3339();
        self.pairing_code = Some(code.clone());
        self.pairing_code_expires_at = Some(expires_at);
        code
    }

    pub fn clear_pairing_code(&mut self) {
        self.pairing_code = None;
        self.pairing_code_expires_at = None;
    }

    /// Records the server-confirmed binding and drops the pairing code.
    pub fn bind(&mut self, slot_id: impl Into<String>, agent_token: impl Into<String>) {
        self.slot_id = Some(slot_id.into());
        self.agent_token = Some(agent_token.into());
        self.clear_pairing_code();
    }

    fn is_valid_code(raw: &str) -> bool {
        raw.len() == 6 && raw.chars().all(|c| c.is_ascii_digit())
    }
}

/// Generates a fresh 6-digit numeric pairing code from a CSPRNG.
pub fn generate_pairing_code() -> String {
    use rand::Rng;
    let code = rand::thread_rng().gen_range(0..1_000_000u32);
    format!("{code:06}")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn unique_temp_path() -> PathBuf {
        use std::sync::atomic::{AtomicU32, Ordering};
        static COUNTER: AtomicU32 = AtomicU32::new(0);
        std::env::temp_dir()
            .join(format!("msp-agent-pairing-{}-{}.json", std::process::id(), COUNTER.fetch_add(1, Ordering::SeqCst)))
    }

    #[test]
    fn generate_pairing_code_is_six_digit_numeric() {
        for _ in 0..200 {
            let code = generate_pairing_code();
            assert_eq!(code.len(), 6);
            assert!(code.chars().all(|c| c.is_ascii_digit()));
        }
    }

    #[test]
    fn issue_pairing_code_sets_code_and_future_expiry() {
        let mut state = AgentState::default();
        let code = state.issue_pairing_code();
        assert_eq!(state.active_pairing_code(), Some(code.as_str()));
        let expiry = chrono::DateTime::parse_from_rfc3339(
            state.pairing_code_expires_at.as_deref().unwrap(),
        )
        .unwrap();
        assert!(expiry > chrono::Utc::now());
    }

    #[test]
    fn active_pairing_code_ignores_expired_codes() {
        let mut state = AgentState::default();
        state.pairing_code = Some("123456".into());
        state.pairing_code_expires_at = Some(
            (chrono::Utc::now() - chrono::Duration::minutes(1)).to_rfc3339(),
        );
        assert_eq!(state.active_pairing_code(), None);

        state.issue_pairing_code();
        assert!(state.active_pairing_code().is_some());
    }

    #[test]
    fn bind_clears_pairing_and_marks_bound_state() {
        let mut state = AgentState::default();
        state.issue_pairing_code();
        state.bind("00000000-0000-4000-8000-000000000001", "secret-token");

        assert!(state.is_bound());
        assert_eq!(state.slot_id.as_deref(), Some("00000000-0000-4000-8000-000000000001"));
        assert_eq!(state.agent_token.as_deref(), Some("secret-token"));
        assert!(state.active_pairing_code().is_none());
    }

    #[test]
    fn save_and_load_roundtrip_preserves_state() {
        let path = unique_temp_path();
        let mut state = AgentState::default();
        state.issue_pairing_code();
        state.bind("slot-1", "tok-1");
        state.save_to(&path).unwrap();

        let loaded = AgentState::load_from(&path);
        assert_eq!(loaded, state);
        assert!(loaded.is_bound());

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn load_from_missing_file_returns_default() {
        let missing = unique_temp_path();
        let state = AgentState::load_from(&missing);
        assert!(!state.is_bound());
        assert!(!state.instance_id.is_empty());
    }
}