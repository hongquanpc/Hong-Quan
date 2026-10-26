---
name: daily-video
description: Produce the daily aitoday.vn vertical AI video end to end — research a hot AI topic (new agent features, AI replacing human tasks, high-starred GitHub repos), verify facts, write episode.json, build with the studio engine, and pass the final QA gate before publishing. Use when asked to make today's video, a new episode, or to run the content workflow.
---

# Daily video — aitoday.vn

Everything lives in `studio/`. Read `studio/README.md` (scene types, pipeline) and the three playbooks in
`studio/playbook/` before writing anything. Write all viewer-facing text in Vietnamese with full diacritics.

## Steps

1. **Research** (`playbook/research.md`): run the sample searches with WebSearch for the last 7 days. Shortlist 3 topics
   across the five pillars, each with ≥ 2 sources (≥ 1 primary/major outlet). Pick one; tell the user the shortlist and the pick in 3 lines.
2. **Verify**: list every number, name and date that will appear on screen or in the voice-over as `facts`
   (`claim`, `check` = where a human confirms it, `checked: false`). GitHub stars: round down ("380K+").
   Never invent model names, dates or figures; if a fact cannot be confirmed, cut it or attribute it ("theo báo cáo…").
3. **Script** → `studio/episodes/<YYYY-MM-DD>-<slug>/episode.json`, using a format from `playbook/hooks-and-scripts.md`.
   First scene `cover` (hook + thumbnail), last scene `cta` (with a comment question). 45–60 s: about 15–18 lines, ≤ 15 words each.
   Add brand logos (simple-icons slugs) wherever a company/tool is named. Fill `post.caption` and `post.hashtags`.
   Then critique it with prompt #4 in `playbook/prompts.md` and apply the fixes.
4. **Draft build**: `cd studio && FAKE=1 ./build.sh episodes/<id>` → look at `out/qa_contact.jpg` with Read and fix any
   layout issue the report lists or that you can see (crowding, empty frames, host covering content).
5. **Real build**: `ELEVENLABS_API_KEY` must be set (ask the user to add it to the environment, never write it to a file);
   `./build.sh episodes/<id>`. Fix every voice line the QA flags (reword, spell numbers out, or add `"hear"` when the
   pronunciation is right but STT writes it differently) and rebuild — TTS is cached per line, so only changed lines cost credits.
6. **Final gate**: the episode may only be called ready when `out/QA_REPORT.md` says ĐẠT. Facts stay `checked: false`
   until the user confirms them — send the user the video, thumbnail, the fact list with links, and the post caption,
   and ask them to confirm. Never set `checked: true` yourself for a fact you could not open the source of.

## Rules

- Accuracy over hype: no "thay thế hoàn toàn con người", no unverifiable superlatives. Incidents: include the company's response.
- Logos only for the brand being discussed; never imply endorsement or partnership.
- Keep ≤ 60 s when possible (QA warns above 65 s); the hook must land in the first 3 s.
- Commit the episode folder (`episode.json`, `out/`) — `build/` is ignored.
