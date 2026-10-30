# PDFDR deployment checklist

**Do not expose the development server to the internet.** The included `server.py` uses Python's development HTTP server and is for local testing only.

Recommended architecture: HTTPS reverse proxy (Caddy/Nginx) → hardened Python application service → PyMuPDF backend. Before launch, replace the dev server with a production application server, add upload/request rate limits, CPU/memory/time limits, concurrency controls, PDF parsing isolation, monitoring, and regular dependency updates.

## Domain and SEO

Once your domain is known, set canonical URLs and OpenGraph URLs, generate `sitemap.xml`, update `robots.txt`, and verify Google Search Console. Do not use localhost or a placeholder domain in public canonical tags.

## Data handling

The backend receives uploaded PDF bytes in POST requests. Review retention, logging, backups, error reporting and applicable privacy requirements. Browser autosave stores project data on the user's device; browser storage may be cleared or limited.

## Acceptance checks

- Open PDFDR homepage and editor on desktop and mobile.
- Upload selectable-text PDF; edit, delete, undo, navigate, export and reopen the output.
- Check fonts and formatting, original document preservation, and edited-preview/export consistency.
- Verify limits for large, malformed, password-protected, rotated and scanned PDFs.
- Run `python smoke_test.py` against the local server.
- Security review and penetration test before public release.
