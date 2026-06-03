---
description: Render markdown constructs + trigger diff styling to preview the active Claude Code theme
---

Render every markdown construct in a single response so I can see how the active Claude Code theme styles them. Include: H1/H2/H3 headings, paragraph text with **bold** / *italic* / ~~strikethrough~~ / `inline code`, a bulleted list with one nested level, a numbered list, a task list with one checked and one unchecked box, a blockquote, a fenced code block with a language hint (your pick), a 3-column markdown table with at least 3 rows, a horizontal rule, and a [link](https://example.com).

Then make a trivial edit to a throwaway file so the diff colors render: Write "before\n" to /tmp/theme-test, then Read it, then Edit it to change "before" to "after", then delete the file. The diff view from Edit is what exercises the theme's diffAddBg / diffDelBg tokens.

Don't preface or summarize — just produce the rendered output.
