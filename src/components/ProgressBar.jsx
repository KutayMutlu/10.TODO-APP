import React from 'react';
import "../App.css";

// Eğer t objesini prop olarak gönderirsen "İlerleme Durumu" yazısını da dinamik yapabilirsin
function ProgressBar({ percentage, t }) {
    const roundedPercentage = Math.round(percentage);

    return (
        <div className="progress-container">
            <div className="progress-label">
                {/* t varsa t.progressLabel, yoksa varsayılan metni kullanır */}
                <span>{t?.progressText}: </span>
                <span>{t?.progressCompleted} %{Math.round(percentage)}</span>
            </div>
            <div className="progress-bar-background">
                <div
                    className="progress-bar-fill"
                    style={{
                        width: `${roundedPercentage}%`,
                        // Tamamlandığında hafif bir parlama efekti için:
                        boxShadow: roundedPercentage === 100 ? '0 0 10px rgba(108, 99, 255, 0.6)' : 'none'
                    }}
                ></div>
            </div>
        </div>
    );
}

export default React.memo(ProgressBar);