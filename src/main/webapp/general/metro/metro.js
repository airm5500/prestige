/* Metro de Prestige (choix du 25/10).
 *  - accueil : une tuile par menu, a la couleur du menu, tailles calculees pour remplir la zone (les menus les plus
 *    fournis en tuile large) ; tuiles « vivantes » qui montrent par moments leurs premiers ecrans ;
 *  - un menu : ses sous-menus en groupes par famille, chaque sous-menu avec son icone ;
 *  - recherche : taper au clavier cherche un ecran dans tous les menus ; Echap revient ;
 *  - un ecran s'ouvre dans Prestige par getSousMenuView, comme l'ancien Metro.
 * Donnees : GET v1/metro (menus et sous-menus permis a la session, meme regle que le menu de navigation).
 */
(function () {
    'use strict';
    var I = window.PrestigeMetroIcones;
    var etat = {menus: [], module: null, q: ''};
    var grille = document.getElementById('grille'), zone = document.getElementById('zone');
    var courant = null, badges = {};

    function joli(n) { return n === n.toUpperCase() ? n.charAt(0) + n.slice(1).toLowerCase() : n; }
    function simple(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
    function svg(nom) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-' + nom + '"/></svg>'; }
    function famille(libelle) {
        for (var i = 0; i < I.FAMILLES.length; i++) {
            if (I.FAMILLES[i][3].test(libelle)) { return I.FAMILLES[i]; }
        }
        return I.AUTRES;
    }
    /* icone d'un sous-menu : la sienne ; sinon (sous-menu ajoute sans icone) celle de sa famille */
    function iconeEcran(e) { return I.ECRANS[e.composant] || famille(e.libelle)[2]; }

    function preparer(menus) {
        return menus.map(function (m, i) {
            var cle = String(m.libelle || '').toUpperCase();
            return {id: m.id, n: cle, nom: joli(m.libelle), sm: m.sousMenus || [],
                c: I.COULEURS[cle] || I.PALETTE[i % I.PALETTE.length], icone: I.MENUS[cle] || 'layout-grid'};
        });
    }

    /* ---------- tailles : remplir la zone, proportions tenues ----------
       Chaque tuile occupe 1 ou 2 colonnes (large). On essaie toutes les largeurs de grille et on garde celle qui donne
       les plus grandes tuiles (hauteur entre 0,62 et 0,95 fois la largeur), avec un plafond (pas de geantes pour deux
       menus) et un plancher (au-dela, la zone defile). */
    function disposer(tuiles, opts) {
        var W = zone.clientWidth - parseFloat(getComputedStyle(zone).paddingLeft) * 2;
        var H = zone.clientHeight - 30, g = W < 640 ? 8 : 10, meilleur = null;
        var unites = tuiles.reduce(function (s, t) { return s + t.span; }, 0);
        for (var c = 1; c <= 14; c++) {
            if (tuiles.some(function (t) { return t.span > c; })) { continue; }
            var r = Math.ceil(unites / c), w = Math.min((W - (c - 1) * g) / c, opts.maxL);
            var h = Math.min((H - (r - 1) * g) / r, w * 0.95);
            if (h < w * 0.62) { w = h / 0.62; }
            var score = w * h * (1 - Math.max(0, c * r - unites) / (c * r) * 0.25);
            if (!meilleur || score > meilleur.score) { meilleur = {c: c, w: w, h: h, score: score}; }
        }
        var m = meilleur;
        if (m.h < opts.minH) {
            m.h = opts.minH; m.w = Math.max(opts.minH / 0.8, m.w);
            m.c = Math.max(1, Math.floor((W + g) / (m.w + g)));
            m.w = Math.min(opts.maxL, (W - (m.c - 1) * g) / m.c);
        }
        grille.style.setProperty('--ecart', g + 'px');
        grille.style.gridTemplateColumns = 'repeat(' + m.c + ', ' + Math.floor(m.w) + 'px)';
        grille.style.gridAutoRows = Math.floor(m.h) + 'px';
        echelle(grille, Math.min(m.w, m.h * 1.25), 26, 96);
    }
    function echelle(el, base, nomMax, icoMax) {
        el.style.setProperty('--nom', Math.max(12, Math.min(nomMax, base * 0.085)) + 'px');
        el.style.setProperty('--petit', Math.max(11, Math.min(15, base * 0.055)) + 'px');
        el.style.setProperty('--ico', Math.max(24, Math.min(icoMax, base * 0.30)) + 'px');
        el.style.setProperty('--pad', Math.max(9, Math.min(20, base * 0.07)) + 'px');
    }

    function appui(b, suite) { b.classList.add('appui'); setTimeout(function () { b.classList.remove('appui'); suite(); }, 110); }

    function tuileMenu(m, i) {
        var b = document.createElement('button'), n = m.sm.length;
        b.className = 'tuile' + (m.span === 2 ? ' large' : '');
        b.style.setProperty('--c', m.c);
        b.style.setProperty('--i', i);
        b.style.gridColumn = 'span ' + m.span;
        b.setAttribute('aria-label', m.nom + ', ' + n + (n > 1 ? ' écrans' : ' écran'));
        var dos = m.sm.slice(0, 4).map(function (s) { return '<div class="ligne">' + esc(s.libelle) + '</div>'; }).join('');
        b.innerHTML = '<div class="faces"><div class="face"><div class="icone">' + svg(m.icone) + '</div>'
            + '<div class="pied"><span class="nom">' + esc(m.nom) + '</span><span class="compte">' + n + '</span></div></div>'
            + '<div class="face dos">' + dos + '</div></div>';
        b.onclick = function () { appui(b, function () { etat.module = m; rendre(); }); };
        return b;
    }

    function tuileEcran(e, i) {
        var b = document.createElement('button');
        b.className = 'tuile ecran';
        b.style.setProperty('--c', e.c);
        b.style.setProperty('--i', i);
        b.dataset.composant = e.composant;
        if (!I.ECRANS[e.composant]) { b.dataset.icone = 'secours'; }
        b.setAttribute('aria-label', e.libelle + (e.module ? ', ' + e.module : ''));
        if (e.aide) { b.title = e.aide; }
        b.innerHTML = '<div class="faces"><div class="face"><div class="icone">' + svg(iconeEcran(e)) + '</div>'
            + '<div><div class="nom">' + esc(e.libelle) + '</div>' + (e.module ? '<div class="module">' + esc(e.module) + '</div>' : '')
            + '</div></div></div>' + (badges[e.composant] ? '<span class="badge">' + badges[e.composant] + '</span>' : '');
        b.onclick = function () { appui(b, function () { ouvrir(e); }); };
        return b;
    }

    /* ouverture dans Prestige, comme l'ancien Metro (sousmenus.jsp) */
    function ouvrir(e) {
        if (window.parent && window.parent !== window && typeof window.parent.getSousMenuView === 'function') {
            window.parent.getSousMenuView(e.composant, e.libelle);
        }
    }

    function poser(cont, n) {
        void cont.offsetWidth;
        cont.classList.add('entree');
        setTimeout(function () { cont.querySelectorAll('.tuile').forEach(function (t) { t.classList.add('posee'); }); }, 700 + n * 35);
        zone.scrollTop = 0;
    }

    function afficher(tuiles, opts, fabrique) {
        grille.classList.remove('entree');
        grille.style.gridAutoRows = '';
        grille.innerHTML = '';
        if (!tuiles.length) {
            grille.style.gridTemplateColumns = '1fr';
            grille.innerHTML = '<div class="vide">Aucun écran ne correspond à cette recherche.</div>';
            return;
        }
        disposer(tuiles, opts);
        tuiles.forEach(function (t, i) { grille.appendChild(fabrique(t, i)); });
        poser(grille, tuiles.length);
    }

    /* ---------- un menu : groupes par famille ----------
       Chaque famille est un bloc de tuiles de sa couleur ; les blocs se rangent cote a cote. On cherche la plus grande
       tuile pour laquelle tous les blocs tiennent dans la zone (sinon, taille plancher et la zone defile). */
    function grouper(ecrans) {
        var g = {};
        ecrans.forEach(function (e) {
            var f = famille(e.libelle), ordre = I.FAMILLES.indexOf(f);
            (g[f[0]] = g[f[0]] || {nom: f[0], c: f[1], ordre: ordre < 0 ? 99 : ordre, ecrans: []}).ecrans.push(e);
        });
        return Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return a.ordre - b.ordre; });
    }
    function mesurerGroupes(groupes, W, H, g) {
        function essai(w, f) {
            var h = Math.round(w * 0.8), x = 0, ligneH = 0, total = 0, ks = [];
            groupes.forEach(function (gr) {
                var n = gr.ecrans.length, k = Math.min(n, Math.max(1, Math.round(Math.sqrt(n * f))));
                var bw = k * w + (k - 1) * g;
                if (bw > W) { k = Math.max(1, Math.floor((W + g) / (w + g))); bw = k * w + (k - 1) * g; }
                var r = Math.ceil(n / k), bh = 34 + r * h + (r - 1) * g;
                ks.push(k);
                if (x > 0 && x + bw > W) { total += ligneH + 26; x = 0; ligneH = 0; }
                x += bw + 34; ligneH = Math.max(ligneH, bh);
            });
            return {w: w, h: h, ks: ks, total: total + ligneH};
        }
        var r = null;
        for (var w = 230; w >= 110 && !r; w -= 4) {
            [0.8, 1.2, 1.6, 2.4, 3.5, 5].forEach(function (f) { var e = essai(w, f); if (e.total <= H && (!r || e.w > r.w)) { r = e; } });
        }
        r = r || essai(110, 2.4);
        groupes.forEach(function (gr, i) { gr.k = r.ks[i]; });
        return r;
    }
    function afficherGroupes(groupes) {
        grille.classList.remove('entree');
        grille.innerHTML = '';
        grille.style.gridTemplateColumns = '1fr';
        grille.style.gridAutoRows = 'auto';
        var W = zone.clientWidth - parseFloat(getComputedStyle(zone).paddingLeft) * 2, H = zone.clientHeight - 30, g = W < 640 ? 8 : 10;
        var cont = document.createElement('div'), n = 0, t = mesurerGroupes(groupes, W, H, g);
        cont.className = 'groupes';
        groupes.forEach(function (gr) {
            var bloc = document.createElement('div'), sg = document.createElement('div');
            bloc.className = 'groupe';
            bloc.style.setProperty('--c', gr.c);
            bloc.innerHTML = '<h2>' + esc(gr.nom) + '</h2>';
            sg.className = 'grille entree';
            sg.style.gridTemplateColumns = 'repeat(' + gr.k + ', ' + t.w + 'px)';
            sg.style.gridAutoRows = t.h + 'px';
            sg.style.setProperty('--ecart', g + 'px');
            echelle(sg, Math.min(t.w, t.h * 1.25), 20, 64);
            gr.ecrans.forEach(function (e) { e.c = gr.c; sg.appendChild(tuileEcran(e, n++)); });
            bloc.appendChild(sg);
            cont.appendChild(bloc);
        });
        grille.appendChild(cont);
        poser(cont, n);
    }

    function rendre() {
        var ms = etat.menus, titre = document.getElementById('titre'), sous = document.getElementById('sousTitre');
        var entete = document.querySelector('.entete');
        document.getElementById('retour').classList.toggle('visible', !!etat.module || !!etat.q);
        if (etat.q) {
            var q = simple(etat.q), res = [];
            ms.forEach(function (m) {
                m.sm.forEach(function (s) {
                    if (simple(s.libelle).indexOf(q) >= 0) {
                        res.push({composant: s.composant, libelle: s.libelle, aide: s.aide, module: m.nom, c: m.c, span: 1});
                    }
                });
            });
            entete.style.removeProperty('--cm');
            titre.textContent = 'Recherche';
            sous.textContent = res.length + (res.length > 1 ? ' écrans trouvés' : ' écran trouvé');
            courant = {tuiles: res, opts: {maxL: 300, minH: 96}, f: tuileEcran};
        } else if (etat.module) {
            var m = etat.module;
            titre.textContent = m.nom;
            sous.textContent = m.sm.length + (m.sm.length > 1 ? ' écrans' : ' écran') + ' · Échap pour revenir';
            entete.style.setProperty('--cm', m.c);
            courant = null;
            afficherGroupes(grouper(m.sm.map(function (s) { return {composant: s.composant, libelle: s.libelle, aide: s.aide, span: 1}; })));
            return;
        } else {
            entete.style.removeProperty('--cm');
            titre.textContent = 'Accueil';
            sous.textContent = ms.length + (ms.length > 1 ? ' modules' : ' module') + ' · tapez pour chercher un écran';
            /* tuile large pour les menus les plus fournis (le quart le plus riche, 15 ecrans au moins) */
            var seuil = Math.max(15, ms.map(function (x) { return x.sm.length; }).sort(function (a, b) { return b - a; })[Math.floor(ms.length / 4)] || 0);
            ms.forEach(function (x) { x.span = ms.length > 3 && x.sm.length >= seuil ? 2 : 1; });
            courant = {tuiles: ms, opts: {maxL: ms.length <= 2 ? 360 : 260, minH: 118}, f: tuileMenu};
        }
        afficher(courant.tuiles, courant.opts, courant.f);
    }

    function retour() {
        if (etat.q) {
            etat.q = '';
            document.getElementById('q').value = '';
        } else {
            etat.module = null;
        }
        rendre();
    }

    /* tuiles vivantes : une tuile de menu montre ses premiers ecrans quelques secondes */
    setInterval(function () {
        if (etat.module || etat.q || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
        var ts = Array.prototype.slice.call(grille.querySelectorAll('.tuile:not(.ecran)'));
        var t = ts[Math.floor(Math.random() * ts.length)];
        if (!t || t.matches(':hover')) { return; }
        t.classList.add('vivante');
        setTimeout(function () { t.classList.remove('vivante'); }, 3200);
    }, 2600);

    document.getElementById('retour').onclick = retour;
    document.getElementById('q').addEventListener('input', function (e) { etat.q = e.target.value.trim(); rendre(); });
    document.addEventListener('keydown', function (e) {
        var q = document.getElementById('q'), actif = document.activeElement;
        if (e.key === 'Escape' && (etat.module || etat.q)) { e.preventDefault(); retour(); return; }
        /* taper au clavier lance la recherche */
        if (actif !== q && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && /\S/.test(e.key)) { q.focus(); }
        /* fleches : d'une tuile a l'autre */
        if (/^Arrow/.test(e.key) && actif && actif.classList.contains('tuile')) {
            var a = actif.getBoundingClientRect(), best = null;
            grille.querySelectorAll('.tuile').forEach(function (t) {
                if (t === actif) { return; }
                var r = t.getBoundingClientRect(), dx = r.left - a.left, dy = r.top - a.top;
                var bon = e.key === 'ArrowRight' ? dx > 5 : e.key === 'ArrowLeft' ? dx < -5 : e.key === 'ArrowDown' ? dy > 5 : dy < -5;
                var d = (e.key === 'ArrowRight' || e.key === 'ArrowLeft') ? Math.abs(dx) + Math.abs(dy) * 3 : Math.abs(dy) + Math.abs(dx) * 3;
                if (bon && (!best || d < best.d)) { best = {t: t, d: d}; }
            });
            if (best) { e.preventDefault(); best.t.focus(); }
        }
    });
    var attente;
    window.addEventListener('resize', function () {
        clearTimeout(attente);
        attente = setTimeout(function () {
            if (!etat.menus.length) { return; }
            if (!courant) { rendre(); } else if (courant.tuiles.length) { disposer(courant.tuiles, courant.opts); }
        }, 80);
    });

    function messageEtat(html) {
        grille.style.gridTemplateColumns = '1fr';
        grille.innerHTML = '<div class="etat">' + html + '</div>';
    }

    /* badge « articles a reassortir » sur Gestion des reserves, comme l'ancien Metro */
    function chargerBadges() {
        var aReserve = etat.menus.some(function (m) { return m.sm.some(function (s) { return s.composant === 'reservemanager'; }); });
        if (!aReserve) { return; }
        fetch('../../api/v1/reserve/suggestions?start=0&limit=1', {credentials: 'same-origin'})
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
                var total = d && d.total ? parseInt(d.total, 10) : 0;
                if (total > 0) {
                    badges.reservemanager = total;
                    var t = grille.querySelector('.tuile[data-composant="reservemanager"]');
                    if (t && !t.querySelector('.badge')) { t.insertAdjacentHTML('beforeend', '<span class="badge">' + total + '</span>'); }
                }
            })['catch'](function () { });
    }

    fetch('../../api/v1/metro', {credentials: 'same-origin'})
        .then(function (r) {
            if (r.status === 401) { throw new Error('session'); }
            if (!r.ok) { throw new Error('serveur'); }
            return r.json();
        })
        .then(function (d) {
            etat.menus = preparer(d.menus || []);
            if (!etat.menus.length) {
                messageEtat('Aucun menu n\'est ouvert à votre profil.');
                return;
            }
            rendre();
            chargerBadges();
        })['catch'](function (e) {
            messageEtat(e.message === 'session' ? 'Votre session a expiré.<br><button type="button" onclick="window.top.location.reload()">Se reconnecter</button>'
                : 'Le menu n\'a pas pu être chargé.<br><button type="button" onclick="window.location.reload()">Réessayer</button>');
        });

    /* controle (tests) : sous-menus de l'utilisateur sans icone dediee */
    window.PrestigeMetro = {
        sansIcone: function () {
            var l = [];
            etat.menus.forEach(function (m) { m.sm.forEach(function (s) { if (!I.ECRANS[s.composant]) { l.push(s.libelle + ' (' + s.composant + ')'); } }); });
            return l;
        }
    };
})();
