# Voice log

Official count = the Wispr Flow desktop app: **Insights > Your usage** (the usage card). That is what judges and the
Most-usage prize use. Write the card's total each evening, and what I dictated that day.

| Date | Card total (words) | Words today | Local history check | What I dictated (apps + what) |
|---|---|---|---|---|
| 23 Oct | [from card] | [card today − card yesterday] | 1,693 words in 15 dictations (Chrome, Terminal, Slack), first at 18:13 IST | Wispr set-up; first Flow; the planning brief for this session (Claude Code in Terminal) |
| 24 Oct | ~4,300 (Siddhu read it from Insights) | | | Q&A answers for the planning session |
| 25 Oct | | | | |
| 26 Oct | | | | |
| 27 Oct | | | | |
| 28 Oct | | | | |
| 29 Oct | | | | |
| 30 Oct | | | | |

Biggest single dictation (for the "How you used Wispr" field): [date, words, what]
Still typed (honest): keyboard shortcuts, small code fixes, [anything else]

## Does Wispr Flow keep a local history on this Mac? Yes.

Checked read-only on 23 Oct 2026 (a copy was read in the session scratchpad; the original was not opened for writing, changed or moved).

- Folder: `~/Library/Application Support/Wispr Flow/` (73 MB). The main file is **`flow.sqlite`** (a SQLite database, with a `-wal` file that holds the newest rows).
- Table **`History`**: one row per dictation. Useful columns: `timestamp` (UTC), `numWords`, `app` (for example `com.apple.Terminal`), `url`, `duration`, `speechDuration`, `language`, plus the text (`asrText`, `formattedText`, `editedText`) and, in some rows, the **audio and a screenshot** (`audio`, `screenshot` BLOBs).
- Other tables: `Dictionary` (6 words), `Meetings` (2), `Notes`, `Todos` and more (empty).
- On 23 Oct it held 15 dictations, 1,693 words, all from today (Wispr was installed today).

**Can it help count words honestly?** Yes, as a cross-check and to fill the "what I dictated" column (words per day and per app).
But:

1. The **usage card is the official number**. The local history may be pruned, may not include other devices, and may count words slightly differently. Never report the local number as the official one.
2. The database holds **my private text, audio and screenshots**. Never commit it, copy it into the repo, upload it or show it in the video. Only the daily totals go in this file.
3. Only read a **copy** (the app is writing to it while running).

Read-only check command (copies first, then reads the copy; prints only dates, counts and apps):

```sh
D="$TMPDIR/wispr_copy"; mkdir -p "$D"
cp ~/Library/Application\ Support/Wispr\ Flow/flow.sqlite* "$D/"
sqlite3 "$D/flow.sqlite" "select date(timestamp,'+330 minutes') as ist_day, count(*), sum(numWords), group_concat(distinct app) from History group by 1;"
rm -rf "$D"
```
