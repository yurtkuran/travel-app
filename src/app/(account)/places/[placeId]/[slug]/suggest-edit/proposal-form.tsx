import { createProposalAction } from "./actions";

interface PlaceValues {
  addressLine2: string | null;
  categoryId: string;
  cityId: string;
  description: string | null;
  id: string;
  name: string;
  phone: string | null;
  postalCode: string | null;
  shortSummary: string | null;
  slug: string;
  streetAddress: string | null;
  typeLabel: string | null;
}

export function ProposalForm({
  categories,
  cities,
  place,
}: {
  categories: { id: string; label: string }[];
  cities: { id: string; label: string }[];
  place: PlaceValues;
}) {
  return (
    <form action={createProposalAction} className="submission-form">
      <input name="placeId" type="hidden" value={place.id} />
      <input name="slug" type="hidden" value={place.slug} />
      <fieldset className="form-section">
        <legend>
          <span className="eyebrow">Proposed public record</span>
          <strong>Edit the fields that should change</strong>
        </legend>
        <p className="form-section__description">
          The published place remains unchanged until an administrator approves
          this complete proposed snapshot.
        </p>
        <div className="form-grid form-grid--two">
          <div className="form-field form-grid__wide">
            <label htmlFor="proposal-name">Place name</label>
            <input
              defaultValue={place.name}
              id="proposal-name"
              maxLength={160}
              name="name"
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="proposal-city">City</label>
            <select
              defaultValue={place.cityId}
              id="proposal-city"
              name="cityId"
              required
            >
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="proposal-category">Category</label>
            <select
              defaultValue={place.categoryId}
              id="proposal-category"
              name="categoryId"
              required
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="proposal-type">Type or cuisine</label>
            <input
              defaultValue={place.typeLabel ?? ""}
              id="proposal-type"
              maxLength={120}
              name="typeLabel"
            />
          </div>
          <div className="form-field">
            <label htmlFor="proposal-phone">Phone number</label>
            <input
              defaultValue={place.phone ?? ""}
              id="proposal-phone"
              maxLength={50}
              name="phone"
              type="tel"
            />
          </div>
          <div className="form-field form-grid__wide">
            <label htmlFor="proposal-summary">Short summary</label>
            <textarea
              defaultValue={place.shortSummary ?? ""}
              id="proposal-summary"
              maxLength={500}
              name="shortSummary"
              rows={2}
            />
          </div>
          <div className="form-field form-grid__wide">
            <label htmlFor="proposal-description">Description</label>
            <textarea
              defaultValue={place.description ?? ""}
              id="proposal-description"
              maxLength={5000}
              name="description"
              rows={5}
            />
          </div>
          <div className="form-field form-grid__wide">
            <label htmlFor="proposal-street">Street address</label>
            <input
              defaultValue={place.streetAddress ?? ""}
              id="proposal-street"
              maxLength={200}
              name="streetAddress"
            />
          </div>
          <div className="form-field">
            <label htmlFor="proposal-address-two">Address line 2</label>
            <input
              defaultValue={place.addressLine2 ?? ""}
              id="proposal-address-two"
              maxLength={120}
              name="addressLine2"
            />
          </div>
          <div className="form-field">
            <label htmlFor="proposal-postal">Postal code</label>
            <input
              defaultValue={place.postalCode ?? ""}
              id="proposal-postal"
              maxLength={32}
              name="postalCode"
            />
          </div>
          <div className="form-field form-grid__wide">
            <label htmlFor="proposal-notes">Notes for the administrator</label>
            <textarea
              id="proposal-notes"
              maxLength={5000}
              name="submitterNotes"
              rows={4}
            />
            <p className="field-help">
              Private to you and administrators; never added to the public
              place.
            </p>
          </div>
        </div>
      </fieldset>
      <div className="submission-form__actions">
        <p>Submitting creates an immutable review record of these values.</p>
        <button className="button-primary" type="submit">
          Submit proposed edit
        </button>
      </div>
    </form>
  );
}
