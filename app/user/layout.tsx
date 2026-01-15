import type { ReactNode } from "react";

import Header from "../common/Header";
import UserAsideNav from "./_components/UserAsideNav";
import { UserProfileProvider } from "./_components/UserProfileContext";

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-primary-foreground ">
      <Header />
      <div className="flex max-w-7xl mx-auto">
        <UserAsideNav />
        <UserProfileProvider>
          <main className="flex-1 p-8 bg-primary-foreground">{children}</main>
        </UserProfileProvider>
      </div>
    </div>
  );
}
