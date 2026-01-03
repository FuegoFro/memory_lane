# Description of project

A slideshow with optional narration for each slide.

## Viewing experience

Optional auto advance or manual, with adjustable delay on the auto advance. The slideshow will consist of both photos and videos. On each entry (photo or video) there should be a way to start the playback of the narration for that entry (mouse click, button press) which will pause auto-advancing (if it was active) until the end of the narration. While narration is playing, if the entry has a title, that title should be visible over the entry. It would be great to have full playback controls for the narration (pause, scrub, stop, etc). If the entry is a video, the narration will play on the left channel, and the video's audio will play on the right channel.

For controls:

- Space/enter/click will start/pause narration for the current slide
- Arrow keys to go next/prev

Buttons

- Next/prev entry
- Play/pause/scrub narration
- Show/hide titles

## Editing experience

There should be a grid of entries (row-major layout of the presentation) with adjustable size that fits as many entries as possible per row. The user should be able to drag and drop the entries to reorder them, or click on an entry to edit the info/narration for that single entry.

When editing info, the user should be able to play the narration for that entry and record (overwrite if existing) the audio. Once recorded, it should automatically generate a transcript of the audio. This transcript is just for the editing experience, to help the user get a quick view of the narration contents. If it's a video, the narration should be limited to the length of the video.

There should also be an optional title for the entry.

# Technical details

This should be a website. We'll build it with React and a DB (likely something easy and SQL for the metadata, not sure where to store large file blobs). This also should be hosted somewhere easy and cheap (_very_ little traffic, this is a hobby project). We want authentication on the edit page, but also don't need it to be overly complicated; possibly a hard-coded password along with a hard-coded TOTP.
