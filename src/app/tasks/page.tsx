import type { Metadata } from "next";
import TaskJournal from "@/components/tasks/TaskJournal";

export const metadata: Metadata = {
  title: "יומן המשימות של אופיר",
  description: "יומן משימות אישי — לוח שנה, קטגוריות, תזכורות ותתי-משימות",
};

export default function TasksPage() {
  return <TaskJournal />;
}
