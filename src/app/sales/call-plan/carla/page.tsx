import { redirect } from "next/navigation";

export default function CarlaRedirectPage() {
  redirect("/sales/call-plan?tab=calendar");
}
