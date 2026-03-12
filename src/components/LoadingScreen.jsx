import React from 'react';

function LoadingScreen({ text }) {
  return (
    <div className="app-loading-screen">
      <div className="app-loading-spinner" />
      <div className="app-loading-text">{text}</div>
    </div>
  );
}

export default React.memo(LoadingScreen);

