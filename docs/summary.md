## Executive summary

This is a personal travel-recommendation and travel-journal application, with a strong emphasis on restaurants and food. It lets visitors browse recommendations by city and category, see ratings and notes, follow website and map links, and view attached photographs. A password-protected administration area lets the owner maintain cities, recommendations, ratings, notes, and images.

The heart of the application is not the frames, tables, or PHP pages—it is the curated collection of personal knowledge:

- Places worth visiting
- Why they are recommended
- Overall and restaurant-specific ratings
- Addresses, phone numbers, websites, and map links
- How the place was discovered
- When it was last visited
- Personal photographs and scanned material

That remains a good and coherent product idea. The clean-sheet application should preserve this curated, personal character while replacing the implementation with a responsive, searchable, secure web application.

My recommendation is a small modular monolith rather than separate frontend and backend services:

- Language: TypeScript
- Frontend: React with Next.js App Router
- Backend: Next.js server-side TypeScript using Server Actions and Route Handlers
- Database: PostgreSQL
- Database access: Drizzle ORM with versioned migrations
- Images: S3-compatible object storage, with image metadata in PostgreSQL
- Authentication: A proven authentication library using secure cookie sessions and modern password hashing

This keeps one language and one deployable application while still providing clean separation between the UI, domain logic, data access, and infrastructure.

## More thorough application summary

### Public experience

The primary public interface is a two-frame layout:

- A city/category tree on the left
- A results area on the right

The navigation tree is constructed from ey_cities and the categories currently represented in ey_travel. It is then written into a shared JavaScript file on every request. See travel-tree.php (travel-tree.php:8).

After selecting a city and category, the visitor gets one of two views:

- Condensed: Tabular display containing the name, cuisine/type, phone, address, rating, and a details icon.
- Verbose: More descriptive two-column output including notes, discovery source, and last visit.

The listing can be sorted by name, cuisine, or rating. This behavior is concentrated in travel.php (travel.php:40) and functions_travel.php (functions_travel.php:114).

Each recommendation can contain:

- City
- Category
- Name
- Two address lines and ZIP code
- A flag indicating whether a map link should be offered
- Telephone number
- External website
- Cuisine or place type
- Where the recommendation was learned about
- Last-visit text
- Free-form personal notes
- Overall rating
- Food, service, and atmosphere ratings
- Zero or more images

The detail view presents the full recommendation and a thumbnail gallery. Selecting a thumbnail opens the original image. See travel-display.php (travel-display.php:9).

There is also an early compact/mobile experiment that presents the same data as a minimal text list. See travel-micro03.php (travel-micro03.php:5).

### Administrative experience

The administration area supports:

- Username/password login
- Filtering by city and category
- Sorting recommendations
- Adding recommendations
- Editing recommendations
- Deleting recommendations
- Adding and deleting cities
- Uploading up to four JPEGs at a time
- Viewing attached images
- Logging out

The central admin table is in travel-admin.php (travel-admin.php:21), while the edit form in travel-entry.php (travel-entry.php:40) exposes nearly the complete domain model.

Restaurant records receive additional food, service, and atmosphere scores. Other categories use only the overall rating.

Image deletion appears incomplete: the confirmation page does not actually perform a deletion and refers to an undefined JavaScript destination.

### Inferred data model

There is no database dump in the repository, so the schema has to be inferred from the queries.

| Legacy table | Responsibility | Important fields |
|---|---|---|
| ey_travel | Main recommendation/place record | travelid, city, category, name, address, contact details, notes, ratings |
| ey_images | Images attached to a recommendation | imageid, travelid, original filename, stored filename |
| ey_cities | City navigation and selection | cityid, city |
| ey_category | Available recommendation categories | category |
| ey_authorized | Administrator accounts | username, password hash |

Cities and categories appear to be stored both as text on the main record and in lookup tables. This means the lookup tables assist the interface but likely do not provide relational integrity.

The repository contains 239 image files totaling about 36 MB. Without the database, I cannot determine how many are still referenced, how many recommendations exist, or whether any database records point to missing files.

### Secondary and legacy content

There are three hand-authored destination guides:

- Charleston
- France
- London

These contain editorial travel notes, restaurant and hotel recommendations, shopping suggestions, transportation notes, and external photo links. They are structurally separate from the database-driven application.

There is also a splash page displaying randomly selected food and travel quotations.

For the rewrite, I would treat these as optional editorial content to migrate after the core recommendation system. They should not dictate the initial architecture.

### What the original design did well

For its time, the project contains a surprisingly complete end-to-end product:

- Public browsing and private administration
- A clear, reusable content model
- Database-driven hierarchical navigation
- Multiple display modes
- Sorting and filtering
- Image upload and galleries
- Restaurant-specific rating dimensions
- Early consideration of mobile presentation
- Container configuration added later for local development

Most importantly, it captures information that generic bookmark managers do not: personal context, provenance, visit history, and qualitative judgment.

