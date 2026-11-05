---
name: daily-mail-work-summary
description: |
  Summarises the user's Outlook emails for a day (default: today, local time) grouped by sender,
  with one table per sender showing Date, Subject and Main points, plus a consolidated list of
  actions for the user. Use when the user asks for "my daily mail summary", "summarise today's
  emails by sender", "what work came in by email today", "work summary from my inbox", or a mail
  summary for a given date or range. Do NOT use for sending, replying to, moving or triaging
  emails, or for calendar/Teams summaries.
metadata:
  category: productivity
  icon: MailMultiple
---

# Daily Mail Work Summary

## Overview
Builds an end-of-day (or any-period) work summary from the user's Outlook mailbox. It reads every
received email in the time window, groups them by sender, and presents one table per sender with
the date, subject and main points of each email, followed by a consolidated "Key actions for me"
list. Read-only: it never changes the mailbox.

## When to Use
- "Give me my daily mail summary" / "work summary from my inbox"
- "Summarise today's emails by sender" / "What work came in by email today?"
- "Summarise yesterday's mails" / "Mail summary for this week" / "Emails from 28-Oct to 31-Oct"
- "Put today's mail summary in an Excel file" (file output variant)

## When NOT to Use
- Sending, replying, forwarding, flagging, moving or deleting emails — handle those directly with Outlook tools
- Triage/prioritisation of the inbox or drafting responses
- Summaries of meetings, calendar or Teams chats
- Finding one specific email ("find the mail from X about Y") — just search for it

## Workflow

### Step 1: Determine the time window
1. Get the user's time zone with `outlook_calendar-GetUserDateAndTimeZoneSettings` (fallback: India Standard Time, UTC+05:30).
2. Default window: **today 00:00 local → now**.
3. Honour explicit periods: "yesterday" = yesterday 00:00–23:59; "this week" = Monday 00:00 → now;
   a date = that whole day; a range = start-day 00:00 → end-day 23:59. All in local time.
4. Convert the window to UTC for the query (e.g. IST 00:00 = previous day 18:30 UTC).

### Step 2: Retrieve ALL received emails in the window
1. Call `outlook-ListMessages` on the **Inbox** with a `receivedDateTime` filter
   (`ge` start, `le` end), selecting id, subject, from, receivedDateTime, conversationId, bodyPreview.
2. **Paginate fully** — keep following the next page until none remains. Never stop at the first page.
3. If there are many messages (roughly 25+), use a tool script (`core-RunScript`) to loop pages and
   fetch bodies, rather than many individual calls.
4. Include **Sent Items** only if the user explicitly asks.
5. Keep newsletters and automated notifications, but tag them as automated (sender address contains
   `noreply`, `no-reply`, `donotreply`, `notifications`, `mailer-daemon`, or is clearly a system/bulk sender).

### Step 3: Read the content
1. For each email, read the **full body** with `outlook-GetMessage` (not just the preview).
2. For reply/forward threads, summarise only the **newest message's new content** — ignore quoted history.
3. Extract 2–3 concise main points, always including any **action items, deadlines or asks directed at the user**.

### Step 4: Group and order
1. Group by sender = display name + email address.
2. Order groups by number of emails **descending**, then by name A–Z.
3. Put all automated/no-reply senders in a final **"Automated / notifications"** section.
4. Within each group, sort rows by date **ascending**.

### Step 5: Present the summary
Use the Output Format below. Finish with "Key actions for me" and a one-line total.

## Output Format

Default is chat (markdown):

```
## Mail work summary — 03-Nov-2026 (00:00–17:30 IST)

### Priya Nair (priya.nair@contoso.com) — 3 emails
| Date | Subject | Main points |
|------|---------|-------------|
| 03-Nov-2026 09:12 | Batch schedule for Azure AI course | Proposed batch start 10-Nov; needs trainer confirmation; asks you to confirm by 05-Nov |
| 03-Nov-2026 11:40 | RE: Lab environment access | Labs provisioned for 25 users; 2 accounts pending |
| 03-Nov-2026 15:05 | Feedback report | Avg rating 4.6/5; request to share report with sales team |

### Rahul Menon (rahul.menon@contoso.com) — 1 email
| Date | Subject | Main points |
|------|---------|-------------|
| 03-Nov-2026 10:15 | Invoice approval | Invoice #4521 awaiting your approval; due 04-Nov |

### Automated / notifications — 2 emails
| Date | Subject | Main points |
|------|---------|-------------|
| 03-Nov-2026 07:00 | Daily digest (LinkedIn Learning) | Weekly learning stats; no action |

### Key actions for me
- Confirm trainer for Azure AI batch — Priya Nair — by 05-Nov
- Approve invoice #4521 — Rahul Menon — by 04-Nov
- Share feedback report with sales team — Priya Nair

**Total: 6 emails from 3 senders.**
```

- Date format: `DD-MMM-YYYY HH:mm` in local time.
- Main points: 2–3 short points separated by semicolons.
- If the user asks for a **file**: produce an **Excel workbook** with one sheet per sender (columns Date, Subject,
  Main points) plus a "Key actions" sheet, or a **Word document** with the same sections if they ask for Word.

## Examples

**Example 1** — User: "Give me my daily mail summary"
→ Window = today 00:00 IST → now; Inbox only; output in chat as above.

**Example 2** — User: "Summarise yesterday's emails by sender and put it in Excel"
→ Window = yesterday 00:00–23:59 IST; one sheet per sender + Key actions sheet; reply with a short
chat summary (total emails/senders, top actions) and the file.

## Edge Cases
- **No emails in the window:** say plainly "No emails were received between {start} and {end}." — do not pad.
- **Empty subject:** show "(no subject)".
- **Body unreadable / attachment-only:** write "Body not available; attachment: {name}" — do not guess.
- **Very large window (e.g. a month):** warn it may take a while, still paginate fully, keep points to 2 per email.
- **Same person with two addresses:** keep them as separate groups (sender = name + address).

## Guardrails
- **Read-only.** Never send, reply, forward, flag, move, mark-as-read or delete any email.
- **Never fabricate.** Every main point must come from the email's actual text; if unclear, say so.
- Retrieve the complete set for the window — never summarise a partial first page as if it were everything.
- Keep content in the chat or the requested file; do not share the summary with anyone else.
- State the exact window and time zone used at the top of the summary.
