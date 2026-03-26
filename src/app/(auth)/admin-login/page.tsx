import { redirect } from "next/navigation";

type LegacyAdminLoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LegacyAdminLoginPage({ searchParams }: LegacyAdminLoginPageProps) {
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value);
      continue;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        query.append(key, entry);
      }
    }
  }

  if (!query.has("verify")) {
    query.set("verify", "1");
  }

  const target = query.toString() ? `/auth/login?${query.toString()}` : "/auth/login";
  redirect(target);
}
