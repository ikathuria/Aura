# Skill: Context Hub (chub)

Use the `chub` CLI to get curated, versioned documentation and skills for implementation tasks.

## Purpose
- Retrieve latest API documentation (e.g., OpenAI, Stripe, Firebase).
- Access versioned, language-specific "What to know" guides.
- Annotate local documentation with session-specific knowledge.
- Contribute feedback to document maintainers.

## Usage Guide

### 1. Searching for Information
Before implementing a new service or API, search for available documentation:
```bash
chub search "service name"
```

### 2. Fetching Documentation
Retrieve documentation for a specific ID and language:
```bash
chub get <id> --lang <js|py>
```
If additional files are needed, use `--file <filename>` or `--full`.

### 3. Annotating & Improving
When discovering session-specific nuances or gaps:
- Add a note: `chub annotate <id> "Note text"`
- Provide feedback: `chub feedback <id> <up|down>`

## Examples
- Searching for OpenAI: `chub search openai`
- Getting OpenAI Chat JS docs: `chub get openai/chat --lang js`
- Annotating a doc: `chub annotate stripe/api "Needs raw body for webhook verification"`
