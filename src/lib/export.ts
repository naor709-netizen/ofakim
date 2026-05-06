// ייצוא אירוע כקובץ iCal — תואם Google / Apple / Outlook

interface ICalEvent {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startYear: number;
  startMonth: number;
  startDay: number;
  endYear: number;
  endMonth: number;
  endDay: number;
}

function pad(n: number) { return String(n).padStart(2, "0"); }
function formatDate(year: number, month: number, day: number) {
  return `${year}${pad(month)}${pad(day)}`;
}

export function generateICal(events: ICalEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ofakim Portal//EN",
    "METHOD:PUBLISH",
  ];
  for (const e of events) {
    const dtStart = formatDate(e.startYear, e.startMonth, e.startDay);
    // iCal DTEND is exclusive (next day)
    const endDate = new Date(e.endYear, e.endMonth - 1, e.endDay + 1);
    const dtEnd = formatDate(endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate());
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@ofakim-portal`,
      `DTSTAMP:${dtStart}T000000Z`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${escapeText(e.title)}`,
      e.description ? `DESCRIPTION:${escapeText(e.description)}` : "",
      e.location ? `LOCATION:${escapeText(e.location)}` : "",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

function escapeText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function downloadICal(filename: string, ical: string) {
  const blob = new Blob([ical], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function shareWhatsapp(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

export function addToGoogleCalendar(p: {
  title: string;
  description?: string;
  location?: string;
  startYear: number;
  startMonth: number;
  startDay: number;
  endYear?: number;
  endMonth?: number;
  endDay?: number;
}) {
  const start = `${p.startYear}${pad(p.startMonth)}${pad(p.startDay)}`;
  const endY = p.endYear ?? p.startYear;
  const endM = p.endMonth ?? p.startMonth;
  const endD = p.endDay ?? p.startDay;
  const endDate = new Date(endY, endM - 1, endD + 1);
  const end = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}`;
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(p.title)}&dates=${start}/${end}${p.location ? `&location=${encodeURIComponent(p.location)}` : ""}${p.description ? `&details=${encodeURIComponent(p.description)}` : ""}`;
  window.open(url, "_blank");
}
