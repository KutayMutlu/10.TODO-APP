import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import DatePicker, { registerLocale } from 'react-datepicker';
import { HiOutlineCalendar, HiOutlineArrowLeft, HiCheckCircle } from 'react-icons/hi2';
import tr from 'date-fns/locale/tr';
import fr from 'date-fns/locale/fr';
import enUS from 'date-fns/locale/en-US';
import sq from 'date-fns/locale/sq';
import 'react-datepicker/dist/react-datepicker.css';
import { toast } from 'react-toastify';
import '../App.css';

const ITEM_HEIGHT = 32;
const PADDING_ITEMS = 2;
const WHEEL_VIEWPORT_HEIGHT = 140; /* App.css .date-time-picker-wheel height ile aynı */
const WHEEL_COPIES = 3; /* iPhone döngü: liste 3 kopya, ortadaki kopyada kalıp sınırda sessiz atla */

const PAD_H = PADDING_ITEMS * ITEM_HEIGHT;
const CENTER_OFFSET = (WHEEL_VIEWPORT_HEIGHT / 2) - (ITEM_HEIGHT / 2);

/** Ortadaki kopyada index'inci öğeyi viewport ortasına getiren scrollTop */
function scrollTopForCenterLoop(index, listLength) {
  return PAD_H + listLength * ITEM_HEIGHT + index * ITEM_HEIGHT - CENTER_OFFSET;
}

/** 3 kopyalı liste için max scrollTop */
function maxScrollTopLoop(listLength) {
  const contentH = PAD_H * 2 + WHEEL_COPIES * listLength * ITEM_HEIGHT;
  return Math.max(0, contentH - WHEEL_VIEWPORT_HEIGHT);
}

/** Ortadaki kopyanın scroll aralığı; dışına çıkınca sessizce ortaya atla */
function getMiddleBounds(listLength) {
  const start = PAD_H + listLength * ITEM_HEIGHT;
  const end = PAD_H + 2 * listLength * ITEM_HEIGHT - WHEEL_VIEWPORT_HEIGHT;
  return { start, end };
}

registerLocale('tr', tr);
registerLocale('fr', fr);
registerLocale('en', enUS);
registerLocale('sq', sq);

