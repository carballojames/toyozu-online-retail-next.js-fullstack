import type { ReactNode } from "react";

import Header from "../common/Header";
import UserAsideNav from "./_components/UserAsideNav";
import { UserProfileProvider } from "./_components/UserProfileContext";

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <UserProfileProvider>
        <div className="flex max-w-7xl mx-auto">
          <UserAsideNav />
          <main className="flex-1 p-8 bg-surface">{children}</main>
        </div>
      </UserProfileProvider>
    </div>
  );
}
