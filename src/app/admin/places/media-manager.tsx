import Image from "next/image";

import { FormConfirmationDialog } from "@/components/ui/form-confirmation-dialog";
import { mediaPolicy } from "@/features/media/policy";
import { thumbnailUrl, type MediaItem } from "@/features/media/server/media";

import {
  deleteMediaAction,
  moveMediaAction,
  replaceMediaAction,
  uploadMediaAction,
} from "./actions";

export function MediaManager({
  items,
  placeId,
}: {
  items: MediaItem[];
  placeId: string;
}) {
  return (
    <section className="media-manager">
      <div>
        <p className="eyebrow">
          Curated imagery · {items.length}/{mediaPolicy.maximumImagesPerPlace}
        </p>
        <h2>Place images</h2>
        <p>
          JPEG, PNG, or WebP up to 10 MB. The first image is the public cover.
        </p>
      </div>
      {items.length ? (
        <div className="media-grid">
          {items.map((item, index) => (
            <article className="media-card" key={item.id}>
              <Image
                alt={item.altText ?? ""}
                height={240}
                src={thumbnailUrl(item.storageKey)}
                unoptimized
                width={240}
              />
              <div>
                <strong>
                  {index === 0 ? "Cover image" : `Image ${index + 1}`}
                </strong>
                {item.caption ? <p>{item.caption}</p> : null}
                <p>{item.isDecorative ? "Decorative" : item.altText}</p>
              </div>
              <div className="table-actions">
                <form action={moveMediaAction}>
                  <input name="placeId" type="hidden" value={placeId} />
                  <input name="mediaId" type="hidden" value={item.id} />
                  <input name="direction" type="hidden" value="earlier" />
                  <button
                    className="button-secondary"
                    disabled={index === 0}
                    type="submit"
                  >
                    Earlier
                  </button>
                </form>
                <form action={moveMediaAction}>
                  <input name="placeId" type="hidden" value={placeId} />
                  <input name="mediaId" type="hidden" value={item.id} />
                  <input name="direction" type="hidden" value="later" />
                  <button
                    className="button-secondary"
                    disabled={index === items.length - 1}
                    type="submit"
                  >
                    Later
                  </button>
                </form>
                <FormConfirmationDialog
                  action={deleteMediaAction}
                  confirmLabel="Remove image"
                  description="This permanently removes the optimized image files and their metadata from the place."
                  fields={{ mediaId: item.id, placeId }}
                  title={`Remove ${index === 0 ? "the cover image" : `image ${index + 1}`}?`}
                  triggerLabel="Remove"
                />
              </div>
              <form action={replaceMediaAction}>
                <input name="placeId" type="hidden" value={placeId} />
                <input name="mediaId" type="hidden" value={item.id} />
                <label>
                  Replace image
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    name="replacement"
                    required
                    type="file"
                  />
                </label>
                <button className="button-secondary" type="submit">
                  Replace
                </button>
              </form>
            </article>
          ))}
        </div>
      ) : (
        <p>No images have been added.</p>
      )}
      <form action={uploadMediaAction} className="taxonomy-form">
        <input name="placeId" type="hidden" value={placeId} />
        <div className="form-grid form-grid--two">
          <div className="form-field">
            <label htmlFor="media-image">Image</label>
            <input
              accept="image/jpeg,image/png,image/webp"
              id="media-image"
              name="image"
              required
              type="file"
            />
          </div>
          <div className="form-field">
            <label htmlFor="media-caption">Caption (optional)</label>
            <input id="media-caption" maxLength={500} name="caption" />
          </div>
          <div className="form-field form-field--wide">
            <label htmlFor="media-alt">Alternative text</label>
            <input id="media-alt" maxLength={500} name="altText" />
            <label className="checkbox-field">
              <input name="isDecorative" type="checkbox" />
              This image is decorative
            </label>
          </div>
        </div>
        <div className="taxonomy-form__actions">
          <button className="button-primary" type="submit">
            Upload image
          </button>
        </div>
      </form>
    </section>
  );
}
