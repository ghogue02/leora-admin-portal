import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const PORTAL_SESSION_COOKIE = "portal_session_id";

export default function Home() {
  const hasPortalSession = cookies().has(PORTAL_SESSION_COOKIE);
  redirect(hasPortalSession ? "/portal/leora" : "/dev/portal-login");
}
