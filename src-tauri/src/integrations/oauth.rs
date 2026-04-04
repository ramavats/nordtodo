/// OAuth2 helpers for Google integration.
/// Uses the out-of-band (OOB) flow for desktop apps:
/// Google shows the auth code directly on-screen — no localhost server needed.
/// Reference: https://developers.google.com/identity/protocols/oauth2/native-app

use std::collections::HashMap;
use crate::errors::AppError;

// ─── Auth URL ────────────────────────────────────────────────────────────────

/// Build the Google OAuth2 authorization URL.
/// Uses OOB redirect (urn:ietf:wg:oauth:2.0:oob) — Google displays the code on-screen.
pub fn build_auth_url(client_id: &str) -> String {
    let scope = "https://www.googleapis.com/auth/tasks \
                 https://www.googleapis.com/auth/userinfo.email";
    let scope_encoded = urlencoding::encode(scope);

    format!(
        "https://accounts.google.com/o/oauth2/v2/auth\
        ?client_id={client_id}\
        &redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob\
        &response_type=code\
        &scope={scope_encoded}\
        &access_type=offline\
        &prompt=consent"
    )
}

// ─── Token types ─────────────────────────────────────────────────────────────

#[derive(Debug, serde::Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: Option<i64>,
    pub token_type: Option<String>,
    pub scope: Option<String>,
    pub error: Option<String>,
    pub error_description: Option<String>,
}

// ─── Token exchange ───────────────────────────────────────────────────────────

/// Exchange an authorization code for access + refresh tokens.
pub fn exchange_code(
    client_id: &str,
    client_secret: &str,
    code: &str,
) -> Result<TokenResponse, AppError> {
    let client = reqwest::blocking::Client::new();
    let mut params = HashMap::new();
    params.insert("client_id", client_id);
    params.insert("client_secret", client_secret);
    params.insert("redirect_uri", "urn:ietf:wg:oauth:2.0:oob");
    params.insert("code", code);
    params.insert("grant_type", "authorization_code");

    let resp = client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .map_err(|e| AppError::Integration(format!("Token exchange HTTP error: {e}")))?;

    let body = resp.text()
        .map_err(|e| AppError::Integration(format!("Token response read error: {e}")))?;

    let token: TokenResponse = serde_json::from_str(&body)
        .map_err(|e| AppError::Integration(
            format!("Token parse error: {e}. Response was: {}", &body[..body.len().min(200)])
        ))?;

    if let Some(ref err) = token.error {
        return Err(AppError::Integration(format!(
            "Token exchange failed: {err} — {}",
            token.error_description.as_deref().unwrap_or("")
        )));
    }

    Ok(token)
}

/// Use the stored refresh token to get a new access token.
pub fn refresh_access_token(
    client_id: &str,
    client_secret: &str,
    refresh_token: &str,
) -> Result<TokenResponse, AppError> {
    let client = reqwest::blocking::Client::new();
    let mut params = HashMap::new();
    params.insert("client_id", client_id);
    params.insert("client_secret", client_secret);
    params.insert("refresh_token", refresh_token);
    params.insert("grant_type", "refresh_token");

    let resp = client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .map_err(|e| AppError::Integration(format!("Token refresh HTTP error: {e}")))?;

    let body = resp.text()
        .map_err(|e| AppError::Integration(format!("Refresh response read error: {e}")))?;

    let token: TokenResponse = serde_json::from_str(&body)
        .map_err(|e| AppError::Integration(format!("Refresh parse error: {e}")))?;

    if let Some(ref err) = token.error {
        return Err(AppError::Integration(format!(
            "Token refresh failed: {err}"
        )));
    }

    Ok(token)
}
