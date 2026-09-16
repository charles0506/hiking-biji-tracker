// ==UserScript==
// @name         健行筆記 走過路線追蹤板
// @namespace    hiking-biji-tracker
// @version      1.0.0
// @description  在健行筆記(hiking.biji.co)寶石任務頁面上，把「去過此路線／已去過」狀態標更清楚，並彙整成一個可跨頁查看、篩選、匯出的個人清單。
// @author       you
// @match        https://hiking.biji.co/*
// @updateURL    https://raw.githubusercontent.com/charles0506/hiking-biji-tracker/main/hiking-biji-tracker.user.js
// @downloadURL  https://raw.githubusercontent.com/charles0506/hiking-biji-tracker/main/hiking-biji-tracker.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const DB_KEY = 'hikingTrackerDB_v1';
    const DONE_HINTS = ['已去過', '已完成', '已走過', 'done'];

    function loadDB() {
        try {
            return GM_getValue(DB_KEY, {});
        } catch (e) {
            return {};
        }
    }

    function saveDB(db) {
        GM_setValue(DB_KEY, db);
    }

    function isDoneNode(btnSpan, iconEl) {
        const text = (btnSpan?.textContent || '').trim();
        if (DONE_HINTS.some((h) => text.includes(h))) return true;
        const iconText = (iconEl?.textContent || '').trim();
        // 網站原本未去過用 "flag" 圖示；一旦變成別的圖示（check / done / place 等）視為已去過
        if (iconText && iconText !== 'flag') return true;
        return false;
    }

    function currentMinisiteId() {
        const m = location.href.match(/[?&]id=(\d+)/);
        return m ? m[1] : null;
    }

    function currentMinisiteTitle() {
        return document.title.replace(/\s*-\s*健行筆記\s*$/, '').trim();
    }

    // ---- 掃描頁面上的 func_btn 卡片，寫進資料庫，並加上清楚的標籤/顏色 ----
    function scanAndTag() {
        const wraps = document.querySelectorAll('.func-wrap');
        if (!wraps.length) return;

        const db = loadDB();
        const minisiteId = currentMinisiteId();
        const minisiteTitle = currentMinisiteTitle();
        let changed = false;

        wraps.forEach((wrap) => {
            const btn = wrap.querySelector('.func_btn[data-id]');
            if (!btn) return;
            const trailId = btn.getAttribute('data-id');
            const span = btn.querySelector('span');
            const icon = btn.querySelector('i');
            const done = isDoneNode(span, icon);

            const itemInfo = wrap.closest('.item-info') || wrap.parentElement;
            const titleLink = itemInfo ? itemInfo.querySelector('a.title') : null;
            const title = titleLink ? titleLink.textContent.trim() : (span ? span.textContent.trim() : trailId);
            const url = titleLink ? new URL(titleLink.getAttribute('href'), location.origin).href : null;
            const cityEl = itemInfo ? itemInfo.querySelector('.city') : null;
            const city = cityEl ? cityEl.textContent.trim() : '';

            const prev = db[trailId] || {};
            db[trailId] = {
                id: trailId,
                title: title || prev.title,
                url: url || prev.url,
                city: city || prev.city,
                done: done || prev.manualDone || false,
                manualDone: prev.manualDone || false,
                lastSeen: new Date().toISOString(),
                minisites: Array.from(new Set([...(prev.minisites || []), minisiteId ? `${minisiteId}:${minisiteTitle}` : null].filter(Boolean))),
            };
            changed = true;

            // ---- 在畫面上加清楚標籤 + 上色，不只依賴原本小圖示 ----
            if (!itemInfo) return;
            itemInfo.style.borderLeft = done ? '4px solid #2e7d32' : '4px solid #c62828';
            itemInfo.style.paddingLeft = '8px';
            itemInfo.style.background = done ? 'rgba(46,125,50,0.06)' : 'rgba(198,40,40,0.04)';

            let chip = itemInfo.querySelector('.hbt-chip');
            if (!chip) {
                chip = document.createElement('span');
                chip.className = 'hbt-chip';
                itemInfo.insertBefore(chip, itemInfo.firstChild);
            }
            chip.textContent = done ? '✅ 已去過' : '⬜ 未去過';
            chip.style.cssText = `display:inline-block;font-size:12px;font-weight:bold;padding:2px 8px;border-radius:10px;margin-bottom:4px;color:#fff;background:${done ? '#2e7d32' : '#9e9e9e'};`;
        });

        if (changed) saveDB(db);
    }

    // ---- 浮動面板：跨頁彙整清單 ----
    function buildPanel() {
        if (document.getElementById('hbt-fab')) return;

        GM_addStyle(`
            #hbt-fab { position:fixed; right:20px; bottom:20px; z-index:99999; width:52px; height:52px; border-radius:50%;
                background:#2e7d32; color:#fff; display:flex; align-items:center; justify-content:center; font-size:22px;
                cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.3); }
            #hbt-panel { position:fixed; right:20px; bottom:84px; z-index:99999; width:360px; max-height:70vh; overflow:auto;
                background:#fff; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,.3); display:none; font-size:13px; }
            #hbt-panel.open { display:block; }
            #hbt-panel header { padding:10px 12px; background:#2e7d32; color:#fff; font-weight:bold; display:flex; justify-content:space-between; align-items:center; }
            #hbt-panel .hbt-tools { padding:8px 12px; display:flex; gap:6px; border-bottom:1px solid #eee; flex-wrap:wrap; }
            #hbt-panel .hbt-tools input { flex:1; min-width:120px; padding:4px 6px; border:1px solid #ccc; border-radius:4px; }
            #hbt-panel .hbt-tools button { padding:4px 8px; border:1px solid #ccc; border-radius:4px; background:#f5f5f5; cursor:pointer; }
            #hbt-panel .hbt-tools button.active { background:#2e7d32; color:#fff; border-color:#2e7d32; }
            #hbt-list { padding:4px 0; }
            .hbt-row { padding:6px 12px; border-bottom:1px solid #f0f0f0; display:flex; gap:8px; align-items:flex-start; }
            .hbt-row a { color:#1565c0; text-decoration:none; }
            .hbt-row .hbt-meta { color:#888; font-size:11px; }
            .hbt-row input[type=checkbox] { margin-top:3px; }
            #hbt-summary { padding:6px 12px; color:#555; border-bottom:1px solid #eee; }
        `);

        const fab = document.createElement('div');
        fab.id = 'hbt-fab';
        fab.title = '我的健行進度';
        fab.textContent = '🥾';
        document.body.appendChild(fab);

        const panel = document.createElement('div');
        panel.id = 'hbt-panel';
        panel.innerHTML = `
            <header><span>我的健行進度</span><span id="hbt-close" style="cursor:pointer">✕</span></header>
            <div id="hbt-summary"></div>
            <div class="hbt-tools">
                <button data-f="all" class="active">全部</button>
                <button data-f="done">已去過</button>
                <button data-f="todo">未去過</button>
                <input id="hbt-search" placeholder="搜尋路線名稱...">
                <button id="hbt-export">匯出 JSON</button>
            </div>
            <div id="hbt-list"></div>
        `;
        document.body.appendChild(panel);

        fab.addEventListener('click', () => {
            panel.classList.toggle('open');
            if (panel.classList.contains('open')) renderList();
        });
        panel.querySelector('#hbt-close').addEventListener('click', () => panel.classList.remove('open'));

        let filter = 'all';
        let keyword = '';

        panel.querySelectorAll('.hbt-tools button[data-f]').forEach((btn) => {
            btn.addEventListener('click', () => {
                filter = btn.getAttribute('data-f');
                panel.querySelectorAll('.hbt-tools button[data-f]').forEach((b) => b.classList.toggle('active', b === btn));
                renderList();
            });
        });
        panel.querySelector('#hbt-search').addEventListener('input', (e) => {
            keyword = e.target.value.trim();
            renderList();
        });
        panel.querySelector('#hbt-export').addEventListener('click', () => {
            const db = loadDB();
            const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'hiking-biji-progress.json';
            a.click();
        });

        function renderList() {
            const db = loadDB();
            const rows = Object.values(db).sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh-Hant'));
            const doneCount = rows.filter((r) => r.done).length;
            panel.querySelector('#hbt-summary').textContent = `共收錄 ${rows.length} 條路線，已去過 ${doneCount} 條`;

            const list = panel.querySelector('#hbt-list');
            list.innerHTML = '';
            rows
                .filter((r) => (filter === 'done' ? r.done : filter === 'todo' ? !r.done : true))
                .filter((r) => !keyword || (r.title || '').includes(keyword))
                .forEach((r) => {
                    const row = document.createElement('div');
                    row.className = 'hbt-row';
                    row.innerHTML = `
                        <input type="checkbox" ${r.manualDone ? 'checked' : ''} title="自行標記已去過（僅存在本機，不會回寫網站）">
                        <div>
                            <div>${r.done ? '✅' : '⬜'} <a href="${r.url || '#'}" target="_blank" rel="noopener">${r.title}</a></div>
                            <div class="hbt-meta">${r.city || ''} ${r.minisites && r.minisites.length ? '｜來自：' + r.minisites.map((m) => m.split(':')[1]).join('、') : ''}</div>
                        </div>
                    `;
                    row.querySelector('input[type=checkbox]').addEventListener('change', (e) => {
                        const db2 = loadDB();
                        db2[r.id].manualDone = e.target.checked;
                        db2[r.id].done = db2[r.id].manualDone || db2[r.id].done;
                        saveDB(db2);
                        renderList();
                    });
                    list.appendChild(row);
                });
        }

        renderList();
    }

    function init() {
        buildPanel();
        scanAndTag();
        // 網站用 AJAX 換路線清單／點擊 func_btn 後會改動 DOM，用 MutationObserver 補抓
        const target = document.querySelector('#trail_list') || document.body;
        const obs = new MutationObserver(() => scanAndTag());
        obs.observe(target, { childList: true, subtree: true });
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 500);
    } else {
        window.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
    }
})();
