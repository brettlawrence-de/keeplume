import { MAX_PHOTO } from './model.js';
export async function verifyPhotos(photos: (string | null)[]) {
    for (const photo of photos) {
        if (!photo)
            continue;
        const image = new Image();
        try {
            image.src = photo;
            await image.decode();
            if (!image.naturalWidth || image.naturalWidth > 1400 || image.naturalHeight > 1400)
                throw Error('Invalid photo dimensions.');
        }
        catch {
            throw Error('A backup photo is damaged or unsupported. Nothing was changed.');
        }
        finally {
            image.src = '';
        }
    }
}
export async function preparePhoto(file: File): Promise<string> {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
        throw Error('Choose a JPEG, PNG or WebP photo. If your HEIC photo is unsupported, convert it to JPEG first.');
    if (file.size > 20 * 1024 * 1024)
        throw Error('Choose a photo smaller than 20 MB.');
    const url = URL.createObjectURL(file), image = new Image();
    try {
        await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(Error('This photo could not be opened. Choose another photo or save without one.')); image.src = url; });
        if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 24000000)
            throw Error('This photo is too large. Choose a smaller image.');
        let size = 1400;
        for (let attempt = 0; attempt < 4; attempt++) {
            const scale = Math.min(1, size / Math.max(image.naturalWidth, image.naturalHeight)), canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            const ctx = canvas.getContext('2d');
            if (!ctx)
                throw Error('Photo preparation is unavailable. You can save without a photo.');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.78));
            if (blob && blob.size <= MAX_PHOTO)
                return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(Error('Could not prepare this photo.')); reader.readAsDataURL(blob); });
            size = Math.floor(size * 0.7);
        }
        throw Error('This photo could not fit safely. Choose a smaller image.');
    }
    finally {
        URL.revokeObjectURL(url);
    }
}