/** value: '' veya 'YYYY-MM-DDTHH:mm' formatında string. onChange: (value: string | null) => void. usePortal: true ise popover body'de render edilir. onClose: picker kapanınca çağrılır (örn. İşlemler menüsünü de kapatmak için). */
function DateTimePicker({ value, onChange, t, lang = 'en', usePortal = false, onClose }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('date');
  const [pendingDate, setPendingDate] = useState(null); /* sadece Onayla ile kayıt; kapatınca atılır */
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
  const didSyncScrollRef = useRef(false);
  const isScrollJumpRef = useRef(false); /* döngü atlaması sırasında scroll handler snap yapmasın */
  const wheelStateRef = useRef({ setHour, setMinute, hour, minute });
  wheelStateRef.current = { setHour, setMinute, hour, minute };

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
  const minMinuteWhenCurrentHour = now.getMinutes() + 1;
  /* Tüm saat ve dakikalar listelenir; geçmiş seçilirse sadece Onayla'da uyarı verilir */
  const hoursList = Array.from({ length: 24 }, (_, i) => i);
  const minutesList = Array.from({ length: 60 }, (_, i) => i);
  const wheelHoursList = Array.from({ length: WHEEL_COPIES }, () => hoursList).flat();
  const wheelMinutesList = Array.from({ length: WHEEL_COPIES }, () => minutesList).flat();

  const closePicker = useCallback(() => {
    setOpen(false);
    setPendingDate(null);
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
      const parsed = parseValue(value);
      const valid = parsed && !isNaN(parsed.getTime());
      setStep(valid ? 'time' : 'date');
    }
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
  }, [open, value, usePortal, closePicker]);

  /* Zaman adımına ilk geçişte sadece yerel saat/dakika ata; kayıt sadece Onayla ile. value/pendingDate ile hesapla (dateValue her render yeni referans olduğu için deps'te kullanılmaz, döngüyü önlemek için). */
  const baseDate = pendingDate || dateValue || new Date();
  const isBaseToday = baseDate && baseDate.toDateString() === now.toDateString();
  useEffect(() => {
    if (!open || step !== 'time') return;
    const base = pendingDate || parseValue(value) || new Date();
    let h = base.getHours();
    let m = base.getMinutes();
    const baseToday = base.toDateString() === now.toDateString();
    if (baseToday) {
      h = Math.max(h, minHourToday);
      if (h === now.getHours()) {
        m = Math.max(m, minMinuteWhenCurrentHour);
        if (m > 59) m = 59;
      }
    }
    setHour(h);
    setMinute(m);
    didSyncScrollRef.current = false;
  }, [open, step, value, pendingDate]);

  /* Zaman adımına ilk girildiğinde scroll'u ortadaki kopyada senkron ayarla (iPhone döngü) */
  useLayoutEffect(() => {
    if (!open || step !== 'time') {
      didSyncScrollRef.current = false;
      return;
    }
    if (didSyncScrollRef.current) return;
    const hourIdx = hoursList.indexOf(hour);
    const minIdx = minutesList.indexOf(minute);
    if (hourIdx < 0 || minIdx < 0) return;
    didSyncScrollRef.current = true;
    if (hourScrollRef.current) {
      const t = scrollTopForCenterLoop(hourIdx, 24);
      hourScrollRef.current.scrollTop = Math.max(0, Math.min(maxScrollTopLoop(24), t));
    }
    if (minuteScrollRef.current) {
      const t = scrollTopForCenterLoop(minIdx, 60);
      minuteScrollRef.current.scrollTop = Math.max(0, Math.min(maxScrollTopLoop(60), t));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, hour, minute]);

  const scrollEndTimeoutRef = useRef(null);

  /* Tekerlek sadece yerel state günceller; kayıt sadece Onayla ile */
  const applyTimeFromWheels = () => {
    setTimeJustUpdated(true);
    if (timeUpdatedTimeoutRef.current) clearTimeout(timeUpdatedTimeoutRef.current);
    timeUpdatedTimeoutRef.current = setTimeout(() => {
      setTimeJustUpdated(false);
      timeUpdatedTimeoutRef.current = null;
    }, 500);
  };

  const handleConfirm = useCallback(() => {
    const base = pendingDate || dateValue || new Date();
    const selected = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, minute, 0, 0);
    const current = new Date();
    if (selected.toDateString() === current.toDateString() && selected.getTime() < current.getTime()) {
      toast.warning(t?.pastTimeWarning ?? 'Seçilen saat geçmişte. Lütfen ileri bir saat seçin.');
      return;
    }
    onChange(dateToValue(selected));
    setPendingDate(null);
    closePicker();
  }, [pendingDate, dateValue, hour, minute, t, closePicker, onChange]);

  /* iPhone döngü: ortadaki öğeyi state'e yaz; sınır dışındaysa sessizce ortaya atla, yoksa snap et */
  const handleWheelScroll = (scrollRef, list, setter) => {
    if (isScrollJumpRef.current) return;
    const el = scrollRef.current;
    if (!el || !list.length) return;
    const centerY = el.scrollTop + WHEEL_VIEWPORT_HEIGHT / 2;
    const rawIndex = Math.round((centerY - PAD_H - ITEM_HEIGHT / 2) / ITEM_HEIGHT);
    const logicalIndex = ((rawIndex % list.length) + list.length) % list.length;
    const value = list[logicalIndex];
    setter(value);
    const { start: middleStart, end: middleEnd } = getMiddleBounds(list.length);
    const targetTop = Math.max(0, Math.min(maxScrollTopLoop(list.length), scrollTopForCenterLoop(logicalIndex, list.length)));

    if (el.scrollTop < middleStart || el.scrollTop > middleEnd) {
      isScrollJumpRef.current = true;
      el.scrollTop = targetTop;
      applyTimeFromWheels();
      requestAnimationFrame(() => { isScrollJumpRef.current = false; });
      if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
      scrollEndTimeoutRef.current = null;
      return;
    }
    if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
    scrollEndTimeoutRef.current = setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTo({ top: targetTop, behavior: 'smooth' });
      applyTimeFromWheels();
      scrollEndTimeoutRef.current = null;
    }, 80);
  };

  const handleWheelItemClick = (scrollRef, value, list, setter) => {
    const el = scrollRef.current;
    if (!el || !list.length) return;
    const index = list.indexOf(value);
    if (index < 0) return;
    setter(value);
    const targetTop = Math.max(0, Math.min(maxScrollTopLoop(list.length), scrollTopForCenterLoop(index, list.length)));
    el.scrollTo({ top: targetTop, behavior: 'smooth' });
    applyTimeFromWheels();
  };

  /* Takvimde tarih seçimi: sadece yerel pendingDate; parent (Create/Düzenleme) sadece Onayla veya Tarih yok ile güncellenir. */
  const handleSelect = (date) => {
    if (!date) return;
    setPendingDate(new Date(date));
    setStep('time');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setPendingDate(null);
    closePicker();
  };

  const localeMap = { tr: 'tr', fr: 'fr', en: 'en', sq: 'sq' };
  const locale = localeMap[lang] || 'en';

  /* Wheel: preventDefault + iPhone döngü (sonda/başta sessiz atla) + state güncelle */
  useEffect(() => {
    if (!open || step !== 'time') return;
    const hourEl = hourScrollRef.current;
    const minuteEl = minuteScrollRef.current;
    if (!hourEl || !minuteEl) return;
    const updateStateFromScroll = (el, listLength, setter) => {
      if (!el || !listLength) return;
      const centerY = el.scrollTop + WHEEL_VIEWPORT_HEIGHT / 2;
      const rawIndex = Math.round((centerY - PAD_H - ITEM_HEIGHT / 2) / ITEM_HEIGHT);
      const index = ((rawIndex % listLength) + listLength) % listLength;
      setter(index);
    };
    const onWheel = (e, scrollRef, listLength, setter) => {
      const el = scrollRef.current;
      if (!el || !listLength) return;
      e.preventDefault();
      const stepDelta = e.deltaY > 0 ? ITEM_HEIGHT : e.deltaY < 0 ? -ITEM_HEIGHT : 0;
      if (stepDelta === 0) return;
      const max = maxScrollTopLoop(listLength);
      const { start: middleStart, end: middleEnd } = getMiddleBounds(listLength);
      let nextTop = el.scrollTop + stepDelta;
      if (nextTop >= max && stepDelta > 0) {
        nextTop = scrollTopForCenterLoop(0, listLength);
        el.scrollTop = nextTop;
        setter(0);
      } else if (nextTop <= 0 && stepDelta < 0) {
        nextTop = scrollTopForCenterLoop(listLength - 1, listLength);
        el.scrollTop = nextTop;
        setter(listLength - 1);
      } else {
        el.scrollTop = Math.max(0, Math.min(max, nextTop));
        updateStateFromScroll(el, listLength, setter);
      }
    };
    const boundHour = (e) => onWheel(e, hourScrollRef, 24, (v) => wheelStateRef.current.setHour(v));
    const boundMinute = (e) => onWheel(e, minuteScrollRef, 60, (v) => wheelStateRef.current.setMinute(v));
    const opts = { passive: false };
    hourEl.addEventListener('wheel', boundHour, opts);
    minuteEl.addEventListener('wheel', boundMinute, opts);
    return () => {
      hourEl.removeEventListener('wheel', boundHour, opts);
      minuteEl.removeEventListener('wheel', boundMinute, opts);
    };
  }, [open, step]);

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
                    {(pendingDate || dateValue) ? (pendingDate || dateValue).toLocaleDateString(lang === 'tr' ? 'tr-TR' : lang === 'fr' ? 'fr-FR' : lang === 'sq' ? 'sq-AL' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : t.deadline}
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
                          onScroll={() => handleWheelScroll(hourScrollRef, hoursList, setHour)}
                        >
                          <div className="date-time-picker-wheel-pad" style={{ height: PAD_H }} />
                          {wheelHoursList.map((h, idx) => (
                            <div
                              key={`hour-${idx}`}
                              role="button"
                              tabIndex={0}
                              className={`date-time-picker-wheel-item${h === hour ? ' is-selected' : ''}`}
                              style={{ height: ITEM_HEIGHT }}
                              onClick={() => handleWheelItemClick(hourScrollRef, h, hoursList, setHour)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleWheelItemClick(hourScrollRef, h, hoursList, setHour); } }}
                            >
                              {pad(h)}
                            </div>
                          ))}
                          <div className="date-time-picker-wheel-pad" style={{ height: PAD_H }} />
                        </div>
                      </div>
                    </div>
                    <div className="date-time-picker-wheel-col">
                      <span className="date-time-picker-wheel-label">{t.minuteLabel}</span>
                      <div className="date-time-picker-wheel-wrap">
                        <div
                          className="date-time-picker-wheel"
                          ref={minuteScrollRef}
                          onScroll={() => handleWheelScroll(minuteScrollRef, minutesList, setMinute)}
                        >
                          <div className="date-time-picker-wheel-pad" style={{ height: PAD_H }} />
                          {wheelMinutesList.map((m, idx) => (
                            <div
                              key={`min-${idx}`}
                              role="button"
                              tabIndex={0}
                              className={`date-time-picker-wheel-item${m === minute ? ' is-selected' : ''}`}
                              style={{ height: ITEM_HEIGHT }}
                              onClick={() => handleWheelItemClick(minuteScrollRef, m, minutesList, setMinute)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleWheelItemClick(minuteScrollRef, m, minutesList, setMinute); } }}
                            >
                              {pad(m)}
                            </div>
                          ))}
                          <div className="date-time-picker-wheel-pad" style={{ height: PAD_H }} />
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
                      onClick={handleConfirm}
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
                  {(pendingDate || dateValue) ? (pendingDate || dateValue).toLocaleDateString(lang === 'tr' ? 'tr-TR' : lang === 'fr' ? 'fr-FR' : lang === 'sq' ? 'sq-AL' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : t.deadline}
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
                        onScroll={() => handleWheelScroll(hourScrollRef, hoursList, setHour)}
                      >
                        <div className="date-time-picker-wheel-pad" style={{ height: PAD_H }} />
                        {wheelHoursList.map((h, idx) => (
                          <div
                            key={`hour-${idx}`}
                            role="button"
                            tabIndex={0}
                            className={`date-time-picker-wheel-item${h === hour ? ' is-selected' : ''}`}
                            style={{ height: ITEM_HEIGHT }}
                            onClick={() => handleWheelItemClick(hourScrollRef, h, hoursList, setHour)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleWheelItemClick(hourScrollRef, h, hoursList, setHour); } }}
                          >
                            {pad(h)}
                          </div>
                        ))}
                        <div className="date-time-picker-wheel-pad" style={{ height: PAD_H }} />
                      </div>
                    </div>
                  </div>
                  <div className="date-time-picker-wheel-col">
                    <span className="date-time-picker-wheel-label">{t.minuteLabel}</span>
                    <div className="date-time-picker-wheel-wrap">
                      <div
                        className="date-time-picker-wheel"
                        ref={minuteScrollRef}
                        onScroll={() => handleWheelScroll(minuteScrollRef, minutesList, setMinute)}
                      >
                        <div className="date-time-picker-wheel-pad" style={{ height: PAD_H }} />
                        {wheelMinutesList.map((m, idx) => (
                          <div
                            key={`min-${idx}`}
                            role="button"
                            tabIndex={0}
                            className={`date-time-picker-wheel-item${m === minute ? ' is-selected' : ''}`}
                            style={{ height: ITEM_HEIGHT }}
                            onClick={() => handleWheelItemClick(minuteScrollRef, m, minutesList, setMinute)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleWheelItemClick(minuteScrollRef, m, minutesList, setMinute); } }}
                          >
                            {pad(m)}
                          </div>
                        ))}
                        <div className="date-time-picker-wheel-pad" style={{ height: PAD_H }} />
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
                    onClick={handleConfirm}
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
