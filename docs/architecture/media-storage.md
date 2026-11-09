# Media Storage and Processing

> **Status:** Phase 6 implementation policy  
> **Last reviewed:** 2026-11-09

TravelTrove stores version-one image variants on a persistent filesystem behind
the `MediaStorage` interface. Place and UI code do not construct filesystem paths
directly, allowing a later S3-compatible implementation without changing the
media workflow.

## Version-one policy

- Accepted input: JPEG, PNG, and WebP identified from decoded content.
- Maximum upload size: 10 MB; maximum decoded input: 40 megapixels.
- Maximum images per place: 12.
- Display variant: WebP, maximum 1600 by 1600 pixels, aspect ratio preserved.
- Thumbnail variant: WebP, 480 by 480 pixels with cover cropping.
- Processing applies orientation and strips unnecessary metadata.
- Alternative text is required unless the image is explicitly decorative.
- The first image by display order is the public cover.

## Storage and consistency

Display keys use `places/{place UUID}/{media UUID}/display.webp`; thumbnails use
the same namespace with `thumbnail.webp`. Keys are validated before filesystem
resolution. Public reads use the immutable `/media/*` transport with `nosniff`.

Files are processed before database insertion. Failed writes remove newly created
variants. Deletion removes the metadata row and both variants through the same
service operation. Canonical published-place media requires admin capability;
users may manage only their own draft media. Public queries return only published
media.

`MEDIA_ROOT` must be persistent. Docker Compose uses the `media_data` volume; the
DigitalOcean deployment must back it up alongside PostgreSQL.
