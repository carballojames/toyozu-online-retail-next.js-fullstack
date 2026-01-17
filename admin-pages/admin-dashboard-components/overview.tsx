"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DashboardRange = "today" | "7d" | "30d" | "all";
const DASHBOARD_RANGES = ["today", "7d", "30d", "all"] as const;

type RecentSort = "date" | "total" | "status";
const RECENT_SORTS = ["date", "total", "status"] as const;

function isDashboardRange(value: string): value is DashboardRange {
  return (DASHBOARD_RANGES as readonly string[]).includes(value);
}

function isRecentSort(value: string): value is RecentSort {
  return (RECENT_SORTS as readonly string[]).includes(value);
}

type DashboardResponse = {
  data?: {
    range: DashboardRange;
    totals: { totalSales: number; totalSupply: number; revenue: number };
    statusCounts: Array<{ statusId: number | null; status: string; count: number }>;
    recentOrders: Array<{ id: string; date: string; customerName: string; status: string; total: number }>;
    topCustomers: Array<{ userId: number; name: string; orders: number; total: number }>;
    delivered: { day: string; count: number };
  };
  error?: string;
};

function formatPhp(value: number): string {
  return `₱${Number(value ?? 0).toLocaleString()}`;
}

export default function OverviewPage() {
  const [range, setRange] = useState<DashboardRange>("7d");
  const [deliveredDay, setDeliveredDay] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [data, setData] = useState<DashboardResponse["data"]>(undefined);

  const [recentSort, setRecentSort] = useState<RecentSort>("date");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      qs.set("range", range);
      if (deliveredDay) qs.set("deliveredDay", deliveredDay);
      const res = await fetch(`/api/admin/dashboard?${qs.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const json = (await res.json()) as DashboardResponse;
      if (!res.ok || !json.data) {
        setData(undefined);
        setError(json.error || "Failed to load dashboard");
        return;
      }
      setData(json.data);
    } catch (e) {
      setData(undefined);
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, deliveredDay]);

  const recentOrders = useMemo(() => {
    const rows = data?.recentOrders ? [...data.recentOrders] : [];
    if (recentSort === "total") return rows.sort((a, b) => b.total - a.total);
    if (recentSort === "status") return rows.sort((a, b) => a.status.localeCompare(b.status));
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [data?.recentOrders, recentSort]);

  const statusCounts = data?.statusCounts ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Overall Dashboard</h1>
          <p className="text-sm text-muted-foreground">Sales, supply, and order tracking</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={range}
            onValueChange={(v) => {
              if (isDashboardRange(v)) setRange(v);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground whitespace-nowrap">Delivered day</div>
            <Input
              type="date"
              value={deliveredDay}
              onChange={(e) => setDeliveredDay(e.target.value)}
              className="w-[160px]"
            />
          </div>

          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Sales</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatPhp(data?.totals.totalSales ?? 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Supply</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatPhp(data?.totals.totalSupply ?? 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Revenue</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatPhp(data?.totals.revenue ?? 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Delivered (selected day)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data?.delivered.count ?? 0}</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pending / Status Counts</CardTitle>
          </CardHeader>
          <CardContent>
            {statusCounts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No data yet.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {statusCounts.map((s) => (
                  <Badge key={s.status} variant={s.status === "Delivered" ? "secondary" : "default"}>
                    {s.status}: {s.count}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Top Customers</CardTitle>
            <div className="text-xs text-muted-foreground">by orders ({data?.range ?? range})</div>
          </CardHeader>
          <CardContent>
            {(!data?.topCustomers || data.topCustomers.length === 0) ? (
              <div className="text-sm text-muted-foreground">No customers found.</div>
            ) : (
              <div className="space-y-2">
                {data.topCustomers.map((c) => (
                  <div key={c.userId} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0 truncate text-foreground">{c.name}</div>
                    <div className="whitespace-nowrap text-muted-foreground">{c.orders} orders</div>
                    <div className="whitespace-nowrap font-medium text-foreground">{formatPhp(c.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Recent Orders (10)</CardTitle>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">Sort</div>
            <Select
              value={recentSort}
              onValueChange={(v) => {
                if (isRecentSort(v)) setRecentSort(v);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="total">Total</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.date || "—"}</TableCell>
                    <TableCell>{o.customerName || "—"}</TableCell>
                    <TableCell>{o.status}</TableCell>
                    <TableCell className="text-right">{formatPhp(o.total)}</TableCell>
                  </TableRow>
                ))}
                {recentOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                      {loading ? "Loading…" : "No recent orders."}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
