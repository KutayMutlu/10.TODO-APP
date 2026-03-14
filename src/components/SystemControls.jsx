import React from 'react';
import { FaSun, FaMoon, FaSignOutAlt, FaGoogle } from "react-icons/fa";
import { IoMdSettings } from "react-icons/io";
/* eslint-disable-next-line no-unused-vars -- motion used in JSX */
import { motion, AnimatePresence } from 'framer-motion';

function SystemControls({
  user,
  lang,
  t,
  theme,
  setTheme,
  setLang,
  settingsRef,
  showSettings,
  setShowSettings,
  isSoundEnabled,
  setIsSoundEnabled,
  handleUpgradeAccount,
  handleLogout,
}) {
  return (
    <div className="system-controls">
      {user && (
        <div className="user-profile-mini">
          <img
            src={
              user.providerData?.[0]?.photoURL ||
              user.photoURL ||
              `https://api.dicebear.com/8.x/notionists-neutral/svg?seed=${user.uid}`
            }
            alt="Avatar"
            className={`user-avatar-small ${user.isAnonymous ? 'is-guest' : ''}`}
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=User&background=6c63ff&color=fff`;
            }}
          />
        </div>
      )}

      <div className="settings-container" ref={settingsRef}>
        <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
          <IoMdSettings />
        </button>
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="settings-menu"
            >
              <div className="setting-item">
                <span>{t.languageLabel}</span>
                <select className="lang-select" value={lang} onChange={(e) => setLang(e.target.value)}>
                  <option value="tr">Türkçe 🇹🇷</option>
                  <option value="en">English 🇺🇸</option>
                  <option value="fr">Français 🇫🇷</option>
                  <option value="sq">Shqip 🇦🇱</option>
                </select>
              </div>
              <div className="setting-item">
                <span>{t.soundEffects}</span>
                <div
                  className={`switch ${isSoundEnabled ? 'on' : 'off'}`}
                  onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                >
                  <div className="switch-handle" />
                </div>
              </div>

              {user && (
                <>
                  {user.isAnonymous && (
                    <div className="setting-item action" onClick={handleUpgradeAccount}>
                      <span>{t.linkGoogle}</span>
                      <FaGoogle className="icon-blue" />
                    </div>
                  )}
                  <div className="setting-item action logout" onClick={handleLogout}>
                    <span>{t.logout}</span>
                    <FaSignOutAlt />
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        className="theme-toggle-btn"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      >
        {theme === 'light' ? <FaMoon /> : <FaSun />}
      </button>
    </div>
  );
}

export default React.memo(SystemControls);

