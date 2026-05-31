// systems.js — Phase 0 multi-system config.
// One codebase serves multiple learning systems; the logged-in user's profiles.system
// (or, for well2go.ai, the hostname) selects which entry here drives routing + branding.
//
// Each system entry:
//   product      — rooms.product value to filter/create rooms by
//   label        — page brand label (English lesson assistant / 健康健身助理 / …)
//   brand        — short brand name used in BRAND_SWAP (Speak2GO / Well2GO / …)
//   glossaryLang — language code threaded into glossary import ('en' | 'ko')
//   essayMode    — true for the essay-writing system (grading via chat2go path)
//   industry     — rooms.industry value used when auto-creating a coach room
//   roomId       — fixed singleton room UUID for this system ('' = none yet)
(function () {
  window.SYSTEMS = {
    speak2go: {
      product: 'speak2go',
      path: '/Codex-speak2go/glossary/',
      label: 'English lesson assistant',
      brand: 'Speak2GO',
      glossaryLang: 'en',
      essayMode: false,
      industry: 'English speaking',
      roomId: '5b622bc4-88b4-47c1-9aa6-643c4b1e0f96', // iamarobot 的 Chat
    },
    well2go: {
      product: 'well2go',
      path: '/Codex-speak2go/chat.html',
      label: '健康健身助理',
      brand: 'Well2GO',
      glossaryLang: 'en',
      essayMode: false,
      industry: 'Rehab therapy',
      roomId: '8980e7e0-e24a-44c4-b542-47c8e9105947', // iamaog 的 Chat
    },
    essay: {
      product: 'essay',
      path: '/Codex-speak2go/essay/',
      label: 'English essay coach',
      brand: 'Speak2GO',
      glossaryLang: 'en',
      essayMode: true,
      industry: '英文作文',
      roomId: '01c240c3-9b94-472f-953b-d27584749008', // essay 批改室
    },
    korean: {
      product: 'korean',
      path: '/Codex-speak2go/korean/',
      label: 'Korean lesson assistant',
      brand: 'Speak2GO',
      glossaryLang: 'ko',
      essayMode: false,
      industry: 'Korean speaking',
      roomId: 'f015f5d5-2163-490f-bf99-92a2ffa45bdd', // product='korean', serverless=true
    },
  };

  // Pure resolver — given a hostname + profile.system, return the system id.
  // well2go.ai is FORCED to 'well2go' to preserve current domain behavior;
  // otherwise the user's bound system (default 'speak2go') wins.
  // Exposed for headless unit-testing of the routing decision.
  window.resolveSystemId = function (hostname, profileSystem) {
    if ((hostname || '').toLowerCase().includes('well2go')) return 'well2go';
    var sys = profileSystem || 'speak2go';
    return window.SYSTEMS[sys] ? sys : 'speak2go';
  };
})();
