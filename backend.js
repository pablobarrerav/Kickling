/* Kickling · conexión con Supabase.
   Hace que el juego vea una "base de datos de documentos" (colecciones y documentos) y un usuario,
   con el mismo formato que usaba en Claude. No necesita librerías. */
(function () {
  var C = window.KICKLING_CONFIG || {};
  if (!C.supabaseUrl || !C.anonKey) return;               // sin configuración: modo individual
  var URL = String(C.supabaseUrl).trim().replace(/\/(rest|auth)\/v1.*$/,'').replace(/\/+$/, ''), KEY = String(C.anonKey).trim(), SK = 'kickling-sb-session';
  var sess = null, pend = null;

  function load() { try { sess = JSON.parse(localStorage.getItem(SK) || 'null'); } catch (e) { sess = null; } }
  function store(s) { sess = s; try { localStorage.setItem(SK, JSON.stringify(s)); } catch (e) {} }
  function expSoon(tok) { try { var p = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); return p.exp * 1000 < Date.now() + 60000; } catch (e) { return true; } }
  function pack(j) { return { access_token: j.access_token, refresh_token: j.refresh_token, uid: j.user && j.user.id }; }

  async function post(path, body) {
    var r = await fetch(URL + path, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    if (!r.ok) throw new Error('auth ' + r.status);
    return r.json();
  }
  // Sesión anónima: cada navegador recibe una identidad propia, guardada en el dispositivo.
  async function session() {
    if (pend) return pend;
    pend = (async function () {
      if (!sess) load();
      if (sess && sess.access_token && !expSoon(sess.access_token)) return sess;
      if (sess && sess.refresh_token) {
        try { var j = await post('/auth/v1/token?grant_type=refresh_token', { refresh_token: sess.refresh_token }); store(pack(j)); return sess; } catch (e) {}
      }
      store(pack(await post('/auth/v1/signup', {})));
      return sess;
    })();
    try { return await pend; } finally { pend = null; }
  }

  async function api(method, path, body, extra) {
    var s = await session();
    var h = Object.assign({ apikey: KEY, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, extra || {});
    var r = await fetch(URL + '/rest/v1' + path, { method: method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!r.ok) { var t = ''; try { t = await r.text(); } catch (e) {} throw new Error('db ' + r.status + ' ' + t.slice(0, 160)); }
    var tx = await r.text();
    return tx ? JSON.parse(tx) : null;
  }

  var OPS = { '==': 'eq', '>=': 'gte', '>': 'gt', '<=': 'lte', '<': 'lt', '!=': 'neq' };
  function mkDoc(row) { return { id: row.id, exists: true, data: function () { return row.data; } }; }
  function enc(v) { return encodeURIComponent(v); }

  function Query(col) { this.col = col; this.f = []; this.o = null; this.n = 0; }
  Query.prototype.where = function (field, op, val) { var q = this.clone(); q.f.push([field, op, val]); return q; };
  Query.prototype.orderBy = function (field, dir) { var q = this.clone(); q.o = [field, String(dir || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc']; return q; };
  Query.prototype.limit = function (n) { var q = this.clone(); q.n = n; return q; };
  Query.prototype.clone = function () { var q = new Query(this.col); q.f = this.f.slice(); q.o = this.o; q.n = this.n; return q; };
  Query.prototype.get = async function () {
    var p = 'col=eq.' + enc(this.col) + '&select=id,data';
    this.f.forEach(function (x) { p += '&' + enc('data->>' + x[0]) + '=' + (OPS[x[1]] || 'eq') + '.' + enc(x[2]); });
    p += '&order=' + (this.o ? enc('data->' + this.o[0]) + '.' + this.o[1] + ',id.asc' : 'id.asc');
    var rows = [], PAGE = 1000, off = 0;
    for (;;) {
      var want = this.n ? Math.min(PAGE, this.n - rows.length) : PAGE;
      if (want <= 0) break;
      var part = await api('GET', '/docs?' + p + '&limit=' + want + '&offset=' + off);
      rows = rows.concat(part); off += part.length;
      if (part.length < want) break;
    }
    var docs = rows.map(mkDoc);
    return { docs: docs, empty: !docs.length, size: docs.length, forEach: function (f) { docs.forEach(f); } };
  };

  function DocRef(path) { var i = path.indexOf('/'); this.col = path.slice(0, i); this.id = path.slice(i + 1); }
  DocRef.prototype.get = async function () {
    var rows = await api('GET', '/docs?col=eq.' + enc(this.col) + '&id=eq.' + enc(this.id) + '&select=id,data');
    if (rows && rows.length) return mkDoc(rows[0]);
    var id = this.id; return { id: id, exists: false, data: function () { return undefined; } };
  };
  DocRef.prototype.set = async function (data) {
    await api('POST', '/docs?on_conflict=col,id', [{ col: this.col, id: this.id, data: data, updated_at: new Date().toISOString() }],
      { Prefer: 'resolution=merge-duplicates,return=minimal' });
  };
  DocRef.prototype.update = async function (patch) { await api('POST', '/rpc/doc_update', { p_col: this.col, p_id: this.id, p_patch: patch }); };
  DocRef.prototype.delete = async function () { await api('DELETE', '/docs?col=eq.' + enc(this.col) + '&id=eq.' + enc(this.id)); };
  DocRef.prototype.acquire = async function (o) {
    var ok = await api('POST', '/rpc/doc_lock', { p_id: this.col + '/' + this.id, p_holder: String(o.holder), p_ttl_ms: Math.round(o.ttlMs || 20000) });
    return { acquired: ok === true };
  };

  var db = {
    collection: function (c) { return new Query(c); },
    doc: function (p) { return new DocRef(p); }
  };
  var user = {
    id: async function () { return (await session()).uid; },
    can: async function () { return true; }
  };

  window.claude = {
    use: async function (name) {
      try {
        if (name === 'db') { await session(); return db; }
        if (name === 'user') { await session(); return user; }
      } catch (e) { /* sin conexión: el juego sigue en modo individual */ }
      return null;
    }
  };
})();
