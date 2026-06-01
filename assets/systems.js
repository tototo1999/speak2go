// systems.js — multi-system config (砍韩语后:超级单词卡 + 超级作文卡 两系统 + well2go)。
// One codebase serves multiple learning systems; the logged-in user's profiles.system
// (or, for well2go.ai, the hostname) selects which entry here drives routing + branding.
//
// Each system entry:
//   product      — rooms.product value to filter/create rooms by
//   path         — sub-path this system's logged-in users land on
//   label        — page brand label
//   brand        — short brand name used in BRAND_SWAP
//   glossaryLang — language code threaded into glossary import ('en')
//   essayMode    — true for the essay-writing system
//   industry     — rooms.industry value used when auto-creating a coach room
//   roomId       — fixed singleton room UUID for this system ('' = none yet)
(function () {
  window.SYSTEMS = {
    speak2go: {
      product: 'speak2go',
      path: '/glossary/',
      label: 'English lesson assistant',
      brand: 'Speak2GO',
      glossaryLang: 'en',
      essayMode: false,
      industry: 'English speaking',
      roomId: '5b622bc4-88b4-47c1-9aa6-643c4b1e0f96', // iamarobot 的 Chat
    },
    well2go: {
      product: 'well2go',
      path: '/chat.html',
      label: '健康健身助理',
      brand: 'Well2GO',
      glossaryLang: 'en',
      essayMode: false,
      industry: 'Rehab therapy',
      roomId: '8980e7e0-e24a-44c4-b542-47c8e9105947', // iamaog 的 Chat
    },
    essay: {
      product: 'essay',
      path: '/essay-card/',
      label: 'English essay coach',
      brand: 'Speak2GO',
      glossaryLang: 'en',
      essayMode: true,
      industry: '英文作文',
      roomId: '01c240c3-9b94-472f-953b-d27584749008', // essay 批改室(超级作文卡复用)
    },
  };

  // Pure resolver — given a hostname + profile.system, return the system id.
  // well2go.ai is FORCED to 'well2go'; otherwise the user's bound system (default 'speak2go') wins.
  // 韩语已下线:profile.system='korean' 的用户会 fallback 到 speak2go。
  window.resolveSystemId = function (hostname, profileSystem) {
    if ((hostname || '').toLowerCase().includes('well2go')) return 'well2go';
    var sys = profileSystem || 'speak2go';
    return window.SYSTEMS[sys] ? sys : 'speak2go';
  };
})();
