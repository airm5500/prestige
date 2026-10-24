/* global Ext, testextjs */
/*
 * Themes du menu de navigation (demande du 24/10, maquettes A, C et D validees).
 *
 * Le menu actuel reste le theme par defaut et n'est pas modifie : avec un autre theme il est seulement cache. Les
 * themes A, C et D lisent les MEMES donnees que lui (le store du composant « navigation », charge par
 * ws_tree_menu.jsp avec les droits de l'utilisateur, apres retrait des menus masques de correctifs-affichage.js) :
 * aucune entree en plus, aucune en moins. Un ecran s'ouvre par le meme chemin (App.onLoadNewComponent).
 *  - A : rail d'icones + panneau des modules ; un module s'ouvre dans un volet par-dessus l'ecran ;
 *  - C : arbre filtrable toujours visible, favoris et recents en tete ;
 *  - D : rail d'icones + arbre ; menu replie, le rail ouvre le volet du module.
 * Choix par utilisateur (Options > Affichage du menu), garde dans ses preferences (cle « menu-navigation ») avec ses
 * favoris, ses recents, les modules ouverts et l'etat replie. Applique en rechargeant la page.
 * Reglages par defaut (a confirmer) : un seul module ouvert a la fois, repere or plein sur l'icone du rail, barre de
 * defilement des menus invisible au repos.
 */
