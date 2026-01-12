"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import Logo from "@/assets/toyozu-logo.png";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
	onSearchClick?: () => void;
};

function roleLabel(roleId: number | null): string {
	if (roleId === 1) return "Admin";
	if (roleId === 2) return "Manager";
	if (roleId === 3) return "Employee";
	if (roleId === 4) return "Customer";
	if (roleId === 0) return "Superuser";
	return "User";
}

export default function AdminHeader({ onSearchClick }: Props) {
	const router = useRouter();
	const [username, setUsername] = useState<string>("");
	const [roleId, setRoleId] = useState<number | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			setUsername(localStorage.getItem("username") ?? "");
			const rawRole = localStorage.getItem("role_id");
			const parsed = rawRole ? Number(rawRole) : NaN;
			setRoleId(Number.isFinite(parsed) ? parsed : null);
		} catch {
			setUsername("");
			setRoleId(null);
		}
	}, []);

	const profileText = useMemo(() => {
		const label = roleLabel(roleId);
		const name = username.trim() ? username.trim() : "Unknown";
		return `${label}: ${name}`;
	}, [roleId, username]);

	return (
		<header className="sticky top-0 z-50 w-full bg-background border-b border-border">
			<div className="h-16 px-6 flex items-center justify-between">
				<button
					type="button"
					className="flex items-center gap-3"
					onClick={() => router.push("/")}
					aria-label="Go to home"
				>
					<Image src={Logo} alt="Toyozu Logo" width={44} height={44} priority />
					<span className="font-semibold text-foreground hidden sm:inline">Admin</span>
				</button>

				<div className="flex items-center gap-3">
					<Badge variant="secondary" className="max-w-[260px] truncate">
						{profileText}
					</Badge>

					<Button
						type="button"
						variant="outline"
						onClick={() => onSearchClick?.()}
						aria-label="Search users"
					>
						<Search className="h-4 w-4" />
						<span className="ml-2 hidden sm:inline">Search</span>
					</Button>
				</div>
			</div>
		</header>
	);
}
