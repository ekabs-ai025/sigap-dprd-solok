/* SIGAP: pembantu bersama untuk halaman staf (login, peran, navigasi).
   Dimuat setelah supabase-js. Peran dibaca dari database (RPC current_staff_role);
   pembatasan sebenarnya dilakukan database, ini hanya menyesuaikan tampilan. */
(function(){
  var SUPABASE_URL = 'https://bekpxjxxpnseizmvysyo.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJla3B4anh4cG5zZWl6bXZ5c3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMjgxNDUsImV4cCI6MjEwNDYwNDE0NX0.iiDyGIoOiUkKIyMz1lkZtOsPQSfMnFCUOnPnoTJgaIY';

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  var MENU = [
    { href: 'verifikasi.html',              label: 'Check-in',          roles: ['satpam','protokol','admin'] },
    { href: 'verifikasi-pendaftaran.html',  label: 'Antrean Verifikasi', roles: ['protokol','admin'] },
    { href: 'admin.html',                   label: 'Rekap Kunjungan',   roles: ['protokol','admin'] },
    { href: 'jadwal-ruang.html',            label: 'Jadwal Ruang',      roles: ['protokol','admin'] },
    { href: 'laporan.html',                 label: 'Laporan',           roles: ['protokol','admin'] },
    { href: 'pengaturan.html',              label: 'Pengaturan',        roles: ['protokol','admin'] }
  ];
  var ROLE_LABEL = { satpam: 'Satpam', protokol: 'Protokol', admin: 'Admin' };
  var HOME = { satpam: 'verifikasi.html', protokol: 'verifikasi-pendaftaran.html', admin: 'verifikasi-pendaftaran.html' };

  var api = { sb: sb, ROLE_LABEL: ROLE_LABEL, HOME: HOME, beforeLogout: null };

  api.esc = function(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  };

  // Tanggal hari ini (YYYY-MM-DD) menurut WIB, bukan zona perangkat.
  api.todayWIB = function(){
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  };

  // '2026-09-21' -> '21 Sep 2026'
  api.tgl = function(iso){
    if(!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    if(isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  api.jam = function(t){ return (t || '').slice(0, 5); };

  api.logout = function(){
    try{ if(typeof api.beforeLogout === 'function') api.beforeLogout(); }catch(e){}
    return sb.auth.signOut().then(function(){ window.location.href = 'login.html'; });
  };

  function currentFile(){
    var p = window.location.pathname.split('/').pop();
    return p || 'index.html';
  }

  function mountNav(email, role){
    var who = document.getElementById('staff-who');
    if(!who) return;
    var here = currentFile();
    var links = MENU.filter(function(m){ return role && m.roles.indexOf(role) >= 0; }).map(function(m){
      var on = (m.href === here);
      return '<a href="' + m.href + '"' + (on ? ' aria-current="page" style="text-decoration:underline;"' : '') + '>' + m.label + '</a>';
    });
    links.push('<a href="#" id="logout-link">Keluar</a>');
    who.innerHTML =
      '<div>' + api.esc(email || '') + (role ? ' &middot; ' + api.esc(ROLE_LABEL[role] || role) : '') + '</div>' +
      '<div class="who-links">' + links.join(' &middot; ') + '</div>';
    var lo = document.getElementById('logout-link');
    if(lo) lo.addEventListener('click', function(e){ e.preventDefault(); api.logout(); });
  }

  function denied(session, role, msg, home){
    mountNav(session && session.user ? session.user.email : '', role);
    var main = document.querySelector('main') || document.body;
    main.innerHTML =
      '<div class="wrap" style="max-width:560px; padding-top:32px;">' +
      '<h1 style="font-size:1.4rem; margin-bottom:12px;">Akses ditolak</h1>' +
      '<p style="color:var(--ink-soft); margin:0 0 20px;">' + api.esc(msg) + '</p>' +
      (home ? '<a class="btn btn-primary" href="' + home + '" style="text-decoration:none;">Ke halaman saya</a> ' : '') +
      '<a class="btn btn-ghost" href="#" id="denied-logout" style="text-decoration:none;">Keluar</a>' +
      '</div>';
    var b = document.getElementById('denied-logout');
    if(b) b.addEventListener('click', function(e){ e.preventDefault(); api.logout(); });
  }

  // Pastikan ada sesi dan peran yang boleh membuka halaman ini.
  // allowed: array peran. cb({ user, role }) dipanggil hanya bila lolos.
  api.guard = function(allowed, cb){
    sb.auth.getSession().then(function(res){
      var session = res.data && res.data.session;
      if(!session){ window.location.href = 'login.html'; return; }
      sb.rpc('current_staff_role').then(function(r){
        var role = r.error ? null : r.data;
        if(!role){
          denied(session, null, 'Akun ini belum diberi peran petugas. Minta admin untuk menetapkan perannya.');
          return;
        }
        if(allowed && allowed.indexOf(role) < 0){
          denied(session, role, 'Peran Anda (' + (ROLE_LABEL[role] || role) + ') tidak memiliki akses ke halaman ini.', HOME[role]);
          return;
        }
        mountNav(session.user.email, role);
        cb({ user: session.user, role: role });
      }).catch(function(){
        denied(session, null, 'Gagal memeriksa peran. Periksa koneksi internet lalu muat ulang halaman.');
      });
    }).catch(function(){
      window.location.href = 'login.html';
    });
  };

  window.SIGAP = api;
})();
