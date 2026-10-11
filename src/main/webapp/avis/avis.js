/* Page publique « Votre avis » (menu Avis clients). Ouverte par le QR code de la pharmacie : le jeton signe du QR
 * (?t=...) est renvoye avec l'avis, le serveur le verifie. Aucune ressource externe, aucun innerHTML : tout texte
 * venu du serveur ou du client est pose par textContent. */
(function () {
  'use strict';
  var API = '../api/v1/avis-public/';
  var LIBELLES = ['', 'Très déçu', 'Déçu', 'Correct', 'Satisfait', 'Très satisfait'];
  var $ = function (id) { return document.getElementById(id); };
  var jeton = new URLSearchParams(location.search).get('t') || '';
  var note = 0, ouverture = Date.now();
  var criteres = {};

  function etat(texte) {
    $('formulaire').hidden = true;
    $('etatLien').hidden = false;
    $('etatTexte').textContent = texte;
  }

  function requete(methode, url, corps, fin) {
    var x = new XMLHttpRequest();
    x.open(methode, url, true);
    x.setRequestHeader('Accept', 'application/json');
    if (corps) { x.setRequestHeader('Content-Type', 'application/json'); }
    x.timeout = 20000;
    x.onload = function () {
      var r = null;
      try { r = JSON.parse(x.responseText); } catch (e) { r = null; }
      fin(x.status, r);
    };
    x.onerror = x.ontimeout = function () { fin(0, null); };
    x.send(corps ? JSON.stringify(corps) : null);
  }

  function majEnvoi() { $('envoyer').disabled = note === 0; }

  /* etoiles */
  var etoiles = Array.prototype.slice.call(document.querySelectorAll('#etoiles button'));
  function poserNote(n) {
    note = n;
    etoiles.forEach(function (b, i) {
      b.classList.toggle('allumee', i < n);
      b.setAttribute('aria-checked', String(i + 1 === n));
    });
    $('noteTexte').textContent = LIBELLES[n];
    $('noteTexte').classList.add('choisie');
    majEnvoi();
  }
  etoiles.forEach(function (b) {
    b.addEventListener('click', function () { poserNote(parseInt(b.getAttribute('data-note'), 10)); });
  });
  $('etoiles').addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { poserNote(Math.min(5, note + 1)); etoiles[note - 1].focus(); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { poserNote(Math.max(1, note - 1)); etoiles[note - 1].focus(); e.preventDefault(); }
  });

  /* criteres : neutre -> apprecie -> a ameliorer -> neutre */
  Array.prototype.forEach.call(document.querySelectorAll('#criteres button'), function (b) {
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () {
      var c = b.getAttribute('data-critere'), v = criteres[c];
      v = v === 'PLUS' ? 'MOINS' : v === 'MOINS' ? null : 'PLUS';
      if (v) { criteres[c] = v; } else { delete criteres[c]; }
      b.classList.toggle('plus', v === 'PLUS');
      b.classList.toggle('moins', v === 'MOINS');
      b.setAttribute('aria-pressed', String(!!v));
    });
  });

  $('texte').addEventListener('input', function () { $('compteur').textContent = $('texte').value.length; });
  $('probleme').addEventListener('change', function () {
    $('blocEmploye').hidden = !$('probleme').checked;
    if ($('probleme').checked) { $('employe').focus(); }
  });
  Array.prototype.forEach.call(document.querySelectorAll('input[name=identite]'), function (r) {
    r.addEventListener('change', function () {
      $('blocIdentite').hidden = document.querySelector('input[name=identite]:checked').value !== 'IDENTIFIE';
    });
  });

  $('formulaire').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!note) { return; }
    var identifie = document.querySelector('input[name=identite]:checked').value === 'IDENTIFIE';
    var tel = $('telephone').value.trim(), mail = $('email').value.trim();
    var err = '';
    if (identifie && mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { err = 'L\'adresse e-mail ne semble pas valide.'; }
    if (identifie && tel && !/^[+0-9 ().-]{6,20}$/.test(tel)) { err = 'Le numéro de téléphone ne semble pas valide.'; }
    if ($('probleme').checked && !$('employe').value.trim()) { err = 'Indiquez le nom ou une description de la personne, ou décochez « problème avec un membre du personnel ».'; }
    $('erreur').hidden = !err;
    $('erreur').textContent = err;
    if (err) { return; }
    var corps = {
      jeton: jeton, note: note, criteres: criteres, texte: $('texte').value.trim(),
      employe: $('probleme').checked ? $('employe').value.trim() : '',
      anonyme: !identifie,
      nom: identifie ? $('nom').value.trim() : '', telephone: identifie ? tel : '', email: identifie ? mail : '',
      rappel: identifie && $('rappel').checked,
      site: $('site').value, duree: Date.now() - ouverture
    };
    $('envoyer').disabled = true;
    $('envoyer').textContent = 'Envoi…';
    requete('POST', API + 'envoyer', corps, function (statut, r) {
      if (statut === 200 && r && r.success) {
        $('formulaire').hidden = true;
        $('merci').hidden = false;
        if (corps.rappel && (corps.telephone || corps.email)) {
          $('merciTexte').textContent = 'Votre avis a bien été transmis. La pharmacie pourra vous répondre.';
        }
        window.scrollTo(0, 0);
        return;
      }
      $('envoyer').textContent = 'Envoyer mon avis';
      majEnvoi();
      $('erreur').hidden = false;
      $('erreur').textContent = (r && r.message) || (statut === 0
        ? 'Connexion impossible. Vérifiez votre réseau puis réessayez.' : 'L\'avis n\'a pas pu être envoyé. Réessayez dans un instant.');
    });
  });

  /* en-tete de la pharmacie, et validite du QR */
  if (!jeton) {
    etat('Ce lien est incomplet. Scannez à nouveau le QR code affiché dans la pharmacie.');
    return;
  }
  requete('GET', API + 'contexte?t=' + encodeURIComponent(jeton), null, function (statut, r) {
    if (statut === 200 && r && r.success) {
      $('pharmacie').textContent = r.pharmacie || 'Pharmacie';
      $('adresse').textContent = r.adresse || '';
      document.title = 'Votre avis — ' + (r.pharmacie || 'Pharmacie');
      $('formulaire').hidden = false;
      return;
    }
    etat((r && r.message) || 'Ce QR code n\'est plus valide. Demandez le nouveau QR code à la pharmacie.');
  });
}());
