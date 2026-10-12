import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {blank,saveItem,validate} from '../dist/model.js';
test('malformed images, oversized JPEG dimensions and prototype-bearing IDs are rejected',()=>{
 const s=blank(),a=saveItem(s,{name:'Synthetic',locationId:null,location:'',notes:'',tags:[],photo:null,due:'',sample:false});a.photo='data:image/jpeg;base64,'+btoa(String.fromCharCode(255,216,255,192,0,8,8,127,255,127,255,3,255,217));assert.throws(()=>validate(s),/invalid/);a.photo=null;a.id='__proto__';assert.throws(()=>validate(s),/invalid/);
});
test('offline shell updates require explicit activation and only delete app cache, never IndexedDB',()=>{
 const worker=fs.readFileSync('dist/service-worker.js','utf8');assert.match(worker,/event.data==='ACTIVATE'/);assert.match(worker,/name.startsWith\('keeplume-shell-'\)/);assert.ok(!worker.includes('indexedDB.deleteDatabase'));assert.match(worker,/event.request.method!=='GET'/);assert.match(worker,/url.origin!==self.location.origin/);assert.ok(!worker.includes('skipWaiting()});self.addEventListener(\'install'));
});
test('UI uses safe user text, private password fields and restrictive bundled-only CSP',()=>{
 const app=fs.readFileSync('src/app.ts','utf8'),html=fs.readFileSync('public/index.html','utf8');assert.ok(!app.includes('innerHTML'));assert.ok(!app.includes('console.log'));assert.match(html,/script-src 'self'/);assert.match(html,/object-src 'none'/);assert.match(app,/password/);assert.ok(!html.includes('fonts.googleapis'));assert.ok(!app.includes('localStorage.setItem'));
});
test('PNG icons have required dimensions; original SVG wordmark and app glyph remain separate',()=>{for(const [file,size]of [['icon-180.png',180],['icon-192.png',192],['icon-512.png',512],['icon-maskable-512.png',512]]){const png=fs.readFileSync('public/assets/'+file);assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);}assert.match(fs.readFileSync('public/assets/wordmark.svg','utf8'),/Remember where/);assert.ok(!fs.readFileSync('public/assets/icon.svg','utf8').includes('<text'));});
