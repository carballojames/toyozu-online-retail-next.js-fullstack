export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ username: string }>;
};

export default async function UserUsernameIndexPage({ params }: PageProps) {
  const { username } = await params;
  redirect(`/user/${encodeURIComponent(username)}/profile`);
}
