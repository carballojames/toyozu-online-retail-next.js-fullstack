"use client";

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
  onRowClick: (userId: number) => void;
};

function roleLabel(roleId: number): string {
  if (roleId === 1) return "Admin";
  if (roleId === 2) return "Manager";
  if (roleId === 3) return "Employee";
  if (roleId === 4) return "Customer";
  return String(roleId);
}

export default function UsersTable({ users, onRowClick }: Props) {
  return (
    <div className="">
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
        </TableBody>
      </Table>
    </div>
  );
}
