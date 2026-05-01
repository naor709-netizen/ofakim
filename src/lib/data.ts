export type Department = "education" | "youth";

export type CategoryId =
  | "early" | "elementary" | "secondary" | "camps" | "haredi" | "edu-general" | "training" | "breaks"
  | "dream" | "social" | "meaningful" | "movements" | "prep" | "recreation" | "youth-general";

export interface Category {
  id: CategoryId;
  name: string;
  department: Department;
  color: string;
}

export interface Event {
  id: string;
  name: string;
  categoryId: CategoryId;
  startMonth: number; // 1-12
  endMonth: number;   // 1-12
  startDay?: number;
  endDay?: number;
  ageGroups: string[];
  location?: string;
  responsible?: string;
  status: "published" | "draft";
}

export interface HebrewHoliday {
  name: string;
  month: number;
  day: number;
  duration?: number; // days
  type: "holiday" | "memorial" | "vacation";
}

export const CATEGORIES: Category[] = [
  // מנהל החינוך
  { id: "early",        name: "גיל הרך",          department: "education", color: "#1D9E75" },
  { id: "elementary",   name: "חינוך יסודי",       department: "education", color: "#185FA5" },
  { id: "secondary",    name: "על-יסודי",           department: "education", color: "#7F77DD" },
  { id: "camps",        name: "קייטנות",            department: "education", color: "#D4537E" },
  { id: "haredi",       name: "חינוך חרדי",         department: "education", color: "#888780" },
  { id: "edu-general",  name: "אירועים כלליים",     department: "education", color: "#5F5E5A" },
  { id: "training",     name: "הכשרות",             department: "education", color: "#BA7517" },
  { id: "breaks",       name: "ימי הפוגה",          department: "education", color: "#E8B454" },
  // מחלקת הנוער
  { id: "dream",        name: "תנועת חלום",         department: "youth", color: "#D85A30" },
  { id: "social",       name: "מעורבות חברתית",     department: "youth", color: "#BA7517" },
  { id: "meaningful",   name: "שירות משמעותי",      department: "youth", color: "#1D9E75" },
  { id: "movements",    name: "תנועות נוער",         department: "youth", color: "#639922" },
  { id: "prep",         name: "מכינות ושנת שירות",  department: "youth", color: "#7F77DD" },
  { id: "recreation",   name: "אירועי הפוגה",        department: "youth", color: "#D4537E" },
  { id: "youth-general",name: "אירועים כלליים",     department: "youth", color: "#885511" },
];

// חגים ומועדים תשפ"ו (2025-2026)
export const HOLIDAYS: HebrewHoliday[] = [
  { name: "ראש השנה",       month: 9,  day: 22, duration: 2, type: "holiday" },
  { name: "יום כיפור",      month: 10, day: 1,  duration: 1, type: "holiday" },
  { name: "סוכות",          month: 10, day: 6,  duration: 7, type: "holiday" },
  { name: "שמחת תורה",      month: 10, day: 13, duration: 1, type: "holiday" },
  { name: "חנוכה",          month: 12, day: 25, duration: 8, type: "holiday" },
  { name: "חופשת חנוכה",    month: 12, day: 28, duration: 5, type: "vacation" },
  { name: "ט\"ו בשבט",      month: 2,  day: 13, duration: 1, type: "holiday" },
  { name: "פורים",          month: 3,  day: 13, duration: 2, type: "holiday" },
  { name: "פסח",            month: 4,  day: 12, duration: 8, type: "holiday" },
  { name: "חופשת פסח",      month: 4,  day: 9,  duration: 12, type: "vacation" },
  { name: "יום השואה",      month: 4,  day: 30, duration: 1, type: "memorial" },
  { name: "יום הזיכרון",    month: 5,  day: 6,  duration: 1, type: "memorial" },
  { name: "יום העצמאות",    month: 5,  day: 7,  duration: 1, type: "holiday" },
  { name: "ל\"ג בעומר",     month: 5,  day: 18, duration: 1, type: "holiday" },
  { name: "שבועות",         month: 6,  day: 1,  duration: 2, type: "holiday" },
  { name: "חופשת קיץ",      month: 7,  day: 1,  duration: 61, type: "vacation" },
];

