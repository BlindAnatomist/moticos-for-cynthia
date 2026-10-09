// Preserve authored content; suppress only an identical adjacent display note.
export function distinctEndingNote(ending,note){const normalized=value=>String(value??'').trim().replace(/\s+/g,' ');return normalized(ending)===normalized(note)?null:note;}
