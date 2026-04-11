"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ImageUpload from "@/components/ui/ImageUpload";
import { useLocale } from "@/i18n/useLocale";

interface CategoryOption {
  _id: string;
  name: string;
}

interface ChannelFormProps {
  categories: CategoryOption[];
  nsfwEnabled: boolean;
  initialData?: {
    _id: string;
    name: string;
    slug: string;
    bio: string;
    category_id: string | null;
    nsfw: boolean;
    profile_image_url: string;
    profile_image_id: string;
    social_links: Record<string, string>;
    active: boolean;
  };
}

export default function ChannelForm({
  categories,
  nsfwEnabled,
  initialData,
}: ChannelFormProps) {
  const router = useRouter();
  const { t } = useLocale();
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [slugTouched, setSlugTouched] = useState(!!initialData?.slug);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  }, [name, slugTouched]);
  const [bio, setBio] = useState(initialData?.bio || "");
  const [categoryId, setCategoryId] = useState(initialData?.category_id || "");
  const [nsfw, setNsfw] = useState(initialData?.nsfw || false);
  const [profileImageUrl] = useState(initialData?.profile_image_url || "");
  const [profileImageId, setProfileImageId] = useState(initialData?.profile_image_id || "");
  const [active, setActive] = useState(initialData?.active ?? true);

  // Social links
  const [youtube, setYoutube] = useState(initialData?.social_links?.youtube || "");
  const [twitter, setTwitter] = useState(initialData?.social_links?.twitter || "");
  const [discord, setDiscord] = useState(initialData?.social_links?.discord || "");
  const [instagram, setInstagram] = useState(initialData?.social_links?.instagram || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload: Record<string, unknown> = {
      name,
      bio,
      category_id: categoryId || null,
      nsfw,
      profile_image_url: profileImageUrl,
      profile_image_id: profileImageId,
      social_links: { youtube, twitter, discord, instagram },
      ...(slug ? { slug } : {}),
      active,
    };

    const url = isEditing
      ? `/api/admin/channels/${initialData._id}`
      : "/api/admin/channels";
    const method = isEditing ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json.issues?.length
          ? json.issues.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`).join(", ")
          : json.error || t("admin.channels.save_failed");
        setError(msg);
        return;
      }
      router.push("/admin/channels");
      router.refresh();
    } catch {
      setError(t("admin.channels.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <Input label={t("admin.channels.name")} value={name} onChange={(e) => setName(e.target.value)} required />
      <Input label={t("admin.channels.slug")} value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} helperText={t("admin.channels.slug_hint")} />
      <div className="space-y-1">
        <label className="block text-sm font-medium text-[var(--theme-text)]">{t("admin.channels.bio")}</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="block w-full rounded-md border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-sm text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
        />
      </div>
      <Select
        label={t("admin.channels.category")}
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        placeholder={t("admin.channels.select_category")}
        options={categories.map((c) => ({ value: c._id, label: c.name }))}
      />
      <ImageUpload
        context="channel_profile"
        currentImageId={profileImageId}
        currentImageUrl={profileImageUrl}
        onUpload={(id) => setProfileImageId(id)}
        label={t("admin.channels.profile_image")}
      />

      <div className="border-t border-[var(--theme-border)] pt-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--theme-text)]">{t("admin.channels.social_links")}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t("admin.channels.youtube")} value={youtube} onChange={(e) => setYoutube(e.target.value)} />
          <Input label={t("admin.channels.twitter")} value={twitter} onChange={(e) => setTwitter(e.target.value)} />
          <Input label={t("admin.channels.discord")} value={discord} onChange={(e) => setDiscord(e.target.value)} />
          <Input label={t("admin.channels.instagram")} value={instagram} onChange={(e) => setInstagram(e.target.value)} />
        </div>
      </div>

      {nsfwEnabled && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={nsfw} onChange={(e) => setNsfw(e.target.checked)} className="rounded border-[var(--theme-border)]" />
          {t("admin.channels.nsfw")}
        </label>
      )}

      {isEditing && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded border-[var(--theme-border)]" />
          {t("admin.channels.active")}
        </label>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" loading={loading}>
          {isEditing ? t("admin.channels.update") : t("admin.channels.create")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          {t("admin.channels.cancel")}
        </Button>
      </div>
    </form>
  );
}
