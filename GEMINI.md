# GEMINI.md

This file provides guidance to Gemini CLI when working in this repository.

@AGENTS.md

## Gemini-Specific Notes

- **Proactive Investigation**: Favor `codebase_investigator` for broad architectural questions.
- **Context Efficiency**: Prioritize `grep_search` over reading large files to minimize token usage.
- **Media Verification**: Large file operations (Dropbox/Gemini API) can hit context limits; prefer surgical verification.
