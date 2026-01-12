import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { AdminProduct } from "../../admin-dashboard.types";
import { formatPhp } from "../../admin-dashboard.utils";

type Props = {
  products: AdminProduct[];
  onEdit: (productId: string) => void;
  emptyMessage?: string;
};

export default function ProductsTable({
  products,
  onEdit,
  emptyMessage = "No products found.",
}: Props) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.id}</TableCell>
              <TableCell>{p.name}</TableCell>
              <TableCell>{p.brand}</TableCell>
              <TableCell>{p.category}</TableCell>
              <TableCell className="text-right">{formatPhp(p.price)}</TableCell>
              <TableCell className="text-right">
                <Badge variant={p.stock <= 5 ? "destructive" : "secondary"}>{p.stock}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" onClick={() => onEdit(p.id)}>
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {products.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
