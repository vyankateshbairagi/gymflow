import { CalendarCheck } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function AttendancePage() {
  return (
    <PlaceholderPage
      title="Attendance"
      description="Daily check-ins and check-outs for members."
      icon={CalendarCheck}
    />
  );
}
