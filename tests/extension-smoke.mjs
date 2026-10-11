import {chromium} from '@playwright/test';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const extension=path.resolve('extension/.output/chrome-mv3');
const manifest=JSON.parse(await readFile(path.join(extension,'manifest.json'),'utf8'));
assert.equal(manifest.manifest_version,3);
assert.deepEqual(manifest.permissions.sort(),['activeTab','storage']);
const profile=await mkdtemp(path.join(tmpdir(),'tabd-extension-test-'));
let context;
try{
 context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const id=new URL(worker.url()).host;
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`chrome-extension://${id}/popup.html`);
 await page.getByRole('button',{name:'Connect to Tabd'}).waitFor();
 assert.equal(await page.getByRole('heading',{name:'Good finds belong here.'}).count(),1);
 assert.deepEqual(errors,[]);
 console.log('Extension smoke test passed: MV3, minimal permissions, service worker, popup, account-link entry point.');
}finally{await context?.close();await rm(profile,{recursive:true,force:true});}
