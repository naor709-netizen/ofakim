export type IcsDate = {
  year: number;
  month: number;
  day: number;
  allDay: boolean;
};

export type IcsEvent = {
  uid: string;
  summary: string;
  start: IcsDate;
  end: IcsDate;
  location: string;
  description: string;
};

function unescape(v: string): string {
  return v
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseIcsDate(value: string): IcsDate | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    allDay: !value.includes("T"),
  };
}

function dateDecrement(d: IcsDate): IcsDate {
  const js = new Date(d.year, d.month - 1, d.day);
  js.setDate(js.getDate() - 1);
  return {
    year: js.getFullYear(),
    month: js.getMonth() + 1,
    day: js.getDate(),
    allDay: d.allDay,
  };
}

function dateBefore(a: IcsDate, b: IcsDate): boolean {
  if (a.year !== b.year) return a.year < b.year;
  if (a.month !== b.month) return a.month < b.month;
  return a.day < b.day;
}

export function parseICS(text: string): IcsEvent[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);
  const events: IcsEvent[] = [];
  let cur: Partial<IcsEvent> | null = null;
  let anonCounter = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "BEGIN:VEVENT") {
      cur = { uid: "", summary: "", location: "", description: "" };
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur && cur.summary && cur.start) {
        let end: IcsDate = cur.end ?? cur.start;
        if (cur.start.allDay && cur.end?.allDay) {
          const dec = dateDecrement(cur.end);
          end = dateBefore(dec, cur.start) ? cur.start : dec;
        }
        events.push({
          uid: cur.uid || `ics-anon-${anonCounter++}`,
          summary: cur.summary,
          start: cur.start,
          end,
          location: cur.location || "",
          description: cur.description || "",
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx < 0) continue;
    const left = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1);
    const name = left.split(";")[0].toUpperCase();

    if (name === "SUMMARY") cur.summary = unescape(value).trim();
    else if (name === "LOCATION") cur.location = unescape(value).trim();
    else if (name === "DESCRIPTION") cur.description = unescape(value).trim();
    else if (name === "UID") cur.uid = value.trim();
    else if (name === "DTSTART") {
      const d = parseIcsDate(value);
      if (d) cur.start = d;
    } else if (name === "DTEND") {
      const d = parseIcsDate(value);
      if (d) cur.end = d;
    }
  }
  return events;
}
