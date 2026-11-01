---
name: update-todo
description: "Reconcile TODO.md with the actual codebase state — mark done items, keep pending ones, refresh the date."
risk: safe
source: local
---

Update `TODO.md` at the repo root so it reflects what is done and what is still pending. If `TODO.md`
does not exist, say so and stop — do not create one unless asked.

## Steps

1. **Read `TODO.md`** and list every item with its current state.
2. **Verify each item against the code**, not against memory or commit messages. Cite what you
   checked (a file, a script in `package.json`, a rule in `.claude/rules/`). An item is done only
   when the code shows it; partial work stays open with a short note on what remains.
3. **Update in place.** Tick done items (`- [x]`), leave pending ones, add a one-line note where the
   state is partial or the item no longer applies (say why rather than deleting it). Keep the existing
   section structure and wording.
4. **Refresh the "last updated" date** if the file has one; add one at the top if it does not.
5. **Report** a short summary: items newly done, items still open, items you could not verify.

## Rules

- Edit only `TODO.md`. Never change code to make an item "done".
- Don't invent new items; mention candidates in the summary instead.
- No emojis or decorative formatting.
