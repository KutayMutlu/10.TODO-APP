import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import DatePicker, { registerLocale } from 'react-datepicker';
import { HiOutlineCalendar, HiOutlineArrowLeft, HiCheckCircle, HiOutlineChevronUp, HiOutlineChevronDown } from 'react-icons/hi2';
import tr from 'date-fns/locale/tr';
import fr from 'date-fns/locale/fr';
import enUS from 'date-fns/locale/en-US';
import sq from 'date-fns/locale/sq';
import 'react-datepicker/dist/react-datepicker.css';
import '../App.css';

const ITEM_HEIGHT = 32;
const PADDING_ITEMS = 2;
const WHEEL_COPIES = 3; /* döngüsel tekerlek: listeyi 3 kopya render edip ortada kalıyoruz */
const WHEEL_VIEWPORT_HEIGHT = 140; /* App.css .date-time-picker-wheel height ile aynı */
/* Mouse wheel: her tık = tam 1 öğe (tek tık = tek adım) */
/* Seçili öğenin viewport ortasında görünmesi için scroll offset (iPhone alarm mantığı) */
const scrollTopToCenterIndex = (padH, listLength, index) => {
  const centerOffset = (WHEEL_VIEWPORT_HEIGHT / 2) - (ITEM_HEIGHT / 2);
  return padH + listLength * ITEM_HEIGHT + index * ITEM_HEIGHT - centerOffset;
};

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
  const isScrollJumpRef = useRef(false);
  const didSyncScrollRef = useRef(false);

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
    didSyncScrollRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only set hour/minute when entering time step
  }, [open, step, value, isSelectedToday]);

  /* Scroll konumunu saat/dakika güncellendikten ve doğru liste render edildikten sonra senkronize et (tek sefer) */
  useEffect(() => {
    if (!open || step !== 'time') {
      didSyncScrollRef.current = false;
      return;
    }
    if (didSyncScrollRef.current) return;
    if (!hoursList.length) return;
    const padH = PADDING_ITEMS * ITEM_HEIGHT;
    const hourIdx = hoursList.indexOf(hour);
    const minIdx = minutesList.indexOf(minute);
    if (hourIdx < 0 || minIdx < 0) return;
    didSyncScrollRef.current = true;
    const maxScroll = (L) => 2 * padH + 3 * L * ITEM_HEIGHT - WHEEL_VIEWPORT_HEIGHT;
    requestAnimationFrame(() => {
      if (hourScrollRef.current) {
        const t = scrollTopToCenterIndex(padH, hoursList.length, hourIdx);
        hourScrollRef.current.scrollTop = Math.max(0, Math.min(maxScroll(hoursList.length), t));
      }
      if (minuteScrollRef.current && minutesList.length > 0) {
        const t = scrollTopToCenterIndex(padH, minutesList.length, minIdx);
        minuteScrollRef.current.scrollTop = Math.max(0, Math.min(maxScroll(minutesList.length), t));
      }
    });
    // hoursList/minutesList closure'dan; sadece open, step, hour, minute değişince çalışsın (scroll her değişimde değil)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, hour, minute]);

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

  /* Masaüstü: ok butonu veya wheel ile tek adım */
  const handleWheelStep = (scrollRef, listLength, direction) => {
    const el = scrollRef.current;
    if (!el || !listLength) return;
    const padH = PADDING_ITEMS * ITEM_HEIGHT;
    const maxScroll = 2 * padH + 3 * listLength * ITEM_HEIGHT - WHEEL_VIEWPORT_HEIGHT;
    const step = direction > 0 ? ITEM_HEIGHT : -ITEM_HEIGHT;
    el.scrollTop = Math.max(0, Math.min(maxScroll, el.scrollTop + step));
  };

  const handleWheelDelta = (e, scrollRef, listLength) => {
    const el = scrollRef.current;
    if (!el || !listLength) return;
    e.preventDefault();
    const padH = PADDING_ITEMS * ITEM_HEIGHT;
    const maxScroll = 2 * padH + 3 * listLength * ITEM_HEIGHT - WHEEL_VIEWPORT_HEIGHT;
    const step = e.deltaY > 0 ? ITEM_HEIGHT : e.deltaY < 0 ? -ITEM_HEIGHT : 0;
    if (step === 0) return;
    el.scrollTop = Math.max(0, Math.min(maxScroll, el.scrollTop + step));
  };

  const handleWheelScroll = (scrollRef, list, setter, otherValue, isHour) => {
    if (isScrollJumpRef.current) return;
    const el = scrollRef.current;
    if (!el || !list.length) return;
    const padH = PADDING_ITEMS * ITEM_HEIGHT;
    /* Viewport ortasındaki öğeyi seçili say (iPhone alarm mantığı) */
    const centerY = el.scrollTop + WHEEL_VIEWPORT_HEIGHT / 2;
    const rawIndex = Math.round((centerY - padH - ITEM_HEIGHT / 2) / ITEM_HEIGHT);
    const logicalIndex = ((rawIndex % list.length) + list.length) % list.length;
    const value = list[logicalIndex];
    setter(value);
    const h = isHour ? value : otherValue;
    const m = isHour ? clampMinuteForToday(value, otherValue) : clampMinuteForToday(otherValue, value);
    if (m !== (isHour ? otherValue : value)) setMinute(m);
    const middleStart = padH + list.length * ITEM_HEIGHT;
    const middleEnd = padH + 2 * list.length * ITEM_HEIGHT;
    const maxScroll = 2 * padH + 3 * list.length * ITEM_HEIGHT - WHEEL_VIEWPORT_HEIGHT;
    const targetTop = Math.max(0, Math.min(maxScroll, scrollTopToCenterIndex(padH, list.length, logicalIndex)));
    let didJump = false;
    if (el.scrollTop < middleStart) {
      isScrollJumpRef.current = true;
      didJump = true;
      el.scrollTop = targetTop;
      requestAnimationFrame(() => { isScrollJumpRef.current = false; });
    } else if (el.scrollTop >= middleEnd) {
      isScrollJumpRef.current = true;
      didJump = true;
      el.scrollTop = targetTop;
      requestAnimationFrame(() => { isScrollJumpRef.current = false; });
    }
    if (didJump) {
      applyTimeFromWheels(h, m);
      if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
      scrollEndTimeoutRef.current = null;
      return;
    }
    if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
    scrollEndTimeoutRef.current = setTimeout(() => {
      el.scrollTo({ top: targetTop, behavior: 'smooth' });
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
    const padH = PADDING_ITEMS * ITEM_HEIGHT;
    const targetTop = scrollTopToCenterIndex(padH, list.length, index);
    const maxScroll = 2 * padH + 3 * list.length * ITEM_HEIGHT - WHEEL_VIEWPORT_HEIGHT;
    el.scrollTo({ top: Math.max(0, Math.min(maxScroll, targetTop)), behavior: 'smooth' });
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

  const wheelHoursList = Array.from({ length: WHEEL_COPIES }, () => hoursList).flat();
  const wheelMinutesList = Array.from({ length: WHEEL_COPIES }, () => minutesList).flat();

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
                    aria-label="Yukarı"
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
                      <div className="date-time-picker-wheel-with-arrows">
                        <button type="button" className="date-time-picker-wheel-arrow date-time-picker-wheel-arrow-up" onClick={() => handleWheelStep(hourScrollRef, hoursList.length, -1)} aria-label="Yukarı">
                          <HiOutlineChevronUp />
                        </button>
                        <div className="date-time-picker-wheel-wrap">
                          <div
                            className="date-time-picker-wheel"
                            ref={hourScrollRef}
                            onWheel={(e) => handleWheelDelta(e, hourScrollRef, hoursList.length)}
                            onScroll={() => handleWheelScroll(hourScrollRef, hoursList, setHour, minute, true)}
                          >
                            <div className="date-time-picker-wheel-pad" style={{ height: PADDING_ITEMS * ITEM_HEIGHT }} />
                            {wheelHoursList.map((h, idx) => (
                              <div
                                key={`hour-${idx}`}
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
                        <button type="button" className="date-time-picker-wheel-arrow date-time-picker-wheel-arrow-down" onClick={() => handleWheelStep(hourScrollRef, hoursList.length, 1)} aria-label="Aşağı">
                          <HiOutlineChevronDown />
                        </button>
                      </div>
                    </div>
                    <div className="date-time-picker-wheel-col">
                      <span className="date-time-picker-wheel-label">{t.minuteLabel}</span>
                      <div className="date-time-picker-wheel-with-arrows">
                        <button type="button" className="date-time-picker-wheel-arrow date-time-picker-wheel-arrow-up" onClick={() => handleWheelStep(minuteScrollRef, minutesList.length, -1)} aria-label="Yukarı">
                          <HiOutlineChevronUp />
                        </button>
                        <div className="date-time-picker-wheel-wrap">
                          <div
                            className="date-time-picker-wheel"
                            ref={minuteScrollRef}
                            onWheel={(e) => handleWheelDelta(e, minuteScrollRef, minutesList.length)}
                            onScroll={() => handleWheelScroll(minuteScrollRef, minutesList, setMinute, hour, false)}
                          >
                            <div className="date-time-picker-wheel-pad" style={{ height: PADDING_ITEMS * ITEM_HEIGHT }} />
                            {wheelMinutesList.map((m, idx) => (
                              <div
                                key={`min-${idx}`}
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
                        <button type="button" className="date-time-picker-wheel-arrow date-time-picker-wheel-arrow-down" onClick={() => handleWheelStep(minuteScrollRef, minutesList.length, 1)} aria-label="Aşağı">
                          <HiOutlineChevronDown />
                        </button>
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
                    aria-label="Yukarı"
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
                    <div className="date-time-picker-wheel-with-arrows">
                      <button type="button" className="date-time-picker-wheel-arrow date-time-picker-wheel-arrow-up" onClick={() => handleWheelStep(hourScrollRef, hoursList.length, -1)} aria-label="Yukarı">
                        <HiOutlineChevronUp />
                      </button>
                      <div className="date-time-picker-wheel-wrap">
                        <div
                          className="date-time-picker-wheel"
                          ref={hourScrollRef}
                          onWheel={(e) => handleWheelDelta(e, hourScrollRef, hoursList.length)}
                          onScroll={() => handleWheelScroll(hourScrollRef, hoursList, setHour, minute, true)}
                        >
                          <div className="date-time-picker-wheel-pad" style={{ height: PADDING_ITEMS * ITEM_HEIGHT }} />
                          {wheelHoursList.map((h, idx) => (
                            <div
                              key={`hour-${idx}`}
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
                      <button type="button" className="date-time-picker-wheel-arrow date-time-picker-wheel-arrow-down" onClick={() => handleWheelStep(hourScrollRef, hoursList.length, 1)} aria-label="Aşağı">
                        <HiOutlineChevronDown />
                      </button>
                    </div>
                  </div>
                  <div className="date-time-picker-wheel-col">
                    <span className="date-time-picker-wheel-label">{t.minuteLabel}</span>
                    <div className="date-time-picker-wheel-with-arrows">
                      <button type="button" className="date-time-picker-wheel-arrow date-time-picker-wheel-arrow-up" onClick={() => handleWheelStep(minuteScrollRef, minutesList.length, -1)} aria-label="Yukarı">
                        <HiOutlineChevronUp />
                      </button>
                      <div className="date-time-picker-wheel-wrap">
                        <div
                          className="date-time-picker-wheel"
                          ref={minuteScrollRef}
                          onWheel={(e) => handleWheelDelta(e, minuteScrollRef, minutesList.length)}
                          onScroll={() => handleWheelScroll(minuteScrollRef, minutesList, setMinute, hour, false)}
                        >
                          <div className="date-time-picker-wheel-pad" style={{ height: PADDING_ITEMS * ITEM_HEIGHT }} />
                          {wheelMinutesList.map((m, idx) => (
                            <div
                              key={`min-${idx}`}
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
                      <button type="button" className="date-time-picker-wheel-arrow date-time-picker-wheel-arrow-down" onClick={() => handleWheelStep(minuteScrollRef, minutesList.length, 1)} aria-label="Aşağı">
                        <HiOutlineChevronDown />
                      </button>
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
