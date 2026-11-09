import Link from "next/link";
import type { PublicTaxonomyItem } from "@/features/places/server/browse";

export function PublicPlaceFilters({
  categories,
  cities,
  fixedCategory,
  fixedCity,
  input,
  pathname,
}: {
  categories: PublicTaxonomyItem[];
  cities: PublicTaxonomyItem[];
  fixedCategory?: string;
  fixedCity?: string;
  input: {
    category: string;
    city: string;
    q: string;
    rating?: number;
    sort: string;
    type: string;
  };
  pathname: string;
}) {
  return (
    <form className="public-filters">
      <div className="form-field public-filters__search">
        <label htmlFor="public-search">Search public places</label>
        <input
          defaultValue={input.q}
          id="public-search"
          name="q"
          placeholder="Name, summary, city, or category"
          type="search"
        />
      </div>
      {!fixedCity ? (
        <div className="form-field">
          <label htmlFor="public-city">City</label>
          <select defaultValue={input.city} id="public-city" name="city">
            <option value="">All cities</option>
            {cities.map((city) => (
              <option key={city.id} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {!fixedCategory ? (
        <div className="form-field">
          <label htmlFor="public-category">Category</label>
          <select
            defaultValue={input.category}
            id="public-category"
            name="category"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="form-field">
        <label htmlFor="public-type">Type or cuisine</label>
        <input defaultValue={input.type} id="public-type" name="type" />
      </div>
      <div className="form-field">
        <label htmlFor="public-rating">Minimum rating</label>
        <select
          defaultValue={input.rating ?? ""}
          id="public-rating"
          name="rating"
        >
          <option value="">Any rating</option>
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value}+ stars
            </option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="public-sort">Sort</label>
        <select defaultValue={input.sort} id="public-sort" name="sort">
          <option value="recent">Recently published</option>
          <option value="name">Name</option>
          <option value="rating">Rating</option>
        </select>
      </div>
      {fixedCity ? <input name="city" type="hidden" value={fixedCity} /> : null}
      {fixedCategory ? (
        <input name="category" type="hidden" value={fixedCategory} />
      ) : null}
      <div className="public-filters__actions">
        <button className="button-primary" type="submit">
          Apply filters
        </button>
        <Link className="button-secondary" href={pathname}>
          Clear filters
        </Link>
      </div>
    </form>
  );
}
