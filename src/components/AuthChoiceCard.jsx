import React from 'react';
import { FcGoogle } from "react-icons/fc";

function AuthChoiceCard({ lang, onLogin, onGuestLogin }) {
  return (
    <div className="login-container">
      <div className="login-card-mini">
        <p className="login-text">
          {lang === 'tr'
            ? 'Hedeflerinize ulaşmak için bir yöntem seçin'
            : 'Choose a method'}
        </p>
        <div className="login-options">
          <div className="login-option-item">
            <button onClick={onLogin} className="login-icon-btn google">
              <FcGoogle />
            </button>
            <span>Google</span>
          </div>
          <div className="login-option-item">
            <button className="login-icon-btn guest" onClick={onGuestLogin}>
              <div className="guest-icon-placeholder">👤</div>
            </button>
            <span>{lang === 'tr' ? 'Misafir' : 'Guest'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(AuthChoiceCard);

