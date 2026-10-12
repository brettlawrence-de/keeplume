export type Entry = {
    id: string;
    label: string;
    essential: boolean;
    itemId: string | null;
    due: string;
};
export type Routine = {
    id: string;
    name: string;
    entries: Entry[];
};
export type Item = {
    id: string;
    name: string;
    locationId: string | null;
    location: string;
    notes: string;
    tags: string[];
    photo: string | null;
    due: string;
    createdAt: string;
    updatedAt: string;
    sample: boolean;
    history: {
        location: string;
        at: string;
    }[];
};
export type Place = {
    id: string;
    name: string;
    detail: string;
};
export type State = {
    version: 1;
    revision: number;
    items: Item[];
    locations: Place[];
    routines: Routine[];
    sessions: Record<string, {
        checked: string[];
        startedAt: string;
    }>;
    settings: {
        theme: 'system' | 'light' | 'dark';
        sort: 'updated' | 'name';
        onboarded: boolean;
        lastBackup: string | null;
    };
};
export const MAX_BYTES = 48 * 1024 * 1024, MAX_PHOTO = 500 * 1024;
function boundedJPEG(data: string) {
    let p = 2;
    while (p < data.length - 2) {
        if (data.charCodeAt(p++) !== 255)
            fail();
        while (data.charCodeAt(p) === 255)
            p++;
        const marker = data.charCodeAt(p++);
        if (marker === 217)
            return false;
        if (marker === 1 || (marker >= 208 && marker <= 215))
            continue;
        const length = data.charCodeAt(p) * 256 + data.charCodeAt(p + 1);
        if (length < 2 || p + length > data.length)
            return false;
        if (marker === 192 || marker === 194) {
            if (length < 8)
                return false;
            const height = data.charCodeAt(p + 3) * 256 + data.charCodeAt(p + 4), width = data.charCodeAt(p + 5) * 256 + data.charCodeAt(p + 6);
            return height > 0 && width > 0 && height <= 1400 && width <= 1400;
        }
        p += length;
    }
    return false;
}
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export const blank = (): State => ({ version: 1, revision: 0, items: [], locations: [], routines: ['Work', 'School', 'Travel'].map(name => ({ id: uid(), name, entries: (name === 'Work' ? ['Keys', 'Phone', 'Work badge'] : name === 'School' ? ['Keys', 'School bag', 'Water bottle'] : ['Passport', 'Phone charger', 'Travel tickets']).map(label => ({ id: uid(), label, essential: true, itemId: null, due: '' })) })), sessions: {}, settings: { theme: 'system', sort: 'updated', onboarded: false, lastBackup: null } });
function fail(): never { throw Error('This backup has invalid or unsupported records. Nothing was changed.'); }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const id = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(v) && !['__proto__', 'prototype', 'constructor'].includes(v);
const timestamp = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));
export const validDate = (v: unknown): v is string => v === '' || (typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v) && Number.isFinite(Date.parse(v + 'T12:00:00Z')) && new Date(v + 'T12:00:00Z').toISOString().slice(0, 10) === v);
export function validate(input: unknown): State {
    if (!object(input) || input.version !== 1 || !Number.isSafeInteger(input.revision) || Number(input.revision) < 0 || !Array.isArray(input.items) || input.items.length > 5000 || !Array.isArray(input.locations) || input.locations.length > 500 || !Array.isArray(input.routines) || input.routines.length > 100 || !object(input.sessions) || !object(input.settings))
        fail();
    const unique = (rows: unknown[]) => {
        const seen = new Set();
        for (const v of rows) {
            if (!object(v) || !id(v.id) || seen.has(v.id))
                fail();
            seen.add(v.id);
        }
    };
    unique(input.items);
    unique(input.locations);
    unique(input.routines);
    const places = new Set(input.locations.map(p => (p as Place).id)), items = new Set(input.items.map(i => (i as Item).id));
    for (const l of input.locations) {
        if (!object(l) || !text(l.name, 100) || !l.name.trim() || !text(l.detail, 300))
            fail();
    }
    for (const i of input.items) {
        if (!object(i) || !text(i.name, 120) || !i.name.trim() || !text(i.location, 500) || !(i.locationId === null || places.has(String(i.locationId))) || !text(i.notes, 2000) || !Array.isArray(i.tags) || i.tags.length > 20 || i.tags.some(t => !text(t, 40)) || !validDate(i.due) || !timestamp(i.createdAt) || !timestamp(i.updatedAt) || typeof i.sample !== 'boolean' || !Array.isArray(i.history) || i.history.length > 20)
            fail();
        if (i.photo !== null) {
            if (!text(i.photo, MAX_PHOTO * 1.4) || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(i.photo))
                fail();
            try {
                const bytes = atob(i.photo.slice(23));
                if (bytes.length > MAX_PHOTO || bytes.charCodeAt(0) !== 255 || bytes.charCodeAt(1) !== 216 || bytes.charCodeAt(bytes.length - 2) !== 255 || bytes.charCodeAt(bytes.length - 1) !== 217 || !boundedJPEG(bytes))
                    fail();
            }
            catch {
                fail();
            }
        }
        for (const h of i.history)
            if (!object(h) || !text(h.location, 500) || !timestamp(h.at))
                fail();
    }
    for (const r of input.routines) {
        if (!object(r) || !text(r.name, 100) || !r.name.trim() || !Array.isArray(r.entries) || r.entries.length > 100)
            fail();
        unique(r.entries);
        for (const e of r.entries)
            if (!object(e) || !text(e.label, 120) || !e.label.trim() || typeof e.essential !== 'boolean' || !validDate(e.due) || !(e.itemId === null || items.has(String(e.itemId))))
                fail();
    }
    for (const [key, session] of Object.entries(input.sessions)) {
        const routine = input.routines.find(r => (r as Routine).id === key) as Routine | undefined;
        if (!routine || !object(session) || !timestamp(session.startedAt) || !Array.isArray(session.checked) || session.checked.length > 100 || new Set(session.checked).size !== session.checked.length || session.checked.some(c => !routine.entries.some(e => e.id === c)))
            fail();
    }
    const s = input.settings;
    if (!['system', 'light', 'dark'].includes(String(s.theme)) || !['updated', 'name'].includes(String(s.sort)) || typeof s.onboarded !== 'boolean' || !(s.lastBackup === null || timestamp(s.lastBackup)))
        fail();
    if (new TextEncoder().encode(JSON.stringify(input)).length > MAX_BYTES)
        throw Error('Backup exceeds the 48 MB safety limit. Nothing was changed.');
    return structuredClone(input) as unknown as State;
}
export function search(state: State, query: string, locationId = ''): Item[] { const q = query.trim().toLocaleLowerCase(); return state.items.filter(i => (!locationId || i.locationId === locationId) && [i.name, i.location, i.notes, ...i.tags].join(' ').toLocaleLowerCase().includes(q)).sort((a, b) => state.settings.sort === 'name' ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt)); }
export function saveItem(s: State, input: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'history'>, oldId?: string) {
    const old = s.items.find(i => i.id === oldId);
    if (oldId && !old)
        throw Error('This item no longer exists. Reload before editing.');
    const at = now();
    const item: Item = { ...input, id: old?.id || uid(), createdAt: old?.createdAt || at, updatedAt: at, history: old?.history || [] };
    if (old && old.location !== item.location)
        item.history = [{ location: old.location, at: old.updatedAt }, ...item.history].slice(0, 20);
    s.items = s.items.filter(i => i.id !== item.id);
    s.items.push(item);
    return item;
}
export function deleteItem(s: State, id: string) {
    s.items = s.items.filter(i => i.id !== id);
    for (const r of s.routines)
        for (const e of r.entries)
            if (e.itemId === id)
                e.itemId = null;
}
export function removeLocation(s: State, id: string) {
    s.locations = s.locations.filter(l => l.id !== id);
    s.items.forEach(i => {
        if (i.locationId === id)
            i.locationId = null;
    });
}
export function renameLocation(s: State, id: string, name: string, detail: string) {
    const l = s.locations.find(l => l.id === id);
    if (!l)
        throw Error('Location not found.');
    l.name = name;
    l.detail = detail;
    for (const i of s.items)
        if (i.locationId === id) {
            const location = [name, detail].filter(Boolean).join(' → ');
            if (location !== i.location) {
                i.history = [{ location: i.location, at: i.updatedAt }, ...i.history].slice(0, 20);
                i.location = location;
                i.updatedAt = now();
            }
        }
}
export function merge(existing: State, incoming: State): State {
    const out = structuredClone(existing);
    for (const key of ['items', 'locations', 'routines'] as const) {
        const ids = new Set(out[key].map(r => r.id));
        for (const row of incoming[key])
            if (!ids.has(row.id))
                (out[key] as unknown[]).push(structuredClone(row));
    }
    for (const [key, v] of Object.entries(incoming.sessions))
        if (!out.sessions[key])
            out.sessions[key] = structuredClone(v);
    return validate(out);
}
