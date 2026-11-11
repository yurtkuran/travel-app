"use client";

import { useUnsavedChanges } from "@/components/forms/use-unsaved-changes";
import type { ManagedPlace } from "@/features/places/server/management";
import type {
  CategoryListItem,
  CityListItem,
} from "@/features/taxonomy/server/taxonomy";
export function PlaceForm({
  action,
  categories,
  cities,
  place,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  categories: CategoryListItem[];
  cities: CityListItem[];
  place?: ManagedPlace;
  submitLabel: string;
}) {
  const { formProps } = useUnsavedChanges();

  return (
    <form action={action} className="taxonomy-form" {...formProps}>
      <input name="placeId" type="hidden" value={place?.id} />
      <div className="form-grid form-grid--two">
        <div className="form-field">
          <label htmlFor="place-name">Place name</label>
          <input
            id="place-name"
            maxLength={160}
            name="name"
            required
            defaultValue={place?.name}
          />
        </div>
        <div className="form-field">
          <label htmlFor="place-type">Type or cuisine</label>
          <input
            id="place-type"
            maxLength={120}
            name="typeLabel"
            defaultValue={place?.typeLabel ?? ""}
          />
        </div>
        <div className="form-field">
          <label htmlFor="place-city">City</label>
          <select
            id="place-city"
            name="cityId"
            required
            defaultValue={place?.cityId ?? ""}
          >
            <option disabled value="">
              Select city
            </option>
            {cities
              .filter(({ isActive }) => isActive)
              .map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                  {city.region ? `, ${city.region}` : ""}, {city.country}
                </option>
              ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="place-category">Category</label>
          <select
            id="place-category"
            name="categoryId"
            required
            defaultValue={place?.categoryId ?? ""}
          >
            <option disabled value="">
              Select category
            </option>
            {categories
              .filter(({ isActive }) => isActive)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
        </div>
        <div className="form-field form-field--wide">
          <label htmlFor="place-summary">Short summary</label>
          <textarea
            id="place-summary"
            maxLength={500}
            name="shortSummary"
            rows={3}
            defaultValue={place?.shortSummary ?? ""}
          />
        </div>
        <div className="form-field form-field--wide">
          <label htmlFor="place-description">Description</label>
          <textarea
            id="place-description"
            maxLength={5000}
            name="description"
            rows={7}
            defaultValue={place?.description ?? ""}
          />
        </div>
        <div className="form-field">
          <label htmlFor="place-address">Street address</label>
          <input
            id="place-address"
            maxLength={200}
            name="streetAddress"
            defaultValue={place?.streetAddress ?? ""}
          />
        </div>
        <div className="form-field">
          <label htmlFor="place-address-two">Address line 2</label>
          <input
            id="place-address-two"
            maxLength={120}
            name="addressLine2"
            defaultValue={place?.addressLine2 ?? ""}
          />
        </div>
        <div className="form-field">
          <label htmlFor="place-postal">Postal code</label>
          <input
            id="place-postal"
            maxLength={32}
            name="postalCode"
            defaultValue={place?.postalCode ?? ""}
          />
        </div>
        <div className="form-field">
          <label htmlFor="place-phone">Phone</label>
          <input
            id="place-phone"
            maxLength={50}
            name="phone"
            defaultValue={place?.phone ?? ""}
          />
        </div>
        <div className="form-field">
          <label htmlFor="place-latitude">Latitude</label>
          <input
            id="place-latitude"
            max={90}
            min={-90}
            name="latitude"
            step="any"
            type="number"
            defaultValue={place?.latitude ?? ""}
          />
        </div>
        <div className="form-field">
          <label htmlFor="place-longitude">Longitude</label>
          <input
            id="place-longitude"
            max={180}
            min={-180}
            name="longitude"
            step="any"
            type="number"
            defaultValue={place?.longitude ?? ""}
          />
          <small>Supply both coordinates or leave both blank.</small>
        </div>
        <div className="form-field">
          <label htmlFor="place-website">Official website</label>
          <input
            id="place-website"
            maxLength={2048}
            name="officialWebsite"
            placeholder="https://example.com"
            type="url"
            defaultValue={place?.officialWebsite ?? ""}
          />
        </div>
        <div className="form-field">
          <label htmlFor="place-map-listing">Map listing</label>
          <input
            id="place-map-listing"
            maxLength={2048}
            name="mapListing"
            placeholder="https://maps.example.com/place"
            type="url"
            defaultValue={place?.mapListing ?? ""}
          />
          <small>Links must use public HTTPS URLs.</small>
        </div>
      </div>
      <div className="taxonomy-form__actions">
        <button className="button-primary" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
