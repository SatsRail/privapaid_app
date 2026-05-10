import type { MediaPageData } from "@/app/c/[slug]/[mediaId]/types";
import MediaBreadcrumb from "@/components/MediaBreadcrumb";
import MediaHeader from "@/components/MediaHeader";
import UnavailableWall from "@/components/UnavailableWall";
import PaymentWall from "@/components/PaymentWall";
import PreviewGallery from "@/components/PreviewGallery";
import CommentSection from "@/components/CommentSection";
import ErrorBoundary from "@/components/ErrorBoundary";
import AdminPreviewBanner from "@/components/AdminPreviewBanner";
import AdminPreviewContent from "@/components/AdminPreviewContent";

export default function PhotoSetLayout({
  media,
  channel,
  products,
  storedProductIds,
  previewImages,
  thumbSrc,
  locale,
  instanceConfig,
  adminPreviewSourceUrl,
}: MediaPageData) {
  const hasPreview = previewImages.length > 0;
  const previewLocked = products.length > 0 && !adminPreviewSourceUrl;

  const viewerContent = adminPreviewSourceUrl ? (
    <>
      <AdminPreviewBanner mediaName={media.name} />
      <AdminPreviewContent mediaId={media._id} mediaType={media.media_type} />
    </>
  ) : products.length > 0 ? (
    <ErrorBoundary>
      <PaymentWall
        mediaId={media._id}
        products={products}
        storedProductIds={storedProductIds}
        thumbnailUrl={thumbSrc}
        mediaType={media.media_type}
        merchantLogo={instanceConfig.theme.logo}
        merchantName={instanceConfig.name}
      />
    </ErrorBoundary>
  ) : (
    <UnavailableWall variant="card" mediaName={media.name} locale={locale} />
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <MediaBreadcrumb
        channelName={channel.name}
        channelSlug={channel.slug}
        mediaName={media.name}
        locale={locale}
      />

      <MediaHeader
        name={media.name}
        products={products}
        viewsCount={media.views_count}
        commentsCount={media.comments_count}
        locale={locale}
      />

      {/* Viewer area — full width */}
      {viewerContent}

      {/* Preview tiles */}
      {hasPreview && (
        <div className="mt-6">
          <PreviewGallery images={previewImages} locked={previewLocked} compact />
        </div>
      )}

      {/* Description */}
      {media.description && (
        <p className="mt-4" style={{ color: "var(--theme-text)" }}>{media.description}</p>
      )}

      {/* Comments */}
      <ErrorBoundary>
        <CommentSection
          mediaId={media._id}
          productIds={products.map((p) => p.productId)}
          storedProductIds={storedProductIds}
        />
      </ErrorBoundary>
    </div>
  );
}
