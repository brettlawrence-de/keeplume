import { blank, State, Item, Routine, Entry, uid, now, search, saveItem, deleteItem, removeLocation, renameLocation, merge, validate } from './model.js';
import { load, commit } from './storage.js';
import { encrypt, decrypt } from './backup.js';
import { preparePhoto, verifyPhotos } from './photo.js';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, cls?: string) => {
    const e = document.createElement(tag);
    if (text !== undefined)
        e.textContent = text;
    if (cls)
        e.className = cls;
    return e;
};
const button = (text: string, action: () => void | Promise<void>, cls = '') => { const b = el('button', text, cls); b.type = 'button'; b.addEventListener('click', () => { Promise.resolve().then(action).catch(error => showError(error)); }); return b; };
const main = $('main'), dialog = $<HTMLDialogElement>('dialog');
let state: State, dirty = false, busy = false, query = '', filter = '', page = 'items', photoBusy = false;
let installPrompt: any, waiting: ServiceWorker | null = null;
let origin: Element | null = null;
const dateLabel = (date: string) => date ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(date + 'T12:00:00')) : 'No date';
const dateToday = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); };
const timeLabel = (s: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(s));
let toastTimer: number;
function toast(text: string) { const node = $('toast'); node.textContent = text; node.hidden = false; clearTimeout(toastTimer); toastTimer = window.setTimeout(() => node.hidden = true, 6500); }
function showError(error: unknown) {
    const text = error instanceof Error ? error.message : 'Something went wrong. Your previous records are preserved.';
    const target = dialog.open ? dialog.querySelector<HTMLElement>('[role=alert]') : null;
    if (target)
        target.textContent = text;
    else
        toast(text);
}
function theme() { const setting = state.settings.theme; document.body.dataset.theme = setting === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : setting; }
async function mutate(fn: (s: State) => void) {
    if (busy)
        throw Error('Please wait for the current save to finish.');
    busy = true;
    try {
        const next = structuredClone(state);
        fn(next);
        state = await commit(next, state.revision);
        theme();
        try {
            const channel = new BroadcastChannel('keeplume-changes');
            channel.postMessage('changed');
            channel.close();
        }
        catch { }
    }
    finally {
        busy = false;
    }
}
function close(force = false) {
    if (busy || photoBusy) {
        toast('Please wait for the current operation to finish.');
        return;
    }
    if (!force && dirty && !confirm('Discard these unsaved changes?'))
        return;
    dirty = false;
    dialog.close();
}
function modal(title: string) {
    if (dialog.open)
        close(true);
    origin = document.activeElement;
    dialog.replaceChildren();
    const h = el('h2', title);
    h.id = 'dialog-title';
    const error = el('p', '', 'error');
    error.setAttribute('role', 'alert');
    dialog.append(h, error);
    dialog.showModal();
    return error;
}
dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
dialog.addEventListener('close', () => {
    dirty = false;
    if (origin instanceof HTMLElement && origin.isConnected)
        origin.focus();
});
dialog.addEventListener('input', () => dirty = true);
window.addEventListener('beforeunload', event => {
    if (dirty || busy) {
        event.preventDefault();
        event.returnValue = '';
    }
});
function field(label: string, type = 'text', value = '', max = 120) {
    const wrap = el('label', label), input = el('input');
    input.type = type;
    input.value = value;
    if (type === 'text' || type === 'password')
        input.maxLength = max;
    wrap.append(input);
    return { wrap, input };
}
function select(label: string, options: {
    value: string;
    label: string;
}[], value = '') {
    const wrap = el('label', label), input = el('select');
    for (const o of options)
        input.add(new Option(o.label, o.value));
    input.value = value;
    wrap.append(input);
    return { wrap, input };
}
function textarea(label: string, value = '', max = 2000) { const wrap = el('label', label), input = el('textarea'); input.value = value; input.maxLength = max; wrap.append(input); return { wrap, input }; }
function actions(...buttons: HTMLButtonElement[]) { const row = el('div', undefined, 'actions'); row.append(...buttons); return row; }
function heading(title: string, subtitle: string, action?: HTMLButtonElement) {
    const box = el('div', undefined, 'heading'), text = el('div');
    text.append(el('span', 'REMEMBER WHERE', 'eyebrow'), el('h1', title), el('p', subtitle));
    box.append(text);
    if (action)
        box.append(action);
    return box;
}
function empty(title: string, message: string, action?: HTMLButtonElement) {
    const box = el('section', undefined, 'empty');
    box.append(el('div', '⌾', 'symbol'), el('h2', title), el('p', message));
    if (action)
        box.append(action);
    return box;
}
function showOnboarding() {
    main.replaceChildren();
    const section = el('section', undefined, 'hero'), icon = el('img');
    icon.src = './assets/icon.svg';
    icon.alt = 'Keeplume locator and bookmark';
    icon.className = 'brand-icon';
    section.append(icon, el('p', 'LESS SEARCHING. MORE LIVING.', 'eyebrow'), el('h1', 'Save where you put something. Find it when you need it.'), el('p', 'A photo, a location, a little peace of mind. Keep your belongings and leaving routines together.', 'lede'));
    const privacy = el('div', undefined, 'panel');
    privacy.append(el('h2', 'A private library, on this device.'), el('p', 'No account, tracking or cloud upload. Browser storage can be cleared, so keep an encrypted backup somewhere safe. Installing the web app does not sync or back up your records.'));
    const sample = el('label', 'Try a few fictional sample items', 'checkbox'), check = el('input');
    check.type = 'checkbox';
    sample.prepend(check);
    privacy.append(sample, el('p', 'Samples are labelled and can be removed anytime.', 'subtle'), button('Start remembering', async () => {
        await mutate(s => {
            s.settings.onboarded = true;
            if (check.checked)
                addSamples(s);
        });
        render();
        toast('Welcome. Save your first item when you are ready.');
    }));
    section.append(privacy);
    main.append(section);
}
function addSamples(s: State) {
    const locationId = uid();
    s.locations.push({ id: locationId, name: 'Bedroom', detail: 'Blue drawer' });
    for (const [name, location, tags] of [['Spare keys', 'Bedroom → blue drawer', ['Home']], ['Travel adapter', 'Hallway → travel pouch', ['Travel']]] as [
        string,
        string,
        string[]
    ][]) {
        saveItem(s, { name, locationId: name === 'Spare keys' ? locationId : null, location, notes: 'Fictional sample — replace or remove freely.', tags, photo: null, due: '', sample: true });
    }
}
function card(item: Item) {
    const box = el('article', undefined, 'card');
    box.dataset.itemId = item.id;
    if (item.photo) {
        const image = el('img');
        image.src = item.photo;
        image.alt = 'Saved photo of ' + item.name;
        image.className = 'photo';
        image.loading = 'lazy';
        box.append(image);
    }
    else
        box.append(el('div', '⌾', 'placeholder'));
    box.append(el('h2', item.name), el('p', item.location || 'No location recorded yet', 'location'));
    if (item.sample)
        box.append(el('span', 'Fictional sample', 'pill amber'));
    for (const tag of item.tags)
        box.append(el('span', tag, 'pill'));
    if (item.due)
        box.append(el('p', 'Take on ' + dateLabel(item.due), 'subtle'));
    box.append(el('p', 'Updated ' + timeLabel(item.updatedAt), 'subtle'), actions(button('View details', () => details(item.id), 'secondary')));
    return box;
}
function items() { main.append(heading('Your things, found.', 'Save a location now. Skip the search later.', button('+ Save an item', () => editItem()))); const bar = el('div', undefined, 'searchbar'), input = field('Find an item', 'search', query, 300), places = select('Location', [{ value: '', label: 'All recorded locations' }, ...state.locations.map(l => ({ value: l.id, label: l.name + (l.detail ? ' → ' + l.detail : '') }))], filter); input.input.placeholder = 'Search name, location, tags or notes'; input.input.addEventListener('input', () => { query = input.input.value; results(); }); places.input.addEventListener('change', () => { filter = places.input.value; results(); }); bar.append(input.wrap, places.wrap); main.append(bar); const result = el('div'); result.id = 'item-results'; main.append(result); results(); }
function results() {
    const result = $('item-results');
    if (!result)
        return;
    result.replaceChildren();
    const rows = search(state, query, filter);
    if (!rows.length) {
        result.append(empty(state.items.length ? 'No matching items' : 'A place for everything.', state.items.length ? 'Try a different search or clear the location filter.' : 'Save your first belonging with a photo or a quick location note.', button(state.items.length ? 'Clear filters' : 'Save an item', () => {
            if (state.items.length) {
                query = '';
                filter = '';
                render();
            }
            else
                editItem();
        })));
        return;
    }
    const count = el('p', `${rows.length} ${rows.length === 1 ? 'item' : 'items'} in your library`, 'subtle');
    count.setAttribute('role', 'status');
    const grid = el('div', undefined, 'grid');
    rows.forEach(i => grid.append(card(i)));
    result.append(count, grid);
}
function editItem(id?: string) {
    const item = state.items.find(i => i.id === id);
    modal(item ? 'Edit item' : 'Save an item');
    let photo = item?.photo || null;
    const form = el('form'), name = field('Item name', 'text', item?.name || ''), where = field('Recorded location', 'text', item?.location || '', 500), notes = textarea('Notes (optional)', item?.notes), tags = field('Tags (optional, comma separated)', 'text', item?.tags.join(', ') || '', 820), due = field('Remember to take on (optional)', 'date', item?.due || ''), place = select('Use a saved location', [{ value: '', label: 'Write a location below' }, ...state.locations.map(l => ({ value: l.id, label: l.name + (l.detail ? ' → ' + l.detail : '') }))], item?.locationId || '');
    name.input.required = true;
    where.input.placeholder = 'Bedroom → blue drawer';
    place.input.addEventListener('change', () => {
        const p = state.locations.find(l => l.id === place.input.value);
        if (p)
            where.input.value = [p.name, p.detail].filter(Boolean).join(' → ');
    });
    where.input.addEventListener('input', () => place.input.value = '');
    const preview = el('img');
    preview.id = 'photo-preview';
    preview.alt = 'Selected item photo';
    preview.hidden = !photo;
    if (photo)
        preview.src = photo;
    const photoLabel = el('p', 'Photo is optional. Native camera access depends on your browser permissions. JPEG, PNG or WebP; up to 20 MB.', 'subtle'), photoStatus = el('p', '', 'status-line');
    photoStatus.setAttribute('role', 'status');
    const camera = field('Take a photo', 'file'), file = field('Choose a photo', 'file');
    for (const f of [camera.input, file.input])
        f.accept = 'image/jpeg,image/png,image/webp';
    camera.input.setAttribute('capture', 'environment');
    const read = async (input: HTMLInputElement) => {
        const chosen = input.files?.[0];
        if (!chosen) {
            photoStatus.textContent = 'No photo selected. Your previous photo is unchanged; you may save without one.';
            return;
        }
        photoBusy = true;
        photoStatus.textContent = 'Preparing your photo…';
        save.disabled = true;
        try {
            photo = await preparePhoto(chosen);
            preview.src = photo;
            preview.hidden = false;
            photoStatus.textContent = 'Photo prepared on this device. Location metadata is not retained.';
            dirty = true;
        }
        catch (error) {
            showError(error);
            photoStatus.textContent = 'Photo unchanged. Choose another image or save without one.';
        }
        finally {
            photoBusy = false;
            save.disabled = false;
            input.value = '';
        }
    };
    for (const f of [camera.input, file.input]) {
        f.addEventListener('change', () => void read(f));
        f.addEventListener('cancel', () => photoStatus.textContent = 'No photo selected. You can save without a photo.');
    }
    const save = button(item ? 'Save changes' : 'Save item', () => { });
    save.type = 'submit';
    form.append(name.wrap, place.wrap, where.wrap, photoLabel, camera.wrap, file.wrap, preview, button('Remove photo', () => { photo = null; preview.hidden = true; dirty = true; }, 'secondary'), photoStatus, notes.wrap, tags.wrap, due.wrap, el('p', 'Locations are your recorded notes, not live tracking.', 'subtle'), actions(button('Cancel', () => close(), 'secondary'), save));
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (photoBusy || busy)
            return;
        save.disabled = true;
        try {
            await mutate(s => { saveItem(s, { name: name.input.value.trim(), locationId: place.input.value || null, location: where.input.value.trim(), notes: notes.input.value.trim(), tags: tags.input.value.split(',').map(t => t.trim()).filter(Boolean), photo, due: due.input.value, sample: item?.sample || false }, id); });
            dirty = false;
            close(true);
            render();
            toast(item ? 'Item updated.' : 'Item saved on this device.');
        }
        catch (error) {
            showError(error);
        }
        finally {
            save.disabled = false;
        }
    });
    dialog.append(form);
    name.input.focus();
}
function details(id: string) {
    const item = state.items.find(i => i.id === id);
    if (!item)
        return;
    modal(item.name);
    if (item.photo) {
        const image = el('img');
        image.src = item.photo;
        image.alt = 'Saved photo of ' + item.name;
        image.className = 'detail-photo';
        dialog.append(image);
    }
    dialog.append(el('p', item.location || 'No location recorded', 'location'), el('p', 'User-recorded location · not live tracking', 'subtle'));
    if (item.notes)
        dialog.append(el('p', item.notes));
    if (item.tags.length)
        dialog.append(el('p', item.tags.join(' · ')));
    if (item.due)
        dialog.append(el('p', 'Remember to take: ' + dateLabel(item.due)));
    const history = el('details'), summary = el('summary', 'Previous locations (' + item.history.length + ')');
    history.append(summary);
    if (!item.history.length)
        history.append(el('p', 'No previous location recorded yet.'));
    else {
        const list = el('ol', undefined, 'history');
        for (const h of item.history)
            list.append(el('li', (h.location || 'No location recorded') + ' · ' + timeLabel(h.at)));
        history.append(list);
    }
    dialog.append(el('p', 'Saved ' + timeLabel(item.createdAt) + ' · updated ' + timeLabel(item.updatedAt), 'subtle'), history, actions(button('Close', () => close(), 'secondary'), button('Edit item', () => { close(true); editItem(id); }), button('Delete item', () => { close(true); confirmAction('Delete ' + item.name + '?', 'This permanently removes its record and photo from this device. Linked checklist entries remain, but their item link is removed.', async () => { await mutate(s => deleteItem(s, id)); render(); toast('Item deleted.'); }); }, 'danger')));
}
function confirmAction(title: string, message: string, action: () => Promise<void>, typed = false) {
    modal(title);
    dialog.append(el('p', message));
    const phrase = field('Type DELETE to confirm');
    if (typed)
        dialog.append(phrase.wrap);
    const remove = button('Delete permanently', async () => {
        if (typed && phrase.input.value !== 'DELETE') {
            showError(Error('Type DELETE exactly to confirm.'));
            return;
        }
        remove.disabled = true;
        try {
            await action();
            dirty = false;
            close(true);
        }
        catch (error) {
            showError(error);
            remove.disabled = false;
        }
    }, 'danger'), keep = button('Keep it', () => close(true), 'secondary');
    dialog.append(actions(keep, remove));
    keep.focus();
}
function locations() {
    main.append(heading('Places you know.', 'Reusable locations. Your records stay safe when a place changes.', button('+ Add a location', () => editLocation())));
    if (!state.locations.length) {
        main.append(empty('Make places reusable.', 'Add a room, drawer or bag. Items can also keep a simple written location.'));
        return;
    }
    const grid = el('div', undefined, 'grid');
    for (const place of state.locations) {
        const count = state.items.filter(i => i.locationId === place.id).length, box = el('article', undefined, 'card');
        box.append(el('span', '⌾', 'eyebrow'), el('h2', place.name), el('p', place.detail || 'No nested description'), el('p', count + ' recorded ' + (count === 1 ? 'item' : 'items'), 'subtle'), actions(button('View items', () => { filter = place.id; query = ''; location.hash = 'items'; render(); }, 'secondary'), button('Edit', () => editLocation(place.id), 'secondary')));
        grid.append(box);
    }
    main.append(grid);
}
function editLocation(id?: string) {
    const place = state.locations.find(l => l.id === id);
    modal(place ? 'Edit location' : 'Add location');
    const form = el('form'), name = field('Location name', 'text', place?.name || '', 100), detail = field('Nested description (optional)', 'text', place?.detail || '', 300);
    name.input.required = true;
    detail.input.placeholder = 'Blue drawer → back compartment';
    const save = button('Save location', () => { });
    save.type = 'submit';
    form.append(name.wrap, detail.wrap, el('p', 'Renaming updates linked item locations and keeps their previous recorded location in history.', 'subtle'), actions(button('Cancel', () => close(), 'secondary'), save));
    if (place)
        form.append(button('Remove location', () => { close(true); confirmAction('Remove ' + place.name + '?', 'Item records and their written locations remain. Only the reusable location and its links are removed.', async () => { await mutate(s => removeLocation(s, id!)); filter = ''; render(); }); }, 'danger'));
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await mutate(s => {
                if (id)
                    renameLocation(s, id, name.input.value.trim(), detail.input.value.trim());
                else
                    s.locations.push({ id: uid(), name: name.input.value.trim(), detail: detail.input.value.trim() });
            });
            dirty = false;
            close(true);
            render();
            toast('Location saved.');
        }
        catch (error) {
            showError(error);
        }
    });
    dialog.append(form);
    name.input.focus();
}
function routines() {
    main.append(heading('Leave with confidence.', 'Reusable checklists. Each active session keeps its own checkmarks.', button('+ New routine', () => editRoutine())));
    if (!state.routines.length) {
        main.append(empty('A calmer way out the door.', 'Create a routine for work, school or your next trip.'));
        return;
    }
    const grid = el('div', undefined, 'grid');
    for (const r of state.routines) {
        const session = state.sessions[r.id], checked = session?.checked.length || 0, box = el('article', undefined, 'card');
        box.append(el('h2', r.name), el('p', r.entries.length + ' checklist ' + (r.entries.length === 1 ? 'entry' : 'entries')), el('p', session ? checked + ' checked · session started ' + timeLabel(session.startedAt) : 'Ready when you are.', 'subtle'), actions(button(session ? 'Continue session' : 'Start checklist', () => runRoutine(r.id)), button('Edit template', () => editRoutine(r.id), 'secondary')));
        grid.append(box);
    }
    main.append(grid);
}
function editRoutine(id?: string) {
    const old = state.routines.find(r => r.id === id), draft: Routine = structuredClone(old || { id: uid(), name: '', entries: [] });
    modal(old ? 'Edit routine template' : 'New routine');
    const form = el('form'), name = field('Routine name', 'text', draft.name, 100);
    name.input.required = true;
    const list = el('div');
    const draw = () => {
        list.replaceChildren();
        for (const e of draft.entries) {
            const box = el('div', undefined, 'entry-editor'), label = field('Checklist entry', 'text', e.label), linked = select('Link to a saved item (optional)', [{ value: '', label: 'No linked item' }, ...state.items.map(i => ({ value: i.id, label: i.name }))], e.itemId || ''), due = field('Remember to take on (optional)', 'date', e.due), essential = el('label', 'Essential item', 'checkbox'), check = el('input');
            check.type = 'checkbox';
            check.checked = e.essential;
            essential.prepend(check);
            label.input.required = true;
            label.input.addEventListener('input', () => e.label = label.input.value);
            linked.input.addEventListener('change', () => { e.itemId = linked.input.value || null; });
            due.input.addEventListener('change', () => e.due = due.input.value);
            check.addEventListener('change', () => e.essential = check.checked);
            box.append(label.wrap, linked.wrap, due.wrap, essential, button('Remove entry', () => { draft.entries = draft.entries.filter(v => v.id !== e.id); dirty = true; draw(); }, 'secondary'));
            list.append(box);
        }
    };
    draw();
    const add = button('+ Add entry', () => {
        if (draft.entries.length >= 100)
            throw Error('Use up to 100 entries per routine.');
        draft.entries.push({ id: uid(), label: '', essential: false, itemId: null, due: '' });
        dirty = true;
        draw();
    }), save = button('Save template', () => { });
    save.type = 'submit';
    form.append(name.wrap, el('p', 'Editing the template does not clear checked entries that remain in your current session.', 'subtle'), list, add, actions(button('Cancel', () => close(), 'secondary'), save));
    if (old)
        form.append(button('Delete routine', () => { close(true); confirmAction('Delete ' + old.name + '?', 'This removes the routine and its active session, but no item records.', async () => { await mutate(s => { s.routines = s.routines.filter(r => r.id !== id); delete s.sessions[id!]; }); render(); }); }, 'danger'));
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await mutate(s => {
                draft.name = name.input.value.trim();
                const index = s.routines.findIndex(r => r.id === draft.id);
                if (index < 0)
                    s.routines.push(draft);
                else
                    s.routines[index] = draft;
                if (s.sessions[draft.id])
                    s.sessions[draft.id].checked = s.sessions[draft.id].checked.filter(key => draft.entries.some(e => e.id === key));
            });
            dirty = false;
            close(true);
            render();
            toast('Routine template saved.');
        }
        catch (error) {
            showError(error);
        }
    });
    dialog.append(form);
    name.input.focus();
}
async function runRoutine(id: string) {
    if (!state.sessions[id])
        await mutate(s => { s.sessions[id] = { checked: [], startedAt: now() }; });
    const routine = state.routines.find(r => r.id === id);
    if (!routine)
        return;
    modal(routine.name + ' checklist');
    const description = el('p', 'Check before you leave. Your template stays unchanged.'), count = el('p', '', 'subtle'), list = el('div');
    const draw = () => {
        list.replaceChildren();
        const checked = state.sessions[id].checked;
        count.textContent = checked.length + ' of ' + routine.entries.length + ' checked';
        for (const entry of routine.entries) {
            const row = el('div', undefined, 'check-row' + (checked.includes(entry.id) ? ' checked' : '')), box = el('input'), label = el('label'), labelId = 'session-' + entry.id;
            box.type = 'checkbox';
            box.id = labelId;
            box.checked = checked.includes(entry.id);
            label.htmlFor = labelId;
            label.append(el('span', entry.label));
            if (entry.essential)
                label.append(el('span', ' · Essential', 'essential'));
            const item = state.items.find(i => i.id === entry.itemId);
            if (item)
                label.append(el('p', item.name + ' · ' + (item.location || 'No location recorded')));
            if (entry.due)
                label.append(el('p', 'Take on ' + dateLabel(entry.due)));
            box.addEventListener('change', async () => {
                const desired = box.checked;
                box.disabled = true;
                try {
                    await mutate(s => {
                        const session = s.sessions[id];
                        session.checked = session.checked.filter(v => v !== entry.id);
                        if (desired)
                            session.checked.push(entry.id);
                    });
                    dirty = false;
                    draw();
                }
                catch (error) {
                    box.checked = !desired;
                    showError(error);
                    box.disabled = false;
                }
            });
            row.append(box, label);
            list.append(row);
        }
    };
    draw();
    dialog.append(description, count, list, actions(button('Done', () => close(true), 'secondary'), button('Reset session', () => {
        if (!confirm('Start a fresh checklist session? The routine template will remain.'))
            return;
        void mutate(s => { s.sessions[id] = { checked: [], startedAt: now() }; }).then(() => { dirty = false; draw(); render(); }).catch(showError);
    }, 'secondary')));
    dirty = false;
}
function due() {
    main.append(heading('Remember to take.', 'Dates you set, shown inside the app. No background alarms or timed notifications.'));
    const rows = [...state.items.filter(i => i.due).map(i => ({ label: i.name, date: i.due, where: i.location, open: () => details(i.id) })), ...state.routines.flatMap(r => r.entries.filter(e => e.due).map(e => ({ label: r.name + ' · ' + e.label, date: e.due, where: state.items.find(i => i.id === e.itemId)?.location || '', open: () => runRoutine(r.id) })))].sort((a, b) => a.date.localeCompare(b.date));
    if (!rows.length) {
        main.append(empty('Nothing dated yet.', 'Add a “Remember to take on” date to an item or routine entry.'));
        return;
    }
    const grid = el('div', undefined, 'grid');
    for (const row of rows) {
        const card = el('article', undefined, 'card');
        card.append(el('span', row.date < dateToday() ? 'Past due' : row.date === dateToday() ? 'Today' : 'Upcoming', 'pill amber'), el('h2', row.label), el('p', dateLabel(row.date)), el('p', row.where || 'No location recorded'), button('View', row.open, 'secondary'));
        grid.append(card);
    }
    main.append(grid);
}
function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob), a = el('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
function exportBackup() {
    modal('Encrypted backup');
    const form = el('form'), pass = field('New backup passphrase', 'password', '', 1024), confirmPass = field('Confirm passphrase', 'password', '', 1024);
    pass.input.autocomplete = confirmPass.input.autocomplete = 'new-password';
    pass.input.required = confirmPass.input.required = true;
    const save = button('Prepare encrypted backup', () => { });
    save.type = 'submit';
    form.append(el('p', 'Includes all records, photos, locations, routines, sessions and settings. Choose at least 12 characters and save the passphrase separately. A lost passphrase cannot be recovered.'), pass.wrap, confirmPass.wrap, actions(button('Cancel', () => close(), 'secondary'), save));
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (pass.input.value !== confirmPass.input.value) {
            showError(Error('Passphrases must match.'));
            return;
        }
        save.disabled = true;
        busy = true;
        try {
            const blob = await encrypt(state, pass.input.value);
            pass.input.value = confirmPass.input.value = '';
            download(blob, 'Keeplume-' + dateToday() + '.keeplume');
            busy = false;
            await mutate(s => s.settings.lastBackup = now());
            dirty = false;
            close(true);
            render();
            toast('Backup prepared. Save the file, then test importing a copy before relying on it.');
        }
        catch (error) {
            showError(error);
        }
        finally {
            busy = false;
            save.disabled = false;
        }
    });
    dialog.append(form);
    pass.input.focus();
}
function importBackup() {
    modal('Recover a backup');
    const form = el('form'), file = field('Keeplume encrypted backup file', 'file'), pass = field('Backup passphrase', 'password', '', 1024);
    file.input.accept = '.keeplume,application/json';
    file.input.required = pass.input.required = true;
    pass.input.autocomplete = 'off';
    const check = button('Verify backup first', () => { });
    check.type = 'submit';
    form.append(el('p', 'Everything is checked locally before any stored data changes. You will choose merge or replace after verification.'), file.wrap, pass.wrap, actions(button('Cancel', () => close(), 'secondary'), check));
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selected = file.input.files?.[0];
        if (!selected)
            return;
        check.disabled = true;
        busy = true;
        try {
            const incoming = await decrypt(selected, pass.input.value);
            pass.input.value = '';
            await verifyPhotos(incoming.items.map(i => i.photo));
            busy = false;
            dirty = false;
            close(true);
            modal('Backup verified');
            dialog.append(el('p', incoming.items.length + ' items, ' + incoming.locations.length + ' locations and ' + incoming.routines.length + ' routines, including saved photos.'), el('p', 'Merge keeps existing records with matching IDs and adds new records. Replace removes current records first, inside a single transaction. Export your current data before replacing.'));
            const apply = async (mode: 'merge' | 'replace') => {
                if (!confirm(mode === 'replace' ? 'Replace all current Keeplume records with this verified backup? This cannot be undone without your current backup.' : 'Merge this backup? Existing records with matching IDs will be kept.'))
                    return;
                await mutate(s => { const next = mode === 'merge' ? merge(s, incoming) : validate(incoming); Object.assign(s, next, { revision: s.revision }); });
                dirty = false;
                close(true);
                query = filter = '';
                render();
                toast('Recovery completed atomically on this device.');
            };
            dialog.append(actions(button('Cancel', () => close(true), 'secondary'), button('Export current first', () => { close(true); exportBackup(); }, 'secondary'), button('Merge', () => apply('merge')), button('Replace', () => apply('replace'), 'danger')));
        }
        catch (error) {
            showError(error);
            pass.input.value = '';
        }
        finally {
            busy = false;
            check.disabled = false;
        }
    });
    dialog.append(form);
    file.input.focus();
}
function settings() {
    main.append(heading('Made for your device.', 'Your preferences, storage and recovery tools.'));
    const panel = el('section', undefined, 'panel'), appearance = select('Appearance', [{ value: 'system', label: 'Use device setting' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }], state.settings.theme), sort = select('Item order', [{ value: 'updated', label: 'Most recently updated' }, { value: 'name', label: 'Name' }], state.settings.sort);
    appearance.input.addEventListener('change', () => void mutate(s => s.settings.theme = appearance.input.value as State['settings']['theme']).catch(showError));
    sort.input.addEventListener('change', () => void mutate(s => s.settings.sort = sort.input.value as State['settings']['sort']).catch(showError));
    panel.append(el('h2', 'Display'), appearance.wrap, sort.wrap);
    const backup = el('section', undefined, 'panel');
    backup.append(el('h2', 'Your safety net.'), el('p', 'Records and photos stay in this browser’s IndexedDB, not on a server. Browser data can be cleared or evicted. Keep backups outside this browser.'), el('p', state.settings.lastBackup ? 'Last export prepared: ' + timeLabel(state.settings.lastBackup) : 'No backup export prepared yet.', 'subtle'), actions(button('Export encrypted backup', exportBackup), button('Import backup', importBackup, 'secondary')), el('p', 'Exports do not upload or sync. Save your passphrase separately; Keeplume cannot recover it.', 'subtle'));
    const storage = el('section', undefined, 'panel'), estimate = el('p', 'Checking storage availability…');
    storage.append(el('h2', 'Device storage'), estimate, button('Request persistent storage', async () => { const allowed = await navigator.storage?.persist?.(); toast(allowed ? 'This browser granted persistent storage. Still keep external backups.' : 'Persistent storage was not granted or is unsupported. Keep external backups.'); }, 'secondary'));
    void navigator.storage?.estimate?.().then(value => {
        if (estimate.isConnected)
            estimate.textContent = 'Browser-reported usage: ' + (Number(value.usage || 0) / 1024 / 1024).toFixed(1) + ' MB' + (value.quota ? ' of approximately ' + (value.quota / 1024 / 1024).toFixed(0) + ' MB' : '') + '. This may include the offline app shell; available space is not guaranteed.';
    }).catch(() => estimate.textContent = 'Storage estimate unavailable. Keep external backups.');
    if (!navigator.storage?.estimate)
        estimate.textContent = 'Storage estimates are not available in this browser.';
    const install = el('section', undefined, 'panel');
    install.append(el('h2', 'Keep Keeplume close.'), el('p', 'On iPhone: open this address in Safari → Share → Add to Home Screen. This is a web app, not an App Store listing.'), el('p', 'After one successful online load, saved items and routines work offline on this same device/browser. Installation is not cloud backup.'));
    if (!standalone()) {
        install.append(button(installPrompt ? 'Install Keeplume' : 'View installation steps', async () => {
            if (installPrompt) {
                const event = installPrompt;
                installPrompt = null;
                await event.prompt();
                await event.userChoice;
                render();
            }
            else
                toast('iPhone: Safari → Share → Add to Home Screen. Other browsers: use their Install app or Apps menu.');
        }, 'secondary'));
    }
    else
        install.append(el('p', 'Running in your app window.', 'subtle'));
    const help = el('details');
    help.append(el('summary', 'Help, privacy and limitations'));
    for (const text of ['Photos are resized on this device to JPEG, up to 1,400 pixels and 500 KB each. Input limit20 MB/24 megapixels; unsupported HEIC can be converted to JPEG. Resizing strips embedded camera metadata.', 'Location history keeps the most recent20 previous locations. It is not live tracking. Removing a reusable location keeps written item locations.', 'Routines have separate active sessions. Resetting a session does not delete the template. Dates are in-app reminders, not timed notifications.', 'All personal records are local. No analytics, fonts, AI or personal-data API requests. Hosting serves the app files and may retain normal access logs. Records are not encrypted while stored locally; use a device passcode. Backup files use authenticated AES-256-GCM and PBKDF2-SHA256.', 'Back up before changing devices, clearing browser data or replacing records. Import verifies first and writes atomically; merge retains matching IDs. Different browsers and installed apps may have separate storage.', 'Updates wait for your permission. Finish or explicitly discard unsaved edits before applying. There is no automatic cloud synchronization.'])
        help.append(el('p', text));
    const danger = el('section', undefined, 'panel');
    danger.append(el('h2', 'Local data controls'), button('Remove fictional samples', async () => {
        if (!confirm('Remove only fictional sample items? Your own records remain.'))
            return;
        await mutate(s => {
            for (const i of [...s.items])
                if (i.sample)
                    deleteItem(s, i.id);
        });
        render();
        toast('Fictional samples removed.');
    }, 'secondary'), button('Delete all local records', () => { modal('Before deleting your records'); dialog.append(el('p', 'Export a backup first. Deletion removes items, photos, locations, routines, sessions and preferences from this browser. It does not delete saved backup files.'), actions(button('Keep records', () => close(true), 'secondary'), button('Export backup', () => { close(true); exportBackup(); }), button('Continue to confirmation', () => { close(true); confirmAction('Delete all local data?', 'This cannot be undone without an external backup. All item records, photos, routines and preferences will be removed.', async () => { await mutate(s => { const next = blank(); Object.assign(s, next, { revision: s.revision }); }); query = filter = ''; render(); toast('Local records deleted. Saved backup files are unchanged.'); }, true); }, 'danger'))); }, 'danger'));
    main.append(panel, backup, storage, install, help, danger);
}
function standalone() {
    return matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & {
        standalone?: boolean;
    }).standalone === true;
}
function render() {
    if (!state) {
        toast('Device storage is not open. Use Retry before navigating.');
        return;
    }
    theme();
    page = location.hash.slice(1) || 'items';
    if (!['items', 'locations', 'routines', 'due', 'settings'].includes(page))
        page = 'items';
    main.replaceChildren();
    for (const link of document.querySelectorAll<HTMLElement>('[data-page]')) {
        if (link.dataset.page === page)
            link.setAttribute('aria-current', 'page');
        else
            link.removeAttribute('aria-current');
    }
    if (!state.settings.onboarded) {
        showOnboarding();
        return;
    }
    const views: Record<string, () => void> = { items, locations, routines, due, settings };
    views[page]();
}
window.addEventListener('hashchange', () => {
    if (busy || photoBusy) {
        history.replaceState(null, '', '#' + page);
        toast('Wait for the current operation to finish.');
        return;
    }
    if (dialog.open) {
        if (dirty && !confirm('Discard unsaved changes and navigate?')) {
            history.replaceState(null, '', '#' + page);
            return;
        }
        close(true);
    }
    render();
    main.focus();
});
window.addEventListener('beforeinstallprompt', (event: Event) => {
    event.preventDefault();
    installPrompt = event;
    if (page === 'settings' && state)
        render();
});
window.addEventListener('appinstalled', () => {
    installPrompt = null;
    toast('Installation was reported by your browser. Find Keeplume on your device.');
    if (page === 'settings')
        render();
});
const connectivity = () => { $('network').hidden = navigator.onLine; };
window.addEventListener('online', connectivity);
window.addEventListener('offline', connectivity);
connectivity();
$('apply-update').addEventListener('click', () => {
    if (busy || photoBusy) {
        toast('Wait for the current operation to finish.');
        return;
    }
    if (dirty && !confirm('Discard unsaved edits and reload for the update?'))
        return;
    dirty = false;
    waiting?.postMessage('ACTIVATE');
});
async function setupWorker() {
    if (!('serviceWorker' in navigator))
        return;
    try {
        const registration = await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
        const ready = () => {
            if (registration.waiting) {
                waiting = registration.waiting;
                $('update').hidden = false;
            }
        };
        ready();
        registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', ready));
        let reloading = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (waiting && !reloading) {
                reloading = true;
                location.reload();
            }
        });
    }
    catch {
        toast('Offline app setup could not finish. Retry online before relying on offline access.');
    }
}
async function start() {
    if (window.top !== window.self) {
        main.replaceChildren(el('p', 'Open Keeplume directly in your browser for privacy.'));
        return;
    }
    try {
        state = await load();
        render();
        void setupWorker();
        try {
            const changes = new BroadcastChannel('keeplume-changes');
            changes.onmessage = async () => {
                if (dirty || busy) {
                    toast('Another tab changed records. Finish your edits, then reload before saving.');
                    return;
                }
                state = await load();
                render();
            };
        }
        catch { }
        matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (state.settings.theme === 'system')
                theme();
        });
    }
    catch (error) {
        main.replaceChildren(empty('Your library could not open.', 'Do not clear browser data. Reopen Keeplume or restore a backup only after checking the error.', button('Retry', start)));
        main.append(el('p', error instanceof Error ? error.message : 'Storage unavailable', 'error'));
    }
}
void start();
