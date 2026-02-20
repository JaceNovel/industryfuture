"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";
import type { Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye } from "lucide-react";

type OrdersResponse = { data: Array<Order & { user?: { email: string } }> };

export default function AdminOrdersPage() {
  const qc = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => apiGet<OrdersResponse>("/api/admin/orders"),
  });

  const updateOrder = useMutation({
    mutationFn: ({ id, status, tag_delivery }: { id: number; status?: string; tag_delivery?: string }) =>
      apiPatch(`/api/admin/orders/${id}`, { status, tag_delivery }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Commandes</h1>
      <p className="mt-1 text-sm text-muted-foreground">Cliquez sur l’œil pour voir le détail de la commande.</p>

      <Card className="mt-6 bg-card/40 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Liste</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersQuery.isError ? (
            <div className="text-sm text-destructive">{(ordersQuery.error as Error).message}</div>
          ) : null}

          <div className="overflow-x-auto">
          <Table className="min-w-[780px]">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tag livraison</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ordersQuery.data?.data ?? []).map((o) => (
                <TableRow key={o.id}>
                  <TableCell>{o.id}</TableCell>
                  <TableCell>
                    <div className="grid gap-2">
                      <Label className="text-xs text-muted-foreground">status</Label>
                      <Input
                        defaultValue={o.status}
                        onBlur={(e) => updateOrder.mutate({ id: o.id, status: e.target.value })}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      defaultValue={o.tag_delivery}
                      onChange={(e) => updateOrder.mutate({ id: o.id, tag_delivery: e.target.value })}
                    >
                      <option value="PRET_A_ETRE_LIVRE">PRET_A_ETRE_LIVRE</option>
                      <option value="SUR_COMMANDE">SUR_COMMANDE</option>
                    </select>
                  </TableCell>
                  <TableCell>{Number(o.total ?? 0).toFixed(2)} €</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => updateOrder.mutate({ id: o.id, status: o.status })}>
                        Sauver
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/orders/${o.id}`} aria-label="Voir détail commande">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
