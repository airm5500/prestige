/* global Ext, testextjs */

/*
 * NOUVEAU TABLEAU DE BORD (plan d'octobre, section 8, lot L8 ; maquette tableau-de-bord-1-v3).
 *
 * Un composant ExtJS SANS iframe : tuiles en haut, cartes en grille. Chaque carte a sa route (v1/tableau-bord/...) et
 * n'est lue que lorsqu'elle devient visible a l'ecran ; une carte retiree n'est jamais lue. La disposition (ordre,
 * elements retires), les periodes des alertes et les interrupteurs sont memorises par utilisateur (v1/preferences).
 *
 * Les clics menent aux menus lies seulement si l'utilisateur les a dans son menu (memes droits). « Voir plus » et les
 * listes des alertes s'ouvrent dans une fenetre de consultation (aucune impression).
 */
Ext.define('testextjs.view.tableaubord.TableauBord', {
    extend: 'Ext.panel.Panel',
    xtype: 'tableaubord',
    border: false,
    autoScroll: true,
    cls: 'tb-panneau',
    bodyCls: 'tb-corps',

    statics: {
        /** Date forcee (tests) : AAAA-MM-JJ ; vide = aujourd'hui. */
        dateForcee: '',
        PREFERENCE: 'tableau-bord',
        MOIS: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
        /** Tuiles : id, titre, icone, couleur. */
        TUILES: [
            {id: 'ca', titre: 'CA net du jour', ico: 'fa-chart-line', k: 'k1'},
            {id: 'marge', titre: 'Marge nette', ico: 'fa-percent', k: 'k2'},
            {id: 'panier', titre: 'Panier moyen', ico: 'fa-basket-shopping', k: 'k3'},
            {id: 'achats', titre: 'Achats du jour', ico: 'fa-truck', k: 'k4'},
            {id: 'ruptures', titre: 'Ruptures', ico: 'fa-triangle-exclamation', k: 'k5'}
        ],
        /** Cartes : id, titre, icone, couleur (t-), largeur (l4 / l6 / l8). */
        CARTES: [
            {id: 'evolution', titre: 'Évolution du chiffre d\'affaires (Net TTC)', ico: 'fa-chart-area', t: 't-bleu', l: 'l8'},
            {id: 'valorisation', titre: 'Valorisation du stock', ico: 'fa-cubes', t: 't-cyan', l: 'l4'},
            {id: 'encaissements', titre: 'Encaissements du jour', ico: 'fa-money-bill-wave', t: 't-vert', l: 'l4'},
            {id: 'mouvements', titre: 'Mouvements de caisse du jour', ico: 'fa-right-left', t: 't-violet', l: 'l4'},
            {id: 'alertes', titre: 'Alertes', ico: 'fa-bell', t: 't-ambre', l: 'l4'},
            /* Retours du 06/10 : frequentation par tranche de 2 h, semaine precedente et semaine en cours. */
            {id: 'frequentation', titre: 'Fréquentation par tranche horaire', ico: 'fa-clock', t: 't-cyan', l: 'l12'},
            {id: 'topmois', titre: 'Top 5 des ventes du mois', ico: 'fa-trophy', t: 't-bleu', l: 'l6'},
            {id: 'grossistes', titre: 'Achats par grossiste (mois)', ico: 'fa-truck-fast', t: 't-violet', l: 'l6'},
            {id: 'topca', titre: 'Top 5 du chiffre d\'affaires (jour)', ico: 'fa-chart-column', t: 't-vert', l: 'l4'},
            {id: 'topqte', titre: 'Top 5 des quantités vendues (jour)', ico: 'fa-arrow-down-wide-short', t: 't-cyan', l: 'l4'},
            {id: 'tva', titre: 'Ventes par taux de TVA (mois)', ico: 'fa-chart-pie', t: 't-rose', l: 'l4'},
            /* Retours du 06/10 (2) : emplacement ou famille d'articles (interrupteur), top 10 */
            {id: 'emplacements', titre: 'CA par emplacement / famille : top 10 (mois)', ico: 'fa-location-dot', t: 't-ambre', l: 'l6'},
            {id: 'tiers', titre: 'Encours tiers payants : top 10 (mois)', ico: 'fa-users', t: 't-rose', l: 'l6'}
        ]
    },

    initComponent: function () {
        var me = this;
        me.prefs = {};
        me.html = '<div class="tb"><div class="tb-entete"><div><div class="tb-titre" data-tb="titre">TABLEAU DE BORD</div>'
                + '<div class="tb-sous" data-tb="date"></div></div><div class="tb-esp"></div>'
                + '<span class="tb-lien tb-retires-rappel" data-tb="perso-rappel" style="display:none"></span>'
                + '<button class="tb-btn tb-sombre" data-tb="perso">Personnaliser</button>'
                + '<button class="tb-btn tb-sombre" data-tb="actualiser"><i class="fa-solid fa-rotate"></i> Actualiser</button></div>'
                + '<div class="tb-bandeau"><b>Mode personnalisation.</b> Glissez une carte ou une tuile par sa poignée ⠿ pour la déplacer, ✕ pour la retirer. '
                + 'Les éléments retirés apparaissent ci-dessous : un clic les remet en place. La disposition est enregistrée pour votre compte.'
                + '<div class="tb-retires" data-tb="retires"></div><div style="margin-top:8px"><button class="tb-btn tb-mini" data-tb="defaut">Rétablir la disposition par défaut</button></div></div>'
                + '<div class="tb-tuiles" data-tb="tuiles" data-dd="tuiles"></div><div class="tb-grille" data-tb="cartes" data-dd="cartes"></div></div>';
        me.callParent(arguments);
        me.on('afterrender', me.demarrer, me, {single: true});
        me.on('destroy', function () {
            if (me.observateur) {
                me.observateur.disconnect();
            }
        });
    },

    /* ------------------------------------------------------------------ outils */

    q: function (sel) {
        /* ecran ferme pendant un chargement ou un redimensionnement : plus rien a dessiner */
        return this.isDestroyed || !this.body || !this.body.dom ? null : this.body.dom.querySelector(sel);
    },

    jour: function () {
        var f = testextjs.view.tableaubord.TableauBord.dateForcee;
        return f || Ext.Date.format(new Date(), 'Y-m-d');
    },

    fmt: function (v) {
        return Math.round(Number(v) || 0).toLocaleString('fr-FR');
    },

    esc: function (s) {
        return Ext.String.htmlEncode(String(s === null || s === undefined ? '' : s));
    },

    /** Lecture d'une route : JSON, ou null en cas d'echec (la carte affiche alors un message). */
    lire: function (url, params, suite) {
        var me = this;
        Ext.Ajax.request({
            url: url, method: 'GET', params: params || {}, timeout: 120000,
            success: function (r) {
                if (!me.isDestroyed) {
                    suite(Ext.decode(r.responseText, true));
                }
            },
            failure: function () {
                if (!me.isDestroyed) {
                    suite(null);
                }
            }
        });
    },

    /** Le menu de l'utilisateur contient-il cet ecran ? Rend son libelle, ou null. */
    menu: function (xtype) {
        var nav = Ext.ComponentQuery.query('navigation')[0];
        var store = nav && nav.getStore ? nav.getStore() : null;
        var trouve = null;
        if (store && store.getRootNode) {
            store.getRootNode().cascadeBy(function (n) {
                if (n.get('id') === xtype) {
                    trouve = n.get('text');
                    return false;
                }
            });
        }
        return trouve;
    },

    ouvrirMenu: function (xtype) {
        var titre = this.menu(xtype);
        if (!titre) {
            Ext.MessageBox.alert('Tableau de bord', 'Ce menu n\'est pas dans vos accès.');
            return;
        }
        testextjs.app.getController('App').onLoadNewComponent(xtype, titre, '');
    },

    /** Lien vers un menu, seulement si l'utilisateur y a acces. */
    lien: function (xtype, texte) {
        return this.menu(xtype) ? '<span class="tb-lien" data-menu="' + xtype + '">' + texte + '</span>' : '';
    },

    /* ------------------------------------------------------------------ preferences */

    chargerPreferences: function (suite) {
        var me = this;
        me.lire('../api/v1/preferences/' + testextjs.view.tableaubord.TableauBord.PREFERENCE, null, function (o) {
            me.prefs = (o && o.success && o.valeur && typeof o.valeur === 'object') ? o.valeur : {};
            suite();
        });
    },

    enregistrerPreferences: function () {
        var me = this;
        clearTimeout(me.minuteurPrefs);
        me.minuteurPrefs = setTimeout(function () {
            Ext.Ajax.request({
                url: '../api/v1/preferences/' + testextjs.view.tableaubord.TableauBord.PREFERENCE, method: 'PUT',
                headers: {'Content-Type': 'application/json'}, jsonData: me.prefs
            });
        }, 400);
    },

    alertesPrefs: function () {
        return Ext.apply({per: 6, rup: 7, ren: 7, sug: 2, nv: 30}, this.prefs.alertes || {});
    },

    /* ------------------------------------------------------------------ construction */

    demarrer: function () {
        var me = this;
        me.body.dom.querySelector('[data-tb="date"]').textContent = 'Tableau de bord · situation du ' + Ext.Date.format(Ext.Date.parse(me.jour(), 'Y-m-d'), 'd/m/Y');
        /* « Bienvenu(e), Dr ... » comme l'ancien tableau de bord : nom du pharmacien lu sur l'officine. */
        me.lire('../api/v1/officine', null, function (o) {
            var off = o && o.length ? o[0] : (o || {});
            var nom = String(off.fullName || off.nomComplet || '').trim();
            var t = me.body ? me.body.dom.querySelector('[data-tb="titre"]') : null;
            if (nom && t) {
                t.textContent = 'Bienvenu(e), ' + nom;
            }
        });
        me.brancherClics();
        /* Priorite au menu de navigation (comme l'ancien tableau de bord) : on attend son chargement, 5 s au plus. */
        var nav = Ext.ComponentQuery.query('navigation')[0];
        var store = nav && nav.getStore ? nav.getStore() : null;
        var lance = false;
        var lancer = function () {
            if (lance || me.isDestroyed) {
                return;
            }
            lance = true;
            me.chargerPreferences(function () {
                me.construire();
            });
        };
        if (store && !store._menuCharge) {
            store.on('load', function () {
                Ext.defer(lancer, 100);
            }, null, {single: true});
            Ext.defer(lancer, 5000);
        } else {
            Ext.defer(lancer, 50);
        }
    },

    ordre: function (liste, cle) {
        var ids = Ext.Array.pluck(liste, 'id'), mem = this.prefs[cle] || [];
        var r = Ext.Array.filter(mem, function (x) {
            return ids.indexOf(x) >= 0;
        });
        Ext.each(ids, function (x) {
            if (r.indexOf(x) < 0) {
                r.push(x);
            }
        });
        return r;
    },

    retire: function (id) {
        return (this.prefs.retires || []).indexOf(id) >= 0;
    },

    construire: function () {
        var me = this, S = testextjs.view.tableaubord.TableauBord;
        var zt = me.q('[data-tb="tuiles"]'), zc = me.q('[data-tb="cartes"]');
        zt.innerHTML = '';
        zc.innerHTML = '';
        if (me.observateur) {
            me.observateur.disconnect();
        }
        Ext.each(me.ordre(S.TUILES, 'ordreTuiles'), function (id) {
            var d = Ext.Array.findBy(S.TUILES, function (x) {
                return x.id === id;
            });
            if (me.retire('tuile-' + id)) {
                return;
            }
            var el = document.createElement('div');
            el.className = 'tb-kpi tb-tuile ' + d.k;
            el.setAttribute('draggable', 'true');
            el.setAttribute('data-id', 'tuile-' + id);
            el.setAttribute('data-nom', 'Tuile : ' + d.titre);
            el.innerHTML = '<span class="tb-poignee">⠿</span><span class="tb-masquer" title="Retirer">✕</span><span class="tb-ico"><i class="fa-solid ' + d.ico + '"></i></span>'
                    + '<div class="tb-meta"><div class="tb-l">' + d.titre + '</div><div data-tuile="' + id + '"><div class="tb-v">…</div></div></div>';
            zt.appendChild(el);
        });
        me.observateur = window.IntersectionObserver ? new IntersectionObserver(function (entrees) {
            Ext.each(entrees, function (e) {
                if (e.isIntersecting) {
                    me.observateur.unobserve(e.target);
                    me.chargerCarte(e.target.getAttribute('data-carte'));
                }
            });
        }, {root: me.body.dom, rootMargin: '200px'}) : null;
        Ext.each(me.ordre(S.CARTES, 'ordreCartes'), function (id) {
            var d = Ext.Array.findBy(S.CARTES, function (x) {
                return x.id === id;
            });
            if (me.retire(id)) {
                return;
            }
            var el = document.createElement('div');
            el.className = 'tb-carte ' + d.t + ' ' + d.l;
            el.setAttribute('draggable', 'true');
            el.setAttribute('data-id', id);
            el.setAttribute('data-nom', d.titre);
            el.setAttribute('data-carte', id);
            el.innerHTML = '<div class="tb-tete"><span class="tb-poignee">⠿</span><i class="fa-solid ' + d.ico + '"></i>' + d.titre
                    + '<div class="tb-outils" data-outils="' + id + '"></div><span class="tb-masquer" title="Retirer">✕</span></div>'
                    + '<div class="tb-c" data-corps="' + id + '"><div class="tb-attente">Chargement…</div></div>';
            zc.appendChild(el);
            if (me.observateur) {
                me.observateur.observe(el);
            } else {
                me.chargerCarte(id);
            }
        });
        me.majRetires();
        me.brancherGlisser();
        me.chargerTuiles();
    },

    /* ------------------------------------------------------------------ tuiles */

    chargerTuiles: function (frais) {
        var me = this, a = me.alertesPrefs();
        if (!me.q('[data-tuile]')) {
            return;
        }
        /* meme regle que les cartes : seule la derniere lecture des tuiles s'affiche */
        var version = me.versionTuiles = (me.versionTuiles || 0) + 1;
        me.lire('../api/v1/tableau-bord/tuiles', {date: me.jour(), achats: me.prefs.achats || 'saisie', rup: a.rup, frais: frais ? 1 : 0}, function (o) {
            if (version === me.versionTuiles) {
                me.dessinerTuiles(o);
            }
        });
    },

    dessinerTuiles: function (o) {
        var me = this, f = me.fmt;
        var poser = function (id, html) {
            var z = me.q('[data-tuile="' + id + '"]');
            if (z) {
                z.innerHTML = html;
            }
        };
        if (!o || !o.success) {
            Ext.each(['ca', 'marge', 'panier', 'achats', 'ruptures'], function (id) {
                poser(id, '<div class="tb-v">—</div><div class="tb-d">indisponible</div>');
            });
            return;
        }
        var ev = o.evolutionJ7;
        poser('ca', '<div class="tb-v">' + f(o.ca) + '</div><div class="tb-d"><b>' + f(o.clients) + '</b> clients'
                + (ev === null || ev === undefined ? '' : ' · <span class="' + (ev >= 0 ? 'tb-hausse' : 'tb-baisse') + '">'
                        + (ev >= 0 ? '+' : '') + String(ev).replace('.', ',') + ' % vs J-7</span>') + '</div>');
        poser('marge', '<div class="tb-v">' + f(o.marge) + '</div><div class="tb-d"><b>' + String(o.tauxMarge).replace('.', ',') + ' %</b> du CA HT</div>');
        poser('panier', '<div class="tb-v">' + f(o.panier) + '</div><div class="tb-d">par client</div>');
        var bl = (me.prefs.achats || 'saisie') === 'bl';
        poser('achats', '<span class="tb-seg tb-seg-tuile" data-seg="achats"><button class="' + (bl ? '' : 'on') + '" data-v="saisie">saisie</button>'
                + '<button class="' + (bl ? 'on' : '') + '" data-v="bl">date BL</button></span>'
                + '<div class="tb-v">' + f(o.achats.ttc) + '</div><div class="tb-d">HT <b>' + f(o.achats.ht) + '</b> + TVA <b>' + f(o.achats.tva)
                + '</b> · <b>' + f(o.achats.bl) + '</b> BL</div>'
                /* retours du 06/10 (4) : ratio vente / achat du jour (CA net TTC / achats TTC) */
                + '<div class="tb-d" title="Chiffre d\'affaires net TTC du jour divisé par les achats TTC du jour">Ratio vente/achat : <b>'
                + (o.achats.ttc > 0 ? (Math.round(o.ca * 100 / o.achats.ttc) / 100).toLocaleString('fr-FR', {minimumFractionDigits: 2}) : '—') + '</b></div>'
                + '<div class="tb-d tb-petit">' + (bl ? 'selon la date figurant sur le BL du grossiste'
                : 'selon la date de saisie (entrée en stock)') + '</div>');
        poser('ruptures', '<div class="tb-v tb-clic" data-liste="ruptures">' + f(o.ruptures.produits) + '</div><div class="tb-d"><span class="tb-baisse"><b>'
                + f(o.ruptures.vendusRecemment) + '</b> vendus sous <b>' + o.ruptures.jours + '</b> j</span></div>');
        me.animerNombres(me.q('[data-tb="tuiles"]'));
    },

    /**
     * Retours du 06/10 (4) : les grands nombres des tuiles defilent jusqu'a leur valeur (0,8 s). Sans effet si
     * l'utilisateur a demande moins d'animations au systeme.
     */
    animerNombres: function (zone) {
        if (!zone || !window.requestAnimationFrame || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
            return;
        }
        Ext.each(Ext.Array.slice(zone.querySelectorAll('.tb-v')), function (el) {
            var texte = el.textContent, cible = Number(texte.replace(/[^0-9-]/g, ''));
            if (!texte || isNaN(cible) || !/^[-\d\s\u202f\u00a0.]+$/.test(texte.trim()) || Math.abs(cible) < 2) {
                return;
            }
            var debut = null, duree = 800;
            var pas = function (t) {
                debut = debut || t;
                var k = Math.min(1, (t - debut) / duree), e = 1 - Math.pow(1 - k, 3);
                el.textContent = k < 1 ? Math.round(cible * e).toLocaleString('fr-FR') : texte;
                if (k < 1) {
                    window.requestAnimationFrame(pas);
                }
            };
            window.requestAnimationFrame(pas);
        });
    },

    /* ------------------------------------------------------------------ cartes */

    corps: function (id) {
        return this.q('[data-corps="' + id + '"]');
    },

    outils: function (id) {
        return this.q('[data-outils="' + id + '"]');
    },

    erreur: function (id) {
        var c = this.corps(id);
        if (c) {
            c.innerHTML = '<div class="tb-attente">Données indisponibles. <span class="tb-lien" data-recharger="' + id + '">Réessayer</span></div>';
        }
    },

    chargerCarte: function (id, frais) {
        var me = this, j = me.jour(), fr = frais ? 1 : 0;
        if (!me.corps(id)) {
            return;
        }
        /* Une seule lecture fait foi par carte : la reponse d'une lecture plus ancienne (date changee, actualiser,
           interrupteur) arrivee en retard est ignoree au lieu d'ecraser la bonne. */
        me.versions = me.versions || {};
        var version = me.versions[id] = (me.versions[id] || 0) + 1;
        var lire = function (url, params, suite) {
            me.lire(url, params, function (o) {
                if (me.versions[id] === version) {
                    suite(o);
                }
            });
        };
        var routes = {
            evolution: function () {
                me.dessinerEvolution(fr);
            },
            valorisation: function () {
                lire('../api/v1/tableau-bord/valorisation', {frais: fr}, function (o) {
                    me.dessinerValorisation(o);
                });
            },
            encaissements: function () {
                lire('../api/v1/tableau-bord/encaissements', {date: j, frais: fr}, function (o) {
                    me.dessinerEncaissements(o);
                });
            },
            mouvements: function () {
                lire('../api/v1/tableau-bord/mouvements', {date: j, frais: fr}, function (o) {
                    me.dessinerMouvements(o);
                });
            },
            alertes: function () {
                var a = me.alertesPrefs();
                lire('../api/v1/tableau-bord/alertes', Ext.apply({frais: fr}, a), function (o) {
                    me.dessinerAlertes(o);
                });
            },
            frequentation: function () {
                lire('../api/v1/tableau-bord/frequentation', {date: j, frais: fr}, function (o) {
                    me.donneesFreq = o;
                    me.dessinerFrequentation();
                });
            },
            topmois: function () {
                lire('../api/v1/tableau-bord/top-mois', {date: j, limite: 5, frais: fr}, function (o) {
                    me.donneesTopMois = o;
                    me.dessinerTopMois();
                });
            },
            grossistes: function () {
                lire('../api/v1/tableau-bord/grossistes', {date: j, limite: 5, frais: fr}, function (o) {
                    me.dessinerBarres('grossistes', o, '#7c3aed', 'grossistes');
                });
            },
            topca: function () {
                lire('../api/v1/tableau-bord/top-jour', {date: j, limite: 5, frais: fr}, function (o) {
                    me.dessinerBarres('topca', o && o.success ? {success: true, data: o.ca} : null, '#16a34a', 'topca');
                    me.dessinerBarres('topqte', o && o.success ? {success: true, data: o.quantites} : null, '#0891b2', 'topqte');
                });
            },
            topqte: function () {
                /* Meme route que le top du CA (une lecture, servie par le cache court) : les deux cartes se remplissent. */
                routes.topca();
            },
            tva: function () {
                me.dessinerTva();
            },
            emplacements: function () {
                var axe = me.prefs.empl === 'famille' ? 'famille' : 'emplacement';
                lire('../api/v1/tableau-bord/emplacements', {date: j, limite: 10, axe: axe, frais: fr}, function (o) {
                    me.dessinerBarres('emplacements', o, '#f59e0b', 'emplacements', '<span class="tb-seg" data-seg="empl">'
                            + '<button data-v="emplacement" class="' + (axe === 'emplacement' ? 'on' : '') + '">Emplacement</button>'
                            + '<button data-v="famille" class="' + (axe === 'famille' ? 'on' : '') + '">Famille</button></span> ');
                });
            },
            tiers: function () {
                lire('../api/v1/tableau-bord/tiers-payants', {date: j, limite: 10, frais: fr}, function (o) {
                    me.dessinerBarres('tiers', o, '#e11d48', 'tiers');
                });
            }
        };
        if (routes[id]) {
            routes[id]();
        }
    },

    /** Barres horizontales (top 5) avec « Voir plus ». */
    dessinerBarres: function (id, o, couleur, plus, avant) {
        var me = this, c = me.corps(id);
        if (!c) {
            return;
        }
        if (!o || !o.success) {
            me.erreur(id);
            return;
        }
        var l = o.data || [];
        var out = me.outils(id);
        if (out) {
            out.innerHTML = (avant || '') + '<span class="tb-lien" data-plus="' + plus + '">Voir plus →</span>';
        }
        if (!l.length) {
            c.innerHTML = '<div class="tb-attente">Aucune donnée sur la période.</div>';
            return;
        }
        var max = Ext.Array.max(Ext.Array.map(l, function (x) {
            return Number(x.valeur) || 0;
        })) || 1;
        var tot = Ext.Array.sum(Ext.Array.map(l, function (x) {
            return Number(x.valeur) || 0;
        })) || 1;
        /* la liste est deja limitee par le serveur (5 ou 10 selon la carte) ; le nombre de clients suit le libelle */
        c.innerHTML = '<table class="tb-fixe">' + Ext.Array.map(l.slice(0, 10), function (x, i) {
            var nb = x.nombre !== undefined ? ' (' + me.fmt(x.nombre) + ')' : '';
            return '<tr><td class="tb-nom1" style="width:46%" title="' + me.esc(x.libelle) + nb + '">' + (i + 1) + '. ' + me.esc(x.libelle) + nb + '</td>'
                    + '<td><div class="tb-barre"><i style="width:' + (x.valeur * 100 / max) + '%;background:' + couleur + '"></i></div></td>'
                    + '<td class="tb-n" style="width:22%"><b>' + me.fmt(x.valeur) + '</b></td><td class="tb-n tb-note" style="width:11%">'
                    + Math.round(x.valeur * 100 / tot) + ' %</td></tr>';
        }).join('') + '</table>';
    },

    /* --- courbe */

    dessinerEvolution: function (frais) {
        var me = this, an = new Date().getFullYear();
        var annee = Number(me.prefs.annee) || an;
        if (annee > an || annee < an - 2) {
            annee = an;
        }
        var cmp = me.prefs.cmp !== false;
        var out = me.outils('evolution');
        if (out) {
            out.innerHTML = '<label class="tb-note"><input type="checkbox" data-cmp ' + (cmp ? 'checked' : '') + '> comparer à N-1</label>'
                    + '<span class="tb-seg" data-seg="annee">' + [an, an - 1, an - 2].map(function (a) {
                return '<button data-v="' + a + '" class="' + (a === annee ? 'on' : '') + '">' + a + '</button>';
            }).join('') + '</span>';
        }
        me.lire('../api/v1/tableau-bord/evolution', {annee: annee, frais: frais ? 1 : 0}, function (o) {
            if (!o || !o.success) {
                me.erreur('evolution');
                return;
            }
            me.donneesEvolution = o;
            me.tracerCourbe();
        });
    },

    tracerCourbe: function () {
        var me = this, o = me.donneesEvolution, c = me.corps('evolution'), M = testextjs.view.tableaubord.TableauBord.MOIS;
        if (!o || !c) {
            return;
        }
        var cmp = me.prefs.cmp !== false, annee = o.annee, now = new Date();
        var enCours = annee === now.getFullYear();
        /* Annee en cours : les mois clos seulement (le mois en cours, incomplet, est rappele dans la legende). */
        var s1 = o.mois.map(function (v, i) {
            return enCours && i >= now.getMonth() ? null : v / 1e6;
        });
        var s0 = o.precedente.map(function (v) {
            return v / 1e6;
        });
        var vals = s1.concat(cmp ? s0 : []).filter(function (v) {
            return v !== null;
        });
        if (!vals.length) {
            c.innerHTML = '<div class="tb-attente">Aucune vente sur l\'année.</div>';
            return;
        }
        var w = Math.max(c.clientWidth - 8, 320), h = 280, pg = 56, pd = 14, ph = 26, pb = 34;
        var pas = Math.max(1, Math.pow(10, Math.floor(Math.log10(Math.max.apply(null, vals) || 1))));
        var max = Math.ceil(Math.max.apply(null, vals) / pas) * pas || 1;
        var min = Math.max(0, Math.floor(Math.min.apply(null, vals) / pas) * pas - pas);
        var X = function (i) {
            return pg + i * (w - pg - pd) / 11;
        }, Y = function (v) {
            return ph + (h - ph - pb) * (1 - (v - min) / ((max - min) || 1));
        };
        var nb = function (v) {
            return (Math.round(v * 10) / 10).toLocaleString('fr-FR');
        };
        var s = '<svg width="' + w + '" height="' + h + '" style="display:block">';
        for (var g = min; g <= max + 1e-9; g += pas) {
            s += '<line x1="' + pg + '" x2="' + (w - pd) + '" y1="' + Y(g) + '" y2="' + Y(g) + '" stroke="#e3e9f0"/><text x="' + (pg - 8) + '" y="' + (Y(g) + 4)
                    + '" font-size="12" font-weight="700" fill="#1e3a5f" text-anchor="end">' + nb(g) + ' M</text>';
        }
        s += '<line x1="' + pg + '" x2="' + pg + '" y1="' + (ph - 6) + '" y2="' + (h - pb) + '" stroke="#1e3a5f" stroke-width="2"/>'
                + '<line x1="' + pg + '" x2="' + (w - pd) + '" y1="' + (h - pb) + '" y2="' + (h - pb) + '" stroke="#1e3a5f" stroke-width="2"/>';
        M.forEach(function (m, i) {
            s += '<text x="' + X(i) + '" y="' + (h - 12) + '" font-size="12" font-weight="700" fill="#1e3a5f" text-anchor="middle">' + m + '</text>';
        });
        var pts = function (a) {
            return a.map(function (v, i) {
                return v === null ? null : [X(i), Y(v)];
            }).filter(Boolean);
        };
        if (cmp) {
            s += '<polyline fill="none" stroke="#9fb3c8" stroke-width="1.8" stroke-dasharray="5 4" points="' + pts(s0).map(function (p) {
                return p.join(',');
            }).join(' ') + '"/>';
        }
        var p1 = pts(s1);
        if (p1.length) {
            s += '<path d="M' + p1[0][0] + ',' + (h - pb) + ' L' + p1.map(function (p) {
                return p.join(',');
            }).join(' L') + ' L' + p1[p1.length - 1][0] + ',' + (h - pb) + ' Z" fill="rgba(46,117,182,.10)"/>';
            s += '<polyline fill="none" stroke="#1e3a5f" stroke-width="2.8" points="' + p1.map(function (p) {
                return p.join(',');
            }).join(' ') + '"/>';
        }
        s1.forEach(function (v, i) {
            if (v === null) {
                return;
            }
            var x = X(i), y = Y(v);
            s += '<circle cx="' + x + '" cy="' + y + '" r="3.5" fill="#fff" stroke="#1e3a5f" stroke-width="2"><title>' + M[i] + ' ' + annee + ' : ' + nb(v) + ' M FCFA</title></circle>';
            s += '<text x="' + x + '" y="' + (y + 18) + '" font-size="11" font-weight="700" fill="#1e2a36" text-anchor="middle">' + nb(v) + '</text>';
            var prev = i > 0 ? s1[i - 1] : null;
            if (prev) {
                var pct = Math.round((v / prev - 1) * 100), tx = (pct > 0 ? '+' : '') + pct + '%', col = pct > 0 ? '#16a34a' : pct < 0 ? '#dc2626' : '#64748b', pw = tx.length * 6.5 + 10;
                s += '<rect x="' + (x - pw / 2) + '" y="' + (y - 24) + '" width="' + pw + '" height="15" rx="7.5" fill="' + col + '"/><text x="' + x + '" y="' + (y - 13)
                        + '" font-size="10" font-weight="800" fill="#fff" text-anchor="middle">' + tx + '</text>';
            }
        });
        s += '</svg>';
        var n = s1.filter(function (v) {
            return v !== null;
        }).length;
        var tot = function (a) {
            return a.slice(0, n).reduce(function (x, y) {
                return x + (y || 0);
            }, 0);
        };
        var lg = n ? '<span><i style="background:#1e3a5f"></i>' + annee + ' (jan → ' + M[n - 1].toLowerCase() + ') : <b>' + nb(tot(s1)) + ' M FCFA</b></span>' : '';
        if (cmp && n && tot(s0) > 0) {
            var e = (tot(s1) / tot(s0) - 1) * 100;
            lg += '<span><i style="background:#9fb3c8"></i>' + (annee - 1) + ' même période : ' + nb(tot(s0)) + ' M <b class="' + (e >= 0 ? 'tb-hausse' : 'tb-baisse') + '">'
                    + (e >= 0 ? '+' : '') + nb(e) + ' %</b></span>';
        }
        if (enCours) {
            lg += '<span>' + M[now.getMonth()] + ' en cours : ' + nb(o.mois[now.getMonth()] / 1e6) + ' M (non tracé)</span>';
        }
        lg += '<span>Pastilles : évolution par rapport au mois précédent</span>';
        c.innerHTML = s + '<div class="tb-legende">' + lg + '</div>';
    },

    /* --- valorisation */

    dessinerValorisation: function (o) {
        var me = this, c = me.corps('valorisation'), f = function (v) {
            return (Math.round(v / 1e5) / 10).toLocaleString('fr-FR') + ' M';
        };
        if (!c) {
            return;
        }
        if (!o || !o.success) {
            me.erreur('valorisation');
            return;
        }
        var tot = o.total.achat || 1, pr = Math.round(o.rayon.achat * 100 / tot), ps = 100 - pr;
        if (!o.total.achat) {
            pr = 0;
            ps = 0;
        }
        c.innerHTML = '<table><tr><th></th><th class="tb-n">Achat</th><th class="tb-n">Vente</th><th class="tb-n" title="Part dans la valeur du stock (achat)">Part</th></tr>'
                + '<tr><td><i class="tb-puce" style="background:#2E75B6"></i> Rayon</td><td class="tb-n">' + f(o.rayon.achat) + '</td><td class="tb-n">' + f(o.rayon.vente) + '</td><td class="tb-n">' + pr + ' %</td></tr>'
                + '<tr><td><i class="tb-puce" style="background:#9fc3e6"></i> Réserve</td><td class="tb-n">' + f(o.reserve.achat) + '</td><td class="tb-n">' + f(o.reserve.vente) + '</td><td class="tb-n">' + ps + ' %</td></tr>'
                + '<tr><td><b>Total</b></td><td class="tb-n"><b>' + f(o.total.achat) + '</b></td><td class="tb-n"><b>' + f(o.total.vente) + '</b></td><td class="tb-n"><b>100 %</b></td></tr></table>'
                + '<div class="tb-note" style="margin-top:8px">Répartition (valeur d\'achat)</div><div class="tb-empile"><i style="width:' + pr + '%;background:#2E75B6"></i><i style="width:' + ps + '%;background:#9fc3e6"></i></div>'
                + '<div class="tb-encart"><div class="tb-l">Entrés il y a plus d\'un mois, jamais vendus depuis</div>'
                + '<div style="display:flex;gap:16px;align-items:baseline"><div class="tb-v" style="font-size:19px">' + me.fmt(o.dormants.produits) + ' produits</div>'
                + '<div class="tb-d"><b>' + f(o.dormants.valeurAchat) + '</b> FCFA (achat)</div></div><div class="tb-d">' + me.lien('stockmort', 'Voir la liste →')
                + ' · à comparer : <b>' + me.fmt(o.dormants.vendus) + '</b> produits entrés et vendus</div></div>';
    },

    /* --- encaissements */

    dessinerEncaissements: function (o) {
        var me = this, c = me.corps('encaissements');
        var couleurs = ['#1e3a5f', '#17987e', '#7b68c8', '#e08a1e', '#2a9bb3', '#d0576b', '#8a99a8'];
        if (!c) {
            return;
        }
        if (!o || !o.success) {
            me.erreur('encaissements');
            return;
        }
        var modes = o.modes || [];
        if (!modes.length) {
            c.innerHTML = '<div class="tb-attente">Aucun encaissement ce jour.</div>';
            return;
        }
        var tot = Ext.Array.sum(Ext.Array.pluck(modes, 'montant')) || 1, r = 46, C = 2 * Math.PI * r, off = 0, seg = '';
        modes.forEach(function (m, i) {
            m.c = couleurs[i % couleurs.length];
            var l = m.montant / tot * C;
            seg += '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="' + m.c + '" stroke-width="20" stroke-dasharray="' + l + ' ' + (C - l)
                    + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 60 60)"><title>' + me.esc(m.libelle) + ' : ' + me.fmt(m.montant) + '</title></circle>';
            off += l;
        });
        var t = '<tr><th>Mode</th><th class="tb-n">Montant</th><th class="tb-n">Part</th></tr>';
        modes.forEach(function (m) {
            var mm = !!m.operateurs;
            t += '<tr class="' + (mm ? 'tb-clic' : '') + '"' + (mm ? ' data-mm' : '') + '><td><i class="tb-puce" style="background:' + m.c + '"></i> '
                    + (mm ? '<span class="tb-chevron">' + (me.mmOuvert ? '▾' : '▸') + '</span>' : '') + me.esc(m.libelle) + '</td><td class="tb-n">' + me.fmt(m.montant)
                    + '</td><td class="tb-n">' + (m.montant * 100 / tot).toFixed(1).replace('.', ',') + ' %</td></tr>';
            if (mm && me.mmOuvert) {
                m.operateurs.forEach(function (x) {
                    t += '<tr class="tb-sous-ligne"><td>' + me.esc(x.libelle) + '</td><td class="tb-n">' + me.fmt(x.montant) + '</td><td class="tb-n">'
                            + (x.montant * 100 / m.montant).toFixed(1).replace('.', ',') + ' % <span class="tb-note">du MM</span></td></tr>';
                });
            }
        });
        t += '<tr><td><b>Total</b></td><td class="tb-n"><b>' + me.fmt(tot) + '</b></td><td class="tb-n">100 %</td></tr>';
        me.donneesEnc = o;
        c.innerHTML = '<div class="tb-donut"><svg width="120" height="120">' + seg + '<text x="60" y="56" text-anchor="middle" font-size="10" fill="#5b6b7c">Total</text>'
                + '<text x="60" y="71" text-anchor="middle" font-size="12" font-weight="800" fill="#1e3a5f">' + (tot / 1e6).toFixed(2).replace('.', ',') + ' M</text></svg>'
                + '<div class="tb-note" style="flex:1">' + (Ext.Array.findBy(modes, function (m) {
                    return !!m.operateurs;
                }) ? 'Clic sur <b>Mobile money</b> pour le détail par opérateur.' : '') + '</div></div><table style="margin-top:8px">' + t + '</table>';
    },

    /* --- mouvements */

    dessinerMouvements: function (o) {
        var me = this, c = me.corps('mouvements');
        if (!c) {
            return;
        }
        if (!o || !o.success) {
            me.erreur('mouvements');
            return;
        }
        var l = o.data || [];
        var lienMenu = me.menu('mvtcaissemanager');
        var html = '<table><tr><th>Mouvement</th><th class="tb-n">Montant</th></tr>' + (l.length ? Ext.Array.map(l, function (x) {
            return '<tr class="' + (lienMenu ? 'tb-clic' : '') + '"' + (lienMenu ? ' data-menu="mvtcaissemanager"' : '') + '><td>' + me.esc(x.libelle) + '</td><td class="tb-n '
                    + (x.sortie ? 'tb-baisse' : 'tb-hausse') + '">' + me.fmt(x.montant) + '</td></tr>';
        }).join('') : '<tr><td colspan="2" class="tb-note">Aucun mouvement ce jour.</td></tr>')
                + '<tr><td><b>Solde</b></td><td class="tb-n"><b>' + me.fmt(o.solde) + '</b></td></tr></table>'
                + '<div class="tb-note" style="margin-top:6px">Hors ventes. Entrées en vert, sorties en rouge.' + (lienMenu ? ' Clic : écran des mouvements de caisse.' : '') + '</div>';
        c.innerHTML = html;
    },

    /* --- alertes */

    dessinerAlertes: function (o) {
        var me = this, c = me.corps('alertes'), a = me.alertesPrefs();
        if (!c) {
            return;
        }
        if (!o || !o.success) {
            me.erreur('alertes');
            return;
        }
        var out = me.outils('alertes');
        if (out) {
            out.innerHTML = '<span class="tb-lien" data-periodes title="Régler les périodes des alertes"><i class="fa-solid fa-gear"></i> Périodes</span>';
        }
        var ligne = function (attr, pastille, classe, texte) {
            return '<tr class="tb-clic" ' + attr + '><td style="width:118px"><span class="tb-pastille ' + classe + '">' + pastille + '</span></td><td>' + texte + '</td></tr>';
        };
        var menuOu = function (x) {
            return me.menu(x) ? 'data-menu="' + x + '"' : '';
        };
        c.innerHTML = '<div class="tb-reglage' + (me.reglageOuvert ? ' ouvert' : '') + '">'
                + '<label>Péremption sous <input type="number" min="1" max="24" value="' + a.per + '" data-p="per"> mois</label>'
                + '<label>Ruptures vendues depuis <input type="number" min="1" max="90" value="' + a.rup + '" data-p="rup"> jours</label>'
                + '<label>Renouvellements sous <input type="number" min="0" max="60" value="' + a.ren + '" data-p="ren"> jours</label>'
                + '<label>Suggestions de commande clôturées depuis <input type="number" min="0" max="60" value="' + a.sug + '" data-p="sug"> jours</label>'
                + '<label>Articles entrés non vendus depuis <input type="number" min="1" max="365" value="' + a.nv + '" data-p="nv"> jours</label>'
                + '<div class="tb-note">Enregistré pour votre compte. La période des ruptures vaut aussi pour la tuile « Ruptures ».</div></div>'
                + '<table>' + ligne('data-liste="ruptures"', 'Rupture', 'p-r', '<b>' + me.fmt(o.ruptures.produits) + '</b> produits à zéro, dont <b>' + me.fmt(o.ruptures.vendusRecemment)
                        + '</b> vendus sous <b>' + a.rup + '</b> j')
                + ligne('data-liste="peremptions"', 'Péremption', 'p-a', '<b>' + me.fmt(o.peremptions.lots) + '</b> lots périment sous <b>' + a.per + '</b> mois ('
                        + (Math.round(o.peremptions.valeurAchat / 1e5) / 10).toLocaleString('fr-FR') + ' M)')
                + ligne(menuOu('reservemanager'), 'Sugg. réserve', 'p-b', '<b>' + me.fmt(o.suggestionsReserve) + '</b> suggestions de réserve à traiter')
                + ligne('data-liste="rayon"', 'Sugg. rayon', 'p-b', '<b>' + me.fmt(o.suggestionsRayon) + '</b> suggestions de rayon à traiter')
                + ligne(menuOu('i_sugg_manager'), 'Sugg. commande', 'p-v', '<b>' + me.fmt(o.suggestionsCommande.cloturees) + '</b> suggestions de commande clôturées depuis <b>'
                        + a.sug + '</b> j, non commandées')
                + ligne(menuOu('ordonnanceclient'), 'Renouvellement', 'p-g', '<b>' + me.fmt(o.renouvellements.patients) + '</b> ordonnances à renouveler sous <b>' + a.ren + '</b> j')
                + ligne(menuOu('venteavoirmanager'), 'Avoirs', 'p-a', '<b>' + me.fmt(o.avoirs) + '</b> ventes en avoir en cours')
                + ligne('data-liste="negatifs"', 'Stock négatif', 'p-r', '<b>' + me.fmt(o.negatifs) + '</b> articles en stock négatif')
                /* retours du 06/10 (4) : articles commandes (entres en stock) et jamais vendus depuis */
                + ligne('data-liste="nonvendus"', 'Entrés non vendus', 'p-a', '<b>' + me.fmt((o.nonVendus || {}).produits || 0) + '</b> articles entrés depuis <b>'
                        + a.nv + '</b> j et pas vendus depuis') + '</table>'
                + '<div class="tb-note" style="margin-top:6px">Ruptures, péremptions, rayon, stock négatif, entrés non vendus : clic → liste des produits. Autres lignes : ouvre le menu.</div>';
    },

    /* --- frequentation (retours du 06/10) : ventes par tranche de 2 h, semaine precedente / semaine en cours */

    dessinerFrequentation: function () {
        var me = this, o = me.donneesFreq, c = me.corps('frequentation');
        if (!c) {
            return;
        }
        if (!o || !o.success) {
            me.erreur('frequentation');
            return;
        }
        var moy = me.prefs.freq !== 'total';
        var pas = Math.min(6, Math.max(1, parseInt(me.prefs.tranche, 10) || 2));
        var out = me.outils('frequentation');
        if (out) {
            out.innerHTML = '<select class="tb-select" data-tranche="1" title="Tranche horaire">' + [1, 2, 3, 4, 5, 6].map(function (n) {
                return '<option value="' + n + '"' + (n === pas ? ' selected' : '') + '>Tranche de ' + n + ' h</option>';
            }).join('') + '</select> <span class="tb-seg" data-seg="freq"><button data-v="moyenne" class="' + (moy ? 'on' : '') + '">Moyenne par jour</button>'
                    + '<button data-v="total" class="' + (moy ? '' : 'on') + '">Total de la semaine</button></span>';
        }
        /* Ventes par heure (24 cases) regroupees par tranche de « pas » heures ; repli sur les tranches de 2 h. */
        var regrouper = function (sem) {
            var h = sem.ventesH, n = Math.ceil(24 / pas), r = [], ca = [];
            for (var k = 0; k < n; k++) {
                r[k] = 0;
                ca[k] = 0;
            }
            if (!h) {
                (sem.ventes || []).forEach(function (v, i) {
                    r[Math.floor(i * 2 / pas)] += v || 0;
                    ca[Math.floor(i * 2 / pas)] += (sem.ca || [])[i] || 0;
                });
            } else {
                h.forEach(function (v, i) {
                    r[Math.floor(i / pas)] += v || 0;
                    ca[Math.floor(i / pas)] += (sem.caH || [])[i] || 0;
                });
            }
            return {ventes: r, ca: ca, caTotal: Ext.Array.sum(ca), jours: sem.jours, debut: sem.debut, fin: sem.fin};
        };
        var p = regrouper(o.precedente), s = regrouper(o.semaine);
        var val = function (sem, i) {
            var v = sem.ventes[i] || 0;
            return moy ? (sem.jours ? v / sem.jours : 0) : v;
        };
        /* retours du 06/10 (4) : part de la tranche dans le chiffre d'affaires de la semaine */
        var partCa = function (sem, i) {
            return sem.caTotal > 0 ? ' — ' + (Math.round(sem.ca[i] * 1000 / sem.caTotal) / 10).toLocaleString('fr-FR') + ' % du CA de la semaine' : '';
        };
        var etiquette = function (i) {
            return (i * pas) + 'h-' + Math.min(24, i * pas + pas) + 'h';
        };
        /* Tranches affichees : celles qui ont eu au moins une vente sur l'une des deux semaines. */
        var tranches = [];
        for (var i = 0; i < p.ventes.length; i++) {
            if ((p.ventes[i] || 0) + (s.ventes[i] || 0) > 0) {
                tranches.push(i);
            }
        }
        if (!tranches.length) {
            c.innerHTML = '<div class="tb-attente">Aucune vente sur les deux semaines.</div>';
            return;
        }
        var max = 0;
        tranches.forEach(function (i) {
            max = Math.max(max, val(p, i), val(s, i));
        });
        max = max || 1;
        var w = Math.max(c.clientWidth - 8, 360), h = 250, pg = 46, pd = 10, ph = 24, pb = 34;
        var bande = (w - pg - pd) / tranches.length, lb = Math.min(28, bande * 0.32);
        var Y = function (v) {
            return ph + (h - ph - pb) * (1 - v / max);
        };
        var nb = function (v) {
            return moy ? (Math.round(v * 10) / 10).toLocaleString('fr-FR') : Math.round(v).toLocaleString('fr-FR');
        };
        var svg = '<svg width="' + w + '" height="' + h + '" style="display:block">';
        [0, 0.5, 1].forEach(function (f) {
            var y = Y(max * f);
            svg += '<line x1="' + pg + '" x2="' + (w - pd) + '" y1="' + y + '" y2="' + y + '" stroke="#e3e9f0"/><text x="' + (pg - 6) + '" y="' + (y + 4)
                    + '" font-size="11" font-weight="700" fill="#1e3a5f" text-anchor="end">' + nb(max * f) + '</text>';
        });
        svg += '<line x1="' + pg + '" x2="' + (w - pd) + '" y1="' + (h - pb) + '" y2="' + (h - pb) + '" stroke="#1e3a5f" stroke-width="2"/>';
        tranches.forEach(function (i, k) {
            var x0 = pg + k * bande + bande / 2, v0 = val(p, i), v1 = val(s, i);
            var ev = v0 > 0 ? Math.round((v1 / v0 - 1) * 100) : null;
            svg += '<rect x="' + (x0 - lb - 1) + '" y="' + Y(v0) + '" width="' + lb + '" height="' + (h - pb - Y(v0)) + '" rx="3" fill="#9fb3c8"><title>Semaine précédente, '
                    + etiquette(i) + ' : ' + nb(v0) + partCa(p, i) + '</title></rect>';
            svg += '<rect x="' + (x0 + 1) + '" y="' + Y(v1) + '" width="' + lb + '" height="' + (h - pb - Y(v1)) + '" rx="3" fill="#0891b2"><title>Semaine en cours, '
                    + etiquette(i) + ' : ' + nb(v1) + partCa(s, i) + '</title></rect>';
            svg += '<text x="' + (x0 - lb / 2 - 1) + '" y="' + (Y(v0) - 4) + '" font-size="10" fill="#5b6b7c" text-anchor="middle">' + nb(v0) + '</text>';
            svg += '<text x="' + (x0 + lb / 2 + 1) + '" y="' + (Y(v1) - 4) + '" font-size="10" font-weight="700" fill="#0e5f73" text-anchor="middle">' + nb(v1) + '</text>';
            svg += '<text x="' + x0 + '" y="' + (h - 18) + '" font-size="11" font-weight="700" fill="#1e3a5f" text-anchor="middle">' + etiquette(i) + '</text>';
            if (ev !== null && moy) {
                svg += '<text x="' + x0 + '" y="' + (h - 4) + '" font-size="10" font-weight="800" fill="' + (ev > 0 ? '#16a34a' : ev < 0 ? '#dc2626' : '#64748b')
                        + '" text-anchor="middle">' + (ev > 0 ? '+' : '') + ev + '%</text>';
            }
        });
        svg += '</svg>';
        var d = function (x) {
            return x.split('-').reverse().slice(0, 2).join('/');
        };
        var totP = Ext.Array.sum(p.ventes), totS = Ext.Array.sum(s.ventes);
        c.innerHTML = svg + '<div class="tb-legende"><span><i style="background:#9fb3c8"></i>Semaine précédente (' + d(p.debut) + ' → ' + d(p.fin) + ') : <b>'
                + me.fmt(totP) + '</b> ventes sur ' + p.jours + ' j</span><span><i style="background:#0891b2"></i>Semaine en cours (' + d(s.debut) + ' → ' + d(s.fin)
                + ') : <b>' + me.fmt(totS) + '</b> ventes sur ' + s.jours + ' j</span><span>' + (moy ? 'Moyenne par jour de vente ; % : évolution de la semaine en cours'
                : 'Total de chaque semaine (la semaine en cours n\'est pas terminée)') + '</span></div>';
    },

    /* --- top du mois (interrupteur CA / quantite, marge) */

    dessinerTopMois: function () {
        var me = this, o = me.donneesTopMois, c = me.corps('topmois');
        if (!c) {
            return;
        }
        if (!o || !o.success) {
            me.erreur('topmois');
            return;
        }
        var mode = me.prefs.top === 'qte' ? 'qte' : 'ca';
        var out = me.outils('topmois');
        if (out) {
            out.innerHTML = '<span class="tb-seg" data-seg="top"><button data-v="ca" class="' + (mode === 'ca' ? 'on' : '') + '">Chiffre d\'affaires</button>'
                    + '<button data-v="qte" class="' + (mode === 'qte' ? 'on' : '') + '">Quantité</button></span>';
        }
        var l = (o.data || []).slice().sort(function (x, y) {
            return mode === 'ca' ? y.ca - x.ca : y.quantite - x.quantite;
        }).slice(0, 5);
        if (!l.length) {
            c.innerHTML = '<div class="tb-attente">Aucune vente ce mois-ci.</div>';
            return;
        }
        var cle = mode === 'ca' ? 'ca' : 'quantite', autre = mode === 'ca' ? 'quantite' : 'ca', max = l[0][cle] || 1;
        c.innerHTML = '<table class="tb-fixe"><tr><th style="width:5%">#</th><th style="width:35%">Produit</th><th class="tb-n" style="width:13%">' + (mode === 'ca' ? 'CA' : 'Qté') + '</th>'
                + '<th style="width:14%"></th><th class="tb-n" style="width:11%">' + (mode === 'ca' ? 'Qté' : 'CA') + '</th><th class="tb-n" style="width:12%">Marge</th><th class="tb-n" style="width:10%">Taux</th></tr>'
                + l.map(function (p, i) {
                    return '<tr><td>' + (i + 1) + '</td><td class="tb-nom1" title="' + me.esc(p.libelle) + '">' + me.esc(p.libelle) + '</td><td class="tb-n"><b>' + me.fmt(p[cle]) + '</b></td>'
                            + '<td><div class="tb-barre"><i style="width:' + (p[cle] * 100 / max) + '%;background:#1d4ed8"></i></div></td><td class="tb-n">' + me.fmt(p[autre]) + '</td>'
                            + '<td class="tb-n">' + me.fmt(p.marge) + '</td><td class="tb-n">' + String(p.taux).replace('.', ',') + ' %</td></tr>';
                }).join('') + '</table><div class="tb-note" style="margin-top:6px">Marge = prix de vente HT − prix d\'achat × quantité, sur les ventes du mois.</div>';
    },

    /* --- TVA : la route de l'ecran « Statistique par TVA » (memes chiffres) */

    dessinerTva: function () {
        var me = this, j = Ext.Date.parse(me.jour(), 'Y-m-d');
        me.lire('../api/v3/tvas', {dtStart: Ext.Date.format(Ext.Date.getFirstDateOfMonth(j), 'Y-m-d'), dtEnd: me.jour(), typeVente: 'TOUT'}, function (o) {
            var c = me.corps('tva');
            if (!c) {
                return;
            }
            if (!o || !o.data) {
                me.erreur('tva');
                return;
            }
            var l = o.data || [], couleurs = ['#2E75B6', '#e08a1e', '#d0576b', '#17987e', '#7b68c8'];
            var lien = me.menu('statistiqueTVA');
            if (!l.length) {
                c.innerHTML = '<div class="tb-attente">Aucune vente ce mois-ci.</div>';
                return;
            }
            var ht = 0, tva = 0, ttc = 0;
            var lignes = l.map(function (x) {
                ht += Number(x['Total HT']) || 0;
                tva += Number(x['Total TVA']) || 0;
                ttc += Number(x['Total TTC']) || 0;
                return '<tr class="' + (lien ? 'tb-clic' : '') + '"' + (lien ? ' data-menu="statistiqueTVA"' : '') + '><td>' + me.esc(x.TAUX) + ' %</td><td class="tb-n">' + me.fmt(x['Total HT'])
                        + '</td><td class="tb-n">' + me.fmt(x['Total TVA']) + '</td><td class="tb-n">' + me.fmt(x['Total TTC']) + '</td></tr>';
            }).join('');
            var empile = l.map(function (x, i) {
                return '<i style="width:' + ((Number(x['Total TTC']) || 0) * 100 / (ttc || 1)) + '%;background:' + couleurs[i % couleurs.length] + '"></i>';
            }).join('');
            var legende = l.map(function (x, i) {
                return '<span><i style="background:' + couleurs[i % couleurs.length] + '"></i>' + me.esc(x.TAUX) + ' % : ' + Math.round((Number(x['Total TTC']) || 0) * 100 / (ttc || 1)) + ' %</span>';
            }).join('');
            c.innerHTML = '<table><tr><th>Taux</th><th class="tb-n">HT</th><th class="tb-n">TVA</th><th class="tb-n">TTC</th></tr>' + lignes
                    + '<tr><td><b>Total</b></td><td class="tb-n"><b>' + me.fmt(ht) + '</b></td><td class="tb-n"><b>' + me.fmt(tva) + '</b></td><td class="tb-n"><b>' + me.fmt(ttc) + '</b></td></tr></table>'
                    + '<div class="tb-empile" style="margin-top:10px">' + empile + '</div><div class="tb-legende">' + legende + '</div><div class="tb-note">Mêmes chiffres que le menu « Statistique par TVA ».</div>';
        });
    },

    /* ------------------------------------------------------------------ fenetres de consultation */

    fenetre: function (titre, html, menu) {
        var me = this;
        var pied = menu && me.menu(menu.xtype) ? [{text: menu.texte, cls: 'fen-btn-principal', handler: function (b) {
                    b.up('window').close();
                    me.ouvrirMenu(menu.xtype);
                }}] : [];
        pied.push({text: 'Fermer', cls: 'fen-btn', handler: function (b) {
                b.up('window').close();
            }});
        Ext.create('Ext.window.Window', {
            title: titre, modal: true, width: Math.min(760, Ext.getBody().getViewSize().width - 40), maxHeight: Ext.getBody().getViewSize().height - 80,
            autoScroll: true, bodyPadding: 12, cls: 'tb-fenetre fen-theme', html: '<div class="tb tb-dans-fenetre">' + html + '</div>', buttons: pied
        }).show();
    },

    voirPlus: function (cle) {
        var me = this, j = me.jour();
        var def = {
            grossistes: ['Achats par grossiste (mois)', '../api/v1/tableau-bord/grossistes'],
            emplacements: [me.prefs.empl === 'famille' ? 'CA par famille (mois)' : 'CA par emplacement (mois)', '../api/v1/tableau-bord/emplacements'],
            tiers: ['Encours tiers payants (mois)', '../api/v1/tableau-bord/tiers-payants'],
            topca: ['Meilleures ventes du jour : chiffre d\'affaires', '../api/v1/tableau-bord/top-jour'],
            topqte: ['Meilleures ventes du jour : quantités', '../api/v1/tableau-bord/top-jour']
        }[cle];
        if (!def) {
            return;
        }
        me.lire(def[1], {date: j, limite: 0, axe: me.prefs.empl === 'famille' ? 'famille' : 'emplacement'}, function (o) {
            var l = !o || !o.success ? [] : (cle === 'topca' ? o.ca : cle === 'topqte' ? o.quantites : o.data) || [];
            var tot = Ext.Array.sum(Ext.Array.map(l, function (x) {
                return Number(x.valeur) || 0;
            })) || 1;
            me.fenetre(def[0], l.length ? '<table class="tb-fixe"><tr><th style="width:7%">#</th><th style="width:60%">Libellé</th><th class="tb-n">Valeur</th><th class="tb-n">Part</th></tr>'
                    + l.map(function (x, i) {
                        var nb = x.nombre !== undefined ? ' (' + me.fmt(x.nombre) + ' client' + (x.nombre > 1 ? 's' : '') + ')' : '';
                        return '<tr><td>' + (i + 1) + '</td><td class="tb-nom1" title="' + me.esc(x.libelle) + nb + '">' + me.esc(x.libelle) + nb + '</td><td class="tb-n">' + me.fmt(x.valeur)
                                + '</td><td class="tb-n">' + (x.valeur * 100 / tot).toFixed(1).replace('.', ',') + ' %</td></tr>';
                    }).join('') + '</table>' : '<div class="tb-attente">Aucune donnée.</div>');
        });
    },

    listeAlerte: function (type) {
        var me = this, a = me.alertesPrefs();
        me.lire('../api/v1/tableau-bord/alertes/liste', {type: type, per: a.per, rup: a.rup, nv: a.nv, limite: 500}, function (o) {
            var l = o && o.success ? o.data : [], t;
            var date = function (d) {
                return d ? d.split('-').reverse().join('/') : '';
            };
            if (type === 'ruptures') {
                t = '<tr><th style="width:44%">Produit</th><th>CIP</th><th>Dernière vente</th><th class="tb-n">Vendu sous ' + a.rup + ' j</th><th>Grossiste</th></tr>'
                        + l.map(function (x) {
                            return '<tr><td class="tb-nom1" title="' + me.esc(x.libelle) + '">' + me.esc(x.libelle) + '</td><td>' + me.esc(x.cip) + '</td><td>' + date(x.derniereVente)
                                    + '</td><td class="tb-n">' + (x.recent ? '<span class="tb-pastille p-r">oui</span>' : '<span class="tb-note">non</span>') + '</td><td class="tb-nom1">'
                                    + me.esc(x.grossiste) + '</td></tr>';
                        }).join('');
                me.fenetre('Produits en rupture (' + l.length + ')', '<table class="tb-fixe">' + t + '</table><div class="tb-note" style="margin-top:8px">Stock à zéro, vendus sur les 90 derniers jours.</div>',
                        {xtype: 'i_sugg_manager', texte: 'Ouvrir les suggestions de commande'});
            } else if (type === 'nonvendus') {
                t = '<tr><th style="width:44%">Produit</th><th>CIP</th><th>Entré le</th><th class="tb-n">Qté entrée</th><th>Grossiste</th></tr>' + l.map(function (x) {
                    return '<tr><td class="tb-nom1" title="' + me.esc(x.libelle) + '">' + me.esc(x.libelle) + '</td><td>' + me.esc(x.cip) + '</td><td>' + date(x.entree)
                            + '</td><td class="tb-n">' + me.fmt(x.quantite) + '</td><td class="tb-nom1">' + me.esc(x.grossiste) + '</td></tr>';
                }).join('');
                me.fenetre('Articles entrés depuis ' + a.nv + ' j et non vendus (' + l.length + ')', '<table class="tb-fixe">' + t + '</table>'
                        + '<div class="tb-note" style="margin-top:8px">Entrés en stock (bons de livraison clôturés) sur la période, sans aucune vente depuis leur entrée.</div>',
                        {xtype: 'i_order_manager', texte: 'Ouvrir les commandes'});
            } else if (type === 'negatifs') {
                t = '<tr><th style="width:52%">Produit</th><th>CIP</th><th class="tb-n">Stock</th><th>Emplacement</th></tr>' + l.map(function (x) {
                    return '<tr><td class="tb-nom1" title="' + me.esc(x.libelle) + '">' + me.esc(x.libelle) + '</td><td>' + me.esc(x.cip) + '</td><td class="tb-n tb-baisse">'
                            + me.fmt(x.quantite) + '</td><td class="tb-nom1">' + me.esc(x.emplacement) + '</td></tr>';
                }).join('');
                me.fenetre('Articles en stock négatif (' + l.length + ')', '<table class="tb-fixe">' + t + '</table>', {xtype: 'etatstock', texte: 'Ouvrir l\'état du stock'});
            } else if (type === 'peremptions') {
                t = '<tr><th style="width:46%">Produit</th><th>CIP</th><th>Lot</th><th>Péremption</th><th class="tb-n">Qté</th></tr>' + l.map(function (x) {
                    return '<tr><td class="tb-nom1" title="' + me.esc(x.libelle) + '">' + me.esc(x.libelle) + '</td><td>' + me.esc(x.cip) + '</td><td>' + me.esc(x.lot) + '</td><td>'
                            + date(x.peremption) + '</td><td class="tb-n">' + me.fmt(x.quantite) + '</td></tr>';
                }).join('');
                me.fenetre('Lots qui périment sous ' + a.per + ' mois (' + l.length + ')', '<table class="tb-fixe">' + t + '</table>', {xtype: 'peremptionquery', texte: 'Ouvrir les péremptions'});
            } else {
                t = '<tr><th style="width:52%">Produit</th><th>CIP</th><th class="tb-n">Qté</th><th>Suggestion</th></tr>' + l.map(function (x) {
                    return '<tr><td class="tb-nom1" title="' + me.esc(x.libelle) + '">' + me.esc(x.libelle) + '</td><td>' + me.esc(x.cip) + '</td><td class="tb-n">' + me.fmt(x.quantite)
                            + '</td><td>' + me.esc(x.reference) + '</td></tr>';
                }).join('');
                me.fenetre('Produits à réapprovisionner en rayon (' + l.length + ')', '<table class="tb-fixe">' + t + '</table>', {xtype: 'reservemanager', texte: 'Ouvrir la réserve'});
            }
            if (!l.length) {
                var w = Ext.WindowManager.getActive();
                if (w && w.body) {
                    w.body.dom.querySelector('table').insertAdjacentHTML('afterend', '<div class="tb-attente">Aucun produit.</div>');
                }
            }
        });
    },

    /* ------------------------------------------------------------------ personnalisation */

    majRetires: function () {
        var me = this, z = me.q('[data-tb="retires"]'), S = testextjs.view.tableaubord.TableauBord;
        var noms = {};
        Ext.each(S.TUILES, function (x) {
            noms['tuile-' + x.id] = 'Tuile : ' + x.titre;
        });
        Ext.each(S.CARTES, function (x) {
            noms[x.id] = x.titre;
        });
        var r = me.prefs.retires || [];
        /* retours du 06/10 (4) : hors personnalisation, un rappel montre qu'il y a des elements retires */
        var rappel = me.q('[data-tb="perso-rappel"]');
        if (rappel) {
            rappel.style.display = r.length && !me.edition ? '' : 'none';
            rappel.innerHTML = '<i class="fa-solid fa-eye-slash"></i> ' + r.length + ' élément' + (r.length > 1 ? 's' : '') + ' retiré' + (r.length > 1 ? 's' : '') + ' — remettre';
            rappel.title = 'Ouvre la personnalisation : chaque élément retiré a son bouton « + » pour le remettre';
        }
        z.innerHTML = r.length ? r.map(function (id) {
            return '<button class="tb-btn tb-mini" data-remettre="' + id + '">+ ' + me.esc(noms[id] || id) + '</button>';
        }).join('') : '<span class="tb-note">Aucun élément retiré.</span>';
    },

    memoriserOrdre: function () {
        var me = this;
        me.prefs.ordreTuiles = Ext.Array.map(Ext.Array.slice(me.q('[data-tb="tuiles"]').children), function (e) {
            return e.getAttribute('data-id').replace('tuile-', '');
        });
        me.prefs.ordreCartes = Ext.Array.map(Ext.Array.slice(me.q('[data-tb="cartes"]').children), function (e) {
            return e.getAttribute('data-id');
        });
        me.enregistrerPreferences();
    },

    brancherGlisser: function () {
        var me = this;
        Ext.each(Ext.Array.slice(me.body.dom.querySelectorAll('[data-dd]')), function (zone) {
            var src = null;
            Ext.each(Ext.Array.slice(zone.children), function (el) {
                el.addEventListener('dragstart', function (e) {
                    if (!me.edition) {
                        e.preventDefault();
                        return;
                    }
                    src = el;
                    el.classList.add('tb-glisse');
                });
                el.addEventListener('dragend', function () {
                    el.classList.remove('tb-glisse');
                    Ext.each(Ext.Array.slice(zone.querySelectorAll('.tb-cible')), function (x) {
                        x.classList.remove('tb-cible');
                    });
                    if (src) {
                        src = null;
                        me.memoriserOrdre();
                        me.tracerCourbe();
                    }
                });
                el.addEventListener('dragover', function (e) {
                    if (src && src !== el) {
                        e.preventDefault();
                        el.classList.add('tb-cible');
                    }
                });
                el.addEventListener('dragleave', function () {
                    el.classList.remove('tb-cible');
                });
                el.addEventListener('drop', function (e) {
                    e.preventDefault();
                    el.classList.remove('tb-cible');
                    if (!src || src === el) {
                        return;
                    }
                    var r = Ext.Array.slice(zone.children);
                    if (r.indexOf(src) < r.indexOf(el)) {
                        el.parentNode.insertBefore(src, el.nextSibling);
                    } else {
                        el.parentNode.insertBefore(src, el);
                    }
                });
            });
        });
    },

    /* ------------------------------------------------------------------ clics */

    brancherClics: function () {
        var me = this, racine = me.body.dom;
        racine.addEventListener('change', function (e) {
            var t = e.target;
            if (t.hasAttribute('data-tranche')) {
                /* Retours du 06/10 (2) : tranche de 1 a 6 h, la vue est regroupee sans relire la base */
                me.prefs.tranche = parseInt(t.value, 10) || 2;
                me.enregistrerPreferences();
                me.dessinerFrequentation();
            } else if (t.hasAttribute('data-cmp')) {
                me.prefs.cmp = t.checked;
                me.enregistrerPreferences();
                me.tracerCourbe();
            } else if (t.hasAttribute('data-p')) {
                var a = me.alertesPrefs(), v = parseInt(t.value, 10);
                if (isNaN(v) || v < 0) {
                    return;
                }
                a[t.getAttribute('data-p')] = v;
                me.prefs.alertes = a;
                me.enregistrerPreferences();
                me.reglageOuvert = true;
                me.chargerCarte('alertes');
                if (t.getAttribute('data-p') === 'rup') {
                    me.chargerTuiles();
                }
            }
        });
        racine.addEventListener('click', function (e) {
            var cible = function (sel) {
                return e.target.closest ? e.target.closest(sel) : null;
            };
            var x;
            if (cible('[data-tb="perso-rappel"]') && !me.edition) {
                x = me.q('[data-tb="perso"]');
                me.edition = true;
                racine.querySelector('.tb').classList.add('tb-edition');
                x.textContent = 'Terminer';
                me.majRetires();
                return;
            }
            if ((x = cible('[data-tb="perso"]'))) {
                me.edition = !me.edition;
                racine.querySelector('.tb').classList.toggle('tb-edition', me.edition);
                x.textContent = me.edition ? 'Terminer' : 'Personnaliser';
                me.majRetires();
                return;
            }
            if (cible('[data-tb="actualiser"]')) {
                me.chargerTuiles(true);
                Ext.each(Ext.Array.slice(racine.querySelectorAll('[data-carte]')), function (el) {
                    me.chargerCarte(el.getAttribute('data-carte'), true);
                });
                return;
            }
            if (cible('[data-tb="defaut"]')) {
                me.prefs = {alertes: me.prefs.alertes};
                me.enregistrerPreferences();
                me.construire();
                return;
            }
            if ((x = cible('.tb-masquer'))) {
                e.stopPropagation();
                var el = x.closest('[data-id]'), id = el.getAttribute('data-id');
                me.prefs.retires = Ext.Array.unique((me.prefs.retires || []).concat([id]));
                el.parentNode.removeChild(el);
                me.majRetires();
                me.enregistrerPreferences();
                return;
            }
            if ((x = cible('[data-remettre]'))) {
                var rid = x.getAttribute('data-remettre');
                me.prefs.retires = Ext.Array.remove((me.prefs.retires || []).slice(), rid);
                me.enregistrerPreferences();
                me.construire();
                return;
            }
            if (me.edition) {
                return;
            }
            if ((x = cible('[data-seg] button'))) {
                var seg = x.parentNode.getAttribute('data-seg'), v = x.getAttribute('data-v');
                if (seg === 'achats') {
                    me.prefs.achats = v;
                    me.chargerTuiles();
                } else if (seg === 'annee') {
                    me.prefs.annee = Number(v);
                    me.chargerCarte('evolution');
                } else if (seg === 'top') {
                    me.prefs.top = v;
                    me.dessinerTopMois();
                } else if (seg === 'freq') {
                    me.prefs.freq = v;
                    me.dessinerFrequentation();
                } else if (seg === 'empl') {
                    me.prefs.empl = v;
                    me.chargerCarte('emplacements');
                }
                me.enregistrerPreferences();
                return;
            }
            if (cible('[data-periodes]')) {
                me.reglageOuvert = !me.reglageOuvert;
                var r = racine.querySelector('.tb-reglage');
                if (r) {
                    r.classList.toggle('ouvert', me.reglageOuvert);
                }
                return;
            }
            if (cible('[data-mm]')) {
                me.mmOuvert = !me.mmOuvert;
                me.dessinerEncaissements(me.donneesEnc);
                return;
            }
            if ((x = cible('[data-plus]'))) {
                me.voirPlus(x.getAttribute('data-plus'));
                return;
            }
            if ((x = cible('[data-recharger]'))) {
                me.chargerCarte(x.getAttribute('data-recharger'), true);
                return;
            }
            if ((x = cible('[data-liste]'))) {
                me.listeAlerte(x.getAttribute('data-liste'));
                return;
            }
            if ((x = cible('[data-menu]'))) {
                me.ouvrirMenu(x.getAttribute('data-menu'));
            }
        });
        me.on('destroy', function () {
            clearTimeout(me.minuteurCourbe);
        });
        me.on('resize', function () {
            clearTimeout(me.minuteurCourbe);
            me.minuteurCourbe = setTimeout(function () {
                if (me.isDestroyed) {
                    return;
                }
                me.tracerCourbe();
                me.dessinerFrequentation();
            }, 200);
        });
    }
});