### Technical risks to address before reuse or deployment

The current code should be treated as source material and a migration reference, not as a foundation to incrementally modernize.

The main issues are:

- Database credentials are embedded directly in the source. Those credentials should be rotated, even if they are believed to be obsolete.
- User input is concatenated directly into SQL, including login, filtering, sorting, reads, updates, and deletes.
- Output is rendered without systematic HTML escaping, creating stored and reflected cross-site scripting risk.
- Passwords use unsalted SHA-1.
- Administrative writes do not have CSRF protection.
- Deletes are performed through GET requests.
- Uploaded-file verification trusts client-provided metadata and does not properly inspect image contents.
- Session handling lacks modern cookie and session-rotation protections.
- Database writes and corresponding filesystem operations are not transactional.
- There are no automated tests, migrations, schema definition, or documented recovery process.
- The interface depends on frames, popup windows, table layouts, short PHP tags, shared generated JavaScript, and fixed-width/nonresponsive styling.
- Several code paths mix obsolete mysql_* calls with mysqli, which would fail under a modern PHP runtime.
- The repository includes PHP 7.4 container configuration; PHP 7.4 is no longer a suitable production target.

The SQL should be replaced with parameterized operations and allowlisted sorting. OWASP identifies prepared statements as the primary SQL-injection defense. Passwords should use a slow password-hashing algorithm such as Argon2id rather than SHA-1. OWASP SQL injection guidance (https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet), OWASP password-storage guidance (https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

## Recommended clean-sheet architecture

### Frontend

Use TypeScript, React, and the Next.js App Router.

React itself recommends starting new applications with a framework, and the Next.js App Router provides routing, layouts, server/client components, data loading, and server-side rendering in one system. React guidance (https://react.dev/learn/creating-a-react-app), Next.js App Router documentation (https://nextjs.org/docs/app).

The public interface should provide:

- Responsive city and category navigation
- List/card and optional map views
- Search across names, cities, cuisine, and notes
- Filters for category and rating
- Sort controls with fixed, allowlisted options
- Permanent detail-page URLs rather than popups
- Responsive image galleries
- Accessible semantic markup and keyboard navigation
- Server-rendered public pages for fast loading and search-engine visibility

### Backend

Use TypeScript on Node.js through Next.js server features.

For an application of this size, a separate NestJS/Express API would add deployment and coordination overhead without delivering much benefit. Keep domain services and data-access modules separate from React components so they could later be exposed through an API if a mobile client becomes necessary.

The backend should handle:

- Authentication and authorization
- Recommendation CRUD operations
- City/category administration
- Validation
- Image-upload authorization and processing
- Search and filtering
- Audit timestamps
- Secure deletion
- Import and migration utilities

### Database and storage

Use PostgreSQL 18, currently the supported production release line, with Drizzle ORM and checked-in SQL migrations. PostgreSQL documentation (https://www.postgresql.org/docs/current/).

A cleaner initial schema would be:

- users
- locations
- categories
- places
- visits
- ratings
- media
- Optionally guides and guide_sections for the static destination articles

The places table should contain the current recommendation information, while visits and ratings can preserve history instead of overwriting a single “last visit” value.

Store images in S3-compatible object storage, not inside the database. PostgreSQL should hold their keys, dimensions, MIME type, captions, ordering, and ownership. Generate thumbnails and optimized WebP/AVIF variants during upload.

## Succinct rewrite plan

1. Preserve and inventory
   - Export and back up the existing MySQL database.
   - Copy the original media independently.
   - Rotate exposed credentials.
   - Produce counts and integrity reports for every table and image.
2. Define the product contract
   - Document existing fields and workflows.
   - Decide which static guides and quotes belong in version one.
   - Define URL structure, public/private behavior, and migration acceptance criteria.
3. Create the new foundation
   - Scaffold a TypeScript/Next.js application.
   - Add PostgreSQL, Drizzle migrations, validation, authentication, structured logging, and test infrastructure.
   - Implement the normalized schema.
4. Build the public application
   - Add responsive browsing, search, filters, sorting, detail pages, maps, ratings, and galleries.
   - Preserve the personal editorial tone rather than making it look like a generic directory.
5. Build administration
   - Implement secure place, category, location, visit, rating, and media management.
   - Add image optimization, confirmations, validation, CSRF protection, and audit timestamps.
6. Migrate and verify
   - Write a repeatable MySQL-to-PostgreSQL importer.
   - Import images into object storage.
   - Reconcile record counts, relationships, ratings, notes, and missing/orphaned images.
   - Import the static guides separately if desired.
7. Test and cut over
   - Add unit, integration, and Playwright end-to-end tests.
   - Run accessibility, security-header, responsive-layout, and backup/restore checks.
   - Put the old application into read-only mode, perform a final migration, and retain it temporarily for comparison.

No files were changed during this analysis.