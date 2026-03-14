import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import DatePicker, { registerLocale } from 'react-datepicker';
import { HiOutlineCalendar, HiOutlineArrowLeft, HiCheckCircle } from 'react-icons/hi2';
import tr from 'date-fns/locale/tr';
import fr from 'date-fns/locale/fr';
import enUS from 'date-fns/locale/en-US';
import sq from 'date-fns/locale/sq';
import 'react-datepicker/dist/react-datepicker.css';
import '../App.css';

const ITEM_HEIGHT = 32;
const PADDING_ITEMS = 2;

registerLocale('tr', tr);
registerLocale('fr', fr);
registerLocale('en', enUS);
registerLocale('sq', sq);

/** value: '' veya 'YYYY-MM-DDTHH:mm' formatında string. onChange: (value: string | null) => void. usePortal: true ise popover body'de render edilir. onClose: picker kapanınca çağrılır (örn. İşlemler menüsünü de kapatmak için). */
function DateTimePicker({ value, onChange, t, lang = 'en', usePortal = false, onClose }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('date');
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);
  const [timeJustUpdated, setTimeJustUpdated] = useState(false);
  const wrapRef = useRef(null);
  const popoverRef = useRef(null);
  const [popoverPosition, setPopoverPosition] = useState(null);
  const timeUpdatedTimeoutRef = useRef(null);
  const hourScrollRef = useRef(null);
  const minuteScrollRef = useRef(null);
  const didSetInitialStepRef = useRef(false);

  const parseValue = (v) => {
    if (!v || !String(v).trim()) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };
  const dateValue = parseValue(value);
  const isValidDate = dateValue && !isNaN(dateValue.getTime());

  const pad = (n) => String(n).padStart(2, '0');
  const dateToValue = (d) => d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` : null;

  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const isSelectedToday = dateValue && dateValue.toDateString() === now.toDateString();
  const isPastToday = isSelectedToday && dateValue && dateValue.getTime() < now.getTime();
  const selectedForPicker = isValidDate && isPastToday ? now : dateValue;

  const minHourToday = now.getMinutes() === 59 ? now.getHours() + 1 : now.getHours();
  const hoursList = isSelectedToday
    ? Array.from({ length: 24 - minHourToday }, (_, i) => minHourToday + i)
    : Array.from({ length: 24 }, (_, i) => i);
  const minMinuteWhenCurrentHour = now.getMinutes() + 1;

  const closePicker = useCallback(() => {
    setOpen(false);
    onClose?.();
  }, [onClose]);

  const updatePopoverPosition = () => {
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      setPopoverPosition({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 260) });
    }
  };

  useEffect(() => {
    if (!open) {
      didSetInitialStepRef.current = false;
      if (usePortal) setPopoverPosition(null);
      return;
    }
    if (!didSetInitialStepRef.current) {
      didSetInitialStepRef.current = true;
      setStep(isValidDate ? 'time' : 'date');
    }
    const base = dateValue || new Date();
    setHour(base.getHours());
    setMinute(base.getMinutes());
    if (usePortal) {
      updatePopoverPosition();
      window.addEventListener('resize', updatePopoverPosition);
    }
    // usePortal (İşlemler menüsü) iken document "click outside" kullanma: overlay/sentetik event ile
    // yanlış kapanma oluyor. Sadece Kapat/Onayla ile kapat.
    if (!usePortal) {
      const handleClickOutside = (e) => {
        if (wrapRef.current && wrapRef.current.contains(e.target)) return;
        closePicker();
      };
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
    return () => {
      if (usePortal) window.removeEventListener('resize', updatePopoverPosition);
    };
  }, [open, value, usePortal, closePicker, dateValue, isValidDate]);

  useEffect(() => {
    if (!open || step !== 'time') return;
    const base = dateValue || new Date();
    let h = base.getHours();
    let m = base.getMinutes();
    if (isSelectedToday) {
      h = Math.max(h, minHourToday);
      if (h === now.getHours()) {
        m = Math.max(m, minMinuteWhenCurrentHour);
        if (m > 59) m = 59;
      }
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0);
      if (d.getTime() !== base.getTime()) onChange(dateToValue(d));
    }
    setHour(h);
    setMinute(m);
    const minListForSync = !isSelectedToday
      ? Array.from({ length: 60 }, (_, i) => i)
      : h > now.getHours()
        ? Array.from({ length: 60 }, (_, i) => i)
        : h === now.getHours() && minMinuteWhenCurrentHour <= 59
          ? Array.from({ length: 60 - minMinuteWhenCurrentHour }, (_, i) => minMinuteWhenCurrentHour + i)
          : Array.from({ length: 60 }, (_, i) => i);
    requestAnimationFrame(() => {
      const hourIdx = hoursList.indexOf(h);
      const minIdx = minListForSync.indexOf(m);
      if (hourScrollRef.current && hourIdx >= 0) {
        hourScrollRef.current.scrollTop = hourIdx * ITEM_HEIGHT;
      }
      if (minuteScrollRef.current && minIdx >= 0) {
        minuteScrollRef.current.scrollTop = minIdx * ITEM_HEIGHT;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync time step with value; intentional limited deps to avoid loops
  }, [open, step, value, isSelectedToday]);

  const scrollEndTimeoutRef = useRef(null);

  const applyTimeFromWheels = (h, m) => {
    const base = dateValue || new Date();
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0);
    if (d.toDateString() === now.toDateString() && d.getTime() < now.getTime()) {
      onChange(dateToValue(now));
    } else {
      onChange(dateToValue(d));
    }
    setTimeJustUpdated(true);
    if (timeUpdatedTimeoutRef.current) clearTimeout(timeUpdatedTimeoutRef.current);
    timeUpdatedTimeoutRef.current = setTimeout(() => {
      setTimeJustUpdated(false);
      timeUpdatedTimeoutRef.current = null;
    }, 500);
  };

  const clampMinuteForToday = (h, m) => {
    if (!isSelectedToday || h !== now.getHours()) return m;
    return Math.max(m, minMinuteWhenCurrentHour);
  };

  const handleWheelScroll = (scrollRef, list, setter, otherValue, isHour) => {
    const el = scrollRef.current;
    if (!el || !list.length) return;
    const index = Math.round(el.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(list.length - 1, index));
    const value = list[clamped];
    setter(value);
    const h = isHour ? value : otherValue;
    const m = isHour ? clampMinuteForToday(value, otherValue) : clampMinuteForToday(otherValue, value);
    if (m !== (isHour ? otherValue : value)) setMinute(m);
    if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
    scrollEndTimeoutRef.current = setTimeout(() => {
      el.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: 'smooth' });
      applyTimeFromWheels(h, m);
      scrollEndTimeoutRef.current = null;
    }, 100);
  };

  const handleWheelItemClick = (scrollRef, value, list, setter, otherValue, isHour) => {
    const el = scrollRef.current;
    if (!el || !list.length) return;
    const index = list.indexOf(value);
    if (index < 0) return;
    setter(value);
    const h = isHour ? value : otherValue;
    const m = isHour ? clampMinuteForToday(value, otherValue) : clampMinuteForToday(otherValue, value);
    if (m !== (isHour ? otherValue : value)) setMinute(m);
    el.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'smooth' });
    applyTimeFromWheels(h, m);
  };

  const handleSelect = (date) => {
    if (!date) return;
    const d = new Date(date);
    d.setHours(hour, minute, 0, 0);
    onChange(dateToValue(d));
    setStep('time');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    closePicker();
  };

  const localeMap = { tr: 'tr', fr: 'fr', en: 'en', sq: 'sq' };
  const locale = localeMap[lang] || 'en';

  const minutesList = !isSelectedToday
    ? Array.from({ length: 60 }, (_, i) => i)
    : hour > now.getHours()
      ? Array.from({ length: 60 }, (_, i) => i)
      : hour === now.getHours()
        ? (minMinuteWhenCurrentHour <= 59 ? Array.from({ length: 60 - minMinuteWhenCurrentHour }, (_, i) => minMinuteWhenCurrentHour + i) : [])
        : Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className="date-time-picker-wrap" ref={wrapRef}>
      <button
        type="button"
        className="deadline-trigger-wrap date-time-picker-trigger"
        onClick={() => {
          if (usePortal && !open && wrapRef.current) {
            const rect = wrapRef.current.getBoundingClientRect();
            setPopoverPosition({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 260) });
          }
          setOpen((prev) => !prev);
        }}
        title={t.deadlinePlaceholder}
        aria-label={t.deadline}
        aria-expanded={open}
      >
        <span className="deadline-trigger-btn">
          <HiOutlineCalendar className="deadline-trigger-icon" />
        </span>
        {isValidDate && (
          <span className="date-time-picker-badge" title={value}>
            ✓
          </span>
        )}
      </button>

      {usePortal && open && popoverPosition && createPortal(
        <div
          ref={popoverRef}
          className="date-time-picker-popover-portal"
          style={{
            position: 'fixed',
            zIndex: 10000,
            top: popoverPosition.top,
            left: popoverPosition.left,
            width: popoverPosition.width,
            minWidth: 260,
            maxHeight: `calc(100vh - ${popoverPosition.top}px - 24px)`,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <div className="date-time-picker-popover date-time-picker-popover-portal-inner date-time-picker-portal-inner-wrap">
            {step === 'date' ? (
              <>
                <div className="date-time-picker-header">
                  <span className="date-time-picker-title">{t.deadline}</span>
                  <div className="date-time-picker-header-actions">
                    {isValidDate && (
                      <button type="button" className="date-time-picker-clear" onClick={handleClear}>
                        {t.noDeadline}
                      </button>
                    )}
                    <button type="button" className="date-time-picker-close" onClick={closePicker}>
                      {t.close}
                    </button>
                  </div>
                </div>
                <DatePicker
                  selected={selectedForPicker || null}
                  onChange={handleSelect}
                  onSelect={handleSelect}
                  minDate={todayStart}
                  dateFormat={lang === 'en' ? 'MMM d, yyyy' : 'd MMM yyyy'}
                  locale={locale}
                  inline
                  className="date-time-picker-inline"
                />
              </>
            ) : (
              <>
                <div className="date-time-picker-header date-time-picker-header-with-back">
                  <button
                    type="button"
                    className="date-time-picker-back"
                    onClick={(e) => { e.stopPropagation(); setStep('date'); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setStep('date'); }}
                    aria-label={t.back}
                  >
                    <HiOutlineArrowLeft className="date-time-picker-back-icon" />
                    <span>{t.back}</span>
                  </button>
                  <span className="date-time-picker-title date-time-picker-title-center">
                    {dateValue ? dateValue.toLocaleDateString(lang === 'tr' ? 'tr-TR' : lang === 'fr' ? 'fr-FR' : lang === 'sq' ? 'sq-AL' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : t.deadline}
                  </span>
                  <div className="date-time-picker-header-actions">
                    <button type="button" className="date-time-picker-close" onClick={closePicker}>
                      {t.close}
                    </button>
                  </div>
                </div>
                <div className="date-time-picker-wheels">
                  <div className="date-time-picker-wheel-row">
                    <div className="date-time-picker-wheel-col">
                      <span className="date-time-picker-wheel-label">{t.hourLabel}</span>
                      <div className="date-time-picker-wheel-wrap">
                        <div
                          className="date-time-picker-wheel"
                          ref={hourScrollRef}
                          onScroll={() => handleWheelScroll(hourScrollRef, hoursList, setHour, minute, true)}
                        >
                          <div className="date-time-picker-wheel-pad" style={{ height: PADDING_ITEMS * ITEM_HEIGHT }} />
                          {hoursList.map((h) => (
                            <div
                              key={h}
                              role="button"
                              tabIndex={0}
                              className={`date-time-picker-wheel-item${h === hour ? ' is-selected' : ''}`}
                              style={{ height: ITEM_HEIGHT }}
                              onClick={() => handleWheelItemClick(hourScrollRef, h, hoursList, setHour, minute, true)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleWheelItemClick(hourScrollRef, h, hoursList, setHour, minute, true); } }}
                            >
                              {pad(h)}
                            </div>
                          ))}
                          <div className="date-time-picker-wheel-pad" style={{ height: PADDING_ITEMS * ITEM_HEIGHT }} />
                        </div>
                      </div>
                    </div>
                    <div className="date-time-picker-wheel-col">
                      <span className="date-time-picker-wheel-label">{t.minuteLabel}</span>
                      <div className="date-time-picker-wheel-wrap">
                        <div
                          className="date-time-picker-wheel"
                          ref={minuteScrollRef}
                          onScroll={() => handleWheelScroll(minuteScrollRef, minutesList, setMinute, hour, false)}
                        >
                          <div className="date-time-picker-wheel-pad" style={{ height: PADDING_ITEMS * ITEM_HEIGHT }} />
                          {minutesList.map((m) => (
                            <div
                              key={m}
                              role="button"
                              tabIndex={0}
                              className={`date-time-picker-wheel-item${m === minute ? ' is-selected' : ''}`}
                              style={{ height: ITEM_HEIGHT }}
                              onClick={() => handleWheelItemClick(minuteScrollRef, m, minutesList, setMinute, hour, false)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleWheelItemClick(minuteScrollRef, m, minutesList, setMinute, hour, false); } }}
                            >
                              {pad(m)}
                            </div>
                          ))}
                          <div className="date-time-picker-wheel-pad" style={{ height: PADDING_ITEMS * ITEM_HEIGHT }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="date-time-picker-selected-time-row">
                    <div className={`date-time-picker-selected-time${timeJustUpdated ? ' date-time-picker-selected-time-just-updated' : ''}`}>
                      <span className="date-time-picker-selected-label">{t.selectedTimeLabel}</span>
                      <span className="date-time-picker-selected-value">
                        {pad(Number(hour))}:{pad(Number(minute))}
                        <HiCheckCircle className="date-time-picker-selected-check" aria-hidden />
                      </span>
                    </div>
                    <button
                      type="button"
                      className="date-time-picker-confirm-btn"
                      onClick={closePicker}
                      aria-label={t.confirm}
                      title={t.confirm}
                    >
                      <HiCheckCircle className="date-time-picker-confirm-icon" aria-hidden />
                      {t.confirm}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
      {!usePortal && open && (
        <div className="date-time-picker-popover">
          {step === 'date' ? (
            <>
              <div className="date-time-picker-header">
                <span className="date-time-picker-title">{t.deadline}</span>
                <div className="date-time-picker-header-actions">
                  {isValidDate && (
                    <button type="button" className="date-time-picker-clear" onClick={handleClear}>
                      {t.noDeadline}
                    </button>
                  )}
                  <button type="button" className="date-time-picker-close" onClick={closePicker}>
                    {t.close}
                  </button>
                </div>
              </div>
              <DatePicker
                selected={selectedForPicker || null}
                onChange={handleSelect}
                onSelect={handleSelect}
                minDate={todayStart}
                dateFormat={lang === 'en' ? 'MMM d, yyyy' : 'd MMM yyyy'}
                locale={locale}
                inline
                className="date-time-picker-inline"
              />
            </>
          ) : (
            <>
                <div className="date-time-picker-header date-time-picker-header-with-back">
                  <button
                    type="button"
                    className="date-time-picker-back"
                    onClick={(e) => { e.stopPropagation(); setStep('date'); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setStep('date'); }}
                    aria-label={t.back}
                  >
                    <HiOutlineArrowLeft className="date-time-picker-back-icon" />
                    <span>{t.back}</span>
                  </button>
                <span className="date-time-picker-title date-time-picker-title-center">
                  {dateValue ? dateValue.toLocaleDateString(lang === 'tr' ? 'tr-TR' : lang === 'fr' ? 'fr-FR' : lang === 'sq' ? 'sq-AL' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : t.deadline}
                </span>
                <div className="date-time-picker-header-actions">
                  <button type="button" className="date-time-picker-close" onClick={closePicker}>
                    {t.close}
                  </button>
                </div>
              </div>
              <div className="date-time-picker-wheels">
                <div className="date-time-picker-wheel-row">
                  <div className="date-time-picker-wheel-col">
                    <span className="date-time-picker-wheel-label">{t.hourLabel}</span>
                    <div className="date-time-picker-wheel-wrap">
                      <div
                        className="date-time-picker-wheel"
                        ref={hourScrollRef}
                        onScroll={() => handleWheelScroll(hourScrollRef, hoursList, setHour, minute, true)}
                      >
                        <div className="date-time-picker-wheel-pad" style={{ height: PADDING_ITEMS * ITEM_HEIGHT }} />
                        {hoursList.map((h) => (
                          <div
                            key={h}
                            role="button"
                            tabIndex={0}
                            className={`date-time-picker-wheel-item${h === hour ? ' is-selected' : ''}`}
                            style={{ height: ITEM_HEIGHT }}
                            onClick={() => handleWheelItemClick(hourScrollRef, h, hoursList, setHour, minute, true)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleWheelItemClick(hourScrollRef, h, hoursList, setHour, minute, true); } }}
                          >
                            {pad(h)}
                          </div>
                        ))}
                        <div className="date-time-picker-wheel-pad" style={{ height: PADDING_ITEMS * ITEM_HEIGHT }} />
                      </div>
                    </div>
                  </div>
                  <div className="date-time-picker-wheel-col">
                    <span className="date-time-picker-wheel-label">{t.minuteLabel}</span>
                    <div className="date-time-picker-wheel-wrap">
                      <div
                        className="date-time-picker-wheel"
                        ref={minuteScrollRef}
                        onScroll={() => handleWheelScroll(minuteScrollRef, minutesList, setMinute, hour, false)}
                      >
                        <div className="date-time-picker-wheel-pad" style={{ height: PADDING_ITEMS * ITEM_HEIGHT }} />
                        {minutesList.map((m) => (
                          <div
                            key={m}
                            role="button"
                            tabIndex={0}
                            className={`date-time-picker-wheel-item${m === minute ? ' is-selected' : ''}`}
                            style={{ height: ITEM_HEIGHT }}
                            onClick={() => handleWheelItemClick(minuteScrollRef, m, minutesList, setMinute, hour, false)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleWheelItemClick(minuteScrollRef, m, minutesList, setMinute, hour, false); } }}
                          >
                            {pad(m)}
                          </div>
                        ))}
                        <div className="date-time-picker-wheel-pad" style={{ height: PADDING_ITEMS * ITEM_HEIGHT }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="date-time-picker-selected-time-row">
                  <div className={`date-time-picker-selected-time${timeJustUpdated ? ' date-time-picker-selected-time-just-updated' : ''}`}>
                    <span className="date-time-picker-selected-label">{t.selectedTimeLabel}</span>
                    <span className="date-time-picker-selected-value">
                      {pad(Number(hour))}:{pad(Number(minute))}
                      <HiCheckCircle className="date-time-picker-selected-check" aria-hidden />
                    </span>
                  </div>
                  <button
                    type="button"
                    className="date-time-picker-confirm-btn"
                    onClick={closePicker}
                    aria-label={t.confirm}
                    title={t.confirm}
                  >
                    <HiCheckCircle className="date-time-picker-confirm-icon" aria-hidden />
                    {t.confirm}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(DateTimePicker);
