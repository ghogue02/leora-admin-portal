import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SALES_SESSION_COOKIE = "sales_session_id";

export default async function Home() {
  const cookieStore = await cookies();
  const hasSalesSession = cookieStore.has(SALES_SESSION_COOKIE);
  redirect(hasSalesSession ? "/sales/leora" : "/sales/login");
}
