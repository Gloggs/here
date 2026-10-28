import { redirect } from "next/navigation";

// Old address. The month view now lives on each class page.
export default function Page() {
  redirect("/dashboard/classes");
}
