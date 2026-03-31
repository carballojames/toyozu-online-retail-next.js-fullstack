"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type AdminUserRow = {
  user_id: number;
  user_name: string;
  username: string;
  email: string | null;
  mobile_phone: string | null;
  role_id: number;
  is_superuser: boolean | null;
  contact_type: string | null;
};

type Props = {
  users: AdminUserRow[];
  isLoading?: boolean;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onRowClick: (userId: number) => void;
};

function roleLabel(roleId: number): string {
  if (roleId === 1) return "Admin";
  if (roleId === 2) return "Manager";
  if (roleId === 3) return "Employee";
  if (roleId === 4) return "Customer";
  return String(roleId);
}

export default function UsersTable({
  users,
  isLoading = false,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  onPageChange,
  onRowClick,
}: Props) {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow
              key={u.user_id}
              className="cursor-pointer"
              onClick={() => onRowClick(u.user_id)}
            >
              <TableCell className="font-medium">{u.user_id}</TableCell>
              <TableCell>{u.user_name}</TableCell>
              <TableCell>{u.username}</TableCell>
              <TableCell>{u.email ?? ""}</TableCell>
              <TableCell>{u.mobile_phone ?? ""}</TableCell>
              <TableCell>{roleLabel(u.role_id)}</TableCell>
            </TableRow>
          ))}
          {!isLoading && users.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No users found.
              </TableCell>
            </TableRow>
          )}
          {isLoading && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Loading users...
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {Math.max(1, totalPages)}
          {totalItems > 0 ? ` • ${totalItems} users` : ""}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage <= 1 || isLoading}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= totalPages || isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