// אירועים לדוגמה תשפ"ו
export const DEMO_EVENTS: Event[] = [
  // גיל הרך
  { id: "1",  name: "יום פתוח גנים",           categoryId: "early",        startMonth: 9,  endMonth: 9,  startDay: 5,  endDay: 5,  ageGroups: ["גן"], location: "גנים עירוניים", responsible: "מיכל כהן", status: "published" },
  { id: "2",  name: "אירוע חנוכה פעוטונים",    categoryId: "early",        startMonth: 12, endMonth: 12, startDay: 24, endDay: 24, ageGroups: ["0-3"], location: "מעון עירוני", responsible: "שרה לוי", status: "published" },
  { id: "3",  name: "פסטיבל אביב גן",          categoryId: "early",        startMonth: 4,  endMonth: 4,  startDay: 4,  endDay: 5,  ageGroups: ["גן"], status: "published" },
  { id: "4",  name: "קייטנת קיץ גנים",         categoryId: "early",        startMonth: 7,  endMonth: 7,  startDay: 2,  endDay: 25, ageGroups: ["3-6"], status: "published" },
  // חינוך יסודי
  { id: "5",  name: "שנה טובה – אסיפת הורים",  categoryId: "elementary",   startMonth: 9,  endMonth: 9,  startDay: 10, endDay: 10, ageGroups: ["א-ו"], status: "published" },
  { id: "6",  name: "אולימפיאדת ספורט",        categoryId: "elementary",   startMonth: 11, endMonth: 11, startDay: 10, endDay: 12, ageGroups: ["א-ו"], location: "אצטדיון אופקים", status: "published" },
  { id: "7",  name: "יריד ספרים",              categoryId: "elementary",   startMonth: 2,  endMonth: 2,  startDay: 15, endDay: 17, ageGroups: ["א-ו"], status: "published" },
  { id: "8",  name: "פרויקט סיום כיתה ו'",     categoryId: "elementary",   startMonth: 6,  endMonth: 6,  startDay: 10, endDay: 20, ageGroups: ["ו"], status: "published" },
  // על-יסודי
  { id: "9",  name: "יום כיפור – עיון",         categoryId: "secondary",    startMonth: 9,  endMonth: 9,  startDay: 28, endDay: 28, ageGroups: ["ז-יב"], status: "published" },
  { id: "10", name: "פרויקט מנהיגות תיכון",    categoryId: "secondary",    startMonth: 11, endMonth: 3,  ageGroups: ["י-יב"], status: "published" },
  { id: "11", name: "מסע לפולין",              categoryId: "secondary",    startMonth: 3,  endMonth: 3,  startDay: 20, endDay: 27, ageGroups: ["יא"], status: "published" },
  { id: "12", name: "טיול שנתי חטיבה",         categoryId: "secondary",    startMonth: 5,  endMonth: 5,  startDay: 12, endDay: 14, ageGroups: ["ז-ט"], status: "published" },
  // קייטנות
  { id: "13", name: "קייטנת פסח",              categoryId: "camps",        startMonth: 4,  endMonth: 4,  startDay: 13, endDay: 18, ageGroups: ["א-ו"], status: "published" },
  { id: "14", name: "קייטנת קיץ עירונית",      categoryId: "camps",        startMonth: 7,  endMonth: 8,  ageGroups: ["א-ח"], location: "בתי ספר העיר", status: "published" },
  // הכשרות
  { id: "15", name: "השתלמות מורים",           categoryId: "training",     startMonth: 10, endMonth: 10, startDay: 14, endDay: 15, ageGroups: ["צוות"], status: "published" },
  { id: "16", name: "יום פדגוגי",              categoryId: "training",     startMonth: 1,  endMonth: 1,  startDay: 20, endDay: 20, ageGroups: ["צוות"], status: "published" },
  // תנועת חלום
  { id: "17", name: "פתיחת שנת חלום",          categoryId: "dream",        startMonth: 10, endMonth: 10, startDay: 20, endDay: 20, ageGroups: ["ד-ח"], location: "המגנט", responsible: "יונתן גל", status: "published" },
  { id: "18", name: "מחנה חלום חורף",          categoryId: "dream",        startMonth: 12, endMonth: 12, startDay: 26, endDay: 29, ageGroups: ["ד-ח"], status: "published" },
  { id: "19", name: "מחנה אביב חלום",          categoryId: "dream",        startMonth: 3,  endMonth: 3,  startDay: 25, endDay: 28, ageGroups: ["ד-ח"], status: "published" },
  // מעורבות חברתית
  { id: "20", name: "פרויקט קהילתי – חורף",   categoryId: "social",       startMonth: 11, endMonth: 2,  ageGroups: ["ז-יב"], status: "published" },
  { id: "21", name: "יום התנדבות עירוני",       categoryId: "social",       startMonth: 4,  endMonth: 4,  startDay: 16, endDay: 16, ageGroups: ["ז-יב"], status: "published" },
  // שירות משמעותי
  { id: "22", name: "תוכנית שת\"פ בתי ספר",    categoryId: "meaningful",   startMonth: 10, endMonth: 5,  ageGroups: ["י-יב"], status: "published" },
  // תנועות נוער
  { id: "23", name: "מחנה בני עקיבא",          categoryId: "movements",    startMonth: 7,  endMonth: 7,  startDay: 15, endDay: 22, ageGroups: ["ד-ח"], status: "published" },
  { id: "24", name: "מחנה צופים",              categoryId: "movements",    startMonth: 8,  endMonth: 8,  startDay: 1,  endDay: 8,  ageGroups: ["ד-ח"], status: "published" },
  // מכינות
  { id: "25", name: "יום פתוח מכינות",         categoryId: "prep",         startMonth: 2,  endMonth: 2,  startDay: 20, endDay: 20, ageGroups: ["יב"], status: "published" },
  // אירועי הפוגה נוער
  { id: "26", name: "יום גיבוש מדריכים",       categoryId: "recreation",   startMonth: 10, endMonth: 10, startDay: 5,  endDay: 5,  ageGroups: ["מדריכים"], status: "published" },
  { id: "27", name: "הכשרת מדריכים קיץ",       categoryId: "recreation",   startMonth: 8,  endMonth: 8,  startDay: 20, endDay: 23, ageGroups: ["מדריכים"], status: "published" },
];

export const MONTHS_HE = ["ספטמבר","אוקטובר","נובמבר","דצמבר","ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט"];
// שנת לימודים: ספטמבר (חודש 9) עד אוגוסט (חודש 8)
export const SCHOOL_YEAR_MONTHS = [9,10,11,12,1,2,3,4,5,6,7,8];
