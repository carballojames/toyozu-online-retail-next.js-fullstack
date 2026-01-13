"use client";

import type { RefObject, ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import UsersTable, { type AdminUserRow } from "./tables/UsersTable";

export default function UserPage({
  userSearchInputRef,
  userQuery,
  onUserQueryChange,
  isUsersLoading,
  usersError,
  users,
  onSearch,
  onReset,
  onRowClick,
}: {
  userSearchInputRef?: RefObject<HTMLInputElement | null>;
  userQuery: string;
  onUserQueryChange: (next: string) => void;
  isUsersLoading: boolean;
  usersError: string;
  users: AdminUserRow[];
  onSearch: () => void;
  onReset: () => void;
  onRowClick: (userId: number) => void;
}): ReactElement {
  return (
    <>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">Search and edit users</p>
        </div>
      </div>


      {usersError ? (
        <div className="bg-surface border border-border rounded-xl p-4 text-sm text-destructive">
          {usersError}
        </div>
      ) : null}

      <div className="bg-surface border border-border rounded-xl p-4">
         <div className="bg-surface flex flex-col md:flex-row gap-3 items-stretch md:items-end mb-4">
            <div className="flex-1 space-y-2">
              <Input
                ref={userSearchInputRef}
                value={userQuery}
                onChange={(e) => onUserQueryChange(e.target.value)}
                placeholder="Search by username, name, or email"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={onSearch} disabled={isUsersLoading}>
                Search
              </Button>
              <Button variant="outline" onClick={onReset} disabled={isUsersLoading}>
                Reset
              </Button>
            </div>
          </div>
        {isUsersLoading ? (
          <div className="text-sm text-muted-foreground">Loading users…</div>
        ) : (
          <UsersTable users={users} onRowClick={onRowClick} />
        )}
      </div>
    </>
  );
}
