/* PRESTIGE MOBILE (plan d'octobre, lot L13) : pointage et photos des produits depuis le telephone.
 * Page autonome (sans ExtJS). Le jeton signe est garde sur le telephone ; le mot de passe jamais.
 * Necessite HTTPS pour la camera et la position (sauf sur localhost). */
(function () {
  'use strict';
  var API = '../api/v1/mobile/';
  var CLE_JETON = 'prestigeMobileJeton', CLE_APPAREIL = 'prestigeMobileAppareil';
  var etat = { moi: null, sens: null, produit: null, photo: null, flux: null, scan: null };
  var $ = function (id) { return document.getElementById(id); };

  function stock(k, v) {
    try { if (v === undefined) { return localStorage.getItem(k); } if (v === null) { localStorage.removeItem(k); } else { localStorage.setItem(k, v); } } catch (e) { /* stockage indisponible */ }
    return null;
  }
  function appareil() {
    var a = stock(CLE_APPAREIL);
    if (!a) {
      a = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'app-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      stock(CLE_APPAREIL, a);
    }
    return a;
  }
  function nomAppareil() {
    var ua = navigator.userAgent, m = ua.match(/\(([^)]+)\)/);
    return (m ? m[1].split(';').slice(-1)[0].replace(/Build.*/, '').trim() : 'Téléphone').slice(0, 80) || 'Téléphone';
  }
  var minuteur;
  function message(t, genre) {
    var m = $('message'); m.textContent = t; m.className = genre || ''; m.hidden = false;
    clearTimeout(minuteur); minuteur = setTimeout(function () { m.hidden = true; }, genre === 'erreur' ? 6000 : 3500);
  }
  function vue(id) {
    ['vConnexion', 'vAccueil', 'vScan', 'vPhoto'].forEach(function (v) { $(v).hidden = v !== id; });
    window.scrollTo(0, 0);
  }
  function appel(chemin, options) {
    options = options || {};
    var h = options.headers || {}, j = stock(CLE_JETON);
    if (j) { h.Authorization = 'Bearer ' + j; }
    if (options.json !== undefined) { h['Content-Type'] = 'application/json'; options.body = JSON.stringify(options.json); }
    return fetch(API + chemin, { method: options.method || 'GET', headers: h, body: options.body, credentials: 'omit' })
      .then(function (r) {
        return r.json().catch(function () { return { success: false, message: 'Réponse illisible du serveur (' + r.status + ').' }; })
          .then(function (o) {
            if (r.status === 401) { deconnecter(o.message || 'Session expirée : reconnectez-vous.'); throw new Error('401'); }
            return o;
          });
      }, function () { message('Serveur injoignable : vérifiez le Wi-Fi de l\'officine.', 'erreur'); throw new Error('reseau'); });
  }

  /* ---------------- connexion */
  function deconnecter(raison) {
    stock(CLE_JETON, null); etat.moi = null;
    $('qui').textContent = ''; $('btnQuitter').hidden = true; vue('vConnexion');
    if (raison) { message(raison, 'erreur'); }
  }
  $('fConnexion').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, b = f.querySelector('button'); b.disabled = true;
    fetch(API + 'connexion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit',
      body: JSON.stringify({ login: f.login.value.trim(), motDePasse: f.motDePasse.value, appareil: appareil(), nomAppareil: nomAppareil() }) })
      .then(function (r) { return r.json(); })
      .then(function (o) {
        f.motDePasse.value = '';
        if (!o.success) { message(o.message || 'Connexion refusée.', 'erreur'); return; }
        stock(CLE_JETON, o.jeton); accueil(o);
      }, function () { message('Serveur injoignable : vérifiez le Wi-Fi de l\'officine.', 'erreur'); })
      .finally(function () { b.disabled = false; });
  });
  $('btnQuitter').addEventListener('click', function () { deconnecter(); });

  /* ---------------- accueil */
  function accueil(moi) {
    etat.moi = moi;
    $('qui').textContent = moi.utilisateur.nom; $('btnQuitter').hidden = false;
    $('cPointage').hidden = !moi.droits.pointage; $('cPhotos').hidden = !moi.droits.photos;
    $('cRien').hidden = moi.droits.pointage || moi.droits.photos;
    var aide = [];
    if (moi.pointage.qr) { aide.push('scannez le QR code affiché à l\'officine'); }
    if (moi.pointage.gps) { aide.push('la position du téléphone est vérifiée'); }
    $('aidePointage').textContent = aide.length ? 'Au pointage : ' + aide.join(' ; ') + '.' : '';
    vue('vAccueil');
    if (moi.droits.pointage) { chargerPointages(); }
  }
  function chargerPointages() {
    appel('pointages').then(function (o) {
      var l = $('lPointages'); l.innerHTML = '';
      (o.data || []).forEach(function (p) {
        var li = document.createElement('li');
        li.innerHTML = '<span class="nom"></span><span class="badge"></span>';
        li.firstChild.textContent = p.heure + (p.source !== 'MOBILE' ? ' (' + p.source.toLowerCase() + ')' : '');
        li.lastChild.textContent = p.sens === 'ENTREE' ? 'Entrée' : p.sens === 'SORTIE' ? 'Sortie' : '?';
        li.lastChild.className = 'badge ' + p.sens;
        l.appendChild(li);
      });
      if (!l.children.length) { l.innerHTML = '<li class="vide">Aucun pointage.</li>'; }
    }).catch(function () { /* deja signale */ });
  }

  /* ---------------- pointage */
  Array.prototype.forEach.call(document.querySelectorAll('[data-sens]'), function (b) {
    b.addEventListener('click', function () {
      etat.sens = b.getAttribute('data-sens');
      if (etat.moi.pointage.qr) { ouvrirScan(); } else { envoyerPointage(null); }
    });
  });
  function position() {
    return new Promise(function (ok) {
      if (!etat.moi.pointage.gps || !navigator.geolocation) { ok(null); return; }
      navigator.geolocation.getCurrentPosition(function (p) { ok(p.coords); }, function () { ok(null); },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    });
  }
  function envoyerPointage(code) {
    message('Pointage en cours…');
    position().then(function (c) {
      return appel('pointages', { method: 'POST', json: { sens: etat.sens, code: code,
        latitude: c ? c.latitude : null, longitude: c ? c.longitude : null, precision: c ? c.accuracy : null } });
    }).then(function (o) {
      message(o.message || (o.success ? 'Pointage enregistré.' : 'Pointage refusé.'), o.success ? 'ok' : 'erreur');
      /* refus : on reste sur le scan pour reessayer (sauf si le code n'y est pour rien) */
      if (o.success || $('vScan').hidden) {
        fermerScan(); vue('vAccueil');
      } else {
        $('fCode').code.value = '';
      }
      if (o.success) { chargerPointages(); if (navigator.vibrate) { navigator.vibrate(120); } }
    }).catch(function () { /* deja signale */ });
  }
  function ouvrirScan() {
    vue('vScan'); $('fCode').code.value = '';
    var video = $('video');
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices) { video.hidden = true; $('fCode').code.focus(); return; }
    video.hidden = false;
    var detecteur = new window.BarcodeDetector({ formats: ['qr_code'] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(function (flux) {
      etat.flux = flux; video.srcObject = flux; video.play();
      etat.scan = setInterval(function () {
        if (video.readyState < 2) { return; }
        detecteur.detect(video).then(function (codes) {
          var c = codes.map(function (x) { return x.rawValue; }).filter(function (v) { return /^PRESTIGE-POINTAGE:/.test(v); })[0];
          if (c && etat.scan) { clearInterval(etat.scan); etat.scan = null; envoyerPointage(c); }
        }).catch(function () { /* image suivante */ });
      }, 350);
    }, function () { video.hidden = true; message('Caméra indisponible : saisissez le code affiché.', 'erreur'); });
  }
  function fermerScan() {
    if (etat.scan) { clearInterval(etat.scan); etat.scan = null; }
    if (etat.flux) { etat.flux.getTracks().forEach(function (t) { t.stop(); }); etat.flux = null; }
  }
  $('fCode').addEventListener('submit', function (e) { e.preventDefault(); envoyerPointage(e.target.code.value.trim().toUpperCase()); });
  $('btnAnnulerScan').addEventListener('click', function () { fermerScan(); vue('vAccueil'); });

  /* ---------------- photos */
  var attente;
  $('rProduit').addEventListener('input', function (e) {
    clearTimeout(attente);
    var q = e.target.value.trim();
    if (q.length < 2) { $('lProduits').innerHTML = ''; return; }
    attente = setTimeout(function () {
      appel('produits?q=' + encodeURIComponent(q)).then(function (o) {
        var l = $('lProduits'); l.innerHTML = '';
        (o.data || []).forEach(function (p) {
          var li = document.createElement('li'); li.className = 'produit';
          li.innerHTML = '<span class="nom"></span><span class="cip"></span><span class="badge"></span>';
          li.children[0].textContent = p.nom; li.children[1].textContent = p.cip;
          li.children[2].textContent = p.images + ' photo' + (p.images > 1 ? 's' : '');
          li.addEventListener('click', function () { ouvrirPhoto(p); });
          l.appendChild(li);
        });
        if (!l.children.length) { l.innerHTML = '<li class="vide">Aucun produit.</li>'; }
      }).catch(function () { /* deja signale */ });
    }, 300);
  });
  function ouvrirPhoto(p) {
    etat.produit = p; etat.photo = null;
    $('tPhoto').textContent = p.nom; $('apercu').hidden = true; $('btnEnvoyer').disabled = true;
    $('cPrincipale').checked = p.images === 0; $('iPhoto').value = '';
    vue('vPhoto');
  }
  /* la photo est reduite sur le telephone (1600 px, JPEG) : envoi rapide, bien sous la limite de 5 Mo */
  $('iPhoto').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    if (!f) { return; }
    var img = new Image();
    img.onload = function () {
      var r = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      c.toBlob(function (b) {
        etat.photo = b; $('apercu').src = URL.createObjectURL(b); $('apercu').hidden = false; $('btnEnvoyer').disabled = false;
      }, 'image/jpeg', 0.85);
    };
    img.onerror = function () { message('Image illisible.', 'erreur'); };
    img.src = URL.createObjectURL(f);
  });
  $('btnEnvoyer').addEventListener('click', function () {
    if (!etat.photo) { return; }
    var fd = new FormData(), b = $('btnEnvoyer');
    fd.append('principale', $('cPrincipale').checked ? 'true' : 'false');
    fd.append('fichier', etat.photo, 'photo.jpg');
    b.disabled = true;
    appel('produits/' + encodeURIComponent(etat.produit.id) + '/images', { method: 'POST', body: fd }).then(function (o) {
      message(o.success ? 'Photo enregistrée.' : (o.message || 'Photo refusée.'), o.success ? 'ok' : 'erreur');
      if (o.success) { vue('vAccueil'); $('rProduit').dispatchEvent(new Event('input')); } else { b.disabled = false; }
    }).catch(function () { b.disabled = false; });
  });
  $('btnAnnulerPhoto').addEventListener('click', function () { vue('vAccueil'); });

  /* ---------------- demarrage */
  if (stock(CLE_JETON)) {
    appel('moi').then(function (o) { if (o.success) { accueil(o); } else { deconnecter(); } }).catch(function () { /* */ });
  } else {
    vue('vConnexion');
  }
}());
