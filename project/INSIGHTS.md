# Insights

Three things the data surfaced, using the tool itself plus the precomputed
aggregates behind it (`index.json`, `heatmaps.json`).

## 1. Human-vs-human combat is essentially absent from this dataset

**What caught my eye:** Filtering for `Kill`/`Killed` (human-on-human) events versus
`BotKill`/`BotKilled` (human-on-bot) events shows an enormous skew.

**The numbers:** Across all 796 matches and ~89,000 event rows, there are exactly
**3 `Kill` and 3 `Killed` events** — i.e. 3 total human-vs-human kills — compared to
**2,415 `BotKill`** and **700 `BotKilled`** events. Human-vs-bot combat outnumbers
human-vs-human combat roughly **800 to 1**.

**Actionable:** This tracks with the per-match player counts the tool also surfaces —
the average match in this slice has ~1 human and under 1 bot's worth of *captured*
participants, so most matches simply don't have two humans in the same place at the
same time. If real player-vs-player tension is a design goal, the metric to watch is
**concurrent humans per match**, not raw kill totals — increasing that is the lever
that would actually produce more PvP, and it's directly filterable/visible in this
tool (humans per match is shown in the sidebar's match list and the right-panel
readout for any selected match).

## 2. Lockdown is meaningfully more lethal to human players than the other two maps

**What caught my eye:** Toggling the "Kill zones" heatmap layer between maps, Lockdown's
hotspots felt visually hotter relative to its smaller footprint. Checking the
underlying `BotKill`/`BotKilled` ratio per map (the closest proxy this dataset has for
"player kill efficiency vs. AI") confirms it:

**The numbers:**
| Map | BotKill (human kills bot) | BotKilled (human dies to bot) | Ratio |
|---|---|---|---|
| Grand Rift | 192 | 46 | 4.17 : 1 |
| Ambrose Valley | 1,797 | 486 | 3.70 : 1 |
| Lockdown | 426 | 168 | **2.54 : 1** |

Players are still net-positive against bots everywhere, but on Lockdown they die to
bots roughly **45% more often relative to their kills** than on Grand Rift.

**Actionable:** This is consistent with Lockdown's documented design intent as the
"smaller/close-quarters map," so it likely reads as the design working as intended —
but it's worth a level designer's eyes either way. If the intent was a *moderate*
lethality bump for CQB, 2.5:1 vs ~4:1 elsewhere is a large swing worth validating
against player sentiment/retention on that specific map; if it's larger than
intended, the kill-zone heatmap (filterable to Lockdown in the tool) points straight
at the choke points driving it.

## 3. Ambrose Valley has one disproportionately dominant hotspot, not a spread of contested areas

**What caught my eye:** Switching the "Traffic" heatmap on for Ambrose Valley — the
most-played map by a wide margin (566 of 796 matches, 71%) — shows traffic isn't
evenly distributed across popular zones; it's heavily concentrated in one region.

**The numbers:** The single hottest traffic bin on Ambrose Valley's 96x96 grid
records 308 position samples — more than 5x the density of the next-busiest area
on that map — and sits almost exactly on top of the map's single hottest kill bin
(27 kills in one bin, also far above the next-highest). Both land in roughly the
same minimap region (around the 40–51% horizontal, 21–23% vertical band of the map).

**Actionable:** A single chokepoint absorbing both the most traffic and the most
kills on the game's flagship map is either an intentional, well-tuned PvP focal
point (in which case it validates the level design and is worth highlighting in
marketing/showcase material) or an unintentional bottleneck funneling players
through one route. Either way it's the highest-leverage single tile on the map for
level design to review — the affected metrics would be average time-to-first-fight
and overall match pacing on Ambrose Valley, both of which a designer could compare
before/after any change to that area using this tool's match-by-match playback.
