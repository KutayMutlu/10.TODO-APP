import React from 'react';
import { FcGoogle } from "react-icons/fc";

function AuthChoiceCard({ lang, t, onLogin, onGuestLogin }) {
  return (
    <div className="login-container">
      <div className="login-card-mini">
        <p className="login-text">{t.loginMethodText}</p>
        <div className="login-options">
          <div className="login-option-item">
            <button onClick={onLogin} className="login-icon-btn google">
              <FcGoogle />
            </button>
            <span>{t.google}</span>
          </div>
          <div className="login-option-item">
            <button className="login-icon-btn guest" onClick={onGuestLogin}>
              <div className="guest-icon-placeholder">👤</div>
            </button>
            <span>{t.guest}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(AuthChoiceCard);