(function () {
    'use strict';

    var CLE = 'menu-navigation';
    var CACHE = 'prestige.menuTheme';
    var THEMES = ['actuel', 'A', 'C', 'D'];
    var LARGEUR = {A: 330, C: 290, D: 350};
    var LARGEUR_REPLIE = {A: 60, C: 60, D: 60};
    var MAX_RECENTS = 5;

    var prefs = {theme: 'actuel', replie: false, ouverts: [], favoris: [], recents: []};
    var etat = {viewport: null, nav: null, cmp: null, modules: [], filtre: '', volet: null, ecran: null, sel: 0, res: []};

    var enc = function (s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c];
        });
    };
    var sansAccent = function (s) {
        return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    };
    var lireCache = function () {
        try {
            var v = JSON.parse(localStorage.getItem(CACHE) || 'null');
            return v && THEMES.indexOf(v.theme) >= 0 ? v : null;
        } catch (e) {
            return null;
        }
    };
    var ecrireCache = function () {
        try {
            localStorage.setItem(CACHE, JSON.stringify({theme: prefs.theme, replie: prefs.replie}));
        } catch (e) {
            /* navigation privee : le serveur reste la reference */
        }
    };

    var minuteur = null;
    function enregistrer() {
        ecrireCache();
        clearTimeout(minuteur);
        minuteur = setTimeout(function () {
            Ext.Ajax.request({url: '../api/v1/preferences/' + CLE, method: 'PUT', jsonData: prefs, failure: function () {}});
        }, 400);
    }

    /* ------------------------------------------------------------ donnees du menu (store du menu actuel) */

    function icone(texte) {
        var e = null;
        try {
            e = testextjs.view.Navigation.prototype._matchIcon(texte);
        } catch (x) {
            e = null;
        }
        return e || {icon: 'fa-circle-dot', bg: 'rgba(107,127,163,0.14)', fg: '#6b7fa3'};
    }

    function lireModules() {
        var store = etat.nav && etat.nav.getStore ? etat.nav.getStore() : null;
        var racine = store && store.getRootNode ? store.getRootNode() : null;
        var mods = [];
        if (!racine) {
            return mods;
        }
        racine.eachChild(function (m) {
            var ents = [];
            m.eachChild(function (n) {
                if (n.isLeaf() && n.get('id') !== undefined) {
                    ents.push({id: String(n.get('id')), texte: n.get('text'), aide: n.raw && n.raw.aide});
                }
            });
            if (ents.length) {
                var ic = icone(m.get('text'));
                mods.push({id: 'm' + mods.length, nom: m.get('text'), ic: ic, ents: ents});
            }
        });
        return mods;
    }
    function trouver(id) {
        for (var i = 0; i < etat.modules.length; i++) {
            for (var j = 0; j < etat.modules[i].ents.length; j++) {
                if (etat.modules[i].ents[j].id === id) {
                    return {m: etat.modules[i], e: etat.modules[i].ents[j]};
                }
            }
        }
        return null;
    }
    /* modules ouverts gardes par leur nom (stable d'une session a l'autre) */
    var estOuvert = function (m) {
        return prefs.ouverts.indexOf(m.nom) >= 0;
    };

    /* ------------------------------------------------------------ ouverture d'un ecran */

    function ouvrir(id) {
        var t = trouver(id);
        if (!t) {
            return;
        }
        fermerVolet();
        fermerPalette();
        testextjs.app.getController('App').onLoadNewComponent(t.e.id, t.e.texte, '');
    }
    /* appele apres chaque ouverture d'ecran, quel que soit le chemin (menu, tableau de bord, notification) */
    function apresOuverture(id) {
        var t = trouver(id);
        if (!t) {
            return;
        }
        etat.ecran = id;
        prefs.recents = [id].concat(prefs.recents.filter(function (x) {
            return x !== id;
        })).slice(0, MAX_RECENTS);
        if (!estOuvert(t.m)) {
            prefs.ouverts = [t.m.nom];
        }
        enregistrer();
        dessiner();
    }

    /* ------------------------------------------------------------ rendu */

    function tuile(m, taille) {
        return '<span class="mp-ic" style="background:' + m.ic.bg + ';color:' + m.ic.fg + (taille ? ';width:' + taille + 'px;height:' + taille + 'px' : '') + '">'
                + '<i class="fa-solid ' + m.ic.icon + '"></i></span>';
    }
    function etoile(id) {
        var on = prefs.favoris.indexOf(id) >= 0;
        return '<span class="mp-etoile' + (on ? ' on' : '') + '" data-fav="' + enc(id) + '" title="' + (on ? 'Retirer des favoris' : 'Ajouter aux favoris') + '">'
                + '<i class="fa-' + (on ? 'solid' : 'regular') + ' fa-star"></i></span>';
    }
    function surligner(texte, q) {
        var t = sansAccent(q).trim(), i = t ? sansAccent(texte).indexOf(t) : -1;
        if (i < 0) {
            return enc(texte);
        }
        return enc(texte.slice(0, i)) + '<mark>' + enc(texte.slice(i, i + t.length)) + '</mark>' + enc(texte.slice(i + t.length));
    }
    function ligne(e, q, cls) {
        return '<div class="mp-ent' + (cls ? ' ' + cls : '') + (e.id === etat.ecran ? ' actif' : '') + '" role="button" tabindex="0" data-ouvrir="' + enc(e.id) + '"'
                + (e.aide ? ' title="' + enc(e.aide) + '"' : '') + '><span class="mp-lib">' + surligner(e.texte, q || '') + '</span>' + etoile(e.id) + '</div>';
    }
    function listeCourte(ids) {
        return ids.map(trouver).filter(Boolean).map(function (t) {
            return ligne(t.e, '', 'court');
        }).join('');
    }
    function rail() {
        var mod = etat.ecran && trouver(etat.ecran);
        return '<button class="mp-rb" data-act="palette" data-bulle="Rechercher un écran (Ctrl K)"><i class="fa-solid fa-magnifying-glass"></i></button>'
                + '<button class="mp-rb" data-act="replier" data-bulle="' + (prefs.replie ? 'Déplier le menu' : 'Replier le menu') + '"><i class="fa-solid ' + (prefs.replie ? 'fa-angles-right' : 'fa-angles-left') + '"></i></button>'
                + '<span class="mp-sep"></span>'
                + etat.modules.map(function (m) {
                    var on = etat.volet ? etat.volet === m : (prefs.theme === 'D' && !prefs.replie && estOuvert(m));
                    return '<button class="mp-rb' + (on ? ' on' : '') + (mod && mod.m === m ? ' ici' : '') + '" data-rail="' + m.id + '" data-bulle="' + enc(m.nom) + '">'
                            + '<i class="fa-solid ' + m.ic.icon + '"></i></button>';
                }).join('');
    }
    function panneauA() {
        return '<button class="mp-recherche" data-act="palette"><i class="fa-solid fa-magnifying-glass"></i> Rechercher un écran… <kbd>Ctrl K</kbd></button>'
                + '<div class="mp-titre">Favoris</div><div class="mp-favs">' + (prefs.favoris.length ? prefs.favoris.map(trouver).filter(Boolean).map(function (t) {
            return '<button data-ouvrir="' + enc(t.e.id) + '"><i class="fa-solid fa-star"></i>' + enc(t.e.texte) + '</button>';
        }).join('') : '<span class="mp-vide-n">Cliquez ★ sur un écran pour l\'épingler ici.</span>') + '</div>'
                + '<div class="mp-titre">Modules</div>'
                + etat.modules.map(function (m) {
                    return '<button class="mp-modn' + (etat.volet === m ? ' on' : '') + '" data-rail="' + m.id + '">' + tuile(m) + '<span class="mp-lib">' + enc(m.nom) + '</span><span class="mp-n">' + m.ents.length + '</span></button>';
                }).join('');
    }
    function arbre() {
        var q = etat.filtre, t = sansAccent(q).trim(), h = '', trouves = 0;
        if (!t) {
            h += '<div class="mp-sect"><i class="fa-solid fa-star"></i> Favoris</div>' + (prefs.favoris.length ? listeCourte(prefs.favoris) : '<div class="mp-vide">Survolez un écran et cliquez ★ pour l\'épingler ici.</div>')
                    + '<div class="mp-sect"><i class="fa-solid fa-clock-rotate-left"></i> Récents</div>' + (prefs.recents.length ? listeCourte(prefs.recents.slice(0, 4)) : '<div class="mp-vide">Les derniers écrans ouverts s\'afficheront ici.</div>')
                    + '<div class="mp-sect"><i class="fa-solid fa-table-cells-large"></i> Modules</div>';
        }
        etat.modules.forEach(function (m) {
            var ents = m.ents.filter(function (e) {
                return !t || sansAccent(e.texte).indexOf(t) >= 0;
            });
            if (t && !ents.length) {
                return;
            }
            trouves += ents.length;
            var ouvert = t ? true : estOuvert(m);
            h += '<button class="mp-mod' + (ouvert ? ' ouvert' : '') + '" data-mod="' + m.id + '" id="mp-mod-' + m.id + '" title="' + enc(m.nom) + '">' + tuile(m)
                    + '<span class="mp-lib">' + enc(m.nom) + '</span><span class="mp-n">' + ents.length + '</span><i class="fa-solid fa-chevron-right mp-chev"></i></button>';
            if (ouvert) {
                h += '<div class="mp-sous">' + ents.map(function (e) {
                    return ligne(e, q);
                }).join('') + '</div>';
            }
        });
        if (t && !trouves) {
            h += '<div class="mp-vide">Aucun écran ne contient « ' + enc(q) + ' ». Essayez un mot plus court.</div>';
        }
        return h;
    }
    function arbreReplieC() {
        return '<button class="mp-rb" data-act="replier" data-bulle="Déplier le menu"><i class="fa-solid fa-angles-right"></i></button>'
                + '<button class="mp-rb" data-act="palette" data-bulle="Rechercher un écran (Ctrl K)"><i class="fa-solid fa-magnifying-glass"></i></button><span class="mp-sep"></span>'
                + etat.modules.map(function (m) {
                    return '<button class="mp-rb mp-rb-clair' + (etat.volet === m ? ' on' : '') + '" data-rail="' + m.id + '" data-bulle="' + enc(m.nom) + '">' + tuile(m, 34) + '</button>';
                }).join('');
    }

    function dessiner() {
        var cmp = etat.cmp;
        if (!cmp || !cmp.el) {
            return;
        }
        var th = prefs.theme, racine = cmp.el.dom.querySelector('.mp');
        racine.className = 'mp mp-' + th + (prefs.replie ? ' replie' : '');
        var r = racine.querySelector('.mp-rail'), p = racine.querySelector('.mp-panneau'), a = racine.querySelector('.mp-corps'), c = racine.querySelector('.mp-colonne');
        if (th === 'A' || th === 'D') {
            r.innerHTML = rail();
        }
        if (th === 'A') {
            p.innerHTML = panneauA();
        }
        if (th === 'C' && prefs.replie) {
            c.innerHTML = arbreReplieC();
        }
        if ((th === 'C' || th === 'D') && a) {
            var haut = a.scrollTop;
            a.innerHTML = arbre();
            a.scrollTop = haut;
        }
        dessinerVolet();
    }

    /* ------------------------------------------------------------ volet (A, ou menu replie) */

    function fermerVolet() {
        if (etat.volet) {
            etat.volet = null;
            dessiner();
        }
    }
    function dessinerVolet() {
        var v = document.getElementById('mp-volet');
        if (!etat.volet) {
            if (v) {
                v.parentNode.removeChild(v);
            }
            return;
        }
        if (!v) {
            v = document.createElement('section');
            v.id = 'mp-volet';
            v.className = 'mp-volet';
            document.body.appendChild(v);
        }
        var b = etat.cmp.el.getBox(), m = etat.volet;
        v.style.left = (b.x + b.width) + 'px';
        v.style.top = b.y + 'px';
        v.style.height = b.height + 'px';
        v.setAttribute('aria-label', m.nom);
        v.innerHTML = '<div class="mp-v-tete">' + tuile(m, 34) + '<div><h2>' + enc(m.nom) + '</h2><div class="mp-v-sous">' + m.ents.length + ' écrans</div></div>'
                + '<button class="mp-v-fermer" data-act="fermer" title="Fermer"><i class="fa-solid fa-xmark"></i></button></div>'
                + '<div class="mp-grille">' + m.ents.map(function (e) {
            return ligne(e, '');
        }).join('') + '</div>';
    }

    /* ------------------------------------------------------------ recherche (Ctrl K) */

    function chercher(q) {
        var t = sansAccent(q).trim(), r = [];
        if (!t) {
            return prefs.recents.map(trouver).filter(Boolean);
        }
        etat.modules.forEach(function (m) {
            m.ents.forEach(function (e) {
                var i = sansAccent(e.texte).indexOf(t);
                var mot = sansAccent(e.texte + ' ' + m.nom).split(/\s+/).some(function (w) {
                    return w.indexOf(t) === 0;
                });
                if (i >= 0 || mot) {
                    r.push({m: m, e: e, i: i < 0 ? 999 : i});
                }
            });
        });
        return r.sort(function (x, y) {
            return x.i - y.i || x.e.texte.length - y.e.texte.length;
        }).slice(0, 10);
    }
    function ouvrirPalette() {
        if (document.getElementById('mp-palette')) {
            return;
        }
        fermerVolet();
        var d = document.createElement('div');
        d.id = 'mp-palette';
        d.innerHTML = '<div class="mp-voile" data-act="fermer-palette"></div><div class="mp-pal" role="dialog" aria-label="Rechercher un écran">'
                + '<div class="mp-p-ch"><i class="fa-solid fa-magnifying-glass"></i><input id="mp-p-saisie" placeholder="Écran ou module… ex. clôture, périmés, BL" autocomplete="off"></div>'
                + '<div class="mp-p-r" id="mp-p-r"></div><div class="mp-p-bas"><span><kbd>↑</kbd> <kbd>↓</kbd> choisir</span><span><kbd>Entrée</kbd> ouvrir</span><span><kbd>Échap</kbd> fermer</span>'
                + '<span class="mp-p-droite">Seuls vos menus autorisés apparaissent</span></div></div>';
        document.body.appendChild(d);
        var s = document.getElementById('mp-p-saisie');
        s.addEventListener('input', function () {
            etat.sel = 0;
            dessinerPalette();
        });
        s.focus();
        dessinerPalette();
    }
    function fermerPalette() {
        var d = document.getElementById('mp-palette');
        if (d) {
            d.parentNode.removeChild(d);
        }
    }
    function dessinerPalette() {
        var q = document.getElementById('mp-p-saisie').value;
        etat.res = chercher(q);
        document.getElementById('mp-p-r').innerHTML = '<div class="mp-p-g">' + (q.trim() ? 'Écrans' : 'Récents') + '</div>'
                + (etat.res.length ? etat.res.map(function (x, i) {
                    return '<button class="mp-p-l' + (i === etat.sel ? ' on' : '') + '" data-ouvrir="' + enc(x.e.id) + '">' + tuile(x.m, 26)
                            + '<span class="mp-lib">' + surligner(x.e.texte, q) + '</span><small>' + enc(x.m.nom) + '</small></button>';
                }).join('') : '<div class="mp-vide">' + (q.trim() ? 'Aucun écran ne correspond. Essayez un autre mot (ex. « caisse », « BL »).' : 'Aucun écran récent.') + '</div>');
    }

    /* ------------------------------------------------------------ evenements */

    function basculerModule(m) {
        /* un seul module ouvert a la fois : deplier un module replie celui qui etait ouvert */
        prefs.ouverts = estOuvert(m) ? [] : [m.nom];
        enregistrer();
    }
    function moduleDe(id) {
        for (var i = 0; i < etat.modules.length; i++) {
            if (etat.modules[i].id === id) {
                return etat.modules[i];
            }
        }
        return null;
    }
    function clic(ev) {
        var t = ev.target, cible = function (sel) {
            return t.closest ? t.closest(sel) : null;
        };
        var bulle = document.querySelector('.mp-bulle');
        if (bulle) {
            bulle.parentNode.removeChild(bulle);
        }
        var f = cible('[data-fav]');
        if (f) {
            ev.stopPropagation();
            ev.preventDefault();
            var id = f.getAttribute('data-fav');
            prefs.favoris = prefs.favoris.indexOf(id) >= 0 ? prefs.favoris.filter(function (x) {
                return x !== id;
            }) : prefs.favoris.concat(id);
            enregistrer();
            dessiner();
            return;
        }
        var o = cible('[data-ouvrir]');
        if (o) {
            ouvrir(o.getAttribute('data-ouvrir'));
            return;
        }
        var md = cible('[data-mod]');
        if (md) {
            basculerModule(moduleDe(md.getAttribute('data-mod')));
            dessiner();
            return;
        }
        var rl = cible('[data-rail]');
        if (rl) {
            var m = moduleDe(rl.getAttribute('data-rail'));
            if (prefs.theme === 'D' && !prefs.replie) {
                /* menu deplie : le module s'ouvre dans l'arbre et vient sous les yeux */
                if (!estOuvert(m)) {
                    basculerModule(m);
                }
                etat.filtre = '';
                var ch = etat.cmp.el.dom.querySelector('.mp-filtre input');
                if (ch) {
                    ch.value = '';
                }
                dessiner();
                var b = document.getElementById('mp-mod-' + m.id);
                if (b) {
                    b.scrollIntoView({block: 'start', behavior: 'smooth'});
                    b.classList.add('eclaire');
                    setTimeout(function () {
                        b.classList.remove('eclaire');
                    }, 900);
                }
                return;
            }
            etat.volet = etat.volet === m ? null : m;
            dessiner();
            return;
        }
        var a = cible('[data-act]');
        if (a) {
            var act = a.getAttribute('data-act');
            if (act === 'palette') {
                ouvrirPalette();
            } else if (act === 'fermer') {
                fermerVolet();
            } else if (act === 'fermer-palette') {
                fermerPalette();
            } else if (act === 'replier') {
                prefs.replie = !prefs.replie;
                etat.volet = null;
                enregistrer();
                poser();
            }
        }
    }
    function touches(ev) {
        var k = ev.key;
        if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && String(k).toLowerCase() === 'k') {
            ev.preventDefault();
            ouvrirPalette();
            return;
        }
        if (document.getElementById('mp-palette')) {
            if (k === 'Escape') {
                fermerPalette();
            } else if (k === 'ArrowDown' || k === 'ArrowUp') {
                etat.sel = Math.max(0, Math.min(etat.res.length - 1, etat.sel + (k === 'ArrowDown' ? 1 : -1)));
                dessinerPalette();
                ev.preventDefault();
            } else if (k === 'Enter' && etat.res[etat.sel]) {
                ouvrir(etat.res[etat.sel].e.id);
            }
            return;
        }
        if (k === 'Escape' && etat.volet) {
            fermerVolet();
        }
        if (k === 'Enter' && ev.target && ev.target.classList && ev.target.classList.contains('mp-ent')) {
            ouvrir(ev.target.getAttribute('data-ouvrir'));
        }
    }
    /* clic hors du volet : il se ferme */
    function clicDocument(ev) {
        if (!etat.volet) {
            return;
        }
        var t = ev.target;
        if (t.closest && (t.closest('#mp-volet') || t.closest('.mp') || t.closest('#mp-palette'))) {
            return;
        }
        fermerVolet();
    }
    function survol(ev) {
        var b = ev.target.closest ? ev.target.closest('[data-bulle]') : null, t = document.querySelector('.mp-bulle');
        if (!b) {
            if (t) {
                t.parentNode.removeChild(t);
            }
            return;
        }
        if (!t) {
            t = document.createElement('div');
            t.className = 'mp-bulle';
            document.body.appendChild(t);
        }
        var r = b.getBoundingClientRect();
        t.textContent = b.getAttribute('data-bulle');
        t.style.left = (r.right + 8) + 'px';
        t.style.top = (r.top + r.height / 2 - 12) + 'px';
    }

    /* ------------------------------------------------------------ mise en place dans l'ecran */

    function largeur() {
        return prefs.replie ? LARGEUR_REPLIE[prefs.theme] : LARGEUR[prefs.theme];
    }
    function squelette() {
        var th = prefs.theme;
        var colonne = (th === 'A' || th === 'D') ? '<nav class="mp-rail" aria-label="Modules"></nav>' : '<nav class="mp-colonne" aria-label="Modules"></nav>';
        if (th === 'A') {
            return colonne + '<aside class="mp-panneau"></aside>';
        }
        return colonne + '<aside class="mp-arbre"><div class="mp-a-tete"><label class="mp-filtre"><i class="fa-solid fa-magnifying-glass"></i>'
                + '<input placeholder="Filtrer le menu… (ex. périmés, BL)" autocomplete="off" aria-label="Filtrer le menu"></label>'
                + (th === 'C' ? '<button class="mp-btn" data-act="replier" title="Replier le menu"><i class="fa-solid fa-angles-left"></i></button>' : '')
                + '</div><div class="mp-corps"></div><div class="mp-pied"><kbd>Ctrl K</kbd> recherche rapide</div></aside>';
    }
    /* (re)pose le composant a la bonne largeur ; le menu actuel est cache */
    function poser() {
        var vp = etat.viewport;
        if (prefs.theme === 'actuel') {
            if (etat.cmp) {
                vp.remove(etat.cmp, true);
                etat.cmp = null;
            }
            etat.nav.show();
            return;
        }
        etat.nav.hide();
        if (!etat.cmp) {
            etat.cmp = vp.insert(1, {xtype: 'menuprestige', region: 'west', width: largeur()});
        } else {
            etat.cmp.setWidth(largeur());
        }
        var racine = etat.cmp.el && etat.cmp.el.dom.querySelector('.mp');
        if (racine) {
            racine.innerHTML = squelette();
            var ch = racine.querySelector('.mp-filtre input');
            if (ch) {
                ch.value = etat.filtre;
                ch.addEventListener('input', function () {
                    etat.filtre = ch.value;
                    dessiner();
                });
                ch.addEventListener('keydown', function (ev) {
                    if (ev.key === 'Escape') {
                        ch.value = '';
                        etat.filtre = '';
                        dessiner();
                    }
                    if (ev.key === 'Enter') {
                        var p = racine.querySelector('.mp-corps .mp-ent');
                        if (p) {
                            ouvrir(p.getAttribute('data-ouvrir'));
                        }
                    }
                });
            }
        }
        dessiner();
    }

    Ext.define('testextjs.view.MenuPrestige', {
        extend: 'Ext.Component',
        xtype: 'menuprestige',
        cls: 'mp-hote',
        html: '<div class="mp"></div>',
        listeners: {
            afterrender: function (c) {
                c.el.on('click', function (e) {
                    clic(e.browserEvent);
                });
                c.el.on('mouseover', function (e) {
                    survol(e.browserEvent);
                });
                c.el.on('mouseleave', function () {
                    var t = document.querySelector('.mp-bulle');
                    if (t) {
                        t.parentNode.removeChild(t);
                    }
                });
                Ext.defer(poser, 1);
            },
            resize: function () {
                dessinerVolet();
            }
        }
    });

    var ecouteurs = false;
    function brancher() {
        if (ecouteurs) {
            return;
        }
        ecouteurs = true;
        document.addEventListener('keydown', touches, true);
        document.addEventListener('mousedown', clicDocument, true);
        document.addEventListener('click', function (ev) {
            var t = ev.target;
            if (t.closest && (t.closest('#mp-volet') || t.closest('#mp-palette'))) {
                clic(ev);
            }
        });
        /* toute ouverture d'ecran (menu, tableau de bord, notification) : recents et ecran actif */
        var app = testextjs.app.getController('App'), orig = app.onLoadNewComponent;
        app.onLoadNewComponent = function (xtype) {
            var r = orig.apply(this, arguments);
            if (prefs.theme !== 'actuel') {
                apresOuverture(String(xtype));
            }
            return r;
        };
        var store = etat.nav.getStore();
        store.on('load', function () {
            etat.modules = lireModules();
            dessiner();
        });
    }

    function appliquer(theme) {
        prefs.theme = THEMES.indexOf(theme) >= 0 ? theme : 'actuel';
        if (prefs.theme !== 'actuel') {
            brancher();
        }
        etat.modules = lireModules();
        poser();
    }

    window.PrestigeMenu = {
        THEMES: THEMES,
        theme: function () {
            return prefs.theme;
        },
        /* appele par le Viewport une fois rendu : theme du cache tout de suite, puis celui du serveur */
        demarrer: function (viewport) {
            etat.viewport = viewport;
            etat.nav = viewport.down('navigation');
            if (!etat.nav) {
                return;
            }
            var c = lireCache();
            if (c && c.theme !== 'actuel') {
                prefs.replie = !!c.replie;
                appliquer(c.theme);
            }
            Ext.Ajax.request({url: '../api/v1/preferences/' + CLE, method: 'GET',
                success: function (r) {
                    var o = Ext.decode(r.responseText, true) || {}, v = o.success && o.valeur;
                    if (!o.success) {
                        return;
                    }
                    var avant = prefs.theme;
                    if (v && typeof v === 'object') {
                        prefs.replie = !!v.replie;
                        ['ouverts', 'favoris', 'recents'].forEach(function (k) {
                            prefs[k] = Ext.isArray(v[k]) ? v[k].map(String).slice(0, 200) : [];
                        });
                        prefs.theme = THEMES.indexOf(v.theme) >= 0 ? v.theme : 'actuel';
                    } else {
                        prefs.theme = 'actuel';
                    }
                    ecrireCache();
                    if (prefs.theme !== avant || prefs.theme !== 'actuel') {
                        appliquer(prefs.theme);
                    }
                }});
        },
        /* Options > Affichage du menu : enregistre puis recharge la page */
        choisir: function (theme, rappel) {
            if (THEMES.indexOf(theme) < 0) {
                return;
            }
            prefs.theme = theme;
            ecrireCache();
            clearTimeout(minuteur);
            Ext.Ajax.request({url: '../api/v1/preferences/' + CLE, method: 'PUT', jsonData: prefs,
                callback: function (o, ok) {
                    if (rappel) {
                        rappel(ok);
                    }
                }});
        },
        ouvrirRecherche: ouvrirPalette
    };
})();
