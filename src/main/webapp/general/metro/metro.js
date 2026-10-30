/* Metro de Prestige (choix du 25/10).
 *  - accueil : une tuile par menu, a la couleur du menu, tailles calculees pour remplir la zone (les menus les plus
 *    fournis en tuile large) ; tuiles « vivantes » qui montrent par moments leurs premiers ecrans ;
 *  - un menu : ses sous-menus en groupes par famille, chaque sous-menu avec son icone ;
 *  - clavier : taper cherche un ecran dans tous les menus, Echap revient, les fleches passent d'une tuile a l'autre,
 *    Entree ouvre ;
 *  - un ecran s'ouvre dans Prestige par getSousMenuView, comme l'ancien Metro.
 * Donnees : GET v1/metro (menus et sous-menus permis a la session, meme regle que le menu de navigation).
 *
 * Utilisation : PrestigeMetro.monter(element) dessine le Metro dans l'element et rend {detruire} ; le composant
 * mainmenumanager le monte directement dans Prestige (sans iframe), la page metro/index.html aussi. Tout ce que le
 * Metro pose sur la page (clavier, minuteries, suivi de taille) est retire par detruire().
 */
(function () {
    'use strict';
    var I = window.PrestigeMetroIcones;
    /* chemins relatifs a ce script (general/metro/), quelle que soit la page qui le charge */
    var BASE = (function () {
        var s = document.currentScript && document.currentScript.src;
        return s ? s.replace(/[^\/]*$/, '') : 'metro/';
    })();
    var API = BASE + '../../api/v1/';
    var montes = [];

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

    /* icones : un seul jeu (icones.svg) pose une fois dans la page, partage par tous les Metro montes */
    var icones = null;
    function chargerIcones() {
        if (!icones) {
            icones = fetch(BASE + 'icones.svg', {credentials: 'same-origin'})
                .then(function (r) { return r.text(); })
                .then(function (t) {
                    if (!document.getElementById('prestige-metro-icones')) {
                        var d = document.createElement('div');
                        d.id = 'prestige-metro-icones';
                        d.style.display = 'none';
                        d.setAttribute('aria-hidden', 'true');
                        d.innerHTML = t;
                        document.body.appendChild(d);
                    }
                })['catch'](function () { icones = null; });
        }
        return icones;
    }

    var GABARIT = '<header class="mt-entete">'
        + '<button class="mt-retour" type="button" aria-label="Retour au menu principal" title="Retour (Échap)">'
        + '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5 M12 19l-7-7 7-7"/></svg>'
        + '</button>'
        + '<div class="mt-titre"><h1 class="mt-titre-texte">Accueil</h1><span class="mt-sous-titre"></span></div>'
        + '<label class="mt-recherche">'
        + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8a97a8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11a8 8 0 1 0 16 0a8 8 0 1 0-16 0 M21 21l-4.35-4.35"/></svg>'
        + '<input class="mt-q" type="search" placeholder="Rechercher un écran (ex. ventes, factures)" aria-label="Rechercher un écran" autocomplete="off">'
        + '</label>'
        + '<div class="mt-bande" aria-hidden="true"></div>'
        + '</header>'
        + '<main class="mt-zone mt-perspective"><div class="mt-grille"><div class="mt-etat">Chargement du menu…</div></div></main>';

    function monter(racine) {
        var etat = {menus: [], module: null, q: ''};
        var courant = null, badges = {}, minuteries = [], detruit = false, auClavier = false;
        racine.classList.add('prestige-metro');
        racine.innerHTML = GABARIT;
        var grille = racine.querySelector('.mt-grille'), zone = racine.querySelector('.mt-zone');
        var champ = racine.querySelector('.mt-q'), btnRetour = racine.querySelector('.mt-retour');
        var titre = racine.querySelector('.mt-titre-texte'), sous = racine.querySelector('.mt-sous-titre'), entete = racine.querySelector('.mt-entete');

        function preparer(menus) {
            return menus.map(function (m, i) {
                var cle = String(m.libelle || '').toUpperCase();
                return {id: m.id, n: cle, nom: joli(m.libelle), sm: m.sousMenus || [],
                    c: I.COULEURS[cle] || I.PALETTE[i % I.PALETTE.length], icone: I.MENUS[cle] || 'layout-grid'};
            });
        }

        /* ---------- tailles : remplir la zone, proportions tenues ----------
           Chaque tuile occupe 1 ou 2 colonnes (large). On essaie toutes les largeurs de grille et on garde celle qui
           donne les plus grandes tuiles (hauteur entre 0,62 et 0,95 fois la largeur), avec un plafond (pas de geantes
           pour deux menus) et un plancher (au-dela, la zone defile). */
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

        function appui(b, suite) { b.classList.add('mt-appui'); setTimeout(function () { b.classList.remove('mt-appui'); if (!detruit) { suite(); } }, 110); }

        function tuileMenu(m, i) {
            var b = document.createElement('button'), n = m.sm.length;
            b.type = 'button';
            b.className = 'mt-tuile' + (m.span === 2 ? ' mt-large' : '');
            b.style.setProperty('--c', m.c);
            b.style.setProperty('--i', i);
            b.style.gridColumn = 'span ' + m.span;
            b.setAttribute('aria-label', m.nom + ', ' + n + (n > 1 ? ' écrans' : ' écran'));
            var dos = m.sm.slice(0, 4).map(function (s) { return '<div class="mt-ligne">' + esc(s.libelle) + '</div>'; }).join('');
            b.innerHTML = '<div class="mt-faces"><div class="mt-face"><div class="mt-icone">' + svg(m.icone) + '</div>'
                + '<div class="mt-pied"><span class="mt-nom">' + esc(m.nom) + '</span><span class="mt-compte">' + n + '</span></div></div>'
                + '<div class="mt-face mt-dos">' + dos + '</div></div>';
            b.onclick = function () { appui(b, function () { etat.module = m; rendre(true); }); };
            return b;
        }

        function tuileEcran(e, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'mt-tuile mt-ecran';
            b.style.setProperty('--c', e.c);
            b.style.setProperty('--i', i);
            b.dataset.composant = e.composant;
            if (!I.ECRANS[e.composant]) { b.dataset.icone = 'secours'; }
            b.setAttribute('aria-label', e.libelle + (e.module ? ', ' + e.module : ''));
            if (e.aide) { b.title = e.aide; }
            b.innerHTML = '<div class="mt-faces"><div class="mt-face"><div class="mt-icone">' + svg(iconeEcran(e)) + '</div>'
                + '<div><div class="mt-nom">' + esc(e.libelle) + '</div>' + (e.module ? '<div class="mt-module">' + esc(e.module) + '</div>' : '')
                + '</div></div></div>' + (badges[e.composant] ? '<span class="mt-badge">' + badges[e.composant] + '</span>' : '');
            b.onclick = function () { appui(b, function () { ouvrir(e); }); };
            return b;
        }

        /* ouverture dans Prestige, comme l'ancien Metro (sousmenus.jsp) : dans la page, ou depuis la page autonome */
        function ouvrir(e) {
            var cible = typeof window.getSousMenuView === 'function' ? window
                : (window.parent && window.parent !== window && typeof window.parent.getSousMenuView === 'function' ? window.parent : null);
            if (cible) { cible.getSousMenuView(e.composant, e.libelle); }
        }

        function poser(cont, n, focus) {
            void cont.offsetWidth;
            cont.classList.add('mt-entree');
            minuteries.push(setTimeout(function () { cont.querySelectorAll('.mt-tuile').forEach(function (t) { t.classList.add('mt-posee'); }); }, 700 + n * 35));
            zone.scrollTop = 0;
            /* au clavier (pas a la souris), la premiere tuile prend le focus quand on change de vue (pas pendant une
               recherche) */
            if (focus && auClavier && !etat.q) {
                var t = cont.querySelector('.mt-tuile');
                if (t) { t.focus({preventScroll: true}); }
            }
        }

        function afficher(tuiles, opts, fabrique, focus) {
            groupesAffiches = null;
            grille.classList.remove('mt-entree');
            grille.style.gridAutoRows = '';
            grille.innerHTML = '';
            if (!tuiles.length) {
                grille.style.gridTemplateColumns = '1fr';
                grille.innerHTML = '<div class="mt-vide">Aucun écran ne correspond à cette recherche.</div>';
                return;
            }
            disposer(tuiles, opts);
            tuiles.forEach(function (t, i) { grille.appendChild(fabrique(t, i)); });
            poser(grille, tuiles.length, focus);
        }

        /* ---------- un menu : groupes par famille ----------
           Chaque famille est un bloc de tuiles de sa couleur ; les blocs se rangent cote a cote. On cherche la plus
           grande tuile pour laquelle tous les blocs tiennent dans la zone (sinon, taille plancher et la zone defile). */
        function grouper(ecrans) {
            var g = {};
            ecrans.forEach(function (e) {
                var f = famille(e.libelle), ordre = I.FAMILLES.indexOf(f);
                (g[f[0]] = g[f[0]] || {nom: f[0], c: f[1], ordre: ordre < 0 ? 99 : ordre, ecrans: []}).ecrans.push(e);
            });
            return Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return a.ordre - b.ordre; });
        }
        /* Disposition MESUREE (retour du 25/10 : groupes centres avec de la place sur les cotes, et pourtant le bas
           debordait) : on essaie des tailles de tuile (de la plus grande a la plus petite) et, pour chacune, des largeurs
           de bloc (peu de colonnes -> blocs hauts ; beaucoup -> blocs larges) ; on mesure le rendu reel et on garde la
           plus grande tuile qui tient dans la zone, avec les blocs les plus larges (les moins hauts). Si rien ne tient,
           taille plancher et la zone defile. */
        var groupesAffiches = null;
        function ajusterGroupes() {
            var ga = groupesAffiches;
            if (!ga || !ga.cont.isConnected) { return; }
            var cs = getComputedStyle(zone);
            var W = zone.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
            var H = zone.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
            /* plancher 84 px (retour du 30/10) : les 43 ecrans de l analyse de gestion d une officine, en 1366 x 768,
               debordaient de 99 px a 96 px */
            var g = W < 640 ? 8 : 10, FACTEURS = [0.6, 1, 1.6, 2.5, 4, 6, 10, 40], PLANCHER = 84;
            function appliquer(w, f) {
                var h = Math.round(w * 0.8), base = Math.min(w, h * 1.25);
                ga.blocs.forEach(function (b) {
                    var n = b.n, k = Math.min(n, Math.max(1, Math.round(Math.sqrt(n * f))));
                    k = Math.max(1, Math.min(k, Math.floor((W + g) / (w + g))));
                    b.sg.style.gridTemplateColumns = 'repeat(' + k + ', ' + w + 'px)';
                    b.sg.style.gridAutoRows = h + 'px';
                    b.sg.style.setProperty('--ecart', g + 'px');
                    echelle(b.sg, base, 20, 64);
                });
                return {haut: ga.cont.offsetHeight, large: ga.cont.scrollWidth};
            }
            ga.cont.style.minHeight = '0';
            var choix = null;
            for (var w = 240; w >= PLANCHER && !choix; w -= 6) {
                FACTEURS.forEach(function (f) {
                    var m = appliquer(w, f);
                    if (m.haut <= H && m.large <= W + 1 && (!choix || m.haut < choix.haut)) { choix = {w: w, f: f, haut: m.haut}; }
                });
            }
            if (!choix) {   /* trop d'ecrans pour la zone : taille plancher, blocs les plus bas, la zone defile */
                FACTEURS.forEach(function (f) { var m = appliquer(PLANCHER, f); if (m.large <= W + 1 && (!choix || m.haut < choix.haut)) { choix = {w: PLANCHER, f: f, haut: m.haut}; } });
                choix = choix || {w: PLANCHER, f: 1};
            }
            appliquer(choix.w, choix.f);
            ga.cont.style.minHeight = '';
        }
        function afficherGroupes(groupes, focus) {
            grille.classList.remove('mt-entree');
            grille.innerHTML = '';
            grille.style.gridTemplateColumns = '1fr';
            grille.style.gridAutoRows = 'auto';
            var cont = document.createElement('div'), n = 0, blocs = [];
            cont.className = 'mt-groupes';
            groupes.forEach(function (gr) {
                var bloc = document.createElement('div'), sg = document.createElement('div');
                bloc.className = 'mt-groupe';
                bloc.style.setProperty('--c', gr.c);
                bloc.innerHTML = '<h2>' + esc(gr.nom) + '</h2>';
                sg.className = 'mt-grille mt-entree';
                gr.ecrans.forEach(function (e) { e.c = gr.c; sg.appendChild(tuileEcran(e, n++)); });
                bloc.appendChild(sg);
                cont.appendChild(bloc);
                blocs.push({sg: sg, n: gr.ecrans.length});
            });
            grille.appendChild(cont);
            groupesAffiches = {cont: cont, blocs: blocs};
            ajusterGroupes();
            poser(cont, n, focus);
        }

        function rendre(focus) {
            var ms = etat.menus;
            btnRetour.classList.toggle('mt-visible', !!etat.module || !!etat.q);
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
                sous.textContent = res.length + (res.length > 1 ? ' écrans trouvés' : ' écran trouvé') + ' · Échap pour revenir';
                courant = {tuiles: res, opts: {maxL: 300, minH: 96}, f: tuileEcran};
            } else if (etat.module) {
                var m = etat.module;
                titre.textContent = m.nom;
                sous.textContent = m.sm.length + (m.sm.length > 1 ? ' écrans' : ' écran') + ' · Échap pour revenir';
                entete.style.setProperty('--cm', m.c);
                courant = null;
                afficherGroupes(grouper(m.sm.map(function (s) { return {composant: s.composant, libelle: s.libelle, aide: s.aide, span: 1}; })), focus);
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
            afficher(courant.tuiles, courant.opts, courant.f, focus);
        }

        function retour() {
            if (etat.q) {
                etat.q = '';
                champ.value = '';
            } else {
                etat.module = null;
            }
            rendre(true);
        }

        /* tuiles vivantes : une tuile de menu montre ses premiers ecrans quelques secondes */
        var vivantes = setInterval(function () {
            if (etat.module || etat.q || document.hidden || !visible() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
            var ts = Array.prototype.slice.call(grille.querySelectorAll('.mt-tuile:not(.mt-ecran)'));
            var t = ts[Math.floor(Math.random() * ts.length)];
            if (!t || t.matches(':hover') || t === document.activeElement) { return; }
            t.classList.add('mt-vivante');
            minuteries.push(setTimeout(function () { t.classList.remove('mt-vivante'); }, 3200));
        }, 2600);

        /* ---------- clavier ----------
           Le Metro ne prend une touche que s'il est affiche, qu'aucune fenetre n'est ouverte par-dessus et que le
           focus est dans le Metro ou nulle part (page) : les autres ecrans et champs de Prestige gardent leurs touches. */
        function visible() { return racine.isConnected && racine.offsetWidth > 0 && racine.offsetHeight > 0; }
        function fenetreOuverte() {
            try {
                return !!(window.Ext && Ext.WindowManager && Ext.WindowManager.getActive && Ext.WindowManager.getActive()
                    && Ext.WindowManager.getActive().isVisible());
            } catch (e) {
                return false;
            }
        }
        function pourLeMetro() {
            var a = document.activeElement;
            return visible() && !fenetreOuverte() && (!a || a === document.body || a === document.documentElement || racine.contains(a));
        }
        function clavier(e) {
            if (e.defaultPrevented || !pourLeMetro()) { return; }
            var actif = document.activeElement;
            if (e.key === 'Escape' && (etat.module || etat.q)) { e.preventDefault(); retour(); return; }
            /* taper lance la recherche */
            if (actif !== champ && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && /\S/.test(e.key)) {
                champ.focus();
                return;
            }
            /* fleches : d'une tuile a l'autre ; depuis la recherche, fleche bas va a la premiere tuile */
            if (e.key === 'ArrowDown' && actif === champ) {
                var p = grille.querySelector('.mt-tuile');
                if (p) { e.preventDefault(); p.focus(); }
                return;
            }
            if (/^Arrow/.test(e.key)) {
                var tuiles = grille.querySelectorAll('.mt-tuile');
                if (!actif || !actif.classList || !actif.classList.contains('mt-tuile')) {
                    if (tuiles.length && actif !== champ) { e.preventDefault(); tuiles[0].focus(); }
                    return;
                }
                /* droite / gauche : tuile suivante / precedente dans l'ordre de lecture (rangee par rangee). La grille
                   se remplit en mode dense, l'ordre du document n'est donc pas celui de l'ecran ; et la recherche de la
                   tuile la plus proche a droite partait, en fin de rangee, vers une tuile lointaine puis restait
                   bloquee (retour du 30/10). */
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    var lecture = Array.prototype.slice.call(tuiles).map(function (t) {
                        var r = t.getBoundingClientRect();
                        return {t: t, haut: Math.round(r.top), gauche: r.left};
                    }).sort(function (x, y) { return Math.abs(x.haut - y.haut) > 5 ? x.haut - y.haut : x.gauche - y.gauche; });
                    var rang = -1;
                    lecture.forEach(function (x, i) { if (x.t === actif) { rang = i; } });
                    var cible = lecture[rang + (e.key === 'ArrowRight' ? 1 : -1)];
                    e.preventDefault();
                    if (cible) { cible.t.focus(); }
                    return;
                }
                var a = actif.getBoundingClientRect(), best = null;
                tuiles.forEach(function (t) {
                    if (t === actif) { return; }
                    var r = t.getBoundingClientRect(), dx = r.left - a.left, dy = r.top - a.top;
                    var bon = e.key === 'ArrowDown' ? dy > 5 : dy < -5;
                    var d = Math.abs(dy) + Math.abs(dx) * 3;
                    if (bon && (!best || d < best.d)) { best = {t: t, d: d}; }
                });
                e.preventDefault();
                if (best) { best.t.focus(); }
            }
        }
        function souris() { auClavier = false; }
        function touche() { auClavier = true; }
        document.addEventListener('keydown', touche, true);
        document.addEventListener('mousedown', souris, true);
        document.addEventListener('keydown', clavier);

        btnRetour.onclick = retour;
        champ.addEventListener('input', function () { etat.q = champ.value.trim(); rendre(false); });

        /* taille : suit la zone (fenetre, menu de navigation, videoprojecteur), pas seulement la fenetre */
        var attente;
        function redimensionner() {
            clearTimeout(attente);
            attente = setTimeout(function () {
                if (detruit || !etat.menus.length || !visible()) { return; }
                if (!courant) { ajusterGroupes(); } else if (courant.tuiles.length) { disposer(courant.tuiles, courant.opts); }
            }, 80);
        }
        var suivi = window.ResizeObserver ? new ResizeObserver(redimensionner) : null;
        if (suivi) { suivi.observe(zone); } else { window.addEventListener('resize', redimensionner); }

        function messageEtat(html) {
            grille.style.gridTemplateColumns = '1fr';
            grille.innerHTML = '<div class="mt-etat">' + html + '</div>';
        }

        /* badge « articles a reassortir » sur Gestion des reserves, comme l'ancien Metro */
        function chargerBadges() {
            var aReserve = etat.menus.some(function (m) { return m.sm.some(function (s) { return s.composant === 'reservemanager'; }); });
            if (!aReserve) { return; }
            fetch(API + 'reserve/suggestions?start=0&limit=1', {credentials: 'same-origin'})
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (d) {
                    var total = d && d.total ? parseInt(d.total, 10) : 0;
                    if (total > 0 && !detruit) {
                        badges.reservemanager = total;
                        var t = grille.querySelector('.mt-tuile[data-composant="reservemanager"]');
                        if (t && !t.querySelector('.mt-badge')) { t.insertAdjacentHTML('beforeend', '<span class="mt-badge">' + total + '</span>'); }
                    }
                })['catch'](function () { });
        }

        Promise.all([chargerIcones(), fetch(API + 'metro', {credentials: 'same-origin'})
            .then(function (r) {
                if (r.status === 401) { throw new Error('session'); }
                if (!r.ok) { throw new Error('serveur'); }
                return r.json();
            })])
            .then(function (res) {
                if (detruit) { return; }
                etat.menus = preparer(res[1].menus || []);
                if (!etat.menus.length) {
                    messageEtat('Aucun menu n\'est ouvert à votre profil.');
                    return;
                }
                rendre(pourLeMetro());
                chargerBadges();
            })['catch'](function (e) {
                if (detruit) { return; }
                messageEtat(e.message === 'session' ? 'Votre session a expiré.<br><button type="button" onclick="window.top.location.reload()">Se reconnecter</button>'
                    : 'Le menu n\'a pas pu être chargé.<br><button type="button" onclick="window.location.reload()">Réessayer</button>');
            });

        var instance = {
            racine: racine,
            /* sous-menus de l'utilisateur sans icone dediee (controle des tests) */
            sansIcone: function () {
                var l = [];
                etat.menus.forEach(function (m) { m.sm.forEach(function (s) { if (!I.ECRANS[s.composant]) { l.push(s.libelle + ' (' + s.composant + ')'); } }); });
                return l;
            },
            redimensionner: redimensionner,
            detruire: function () {
                if (detruit) { return; }
                detruit = true;
                document.removeEventListener('keydown', clavier);
                document.removeEventListener('keydown', touche, true);
                document.removeEventListener('mousedown', souris, true);
                clearInterval(vivantes);
                clearTimeout(attente);
                minuteries.forEach(clearTimeout);
                if (suivi) { suivi.disconnect(); } else { window.removeEventListener('resize', redimensionner); }
                montes.splice(montes.indexOf(instance), 1);
                racine.innerHTML = '';
                racine.classList.remove('prestige-metro');
            }
        };
        montes.push(instance);
        return instance;
    }

    window.PrestigeMetro = {
        monter: monter,
        /* Metro montes (controle des tests : aucun reste apres avoir quitte le Metro) */
        montes: function () { return montes.slice(); },
        sansIcone: function () { return montes.length ? montes[montes.length - 1].sansIcone() : []; }
    };
})();
