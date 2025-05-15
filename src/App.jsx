import React, { useState, useEffect } from "react";
import axios from "axios";

const client_id = "pkce-client";
const scope = "openid profile pkce-scope offline_access";
const response_type = "code";

const redirect_uri = "https://localhost:5001/signin-oidc"; // Must be a valid URL in the REACT application host and port, and be in the Identity Server database as calback.
const baseUrl = "https://zkg3j6f6-48814.usw3.devtunnels.ms"; // Change this to the Identity Server URL

let codeVerifierGlobal = ""; // Save to use in token exchange

function App() {
  const [refreshToken, setRefreshToken] = useState(null);
  const [manualCode, setManualCode] = useState("");

  // The 3 methods below are used to generate the code verifier and code challenge. You can replace them by your own implementation or third-party library.
  const generateCodeVerifier = () => {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return base64UrlEncode(array);
  };

  const generateCodeChallenge = async (codeVerifier) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest("SHA-256", data);
    return base64UrlEncode(new Uint8Array(digest));
  };

  const base64UrlEncode = (buffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };

  const handleLogin = async () => {
    const codeVerifier = generateCodeVerifier();

    codeVerifierGlobal = codeVerifier;
    localStorage.setItem("pkce_code_verifier", codeVerifier); // Save it

    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      client_id,
      response_type,
      redirect_uri,
      scope,
      code_challenge_method: "S256",
      code_challenge: codeChallenge,
      state: "abc123",
      nonce: "xyz456",
    });

    const authorizeUrl = `${baseUrl}/connect/authorize?${params.toString()}`;
    const popup = window.open(
      authorizeUrl,
      "LoginPopup",
      "width=600,height=700"
    );
  };

  const exchangeCodeForToken = async (code) => {
    try {
      codeVerifierGlobal = localStorage.getItem("pkce_code_verifier"); // Retrieve it

      const params = new URLSearchParams({
        grant_type: "authorization_code",
        client_id,
        code,
        redirect_uri,
        code_verifier: codeVerifierGlobal,
      });

      const response = await axios.post(`${baseUrl}/connect/token`, params);

      console.log("Token Response:", response.data);

      setRefreshToken(response.data.refresh_token);
    } catch (error) {
      console.error("Token exchange failed", error);
    }
  };

  const handleManualCodeSubmit = () => {
    exchangeCodeForToken(manualCode);
  };

  return (
    <div>
      <h1>PKCE Login POC</h1>
      {!refreshToken ? (
        <>
          <button onClick={handleLogin}>Start Login</button>
          <div style={{ marginTop: "20px" }}>
            <input
              type="text"
              placeholder="Paste code here"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              style={{ width: "300px" }}
            />
            <button onClick={handleManualCodeSubmit}>
              Exchange Code for Token
            </button>
          </div>
        </>
      ) : (
        <div>
          <h2>Refresh Token:</h2>
          <pre>{refreshToken}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
