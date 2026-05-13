# Public Readiness

This repo is safe to publish as a public-facing prototype after the checks below pass.

## Included

- Next.js app source
- Chat and recommendation UI components
- Spend parsing and conversation manager logic
- Sample environment template with placeholders
- Minimal API integration documentation

## Excluded

- Live partner endpoints
- API keys, tokens, session secrets, and local environment files
- Internal planning docs, issue trackers, migration notes, and handoff files
- Debug scripts and request/response traces

## Pre-Publish Checklist

```bash
npm run build
npm test
rg -n -i "bk-prod|bankkaro\\.com|sk-[A-Za-z0-9]|AIza[0-9A-Za-z_-]|gsk_[A-Za-z0-9]|hf_[A-Za-z0-9]|BEGIN RSA|BEGIN OPENSSH|client_secret|private_key"
```

