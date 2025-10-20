import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SALES_SESSION_COOKIE = "sales_session_id";

export default function Home() {
  const hasSalesSession = cookies().has(SALES_SESSION_COOKIE);
  redirect(hasSalesSession ? "/sales/dashboard" : "/sales/login");
}
