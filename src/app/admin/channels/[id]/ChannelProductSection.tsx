"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";

interface ChannelProductData {
  satsrail_product_id: string;
  name: string;
  price_cents: number;
  currency: string;
  status: string;
  encrypted_media_count: number;
}

interface ChannelProductSectionProps {
  channelId: string;
  products: ChannelProductData[];
  currency: string;
  mediaCount: number;
}

export default function ChannelProductSection({
  channelId,
  products,
  currency,
  mediaCount,
}: ChannelProductSectionProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [accessDuration, setAccessDuration] = useState(2592000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/admin/channels/${channelId}/create-product`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            price_cents: Math.round(parseFloat(price) * 100),
            currency,
            access_duration_seconds: accessDuration,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to create channel product");
        return;
      }
      setShowModal(false);
      setName("");
      setPrice("");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(cents: number, cur: string) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
    }).format(cents / 100);
  }

  return (
    <>
      <div className="mb-6 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)]">
        <div className="flex items-center justify-between border-b border-[var(--theme-border)] px-4 py-3">
          <h2 className="text-lg font-semibold">
            Channel Products ({products.length})
          </h2>
          <Button size="sm" onClick={() => setShowModal(true)}>
            Create Channel Product
          </Button>
        </div>

        {products.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-[var(--theme-bg-secondary)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--theme-text-secondary)]">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--theme-text-secondary)]">
                  Price
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--theme-text-secondary)]">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--theme-text-secondary)]">
                  Encrypted Media
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--theme-border)]">
              {products.map((p) => (
                <tr
                  key={p.satsrail_product_id}
                  className="hover:bg-[var(--theme-bg-secondary)]"
                >
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">
                    {formatPrice(p.price_cents, p.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      color={p.status === "active" ? "green" : "red"}
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[var(--theme-text-secondary)]">
                    {p.encrypted_media_count} / {mediaCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-[var(--theme-text-secondary)]">
            No channel-level products yet. Create one to grant access to all
            media in this channel.
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create Channel Product"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <p className="text-sm text-[var(--theme-text-secondary)]">
            This product will encrypt all {mediaCount} media item(s) in
            this channel. Buyers get access to every media item.
          </p>
          <Input
            label="Product Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label={`Price (${currency.toUpperCase()})`}
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            min={0.01}
            step="0.01"
          />
          <Select
            label="Access Duration"
            value={String(accessDuration)}
            onChange={(e) => setAccessDuration(parseInt(e.target.value))}
            options={[
              { value: "86400", label: "1 day" },
              { value: "604800", label: "7 days" },
              { value: "2592000", label: "30 days" },
              { value: "7776000", label: "90 days" },
              { value: "31536000", label: "1 year" },
              { value: "0", label: "Lifetime" },
            ]}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Product
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
