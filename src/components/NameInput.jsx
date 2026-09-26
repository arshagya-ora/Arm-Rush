import React, { useState, useEffect, useRef } from 'react';
import useLanguage from '../hooks/useLanguage';

const MAX_CHARS = 6;

const NameInput = ({ score, onSubmit, isSaving = false, saveError = false, canPublish = true }) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const hiddenInputRef = useRef(null);

  // Auto-focus hidden input on mount to trigger mobile keyboard
  useEffect(() => {
    const timer = setTimeout(() => {
      if (hiddenInputRef.current) {
        hiddenInputRef.current.focus();
      }
    }, 600); // delay to let entry animation finish
    return () => clearTimeout(timer);
  }, []);

  // Handle keyboard typing for arcade feel (desktop fallback)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isSaving) return;
      // Skip if hidden input is focused — it handles input via onChange
      if (document.activeElement === hiddenInputRef.current) return;
      // Let focused buttons and the consent checkbox handle their own keys.
      if (e.target instanceof Element && e.target.closest('button, input, textarea, select, [contenteditable]')) return;

      if (e.key.length === 1 && e.key.match(/[a-zA-Z0-9]/)) {
        if (name.length < MAX_CHARS) {
          setName((prev) => (prev + e.key.toUpperCase()).slice(0, MAX_CHARS));
        }
      } else if (e.key === 'Backspace') {
        setName((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter' && name.length > 0) {
        e.preventDefault();
        onSubmit(name, consent);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [name, consent, onSubmit, isSaving]);

  // Handle hidden input changes (mobile keyboard)
  const handleInputChange = (e) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, MAX_CHARS);
    setName(raw);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && name.length > 0 && !isSaving) {
      e.preventDefault();
      onSubmit(name, consent);
    }
  };

  const handleSubmit = () => {
    if (name.length > 0 && !isSaving) {
      onSubmit(name, consent);
    }
  };

  // Focus the hidden input when tapping on the arcade slots
  const handleSlotsClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  };

  // Build slots array
  const slots = [];
  for (let i = 0; i < MAX_CHARS; i++) {
    slots.push(name[i] || '_');
  }

  return (
    <div className="name-input-container">
      <h2 className="glow-text" style={{ color: 'var(--neo-pink)' }}>{t('endText')}</h2>
      <p className="subtitle" style={{ fontSize: '2rem', fontWeight: '800' }}>{t('yourScore')} <strong>{score}</strong></p>
      <p className="instruction">{t(canPublish ? 'enterNick' : 'enterNickLocal')}</p>
      {!canPublish && <p role="status">{t('localResultNotice')}</p>}
      
      {/* Hidden input for mobile keyboard trigger */}
      <input
        ref={hiddenInputRef}
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck="false"
        maxLength={MAX_CHARS}
        disabled={isSaving}
        value={name}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        className="name-hidden-input"
        aria-label={t('nickname')}
      />

      <div className="arcade-input" onClick={handleSlotsClick}>
        {slots.map((char, i) => (
          <div key={i} className={`char-slot ${i < name.length ? 'char-filled' : ''} ${i === name.length ? 'char-active' : ''}`}>
            {char}
          </div>
        ))}
      </div>

      {canPublish && <div className="consent-box">
        <label className="consent-label">
          <input
            type="checkbox"
            className="consent-checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={isSaving}
          />
          {t('consentText')}
        </label>
      </div>}

      {saveError && <p role="alert">{t('saveError')}</p>}
      {isSaving && <p role="status">{t('savingScore')}</p>}
      
      <button 
        className={`btn-primary arcade-btn`}
        onClick={handleSubmit}
        disabled={name.length === 0 || isSaving}
        style={{ marginTop: '1rem', background: 'var(--neo-pink)' }}
      >
        {isSaving ? t('savingScore') : saveError ? t('tryAgain') : t(canPublish ? 'saveScore' : 'continueToResult')}
      </button>
    </div>
  );
};

export default NameInput;
