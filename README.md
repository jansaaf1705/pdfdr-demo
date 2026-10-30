# PDFDR — PDF Editor Website (Release Candidate)

PDFDR is a focused visual PDF editor with a responsive marketing website. Based on the working Phase 16 build.

## Windows local installation

1. Install Python 3.11–3.14.
2. In the extracted PDFDR-final folder run:

```cmd
python -m pip install -r requirements.txt
python server.py
```

3. Open http://127.0.0.1:5500/ and use http://127.0.0.1:5500/editor/ for the editor.
4. Optional backend smoke test in a second terminal: `python smoke_test.py`.

## Included

- Homepage, editor, About, Contact, Privacy, Terms, favicon and robots.txt.
- Click/tap detected PDF text to edit; original text is redacted and replacement inserted on export.
- Live edited PDF preview, page tools, annotations, added images and text, local recovery.
- Backend text extraction and PDF export using PyMuPDF.

## Before publishing PDFDR

**This is a release candidate, not a security-audited production service.**

1. Replace the support-email placeholder on `/contact/` with your real contact details.
2. Review and adapt `/privacy/` and `/terms/` for your business, hosting and jurisdiction.
3. Configure a real domain, HTTPS, access logs with sensitive data minimized, rate limiting, resource limits and process supervision.
4. Never expose `python server.py` directly to the public internet. It is a local development server.
5. PDF files **are sent to the backend** for text extraction, preview, and permanent text replacement. Do not claim the app is fully browser-only.
6. Test on Chrome, Firefox, Safari, Android and iOS. Test scanned PDFs, embedded fonts, rotated pages, images, redactions and exports.
7. Review third-party JS CDN dependencies and pin or self-host them before launch.
8. Add canonical URLs, sitemap and social previews after selecting your domain.
9. Do not market text deletion as certified secure redaction without independent testing.

## Limitations

- Text editing is based on detected text spans, not Word-like paragraph reflow.
- Exact font fidelity is not guaranteed; some fonts are substituted.
- Scanned PDFs need OCR, which is not implemented.
- Complex backgrounds may be changed by text redaction.
- No user accounts or cloud project sync.

## Hosting

A VPS/container supporting Python and HTTPS reverse proxy is recommended. Basic static-only hosting or PHP-only shared hosting will not run the text-editing backend. See `DEPLOYMENT.md`.
