import { useEffect, useState, type FormEvent } from "react"
import { calendarMonthRange, getBusinessCalendar, saveCalendarDate, saveOpeningHours, type CalendarDate, type CalendarView, type OpeningDay } from "../../api/businessCalendarApi"
import { useI18n } from "../../i18n/I18nContext"
import ErrorMessage from "../common/ErrorMessage"
import { calendarCopy } from "./calendarCopy"
import { DEFAULT_COMPANY_TIME_ZONE, formatTimeZoneLabel, lastCompleteCompanyDate } from "../../utils/companyLocalization"
import { calendarDateIsClosed } from "../../utils/businessCalendar"

type View = "calendar" | "hours"

function companyToday(zone: string) {
  const yesterday = lastCompleteCompanyDate(zone || DEFAULT_COMPANY_TIME_ZONE)
  const date = yesterday ? new Date(yesterday + "T12:00:00Z") : new Date()
  if (yesterday) date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

export default function BusinessCalendarSettings({ site, zone, view }: { site: number; zone: string; view: View }) {
  const { language } = useI18n()
  const text = calendarCopy[language]
  const [month, setMonth] = useState(() => companyToday(zone).slice(0, 7))
  const [selected, setSelected] = useState(() => companyToday(zone))
  const [data, setData] = useState<CalendarView | null>(null)
  const [revision, setRevision] = useState(0)
  const [loaded, setLoaded] = useState("")
  const [failed, setFailed] = useState(false)
  const [saved, setSaved] = useState(false)
  const loadKey = `${site}|${month}|${revision}`
  useEffect(() => {
    let active = true
    getBusinessCalendar(site, month).then(value => {
      if (active) { setData(value); setLoaded(`${site}|${month}|${revision}`); setFailed(false) }
    }).catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [site, month, revision])

  const range = calendarMonthRange(month)
  const count = Number(range.end.slice(-2))
  const offset = (new Date(range.start + "T12:00:00Z").getUTCDay() + 6) % 7
  const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(language, { weekday: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(2026, 10, 16 + index))))
  const ready = data && loaded === loadKey
  const visibleDates = data?.calendar.dates.filter(item => item.date.startsWith(month)) ?? []
  function onSaved() { setSaved(true); setRevision(value => value + 1) }
  return <section className="calendar-settings-panel">
    <h2>{view === "hours" ? text.hours : text.calendar}</h2>
    <p>{text.zone}: {formatTimeZoneLabel(data?.businessTimeZone || zone)}</p>
    {failed && <ErrorMessage message={text.error} onDismiss={() => setFailed(false)} />}
    {saved && <p role="status">{text.saved}</p>}
    {view === "calendar" && <label className="calendar-month-select">{text.month}<input type="month" value={month}
      onChange={event => { if (event.target.value) { setSaved(false); setMonth(event.target.value); setSelected(event.target.value + "-01") } }} /></label>}
    {!ready ? !failed && <p role="status">{text.loading}</p> : view === "hours"
      ? <HoursEditor key={loadKey} site={site} effective={data.calendar.effectiveFrom || companyToday(zone)}
          initial={data.calendar.weekdays} onSaved={onSaved} />
      : <>
        <div className="business-calendar-layout">
          <div className="business-calendar" role="group" aria-label={text.calendar}>
            {weekdays.map((name, index) => <span className="calendar-weekday" key={index}>{name}</span>)}
            {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}
            {Array.from({ length: count }, (_, index) => {
              const date = month + "-" + String(index + 1).padStart(2, "0")
              const entry = data.calendar.dates.find(item => item.date === date)
              const closed = calendarDateIsClosed(data.calendar, date)
              return <button type="button" key={date} aria-pressed={date === selected}
                className={entry?.eventDescription ? "calendar-event-day" : closed ? "calendar-closed-day" : ""}
                title={entry?.eventDescription || (closed ? text.CLOSED : date)}
                aria-label={date + (entry?.eventDescription ? ": " + entry.eventDescription : "")}
                onClick={() => { setSelected(date); setSaved(false) }}>{index + 1}</button>
            })}
          </div>
          <DateEditor key={`${loadKey}|${selected}`} site={site} date={selected}
            entry={data.calendar.dates.find(item => item.date === selected)}
            onSaved={onSaved} />
        </div>
        <h3>{text.recorded}</h3>
        {visibleDates.length === 0 ? <p>{text.noDates}</p> : <ul className="calendar-recorded-dates">
          {visibleDates.map(item => <li key={item.date}>
            <button type="button" onClick={() => setSelected(item.date)}>{item.date}</button>
            <span>{text[item.dayType]}{item.eventDescription ? " · " + item.eventDescription : ""}</span>
          </li>)}
        </ul>}
      </>}
  </section>
}

function HoursEditor({ site, initial, effective, onSaved }: {
  site: number; initial: OpeningDay[]; effective: string; onSaved: () => void
}) {
  const { language } = useI18n()
  const text = calendarCopy[language]
  const [from, setFrom] = useState(effective)
  const [days, setDays] = useState<OpeningDay[]>(() => Array.from({ length: 7 }, (_, index) =>
    initial.find(row => row.weekday === index + 1) || { weekday: index + 1, open: false, opensAt: null, closesAt: null, closesNextDay: false }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  function update(day: number, values: Partial<OpeningDay>) {
    setDays(rows => rows.map(row => row.weekday === day ? { ...row, ...values } : row))
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(false)
    try { await saveOpeningHours(site, from, days); onSaved() }
    catch { setError(true) }
    finally { setBusy(false) }
  }
  return <form onSubmit={submit}>
    {error && <ErrorMessage message={text.error} onDismiss={() => setError(false)} />}
    <fieldset className="calendar-fields" disabled={busy}>
      <label>{text.effective}<input type="date" value={from} required onChange={event => setFrom(event.target.value)} /></label>
      {days.map(day => {
        const name = new Intl.DateTimeFormat(language, { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 10, 15 + day.weekday)))
        return <div className="opening-hours-row" key={day.weekday}>
          <label className="terms-acceptance"><input type="checkbox" checked={day.open} onChange={event => update(day.weekday, event.target.checked
            ? { open: true, opensAt: "09:00", closesAt: "17:00" }
            : { open: false, opensAt: null, closesAt: null, closesNextDay: false })} /><span>{name}</span></label>
          <label>{text.opens}<input type="time" aria-label={name + " " + text.opens} required={day.open} disabled={!day.open}
            value={day.opensAt?.slice(0, 5) || ""} onChange={event => update(day.weekday, { opensAt: event.target.value })} /></label>
          <label>{text.closes}<input type="time" aria-label={name + " " + text.closes} required={day.open} disabled={!day.open}
            value={day.closesAt?.slice(0, 5) || ""} onChange={event => update(day.weekday, { closesAt: event.target.value })} /></label>
          <label className="terms-acceptance"><input type="checkbox" checked={day.closesNextDay} disabled={!day.open}
            onChange={event => update(day.weekday, { closesNextDay: event.target.checked })} /><span>{text.nextDay}</span></label>
        </div>
      })}
      <button type="submit">{text.saveHours}</button>
    </fieldset>
  </form>
}

function DateEditor({ site, date, entry, onSaved }: { site: number; date: string; entry?: CalendarDate; onSaved: () => void }) {
  const { language } = useI18n()
  const text = calendarCopy[language]
  const [type, setType] = useState<CalendarDate["dayType"]>(entry?.dayType || "REGULAR")
  const [description, setDescription] = useState(entry?.eventDescription || "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(false)
    try { await saveCalendarDate(site, date, type, description); onSaved() }
    catch { setError(true) }
    finally { setBusy(false) }
  }
  return <form onSubmit={submit}>
    <h3>{date}</h3>
    {error && <ErrorMessage message={text.error} onDismiss={() => setError(false)} />}
    <fieldset className="calendar-fields" disabled={busy}>
      <label>{text.type}<select aria-label={text.type} value={type} onChange={event => setType(event.target.value as CalendarDate["dayType"])}>
        <option value="REGULAR">{text.REGULAR}</option><option value="CLOSED">{text.CLOSED}</option><option value="OPEN">{text.OPEN}</option>
      </select></label>
      <label>{text.event}<textarea rows={4} maxLength={500} value={description}
        aria-label={text.event + ": " + text.description} onChange={event => setDescription(event.target.value)} /></label>
      <button type="submit">{text.saveDate}</button>
    </fieldset>
  </form>
}
