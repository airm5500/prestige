/* global Ext, testextjs */
/*
 * PRESENTATIONS A L'ESSAI DES SAISIES (proposition du 04/11, docs/notices/PROPOSITION_SAISIES_2026-11-04.html).
 *
 * Trois ecrans, trois presentations chacun (A, B, C), a essayer en vrai avant de choisir :
 *   - suggestion ouverte (suggerercdemanager) ;
 *   - saisie de commande / BL, commande ouverte (ordermanagerlist) ;
 *   - gestion des entrees, bon ouvert (bonlivraisondetail).
 * La liste est declaree dans correctifs-affichage.js (PrestigeAffichage.PRESENTATIONS_SAISIES).
 *
 * Regles :
 *   - l'ecran actuel reste le defaut et ne change pas : sans choix sur le poste, seul le petit selecteur
 *     « Présentation » est ajoute (en haut a droite, pose sur l'ecran sans toucher a sa mise en page) ;
 *   - le choix est memorise par poste (cookie : il survit a la deconnexion, qui vide le localStorage) ;
 *   - une variante ne change que la presentation : la grille d'origine et ses boutons restent dans l'ecran (masques),
 *     et chaque bouton de la variante declenche le bouton ou la methode d'origine. Les quantites passent par les
 *     memes API REST que la grille d'origine ;
 *   - aucune fenetre surgissante ajoutee pour une modification : la confirmation, quand il en faut une, se fait dans
 *     le bouton lui-meme (premier clic : « Confirmer … ? », second clic : l'action).
 */
window.PrestigePresentations = (function () {
    'use strict';

    var COOKIE = 'prestige_presentations';
    var VARIANTES = ['actuel', 'A', 'B', 'C'];
    var courant = null;

    /* ------------------------------------------------------------------ outils */

    function enc(s) {
        return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
            return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c];
        });
    }
    function num(v) {
        var n = Number(v);
        return isFinite(n) ? n : 0;
    }
    function nf(v) {
        return Ext.util.Format.number(Math.round(num(v)), '0,000.');
    }
    function liste() {
        return (window.PrestigeAffichage && window.PrestigeAffichage.PRESENTATIONS_SAISIES) || {};
    }

    /* ------------------------------------------------------------------ choix memorise par poste */

    function lireChoix() {
        var o = {}, m = document.cookie.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]*)'));
        if (m) {
            decodeURIComponent(m[1]).split('.').forEach(function (p) {
                var kv = p.split(':');
                if (kv.length === 2 && VARIANTES.indexOf(kv[1]) >= 0) {
                    o[kv[0]] = kv[1];
                }
            });
        }
        return o;
    }
    function choix(cle) {
        return lireChoix()[cle] || 'actuel';
    }
    function ecrireChoix(cle, v) {
        var o = lireChoix(), parts = [];
        o[cle] = v;
        Object.keys(o).forEach(function (k) {
            if (o[k] !== 'actuel') {
                parts.push(k + ':' + o[k]);
            }
        });
        document.cookie = COOKIE + '=' + encodeURIComponent(parts.join('.')) + ';path=/;max-age=' + (5 * 365 * 24 * 3600)
                + ';SameSite=Lax';
    }

    /* ------------------------------------------------------------------ ecrans concernes */

    var ECRANS = {
        suggestion: {
            grille: 'gridpanelSuggestionID', barreDe: 'btn_cancel',
            disponible: function (e) {
                return !!e.getNameintern() && e.getNameintern() !== '0' && e.getTitre() === 'Suggestion de commande';
            },
            boutons: ['btn_cancel', 'btn_print', 'btn_export_csv', 'btn_dispo_verifier', 'btn_dispo_reverifier',
                'btn_dispo_imprimer', 'btn_equivalents_dci', 'btn_produits_retires', 'btn_clean_sugg', 'btn_sugg_commander_pml']
        },
        commande: {
            grille: 'gridpanelID', barreDe: 'btn_creerbl',
            disponible: function (e) {
                return typeof e.estModification === 'function' && e.estModification();
            },
            boutons: ['btn_export_cmd_csv', 'btn_import_reponse', 'btn_cmd_dispo_verifier', 'btn_cmd_dispo_reverifier',
                'btn_cmd_dispo_imprimer', 'btn_cmd_envoyer_pml', 'btn_creerbl', 'btn_cancel']
        },
        entree: {
            grille: 'gridpanelID', barreDe: 'btn_enterstock',
            disponible: function (e) {
                return !!e.getNameintern();
            },
            boutons: ['btn_cancel', 'btn_enterstock']
        }
    };

    function cleDe(ecran) {
        var l = liste(), trouve = null;
        Object.keys(l).forEach(function (k) {
            if (!trouve && ECRANS[k] && ecran.isXType && ecran.isXType(l[k].xtype)) {
                trouve = k;
            }
        });
        return trouve;
    }

    /** Point d'accroche (App.onLoadNewComponent*, via PrestigeAffichage.appliquerSiConcerne), avant le rendu. */
    function appliquerSiConcerne(ecran) {
        var cle = cleDe(ecran);
        if (!cle || ecran.ppCle) {
            return;
        }
        var def = liste()[cle], v = choix(cle), ok = false;
        try {
            ok = ECRANS[cle].disponible(ecran);
        } catch (e) {
            ok = false;
        }
        ecran.ppCle = cle;
        ecran.ppArgs = {
            xtype: def.xtype,
            titre: ecran.getTitre ? ecran.getTitre() : '',
            nameintern: ecran.getNameintern ? ecran.getNameintern() : '',
            odatasource: ecran.getOdatasource ? ecran.getOdatasource() : ''
        };
        ecran.on('afterrender', function () {
            poserSelecteur(ecran, cle, ok ? v : 'actuel', ok);
        }, null, {single: true});
        if (v === 'actuel' || !ok) {
            return;
        }
        ecran.ppVariante = v;
        if (cle === 'suggestion') {
            /* la grille d'origine, masquee, ne doit pas prendre le curseur a chaque chargement */
            ecran.focusCell = Ext.emptyFn;
            ecran.restoreLastFocus = Ext.emptyFn;
        }
        ecran.on('afterlayout', function () {
            try {
                monter(ecran, cle, v);
            } catch (e) {
                /* une variante qui ne se monte pas rend l'ecran actuel, intact */
                if (window.console) {
                    console.error('Présentation ' + v + ' : ', e);
                }
                demonter(ecran);
            }
        }, null, {single: true, delay: 60});
    }

    /* ------------------------------------------------------------------ selecteur */

    function poserSelecteur(ecran, cle, v, ok) {
        var def = liste()[cle], el = ecran.getEl();
        if (!el || el.down('.pp-selecteur')) {
            return;
        }
        if (el.getStyle('position') === 'static') {
            el.setStyle('position', 'relative');
        }
        var h = '<span class="pp-sel-titre">Présentation</span>'
                + '<button type="button" data-pp-v="actuel" class="' + (v === 'actuel' ? 'on' : '') + '" title="Écran actuel">Actuelle</button>';
        ['A', 'B', 'C'].forEach(function (l) {
            h += '<button type="button" data-pp-v="' + l + '" class="' + (v === l ? 'on' : '') + '"'
                    + (ok ? '' : ' disabled') + ' title="' + enc(l + ' : ' + def.variantes[l]
                            + (ok ? '' : ' (disponible à l\'ouverture d\'un document existant)')) + '">' + l + '</button>';
        });
        var d = document.createElement('div');
        d.className = 'pp-selecteur';
        d.setAttribute('role', 'group');
        d.setAttribute('aria-label', 'Présentation de l\'écran ' + def.libelle);
        d.innerHTML = h;
        el.dom.appendChild(d);
        d.addEventListener('click', function (ev) {
            var b = ev.target.closest ? ev.target.closest('button[data-pp-v]') : null;
            if (!b || b.disabled) {
                return;
            }
            var nv = b.getAttribute('data-pp-v');
            if (nv === v) {
                return;
            }
            ecrireChoix(cle, nv);
            b.textContent = nv === 'actuel' ? 'Actuelle…' : nv + '…';
            reouvrir(ecran);
        });
    }

    function reouvrir(ecran) {
        var a = ecran.ppArgs;
        Ext.defer(function () {
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(a.xtype, a.titre, a.nameintern, a.odatasource);
        }, 10);
    }

    /* ------------------------------------------------------------------ cadres du haut (habillage seul) */

    /* Les cadres du haut (repartiteur, montants, ajout de produit, etiquettes) restent les composants d'origine, avec
       leurs actions : la variante ne change que leur titre et leur habillage (classe CSS), puis les rend a la sortie. */
    var TITRES_TETE = {
        suggestion: {
            A: ['1 · Répartiteur et montants', '2 · Ajouter un produit à la suggestion'],
            B: ['Répartiteur', 'Ajouter un produit'],
            C: ['Suggestion', 'Ajouter une ligne (nom ou CIP)']
        },
        commande: {
            A: ['1 · Choisir le répartiteur', '2 · Ajouter des produits'],
            B: ['Répartiteur', 'Ajouter un produit'],
            C: ['Fournisseur', 'Ajouter une ligne au bon (nom ou CIP)']
        },
        entree: {
            A: ['Bon de livraison et étiquettes'],
            B: ['Bon de livraison'],
            C: ['Réception et étiquettes']
        }
    };

    function habillerTete(ctx) {
        var titres = (TITRES_TETE[ctx.cle] || {})[ctx.v] || [];
        ctx.tete = ctx.ecran.query('> fieldset').filter(function (f) {
            return f !== ctx.cadre;
        });
        ctx.tete.forEach(function (f, i) {
            f.ppTitre = f.title;
            f.addCls(['pp-tete', 'pp-tete-' + ctx.v]);
            if (titres[i]) {
                f.setTitle(titres[i]);
            }
        });
        ctx.ecran.addCls('pp-avec-tete');
    }
    function rendreTete(ctx) {
        (ctx.tete || []).forEach(function (f) {
            if (!f.isDestroyed) {
                f.removeCls(['pp-tete', 'pp-tete-' + ctx.v]);
                f.setTitle(f.ppTitre);
            }
        });
        ctx.ecran.removeCls('pp-avec-tete');
        ctx.tete = null;
    }

    /* ------------------------------------------------------------------ montage d'une variante */

    function monter(ecran, cle, v) {
        var cfg = ECRANS[cle], grille = Ext.getCmp(cfg.grille);
        if (!grille || ecran.ppCtx) {
            return;
        }
        var cadre = grille.up('fieldset'), bout = Ext.getCmp(cfg.barreDe), barre = bout ? bout.up('toolbar') : null;
        var idx = ecran.items.indexOf(cadre);
        var ctx = {
            ecran: ecran, cle: cle, v: v, cfg: cfg, grille: grille, cadre: cadre, barre: barre, lignes: [], charge: false,
            sel: null, filtre: '', ouverts: {}, onglet: null, filtrePrix: false, lectures: {}, derniere: null, ordre: [],
            armes: {}
        };
        ecran.ppCtx = ctx;
        courant = ctx;
        ctx.vue = ecran.insert(idx < 0 ? ecran.items.getCount() : idx, {
            xtype: 'component', flex: 1, minHeight: 420, itemId: 'ppVue',
            cls: 'pp-vue pp-' + cle + ' pp-v' + v,
            html: '<div class="pp-cadre"><div class="pp-attente">Chargement de la présentation ' + v + '…</div></div>'
        });
        cadre.hide();
        if (barre) {
            barre.hide();
        }
        habillerTete(ctx);
        var dom = ctx.vue.getEl().dom;
        dom.addEventListener('click', function (ev) {
            surClic(ctx, ev);
        });
        dom.addEventListener('keydown', function (ev) {
            surTouche(ctx, ev);
        });
        dom.addEventListener('change', function (ev) {
            surChangement(ctx, ev);
        });
        dom.addEventListener('input', function (ev) {
            if (ev.target && ev.target.getAttribute('data-pp-filtre') !== null) {
                ctx.filtre = ev.target.value;
                if (ctx.cle === 'suggestion') {
                    rechercherSuggestion(ctx);
                } else {
                    rendre(ctx);
                }
            }
        });
        /* toute modification faite par une action d'origine (ajout de produit, fenetre de lot...) recharge la grille
           d'origine : la variante relit alors ses lignes */
        grille.getStore().on('load', function () {
            planifierChargement(ctx);
        });
        /* l'etat de disponibilite PharmaML est pose sur l'ecran puis la grille d'origine est rafraichie */
        grille.getView().on('refresh', function () {
            planifierRendu(ctx);
        });
        cfg.boutons.forEach(function (id) {
            var b = Ext.getCmp(id);
            if (b) {
                b.on({show: planifierRenduF(ctx), hide: planifierRenduF(ctx), enable: planifierRenduF(ctx), disable: planifierRenduF(ctx)});
            }
        });
        ecran.on('destroy', function () {
            ctx.detruit = true;
        });
        charger(ctx);
    }

    function demonter(ecran) {
        var ctx = ecran.ppCtx;
        if (!ctx) {
            return;
        }
        if (ctx.vue) {
            ctx.vue.destroy();
        }
        rendreTete(ctx);
        ctx.cadre.show();
        if (ctx.barre) {
            ctx.barre.show();
        }
        ecran.ppCtx = null;
    }

    /** Recherche d'origine de la suggestion (champ « rechercherDetail », action de recherche) apres la frappe. */
    function rechercherSuggestion(ctx) {
        clearTimeout(ctx.minRecherche);
        ctx.minRecherche = setTimeout(function () {
            var champ = Ext.getCmp('rechercherDetail');
            if (ctx.detruit || !champ || !ctx.ecran.onRechClick) {
                return;
            }
            champ.setValue(ctx.filtre);
            ctx.ecran.onRechClick();
        }, 350);
    }

    function planifierChargement(ctx) {
        clearTimeout(ctx.minChargement);
        ctx.minChargement = setTimeout(function () {
            charger(ctx);
        }, 120);
    }
    function planifierRendu(ctx) {
        clearTimeout(ctx.minRendu);
        ctx.minRendu = setTimeout(function () {
            rendre(ctx);
        }, 60);
    }
    function planifierRenduF(ctx) {
        return function () {
            planifierRendu(ctx);
        };
    }

    /* ------------------------------------------------------------------ lecture des lignes (API existantes) */

    /* Suggestion : le calcul de chaque ligne est couteux (ventes des derniers mois, stock, prix...). La variante montre
       donc les lignes de la page de la grille d'origine (meme pagination, meme recherche, aucune requete de plus) et
       lit les totaux de toute la suggestion par une requete d'agregat. */
    function chargerPageSuggestion(ctx) {
        var st = ctx.grille.getStore();
        if (st.isLoading() || !st.lastOptions) {
            /* la grille d'origine n'a pas encore lu sa page : son evenement « load » relancera la lecture */
            return;
        }
        ctx.lignes = st.getRange().map(function (r) {
            return r.data;
        });
        ctx.page = {debut: st.getCount() ? (st.currentPage - 1) * st.pageSize + 1 : 0, fin: (st.currentPage - 1) * st.pageSize + st.getCount(),
            total: st.getTotalCount(), avant: st.currentPage > 1, apres: st.currentPage * st.pageSize < st.getTotalCount()};
        ctx.charge = true;
        ctx.erreur = null;
        rendre(ctx);
        var jeton = (ctx.jeton || 0) + 1;
        ctx.jeton = jeton;
        ctx.totauxEnCours = true;
        Ext.Ajax.request({
            method: 'GET', url: '../api/v1/presentations-saisies/suggestion/' + encodeURIComponent(ctx.ecran.getNameintern()) + '/totaux',
            success: function (r) {
                var o = Ext.JSON.decode(r.responseText, true) || {};
                if (!ctx.detruit && jeton === ctx.jeton && o.success) {
                    ctx.srv = {lignes: num(o.lignes), boites: num(o.boites), montant: num(o.montant)};
                }
            },
            callback: function () {
                if (!ctx.detruit && jeton === ctx.jeton) {
                    ctx.totauxEnCours = false;
                    rendre(ctx);
                }
            }
        });
    }

    function charger(ctx) {
        if (ctx.detruit) {
            return;
        }
        if (ctx.cle === 'suggestion') {
            chargerPageSuggestion(ctx);
            return;
        }
        /* une seule lecture a la fois : une demande arrivee pendant la lecture est rejouee une fois a la fin */
        if (ctx.lecture) {
            ctx.relire = true;
            return;
        }
        ctx.lecture = true;
        var e = ctx.ecran, id = e.getNameintern(), url, params;
        if (ctx.cle === 'commande') {
            url = '../api/v1/commande/commande-en-cours-items';
            params = {orderId: id, query: '', filtre: 'ALL', start: 0, limit: 5000, page: 1};
        } else {
            url = '../api/v1/commande/bon/items/' + encodeURIComponent(id);
            params = {query: '', filtre: 'ALL', start: 0, limit: 5000, page: 1, sort: 'lg_FAMILLE_NAME', dir: 'ASC'};
        }
        var jeton = (ctx.jeton || 0) + 1;
        ctx.jeton = jeton;
        Ext.Ajax.request({
            method: 'GET', url: url, params: params, timeout: 240000,
            callback: function () {
                ctx.lecture = false;
                if (ctx.relire && !ctx.detruit) {
                    ctx.relire = false;
                    charger(ctx);
                }
            },
            success: function (r) {
                if (ctx.detruit || jeton !== ctx.jeton) {
                    return;
                }
                var o = Ext.JSON.decode(r.responseText, true) || {};
                ctx.lignes = o.data || [];
                ctx.charge = true;
                ctx.erreur = null;
                rendre(ctx);
            },
            failure: function () {
                if (!ctx.detruit) {
                    ctx.erreur = 'Lignes indisponibles : le serveur ne répond pas.';
                    rendre(ctx);
                }
            }
        });
    }

    /* ------------------------------------------------------------------ actions d'origine */

    /** Bouton d'origine present et non masque (son conteneur l'est, lui ne l'est pas). */
    function bouton(id) {
        var b = Ext.getCmp(id);
        return b && !b.isHidden() && !b.isDestroyed ? b : null;
    }
    /** Declenche le bouton d'origine : meme gestionnaire, meme portee. */
    function declencher(id) {
        var b = bouton(id);
        if (!b || b.isDisabled()) {
            return false;
        }
        if (typeof b.fireHandler === 'function') {
            b.fireHandler(Ext.EventObject);
        } else if (b.handler) {
            b.handler.call(b.scope || b, b, Ext.EventObject);
        }
        return true;
    }
    function texteBouton(id, defaut) {
        var b = Ext.getCmp(id);
        var t = b && b.getText ? b.getText() : '';
        t = String(t || defaut || '').replace(/<[^>]*>/g, '').replace(/&eacute;/g, 'é');
        return t;
    }
    /** HTML d'un bouton de la variante relie au bouton d'origine (absent si l'origine est masquee). */
    function btn(id, opts) {
        opts = opts || {};
        var b = bouton(id);
        if (!b) {
            return '';
        }
        var t = opts.texte || texteBouton(id);
        return '<button type="button" class="pp-btn ' + (opts.cls || '') + '" data-pp-action="' + id + '"'
                + (b.isDisabled() ? ' disabled' : '') + ' title="' + enc(b.tooltip ? String(b.tooltip) : t) + '">'
                + enc(t) + '</button>';
    }
    /** Methode de l'ecran exposee comme bouton (actions d'origine sans bouton visible dans la barre du bas). */
    function btnMethode(cle, texte, cls, titre) {
        return '<button type="button" class="pp-btn ' + (cls || '') + '" data-pp-methode="' + cle + '" title="'
                + enc(titre || texte) + '">' + enc(texte) + '</button>';
    }
    function menuPlus(ids) {
        var visibles = ids.filter(function (id) {
            return !!bouton(id);
        });
        if (!visibles.length) {
            return '';
        }
        return '<button type="button" class="pp-btn" data-pp-plus="' + visibles.join(',') + '" aria-haspopup="true">Plus ▾</button>';
    }
    function ouvrirPlus(el, ids) {
        var m = Ext.create('Ext.menu.Menu', {
            plain: true, cls: 'pp-menu',
            items: ids.map(function (id) {
                var b = Ext.getCmp(id);
                return {text: enc(texteBouton(id)), disabled: !b || b.isDisabled(), handler: function () {
                        declencher(id);
                    }};
            }),
            listeners: {hide: function (mm) {
                    Ext.defer(function () {
                        mm.destroy();
                    }, 50);
                }}
        });
        m.showBy(Ext.get(el), 'tl-bl?');
    }

    /** Enregistrement « Confirmer ? » dans le bouton : premier clic arme (5 s), second clic execute. */
    function armer(ctx, el, cle, texteConfirmation, action) {
        if (ctx.armes[cle] && Date.now() - ctx.armes[cle].quand > 400) {
            delete ctx.armes[cle];
            action();
            return;
        }
        if (ctx.armes[cle]) {
            return;
        }
        ctx.armes[cle] = {quand: Date.now()};
        el.textContent = texteConfirmation;
        el.classList.add('pp-arme');
        setTimeout(function () {
            if (ctx.armes[cle]) {
                delete ctx.armes[cle];
                rendre(ctx);
            }
        }, 5000);
    }

    /* ------------------------------------------------------------------ evenements */

    function ligneParId(ctx, id) {
        var cleId = ctx.cle === 'suggestion' ? 'lg_SUGGESTION_ORDER_DETAILS_ID' : (ctx.cle === 'commande' ? 'lg_ORDERDETAIL_ID' : 'lg_BON_LIVRAISON_DETAIL');
        for (var i = 0; i < ctx.lignes.length; i++) {
            if (ctx.lignes[i][cleId] === id) {
                return ctx.lignes[i];
            }
        }
        return null;
    }
    function idLigne(ctx, l) {
        return ctx.cle === 'suggestion' ? l.lg_SUGGESTION_ORDER_DETAILS_ID : (ctx.cle === 'commande' ? l.lg_ORDERDETAIL_ID : l.lg_BON_LIVRAISON_DETAIL);
    }

    function surClic(ctx, ev) {
        var t = ev.target, el;
        if (!t || !t.closest) {
            return;
        }
        if ((el = t.closest('[data-pp-action]'))) {
            if (!el.disabled) {
                declencher(el.getAttribute('data-pp-action'));
            }
            return;
        }
        if ((el = t.closest('[data-pp-page]'))) {
            var pager = ctx.grille.down('pagingtoolbar');
            if (pager && !el.disabled) {
                if (el.getAttribute('data-pp-page') === '1') {
                    pager.moveNext();
                } else {
                    pager.movePrevious();
                }
            }
            return;
        }
        if ((el = t.closest('[data-pp-plus]'))) {
            ouvrirPlus(el, el.getAttribute('data-pp-plus').split(','));
            return;
        }
        if ((el = t.closest('[data-pp-methode]'))) {
            methode(ctx, el.getAttribute('data-pp-methode'), el);
            return;
        }
        if ((el = t.closest('[data-pp-pas]'))) {
            var l = ligneParId(ctx, el.getAttribute('data-pp-ligne'));
            if (l) {
                var q = Math.max(1, quantite(ctx, l) + num(el.getAttribute('data-pp-pas')));
                enregistrerQuantite(ctx, l, q);
            }
            return;
        }
        if ((el = t.closest('[data-pp-ligne-action]'))) {
            actionLigne(ctx, el.getAttribute('data-pp-ligne-action'), ligneParId(ctx, el.getAttribute('data-pp-ligne')), el);
            return;
        }
        if ((el = t.closest('[data-pp-groupe]'))) {
            var g = el.getAttribute('data-pp-groupe');
            ctx.ouverts[g] = !ctx.ouverts[g];
            rendre(ctx);
            return;
        }
        if ((el = t.closest('[data-pp-onglet]'))) {
            ctx.onglet = el.getAttribute('data-pp-onglet');
            rendre(ctx);
            return;
        }
        if ((el = t.closest('tr[data-pp-sel]'))) {
            if (t.closest('input,button,a')) {
                return;
            }
            choisirLigne(ctx, el.getAttribute('data-pp-sel'));
        }
    }

    function choisirLigne(ctx, id) {
        if (ctx.sel === id) {
            return;
        }
        ctx.sel = id;
        rendre(ctx);
        if (ctx.cle === 'suggestion' && ctx.v === 'A') {
            chargerInfosProduit(ctx, ligneParId(ctx, id));
        }
    }

    function surChangement(ctx, ev) {
        var t = ev.target;
        if (t && t.getAttribute && t.getAttribute('data-pp-qte') !== null) {
            var l = ligneParId(ctx, t.getAttribute('data-pp-qte'));
            var q = Math.round(num(t.value));
            if (!l) {
                return;
            }
            if (q < 1) {
                t.value = quantite(ctx, l);
                return;
            }
            if (q !== quantite(ctx, l)) {
                enregistrerQuantite(ctx, l, q);
            }
        }
        if (t && t.getAttribute && t.getAttribute('data-pp-lu') !== null) {
            var lu = ctx.lectures[t.getAttribute('data-pp-lu')];
            var n = Math.max(0, Math.round(num(t.value)));
            if (lu) {
                corrigerLecture(ctx, t.getAttribute('data-pp-lu'), n);
            }
        }
    }

    function surTouche(ctx, ev) {
        var t = ev.target;
        if (t && t.getAttribute && t.getAttribute('data-pp-qte') !== null && ev.key === 'Enter') {
            ev.preventDefault();
            surChangement(ctx, {target: t});
            if (ctx.v === 'C') {
                var s = ctx.vue.getEl().dom.querySelector('[data-pp-filtre]');
                if (s) {
                    s.focus();
                    s.select();
                }
            }
            return;
        }
        if (t && t.getAttribute && t.getAttribute('data-pp-scan') !== null && ev.key === 'Enter') {
            ev.preventDefault();
            var code = t.value.trim();
            t.value = '';
            if (code) {
                lireCode(ctx, code);
            }
            return;
        }
        /* variante C de la suggestion : saisie au clavier */
        if (ctx.cle === 'suggestion' && ctx.v === 'C') {
            toucheClavierSuggestion(ctx, ev);
        }
    }

    /* ------------------------------------------------------------------ quantites */

    function quantite(ctx, l) {
        return num(l.int_NUMBER);
    }
    function prixAchat(ctx, l) {
        return ctx.cle === 'suggestion' ? num(l.int_PAF_SUGG) : num(l.int_PAF);
    }
    function montantLigne(ctx, l) {
        return ctx.cle === 'commande' ? num(l.int_PRICE) : quantite(ctx, l) * prixAchat(ctx, l);
    }

    /** Meme API que la grille d'origine (update-qte-cmde, updateorderitem), puis rechargement de l'ecran. */
    function enregistrerQuantite(ctx, l, q) {
        var e = ctx.ecran, id = idLigne(ctx, l), ancienne = quantite(ctx, l);
        /* valeurs d'avant, remises telles quelles si le serveur refuse (quantite et montant de la ligne) ; les totaux
           ne sont corriges en retour que s'ils n'ont pas ete relus entre-temps (une relecture dit deja la base) */
        var avant = {n: l.int_NUMBER, prix: l.int_PRICE}, srv = ctx.srv, ecart = q - ancienne, pa = prixAchat(ctx, l);
        l.int_NUMBER = q;
        if (srv) {
            srv.boites += ecart;
            srv.montant += ecart * pa;
        }
        if (ctx.cle === 'commande') {
            l.int_PRICE = q * num(l.int_PAF);
        }
        ctx.enCours = (ctx.enCours || 0) + 1;
        rendre(ctx);
        var fin = function (ok, msg) {
            ctx.enCours--;
            if (!ok) {
                l.int_NUMBER = avant.n;
                if (ctx.cle === 'commande') {
                    l.int_PRICE = avant.prix;
                }
                if (srv && ctx.srv === srv) {
                    srv.boites -= ecart;
                    srv.montant -= ecart * pa;
                }
                ctx.message = {niveau: 'ko', texte: msg || 'La quantité n\'a pas été enregistrée.'};
            } else {
                ctx.message = null;
            }
            rendre(ctx);
            /* la grille d'origine et les montants de l'entete restent a jour */
            ctx.grille.getStore().reload();
            if (ctx.cle === 'suggestion' && e.getSuggestionAmount) {
                e.getSuggestionAmount(e.getNameintern());
            } else if (ctx.cle === 'commande' && e.getCommandeAmount) {
                e.getCommandeAmount(e.getNameintern());
            }
        };
        if (ctx.cle === 'suggestion') {
            Ext.Ajax.request({
                method: 'POST', url: '../api/v1/suggestion/item/update-qte-cmde',
                headers: {'Content-Type': 'application/json'},
                params: Ext.JSON.encode({itemId: id, qte: q}),
                success: function () {
                    fin(true);
                },
                failure: function () {
                    fin(false);
                }
            });
        } else {
            var g = Ext.getCmp('lgGROSSISTEID');
            Ext.Ajax.request({
                method: 'POST', url: '../api/v1/commande/updateorderitem',
                headers: {'Content-Type': 'application/json'},
                params: Ext.JSON.encode({
                    id: id, grossisteId: g ? g.getValue() : null,
                    prixAchat: l.int_PAF, prixVente: l.lg_FAMILLE_PRIX_VENTE, stock: q
                }),
                success: function (r) {
                    var o = Ext.JSON.decode(r.responseText, true) || {};
                    fin(o.success === true, 'L\'opération a échoué.');
                },
                failure: function () {
                    fin(false);
                }
            });
        }
    }

    function champQte(ctx, l, avecPas) {
        var id = idLigne(ctx, l), q = quantite(ctx, l);
        var champ = '<input class="pp-qte-champ" type="number" min="1" step="1" value="' + q + '" data-pp-qte="' + enc(id)
                + '" data-pp-focus="q-' + enc(id) + '" aria-label="Quantité">';
        if (!avecPas) {
            return champ;
        }
        return '<span class="pp-qte"><button type="button" data-pp-pas="-1" data-pp-ligne="' + enc(id) + '" aria-label="Diminuer"'
                + (q <= 1 ? ' disabled' : '') + '>−</button>' + champ
                + '<button type="button" data-pp-pas="1" data-pp-ligne="' + enc(id) + '" aria-label="Augmenter">+</button></span>';
    }

    /* ------------------------------------------------------------------ disponibilite PharmaML (etat d'origine) */

    var DISPO = {OUI: ['ok', 'Dispo'], NON: ['ko', 'Indispo'], AUTRE: ['att', 'Autre'], INCONNU: ['info', 'Sans réponse']};
    function etatDispo(ctx, l) {
        return (ctx.ecran.etatDispo || {})[l.lg_FAMILLE_ID] || null;
    }
    function pastilleDispo(ctx, l) {
        var e = etatDispo(ctx, l);
        if (!e) {
            return '<span class="pp-gris">—</span>';
        }
        var d = DISPO[e.statut] || DISPO.INCONNU;
        var titre = (e.libelle || '') + (e.dateDispo ? ' · mise à disposition ' + e.dateDispo : '') + (e.grossiste ? ' · ' + e.grossiste : '');
        return '<span class="pp-pas ' + d[0] + '" title="' + enc(titre) + '">' + d[1] + '</span>';
    }
    function comptesDispo(ctx) {
        var c = {OUI: 0, NON: 0, AUTRE: 0, connus: 0, montantDispo: 0};
        ctx.lignes.forEach(function (l) {
            var e = etatDispo(ctx, l);
            if (e && c[e.statut] !== undefined) {
                c[e.statut]++;
                c.connus++;
                if (e.statut === 'OUI') {
                    c.montantDispo += montantLigne(ctx, l);
                }
            }
        });
        return c;
    }

    /* ------------------------------------------------------------------ rendu commun */

    function chiffre(libelle, valeur, cls, attr) {
        return '<div class="pp-chiffre"><small>' + enc(libelle) + '</small><b class="' + (cls || '') + '"' + (attr || '') + '>'
                + valeur + '</b></div>';
    }
    function totaux(ctx) {
        if (ctx.cle === 'suggestion') {
            return ctx.srv ? {lignes: ctx.srv.lignes, boites: ctx.srv.boites, montant: ctx.srv.montant}
            : {lignes: ctx.page ? ctx.page.total : ctx.lignes.length, boites: 0, montant: 0};
        }
        var t = {lignes: ctx.lignes.length, boites: 0, montant: 0};
        ctx.lignes.forEach(function (l) {
            t.boites += quantite(ctx, l);
            t.montant += montantLigne(ctx, l);
        });
        return t;
    }
    function filtrer(ctx, lignes) {
        var f = (ctx.filtre || '').trim().toLowerCase();
        if (!f || ctx.cle === 'suggestion') {
            return lignes;
        }
        return lignes.filter(function (l) {
            var cip = String(l.str_FAMILLE_CIP || l.lg_FAMILLE_CIP || '').toLowerCase();
            var nom = String(l.str_FAMILLE_NAME || l.lg_FAMILLE_NAME || '').toLowerCase();
            return cip.indexOf(f) >= 0 || nom.indexOf(f) >= 0;
        });
    }
    function message(ctx) {
        return ctx.message ? '<div class="pp-message ' + ctx.message.niveau + '" role="status">' + enc(ctx.message.texte) + '</div>' : '';
    }

    function rendre(ctx) {
        if (ctx.detruit || !ctx.vue || !ctx.vue.getEl()) {
            return;
        }
        var dom = ctx.vue.getEl().dom, act = document.activeElement, focus = null, debut = null, fin = null, defil = null;
        if (act && dom.contains(act)) {
            focus = act.getAttribute('data-pp-focus');
            try {
                debut = act.selectionStart;
                fin = act.selectionEnd;
            } catch (e) {
                debut = null;
            }
        }
        var corps = dom.querySelector('.pp-corps');
        if (corps) {
            defil = corps.scrollTop;
        }
        var h;
        if (ctx.erreur) {
            h = '<div class="pp-attente ko">' + enc(ctx.erreur) + '</div>';
        } else if (!ctx.charge) {
            h = '<div class="pp-attente">Chargement…</div>';
        } else {
            h = RENDUS[ctx.cle][ctx.v](ctx);
        }
        dom.innerHTML = '<div class="pp-cadre">' + h + '</div>';
        corps = dom.querySelector('.pp-corps');
        if (corps && defil !== null) {
            corps.scrollTop = defil;
        }
        Object.keys(ctx.armes).forEach(function (k) {
            var b = dom.querySelector('[data-pp-arme="' + k + '"]');
            if (b) {
                b.setAttribute('data-pp-texte', b.textContent);
                b.textContent = b.getAttribute('data-pp-confirmer') || 'Confirmer ?';
                b.classList.add('pp-arme');
            }
        });
        /* un deplacement demande (Entree vers la quantite, fleches) passe avant le champ qui avait le curseur */
        var cible = ctx.focusVoulu ? dom.querySelector('[data-pp-focus="' + ctx.focusVoulu + '"]') : null;
        if (cible) {
            debut = null;
        } else if (focus) {
            cible = dom.querySelector('[data-pp-focus="' + focus + '"]');
        }
        ctx.focusVoulu = null;
        if (cible) {
            cible.focus();
            if (debut !== null && cible.setSelectionRange && cible.type !== 'number') {
                try {
                    cible.setSelectionRange(debut, fin);
                } catch (e) {
                    /* champ sans selection */
                }
            }
        }
    }

    /* ================================================================== 1. SUGGESTION */

    function moyenne(l) {
        return Math.round((num(l.int_VALUE1) + num(l.int_VALUE2) + num(l.int_VALUE3)) / 3);
    }
    function urgence(l) {
        var s = num(l.int_STOCK), seuil = num(l.int_SEUIL);
        return s <= 0 ? 'rupture' : (s < seuil ? 'seuil' : 'confort');
    }
    function titreSuggestion(ctx) {
        var d = ctx.ecran.getOdatasource() || {}, g = Ext.getCmp('lg_GROSSISTE_ID');
        return '<div class="pp-titre">Suggestion ' + enc(d.str_REF || '') + ' <small>· ' + enc(g ? g.getRawValue() : (d.str_GROSSISTE_LIBELLE || ''))
                + ' · ' + nf(totaux(ctx).lignes) + ' lignes</small></div>';
    }
    /** Pagination d'origine : lignes affichees et pages precedente / suivante. */
    function pagesSuggestion(ctx) {
        var pg = ctx.page;
        if (!pg) {
            return '';
        }
        return '<span class="pp-pages"><span class="pp-gris" data-pp-pages>' + (pg.total ? 'Lignes ' + nf(pg.debut) + '–' + nf(pg.fin) + ' sur ' + nf(pg.total)
                : 'Aucune ligne') + '</span><button type="button" class="pp-btn" data-pp-page="-1"' + (pg.avant ? '' : ' disabled')
                + ' aria-label="Page précédente" title="Page précédente">‹</button><button type="button" class="pp-btn" data-pp-page="1"'
                + (pg.apres ? '' : ' disabled') + ' aria-label="Page suivante" title="Page suivante">›</button></span>';
    }
    var PLUS_SUGG = ['btn_dispo_reverifier', 'btn_dispo_imprimer', 'btn_produits_retires', 'btn_clean_sugg', 'btn_print'];

    function piedSuggestion(ctx, boutons) {
        var t = totaux(ctx), c = comptesDispo(ctx);
        return '<div class="pp-pied">' + chiffre('Lignes', nf(t.lignes), '', ' data-pp-total="lignes"')
                + chiffre('Boîtes', nf(t.boites), '', ' data-pp-total="boites"')
                + chiffre('Montant achat', nf(t.montant) + ' F', '', ' data-pp-total="montant"')
                + (c.connus ? chiffre('Indisponibles', nf(c.NON), c.NON ? 'pp-rouge' : '') : '')
                + pagesSuggestion(ctx) + '<span class="pp-espace"></span>' + boutons + '</div>';
    }

    function tableSuggestionA(ctx) {
        var lignes = filtrer(ctx, ctx.lignes);
        var h = '<table class="pp-g"><thead><tr><th colspan="2"></th><th class="grp" colspan="2">Stock</th><th class="grp">Ventes</th>'
                + '<th class="grp" colspan="2">Commande</th><th class="grp" colspan="3">Prix</th></tr>'
                + '<tr><th>CIP</th><th>Libellé</th><th class="n bl">Stock</th><th class="n">Seuil</th><th class="n bl">Moy./mois</th>'
                + '<th class="n bl">Qté</th><th>Dispo</th><th class="n bl">PA tarif</th><th class="n">PA fact.</th><th class="n">Montant</th></tr></thead><tbody>';
        lignes.forEach(function (l) {
            var id = l.lg_SUGGESTION_ORDER_DETAILS_ID;
            h += '<tr data-pp-sel="' + enc(id) + '" class="' + (ctx.sel === id ? 'sel' : '') + '">'
                    + '<td>' + enc(l.str_FAMILLE_CIP) + '</td><td class="des">' + enc(l.str_FAMILLE_NAME) + '</td>'
                    + '<td class="n bl ' + (num(l.int_STOCK) <= 0 ? 'pp-rouge' : '') + '">' + nf(l.int_STOCK) + '</td><td class="n">' + nf(l.int_SEUIL) + '</td>'
                    + '<td class="n bl">' + nf(moyenne(l)) + '</td>'
                    + '<td class="n bl">' + champQte(ctx, l, false) + '</td><td>' + pastilleDispo(ctx, l) + '</td>'
                    + '<td class="n bl">' + nf(l.lg_FAMILLE_PRIX_ACHAT) + '</td><td class="n">' + nf(l.int_PAF_SUGG) + '</td>'
                    + '<td class="n"><b>' + nf(montantLigne(ctx, l)) + '</b></td></tr>';
        });
        if (!lignes.length) {
            h += '<tr><td colspan="10" class="pp-vide">Aucune ligne' + (ctx.filtre ? ' pour « ' + enc(ctx.filtre) + ' »' : '') + '.</td></tr>';
        }
        return h + '</tbody></table>';
    }

    function coteSuggestion(ctx) {
        var l = ctx.sel ? ligneParId(ctx, ctx.sel) : null;
        if (!l) {
            return '<div class="pp-cote"><h4>Produit</h4><p class="pp-gris">Cliquez une ligne : ses informations s\'affichent ici, sans fenêtre.</p></div>';
        }
        var moy = moyenne(l), jour = moy / 30, q = quantite(ctx, l), stock = num(l.int_STOCK);
        var couverture = jour > 0 ? Math.round((stock + q) / jour) + ' jours' : '—';
        var mois = [num(l.int_VALUE3), num(l.int_VALUE2), num(l.int_VALUE1), num(l.int_VALUE0)];
        var max = Math.max.apply(null, mois.concat([1]));
        var barres = mois.map(function (v, i) {
            return '<i class="' + (i === 3 ? 'c' : '') + '" style="height:' + Math.max(4, Math.round(v * 100 / max)) + '%" title="' + nf(v) + '"></i>';
        }).join('');
        var inf = ctx.infos && ctx.infos.id === l.lg_FAMILLE_ID ? ctx.infos.d : null;
        var ligne = function (a, b) {
            return '<div class="pp-ligne-cote"><span>' + a + '</span><b>' + b + '</b></div>';
        };
        return '<div class="pp-cote" aria-live="polite"><h4>' + enc(l.str_FAMILLE_NAME) + '</h4>'
                + ligne('CIP', enc(l.str_FAMILLE_CIP))
                + ligne('Stock rayon / réserve', nf(stock) + ' / ' + (inf ? nf(inf.stockReserve) : '…'))
                + ligne('Seuil', nf(l.int_SEUIL))
                + ligne('Couverture après commande', couverture)
                + '<small class="pp-gris">Ventes des 4 derniers mois (le dernier : mois en cours)</small><div class="pp-mini">' + barres + '</div>'
                + ligne('Moyenne mensuelle (3 mois)', nf(moy))
                + ligne('Dernière entrée', inf ? enc(inf.derniereEntreeDate || '—') + ' (qté ' + nf(inf.derniereEntreeQte) + ')' : '…')
                + ligne('Moyenne d\'achat 3 mois', inf ? nf(inf.moyenneAchat3Mois) : '…')
                + ligne('PA facturé / PV', nf(l.int_PAF_SUGG) + ' / ' + nf(l.lg_FAMILLE_PRIX_VENTE))
                + ligne('Disponibilité', pastilleDispo(ctx, l))
                + '</div>';
    }
    function chargerInfosProduit(ctx, l) {
        if (!l) {
            return;
        }
        Ext.Ajax.request({
            method: 'GET', url: '../api/v1/commande/produit/reappro-infos/' + encodeURIComponent(l.lg_FAMILLE_ID),
            success: function (r) {
                ctx.infos = {id: l.lg_FAMILLE_ID, d: Ext.JSON.decode(r.responseText, true) || {}};
                rendre(ctx);
            }
        });
    }

    function suggestionA(ctx) {
        if (!ctx.sel && ctx.lignes.length) {
            ctx.sel = ctx.lignes[0].lg_SUGGESTION_ORDER_DETAILS_ID;
            chargerInfosProduit(ctx, ctx.lignes[0]);
        }
        return titreSuggestion(ctx)
                + '<div class="pp-barre"><input class="pp-recherche" type="search" data-pp-filtre data-pp-focus="filtre" value="' + enc(ctx.filtre)
                + '" placeholder="Filtrer les lignes : nom ou CIP… (ajout d\'un produit : cadre « Ajout Produit » ci-dessus)" aria-label="Filtrer les lignes">'
                + btn('btn_dispo_verifier') + btn('btn_equivalents_dci') + menuPlus(PLUS_SUGG)
                + btn('btn_sugg_commander_pml', {cls: 'prim'}) + '</div>' + message(ctx)
                + '<div class="pp-cols"><div class="pp-corps">' + tableSuggestionA(ctx) + '</div>' + coteSuggestion(ctx) + '</div>'
                + piedSuggestion(ctx, btn('btn_export_csv') + btn('btn_cancel', {texte: 'Fermer'}));
    }

    function suggestionB(ctx) {
        var groupes = {rupture: [], seuil: [], confort: []};
        filtrer(ctx, ctx.lignes).forEach(function (l) {
            groupes[urgence(l)].push(l);
        });
        if (ctx.ouverts.confort === undefined) {
            ctx.ouverts = {rupture: true, seuil: true, confort: false};
        }
        var t = totaux(ctx);
        var noms = {rupture: ['r', 'En rupture'], seuil: ['s', 'Sous le seuil'], confort: ['c', 'Confort']};
        var corps = '';
        ['rupture', 'seuil', 'confort'].forEach(function (g) {
            var ouvert = ctx.ouverts[g];
            corps += '<button type="button" class="pp-groupe ' + noms[g][0] + '" data-pp-groupe="' + g + '" aria-expanded="' + ouvert + '">'
                    + (ouvert ? '▾ ' : '▸ ') + noms[g][1] + ' · ' + groupes[g].length + ' produit' + (groupes[g].length > 1 ? 's' : '')
                    + (ouvert ? '' : ' (replié)') + '</button>';
            if (ouvert && groupes[g].length) {
                corps += '<table class="pp-g"><tbody>' + groupes[g].map(function (l) {
                    return '<tr><td class="cip">' + enc(l.str_FAMILLE_CIP) + '</td><td class="des">' + enc(l.str_FAMILLE_NAME) + '</td>'
                            + '<td class="n">stock <b class="' + (num(l.int_STOCK) <= 0 ? 'pp-rouge' : '') + '">' + nf(l.int_STOCK) + '</b> / seuil ' + nf(l.int_SEUIL) + '</td>'
                            + '<td class="n">moy. ' + nf(moyenne(l)) + '</td><td class="n">' + champQte(ctx, l, true) + '</td>'
                            + '<td>' + pastilleDispo(ctx, l) + '</td><td class="n"><b>' + nf(montantLigne(ctx, l)) + ' F</b></td></tr>';
                }).join('') + '</tbody></table>';
            }
        });
        return titreSuggestion(ctx)
                + '<div class="pp-barre"><input class="pp-recherche" type="search" data-pp-filtre data-pp-focus="filtre" value="' + enc(ctx.filtre)
                + '" placeholder="Filtrer les lignes…" aria-label="Filtrer les lignes">'
                + '<span class="pp-pas ko">Rupture ' + groupes.rupture.length + '</span><span class="pp-pas att">Sous le seuil ' + groupes.seuil.length
                + '</span><span class="pp-pas info">Confort ' + groupes.confort.length + '</span>'
                + btn('btn_dispo_verifier') + menuPlus(['btn_equivalents_dci'].concat(PLUS_SUGG))
                + btn('btn_sugg_commander_pml', {cls: 'prim', texte: 'Commander (' + nf(t.montant) + ' F)'}) + '</div>' + message(ctx)
                + '<div class="pp-corps">' + corps + '</div>'
                + piedSuggestion(ctx, btn('btn_export_csv') + btn('btn_cancel', {texte: 'Fermer'}));
    }

    function suggestionC(ctx) {
        var lignes = filtrer(ctx, ctx.lignes);
        if (lignes.length && !lignes.some(function (l) {
            return l.lg_SUGGESTION_ORDER_DETAILS_ID === ctx.sel;
        })) {
            ctx.sel = lignes[0].lg_SUGGESTION_ORDER_DETAILS_ID;
        }
        var h = '<table class="pp-g dense"><thead><tr><th>CIP</th><th>Libellé</th><th class="n">Stock</th><th class="n">Seuil</th><th class="n">Moy.</th>'
                + '<th class="n">Qté</th><th>Dispo</th><th class="n">PA</th><th class="n">Montant</th></tr></thead><tbody>';
        lignes.forEach(function (l) {
            var id = l.lg_SUGGESTION_ORDER_DETAILS_ID;
            h += '<tr data-pp-sel="' + enc(id) + '" class="' + (ctx.sel === id ? 'sel' : '') + '"><td>' + enc(l.str_FAMILLE_CIP) + '</td>'
                    + '<td class="des">' + enc(l.str_FAMILLE_NAME) + '</td><td class="n">' + nf(l.int_STOCK) + '</td><td class="n">' + nf(l.int_SEUIL) + '</td>'
                    + '<td class="n">' + nf(moyenne(l)) + '</td><td class="n">' + champQte(ctx, l, false) + '</td><td>' + pastilleDispo(ctx, l) + '</td>'
                    + '<td class="n">' + nf(l.int_PAF_SUGG) + '</td><td class="n">' + nf(montantLigne(ctx, l)) + '</td></tr>';
        });
        if (!lignes.length) {
            h += '<tr><td colspan="9" class="pp-vide">Aucune ligne' + (ctx.filtre ? ' pour « ' + enc(ctx.filtre) + ' »' : '') + '.</td></tr>';
        }
        h += '</tbody></table>';
        var t = totaux(ctx);
        return titreSuggestion(ctx)
                + '<div class="pp-barre"><input class="pp-recherche grande" type="search" data-pp-filtre data-pp-focus="filtre" value="' + enc(ctx.filtre)
                + '" placeholder="⌕ Tapez un nom ou un CIP de la suggestion… puis Entrée pour la quantité" aria-label="Rechercher une ligne"></div>'
                + '<div class="pp-barre pp-raccourcis"><span class="pp-kbd">↑</span><span class="pp-kbd">↓</span> ligne · <span class="pp-kbd">Entrée</span> quantité · '
                + '<span class="pp-kbd">+</span><span class="pp-kbd">−</span> quantité · <span class="pp-kbd">Échap</span> retour à la recherche · '
                + '<span class="pp-kbd">F4</span> équivalents DCI · <span class="pp-kbd">F8</span> vérifier la disponibilité</div>' + message(ctx)
                + '<div class="pp-corps">' + h + '</div>'
                + '<div class="pp-pied"><b><span data-pp-total="lignes">' + nf(t.lignes) + '</span> lignes · <span data-pp-total="boites">' + nf(t.boites)
                + '</span> boîtes · <span data-pp-total="montant">' + nf(t.montant) + '</span> F</b>' + pagesSuggestion(ctx)
                + '<span class="pp-espace"></span>' + btn('btn_export_csv') + menuPlus(['btn_dispo_verifier', 'btn_equivalents_dci'].concat(PLUS_SUGG))
                + btn('btn_cancel', {texte: 'Fermer'}) + btn('btn_sugg_commander_pml', {cls: 'prim', texte: 'Commander'}) + '</div>';
    }

    function toucheClavierSuggestion(ctx, ev) {
        var lignes = filtrer(ctx, ctx.lignes), i = -1, k = ev.key, t = ev.target, dansQte = t && t.getAttribute('data-pp-qte') !== null;
        lignes.forEach(function (l, j) {
            if (l.lg_SUGGESTION_ORDER_DETAILS_ID === ctx.sel) {
                i = j;
            }
        });
        if (k === 'F8') {
            ev.preventDefault();
            declencher('btn_dispo_verifier');
            return;
        }
        if (k === 'F4') {
            ev.preventDefault();
            declencher('btn_equivalents_dci');
            return;
        }
        if (k === 'Escape') {
            var s = ctx.vue.getEl().dom.querySelector('[data-pp-filtre]');
            if (s) {
                ev.preventDefault();
                s.focus();
                s.select();
            }
            return;
        }
        if ((k === 'ArrowDown' || k === 'ArrowUp') && lignes.length) {
            ev.preventDefault();
            i = Math.max(0, Math.min(lignes.length - 1, i + (k === 'ArrowDown' ? 1 : -1)));
            ctx.sel = lignes[i].lg_SUGGESTION_ORDER_DETAILS_ID;
            if (dansQte) {
                ctx.focusVoulu = 'q-' + ctx.sel;
            }
            rendre(ctx);
            var tr = ctx.vue.getEl().dom.querySelector('tr.sel');
            if (tr && tr.scrollIntoView) {
                tr.scrollIntoView({block: 'nearest'});
            }
            return;
        }
        if (k === 'Enter' && !dansQte && i >= 0) {
            ev.preventDefault();
            ctx.focusVoulu = 'q-' + ctx.sel;
            rendre(ctx);
            return;
        }
        if ((k === '+' || k === '-') && i >= 0 && !(t && t.getAttribute('data-pp-filtre') !== null)) {
            ev.preventDefault();
            var l = lignes[i];
            enregistrerQuantite(ctx, l, Math.max(1, quantite(ctx, l) + (k === '+' ? 1 : -1)));
        }
    }

    /* ================================================================== 2. COMMANDE */

    var PLUS_CMD = ['btn_cmd_dispo_reverifier', 'btn_cmd_dispo_imprimer', 'btn_import_reponse', 'btn_export_cmd_csv'];

    function infosCommande(ctx) {
        var d = ctx.ecran.getOdatasource() || {}, g = Ext.getCmp('lgGROSSISTEID');
        return {
            ref: d.str_REF_ORDER || ctx.ecran.orderRef || '', grossiste: g ? g.getRawValue() : (d.str_GROSSISTE_LIBELLE || ''),
            envoi: d.str_ENVOI_PHARMAML || '', dateEnvoi: d.dt_ENVOI_PHARMAML || '', date: d.dt_CREATED || d.dt_UPDATED || ''
        };
    }
    function etapes(ctx) {
        var i = infosCommande(ctx), c = comptesDispo(ctx), pml = !!bouton('btn_cmd_envoyer_pml');
        var envoye = i.envoi === 'EN_ATTENTE' || i.envoi === 'REPONDUE';
        var reponse = i.envoi === 'REPONDUE' || c.connus > 0;
        var e = [
            {nom: 'Préparer', fait: ctx.lignes.length > 0},
            {nom: pml ? 'Envoyer (PharmaML)' : 'Envoyer (hors PharmaML)', fait: envoye || !pml},
            {nom: 'Réponse du grossiste', fait: reponse},
            {nom: 'Bon de livraison', fait: false}
        ];
        var cours = 0;
        while (cours < e.length - 1 && e[cours].fait) {
            cours++;
        }
        return {liste: e, cours: cours, pml: pml, envoye: envoye};
    }
    function prixGrossiste(l) {
        var m = num(l.lg_FAMILLE_PRIX_ACHAT), g = num(l.int_PAF);
        if (!m || m === g) {
            return nf(g);
        }
        return '<b class="pp-orange" title="PA machine ' + nf(m) + '">' + nf(g) + (g > m ? ' ▲' : ' ▼') + '</b>';
    }

    function commandeA(ctx) {
        var et = etapes(ctx), c = comptesDispo(ctx), t = totaux(ctx), i = infosCommande(ctx);
        var h = '<div class="pp-titre">Commande ' + enc(i.ref) + ' <small>· ' + enc(i.grossiste) + (i.date ? ' · ' + enc(i.date) : '') + '</small></div>'
                + '<ol class="pp-etapes">' + et.liste.map(function (e, n) {
                    var cls = n < et.cours || (e.fait && n !== et.cours) ? 'fait' : (n === et.cours ? 'cours' : '');
                    return '<li class="pp-etape ' + cls + '"' + (n === et.cours ? ' aria-current="step"' : '') + '><span class="rond">'
                            + (cls === 'fait' ? '✓' : (n + 1)) + '</span>' + enc(e.nom) + '</li>';
                }).join('') + '</ol>';
        /* seul le bouton de l'etape suivante est mis en avant */
        var principal = !et.envoye && et.pml ? btn('btn_cmd_envoyer_pml', {cls: 'prim'}) + btn('btn_creerbl', {texte: 'Créer le bon de livraison'})
                : btn('btn_cmd_envoyer_pml') + btn('btn_creerbl', {cls: 'prim', texte: 'Créer le bon de livraison →'});
        h += '<div class="pp-barre">' + (c.connus ? '<span class="pp-pas ok">' + c.OUI + ' disponibles</span><span class="pp-pas att">' + c.AUTRE
                + ' autres</span><span class="pp-pas ko">' + c.NON + ' indisponibles</span>' : '<span class="pp-gris">Disponibilité non vérifiée</span>')
                + '<span class="pp-espace"></span>' + btn('btn_cmd_dispo_verifier') + btn('btn_cmd_dispo_reverifier') + principal + '</div>' + message(ctx);
        h += '<div class="pp-corps"><table class="pp-g"><thead><tr><th>CIP</th><th>Désignation</th><th class="n">Qté cdée</th><th class="n">Qté dispo</th>'
                + '<th>Réponse</th><th class="n">PA machine</th><th class="n">PA grossiste</th><th class="n">Montant</th></tr></thead><tbody>'
                + ctx.lignes.map(function (l) {
                    var e = etatDispo(ctx, l), ecart = num(l.lg_FAMILLE_PRIX_ACHAT) && num(l.lg_FAMILLE_PRIX_ACHAT) !== num(l.int_PAF);
                    return '<tr class="' + (ecart ? 'ecart' : '') + '"><td>' + enc(l.lg_FAMILLE_CIP) + '</td><td class="des">' + enc(l.lg_FAMILLE_NAME) + '</td>'
                            + '<td class="n">' + champQte(ctx, l, false) + '</td>'
                            + '<td class="n">' + (e && e.quantiteDispo !== null && e.quantiteDispo !== undefined ? nf(e.quantiteDispo) : '<span class="pp-gris">—</span>') + '</td>'
                            + '<td>' + pastilleDispo(ctx, l) + '</td><td class="n">' + nf(l.lg_FAMILLE_PRIX_ACHAT) + '</td>'
                            + '<td class="n">' + prixGrossiste(l) + '</td><td class="n"><b>' + nf(l.int_PRICE) + '</b></td></tr>';
                }).join('') + '</tbody></table></div>';
        h += '<div class="pp-pied">' + chiffre('Lignes', nf(t.lignes), '', ' data-pp-total="lignes"') + chiffre('Boîtes', nf(t.boites), '', ' data-pp-total="boites"')
                + chiffre('Montant commandé', nf(t.montant) + ' F', '', ' data-pp-total="montant"')
                + (c.connus ? chiffre('Montant disponible', nf(c.montantDispo) + ' F') : '')
                + '<span class="pp-espace"></span>' + btn('btn_cmd_dispo_imprimer') + btn('btn_import_reponse') + btn('btn_export_cmd_csv')
                + btn('btn_cancel', {texte: 'Fermer'}) + '</div>';
        return h;
    }

    function commandeB(ctx) {
        var c = comptesDispo(ctx), t = totaux(ctx), i = infosCommande(ctx);
        var prixChanges = ctx.lignes.filter(function (l) {
            return l.prixDiff === true || (num(l.lg_FAMILLE_PRIX_ACHAT) && num(l.lg_FAMILLE_PRIX_ACHAT) !== num(l.int_PAF));
        });
        var lignes = ctx.filtrePrix ? prixChanges : ctx.lignes;
        var taux = c.connus ? Math.round(c.OUI * 100 / Math.max(1, c.connus)) : null;
        var gauche = '<div class="pp-corps"><table class="pp-g"><thead><tr><th>CIP</th><th>Désignation</th><th class="n">Qté</th><th class="n">PA</th>'
                + '<th class="n">PV</th><th class="n">Montant</th></tr></thead><tbody>'
                + lignes.map(function (l) {
                    return '<tr data-pp-sel="' + enc(l.lg_ORDERDETAIL_ID) + '" class="' + (ctx.sel === l.lg_ORDERDETAIL_ID ? 'sel' : '')
                            + (prixChanges.indexOf(l) >= 0 ? ' ecart' : '') + '"><td>' + enc(l.lg_FAMILLE_CIP) + '</td><td class="des">' + enc(l.lg_FAMILLE_NAME) + '</td>'
                            + '<td class="n">' + champQte(ctx, l, true) + '</td><td class="n">' + prixGrossiste(l) + '</td>'
                            + '<td class="n">' + nf(l.lg_FAMILLE_PRIX_VENTE) + '</td><td class="n"><b>' + nf(l.int_PRICE) + '</b></td></tr>';
                }).join('') + '</tbody></table></div>';
        var droite = '<div class="pp-cote">'
                + '<div class="pp-carte"><small>Montant de la commande</small><b data-pp-total="montant">' + nf(t.montant) + ' F</b>'
                + '<small><span data-pp-total="lignes">' + nf(t.lignes) + '</span> lignes · <span data-pp-total="boites">' + nf(t.boites) + '</span> boîtes</small></div>'
                + '<div class="pp-carte"><small>Disponibilité grossiste</small><b>' + (taux === null ? '—' : taux + ' %') + '</b>'
                + (taux === null ? '<small>Non vérifiée</small>' : '<div class="pp-jauge"><i style="width:' + taux + '%"></i></div>') + '</div>'
                + '<h4>À décider</h4>'
                + '<div class="pp-ligne-cote"><span>' + c.NON + ' indisponible' + (c.NON > 1 ? 's' : '') + '</span>'
                + (c.NON && bouton('btn_cmd_dispo_reverifier') ? '<a href="#" data-pp-action="btn_cmd_dispo_reverifier" onclick="return false">revérifier</a>' : '') + '</div>'
                + '<div class="pp-ligne-cote"><span>' + prixChanges.length + ' prix changé' + (prixChanges.length > 1 ? 's' : '') + '</span>'
                + (prixChanges.length || ctx.filtrePrix ? '<a href="#" data-pp-methode="filtre-prix" onclick="return false">' + (ctx.filtrePrix ? 'tout voir' : 'comparer') + '</a>' : '') + '</div>'
                + '<div class="pp-pile">' + btn('btn_cmd_envoyer_pml', {cls: 'prim'}) + btn('btn_import_reponse') + btn('btn_cmd_dispo_verifier')
                + btn('btn_creerbl', {texte: 'Créer le bon de livraison', cls: etapes(ctx).envoye || !bouton('btn_cmd_envoyer_pml') ? 'prim' : ''}) + '</div>'
                + '<div class="pp-pile fin">' + btn('btn_export_cmd_csv') + btn('btn_cmd_dispo_imprimer') + btnMethode('imprimer-commande', 'Imprimer la commande')
                + btn('btn_cancel', {texte: 'Fermer'}) + '</div></div>';
        return '<div class="pp-titre">Commande ' + enc(i.ref) + ' <small>· ' + enc(i.grossiste) + '</small></div>' + message(ctx)
                + '<div class="pp-cols">' + '<div class="pp-col">' + gauche + '</div>' + droite + '</div>';
    }

    function commandeC(ctx) {
        var t = totaux(ctx), i = infosCommande(ctx);
        var envoi = i.envoi === 'REPONDUE' ? 'Envoi PharmaML · réponse reçue' + (i.dateEnvoi ? ' (' + enc(i.dateEnvoi) + ')' : '')
                : (i.envoi === 'EN_ATTENTE' ? 'Envoi PharmaML · en attente de réponse' : 'Non envoyée');
        return '<div class="pp-corps pp-fond-papier"><div class="pp-papier">'
                + '<div class="pp-haut"><div><h4>Bon de commande ' + enc(i.ref) + '</h4><small class="pp-gris">Pharmacie · ' + enc(i.date || Ext.Date.format(new Date(), 'd/m/Y')) + '</small></div>'
                + '<div class="pp-droite"><b>' + enc(i.grossiste) + '</b><br><small class="pp-gris">' + envoi + '</small></div></div>' + message(ctx)
                + '<table class="pp-g papier"><thead><tr><th>CIP</th><th>Désignation</th><th class="n">Qté</th><th class="n">PA</th><th class="n">Montant</th><th>Réponse</th></tr></thead><tbody>'
                + ctx.lignes.map(function (l) {
                    return '<tr><td>' + enc(l.lg_FAMILLE_CIP) + '</td><td>' + enc(l.lg_FAMILLE_NAME) + '</td><td class="n">' + champQte(ctx, l, false) + '</td>'
                            + '<td class="n">' + nf(l.int_PAF) + '</td><td class="n">' + nf(l.int_PRICE) + '</td><td>' + pastilleDispo(ctx, l) + '</td></tr>';
                }).join('') + '</tbody></table>'
                + '<div class="pp-total"><span class="pp-gris"><span data-pp-total="lignes">' + nf(t.lignes) + '</span> lignes · <span data-pp-total="boites">'
                + nf(t.boites) + '</span> boîtes · Total</span><b data-pp-total="montant">' + nf(t.montant) + ' F CFA</b></div>'
                + '<div class="pp-actions-papier">' + btnMethode('imprimer-commande', 'Imprimer') + btn('btn_creerbl', {cls: 'prim', texte: 'Créer le bon de livraison'}) + '</div>'
                + '</div></div>'
                + '<div class="pp-pied"><span class="pp-gris">Autres actions</span><span class="pp-espace"></span>' + btn('btn_cmd_envoyer_pml')
                + btn('btn_cmd_dispo_verifier') + menuPlus(PLUS_CMD) + btn('btn_cancel', {texte: 'Fermer'}) + '</div>';
    }

    /* ================================================================== 3. ENTREES */

    function gestionLot(ctx) {
        return ctx.ecran.gestionLot === true;
    }
    /* Quantite recue de la ligne : la commandee moins le reliquat (colonne RELICAT de l'ecran d'origine). L'API de la
       grille renvoie « int_QTE_RECUE » egale a la commandee pour l'affichage d'origine ; le reliquat seul dit l'ecart. */
    function recue(l) {
        return Math.max(0, num(l.int_QTE_CMDE) - num(l.int_QTE_MANQUANT));
    }
    function statutEntree(ctx, l) {
        var cde = num(l.int_QTE_CMDE), recu = recue(l);
        if (gestionLot(ctx) && !l.lots) {
            return ['ko', 'Lot manquant', 'lots'];
        }
        if (recu !== cde) {
            return ['att', 'Écart ' + (recu - cde > 0 ? '+' : '−') + Math.abs(recu - cde), 'ecarts'];
        }
        return ['ok', 'Conforme', null];
    }
    function totauxEntree(ctx) {
        var t = {lignes: ctx.lignes.length, recu: 0, saisi: 0, ug: 0, montant: 0, pointees: 0, ecarts: 0, lots: 0, prix: 0, ugLignes: 0};
        ctx.lignes.forEach(function (l) {
            t.recu += recue(l);
            t.saisi += num(l.quantiteSaisie);
            t.ug += num(l.freeQty);
            t.montant += recue(l) * num(l.int_PAF);
            if (l.checked) {
                t.pointees++;
            }
            var s = statutEntree(ctx, l);
            if (s[2] === 'ecarts') {
                t.ecarts++;
            }
            if (s[2] === 'lots') {
                t.lots++;
            }
            if (l.prixDiff === true) {
                t.prix++;
            }
            if (num(l.freeQty) > 0) {
                t.ugLignes++;
            }
        });
        return t;
    }
    function titreEntree(ctx) {
        var d = ctx.ecran.getOdatasource() || {};
        return '<div class="pp-titre">Bon de livraison ' + enc(d.str_REF_LIVRAISON || '') + ' <small>· ' + enc(d.str_GROSSISTE_LIBELLE || '')
                + (d.str_REF_ORDER ? ' · commande ' + enc(d.str_REF_ORDER) : '') + '</small></div>';
    }
    function actionsLigneEntree(ctx, l) {
        var id = enc(l.lg_BON_LIVRAISON_DETAIL);
        return '<button type="button" class="pp-btn fin" data-pp-ligne-action="saisir" data-pp-ligne="' + id + '" title="Saisie de la quantité, des UG et du lot (fenêtre d\'origine « Ajout de lot »)">Saisir</button>'
                /* x-action-col-icon : l'action d'origine (PrestigeConfirmation.ligne) demande alors « Confirmer ? » dans le
                   bouton lui-meme, comme sur l'icone de la grille, au lieu d'une fenetre */
                + (num(l.freeQty) > 0 || l.hasLots ? '<button type="button" class="pp-btn fin pp-icone-conf" data-pp-ligne-action="retirer" data-pp-ligne="' + id
                        + '" title="Suppression de lot (action d\'origine)"><span class="x-action-col-icon">Retirer</span></button>' : '')
                + '<button type="button" class="pp-btn fin lien" data-pp-ligne-action="article" data-pp-ligne="' + id + '" title="Modifier l\'article (action d\'origine)">Article</button>';
    }
    function piedEntree(ctx, t, entree) {
        return '<div class="pp-pied">' + chiffre('Montant reçu', nf(t.montant) + ' F', '', ' data-pp-total="montant"')
                + chiffre('Quantité reçue', nf(t.recu), '', ' data-pp-total="recu"') + chiffre('Quantité saisie', nf(t.saisi), '', ' data-pp-total="saisi"')
                + chiffre('UG', nf(t.ug), '', ' data-pp-total="ug"')
                + '<span class="pp-espace"></span>' + btnMethode('ug', 'Vérifier les UG saisies') + btn('btn_cancel') + entree + '</div>';
    }

    function entreeA(ctx) {
        var t = totauxEntree(ctx), reste = t.lignes - t.pointees, pct = t.lignes ? Math.round(t.pointees * 100 / t.lignes) : 0;
        var entree = bouton('btn_enterstock') ? '<button type="button" class="pp-btn prim" data-pp-action="btn_enterstock"' + (reste > 0 ? ' disabled' : '')
                + ' title="Entrée en stock (action d\'origine)">' + (reste > 0 ? 'Entrée en stock (' + reste + ' ligne' + (reste > 1 ? 's' : '') + ' à pointer)' : 'Entrée en stock')
                + '</button>' : '';
        return titreEntree(ctx)
                + '<div class="pp-progression"><b data-pp-total="pointees">' + t.pointees + ' / ' + t.lignes + ' lignes pointées</b>'
                + '<div class="pp-jauge" role="progressbar" aria-valuemin="0" aria-valuemax="' + t.lignes + '" aria-valuenow="' + t.pointees + '"><i style="width:' + pct + '%"></i></div>'
                + (t.ecarts ? '<span class="pp-pas att">' + t.ecarts + ' écart' + (t.ecarts > 1 ? 's' : '') + '</span>' : '')
                + (t.lots ? '<span class="pp-pas ko">' + t.lots + ' lot' + (t.lots > 1 ? 's' : '') + ' manquant' + (t.lots > 1 ? 's' : '') + '</span>' : '') + '</div>'
                + message(ctx)
                + '<div class="pp-corps"><table class="pp-g"><thead><tr><th>Pointage</th><th>CIP</th><th>Désignation</th><th class="n">Cdé</th><th class="n">Reçu</th>'
                + '<th class="n">Saisi</th><th class="n">UG</th><th>Lot</th><th>Péremption</th><th class="n">PA</th><th class="n">PV</th><th>Statut</th><th></th></tr></thead><tbody>'
                + ctx.lignes.map(function (l) {
                    var s = statutEntree(ctx, l), id = enc(l.lg_BON_LIVRAISON_DETAIL);
                    var pointage = l.checked ? '<span class="pp-pas ok" title="Quantité pointée : ' + nf(l.checkedQuantity) + '">Pointé ✓</span>'
                            : '<button type="button" class="pp-btn fin" data-pp-ligne-action="pointer" data-pp-ligne="' + id + '" title="Pointer cette ligne : quantité reçue ' + nf(recue(l)) + '">Pointer</button>';
                    return '<tr class="' + (l.checked ? 'pointee' : '') + '"><td>' + pointage + '</td><td>' + enc(l.lg_FAMILLE_CIP) + '</td><td class="des">' + enc(l.lg_FAMILLE_NAME) + '</td>'
                            + '<td class="n">' + nf(l.int_QTE_CMDE) + '</td><td class="n"><b>' + nf(recue(l)) + '</b></td><td class="n">' + nf(l.quantiteSaisie) + '</td>'
                            + '<td class="n">' + nf(l.freeQty) + '</td><td>' + (l.lots ? enc(l.lots) : (gestionLot(ctx) ? '<span class="pp-pas ko">à saisir</span>' : '<span class="pp-gris">—</span>')) + '</td>'
                            + '<td>' + enc(l.datePeremption || '') + '</td><td class="n">' + nf(l.int_PAF) + '</td><td class="n">' + nf(l.int_PRIX_VENTE) + '</td>'
                            + '<td><span class="pp-pas ' + s[0] + '">' + s[1] + '</span></td><td class="pp-actions-ligne">' + actionsLigneEntree(ctx, l) + '</td></tr>';
                }).join('') + '</tbody></table></div>'
                + piedEntree(ctx, t, entree);
    }

    function entreeB(ctx) {
        var t = totauxEntree(ctx);
        var tests = {
            tout: function () {
                return true;
            },
            ecarts: function (l) {
                return statutEntree(ctx, l)[2] === 'ecarts';
            },
            lots: function (l) {
                return statutEntree(ctx, l)[2] === 'lots';
            },
            prix: function (l) {
                return l.prixDiff === true;
            },
            ug: function (l) {
                return num(l.freeQty) > 0;
            }
        };
        if (!ctx.onglet) {
            ctx.onglet = t.ecarts ? 'ecarts' : (t.lots ? 'lots' : 'tout');
        }
        var onglets = [['tout', 'Tout', t.lignes, false], ['ecarts', 'Écarts', t.ecarts, true], ['lots', 'Lots', t.lots, true],
            ['prix', 'Prix changés', t.prix, true], ['ug', 'UG', t.ugLignes, false]];
        var lignes = ctx.lignes.filter(tests[ctx.onglet]);
        var conformes = ctx.lignes.filter(function (l) {
            return !statutEntree(ctx, l)[2] && l.prixDiff !== true;
        }).length;
        return titreEntree(ctx)
                + '<div class="pp-onglets" role="tablist">' + onglets.map(function (o) {
                    return '<button type="button" role="tab" aria-selected="' + (ctx.onglet === o[0]) + '" class="' + (ctx.onglet === o[0] ? 'on' : '')
                            + '" data-pp-onglet="' + o[0] + '">' + o[1] + (o[3] && o[2] ? '<em>' + o[2] + '</em>' : ' ' + o[2]) + '</button>';
                }).join('') + '</div>' + message(ctx)
                + '<div class="pp-corps"><table class="pp-g"><thead><tr><th>CIP</th><th>Désignation</th><th class="n">Cdé</th><th class="n">Reçu</th>'
                + '<th class="n">Reliquat</th><th class="n">Saisi</th><th class="n">UG</th><th>Lot</th><th class="n">PV BL</th><th>Statut</th><th>Décision</th></tr></thead><tbody>'
                + (lignes.length ? lignes.map(function (l) {
                    var s = statutEntree(ctx, l);
                    return '<tr class="' + (s[2] || l.prixDiff === true ? 'ecart' : '') + '"><td>' + enc(l.lg_FAMILLE_CIP) + '</td><td class="des">' + enc(l.lg_FAMILLE_NAME) + '</td>'
                            + '<td class="n">' + nf(l.int_QTE_CMDE) + '</td><td class="n"><b>' + nf(recue(l)) + '</b></td><td class="n">' + nf(l.int_QTE_MANQUANT) + '</td>'
                            + '<td class="n">' + nf(l.quantiteSaisie) + '</td><td class="n">' + nf(l.freeQty) + '</td><td>' + enc(l.lots || '') + '</td>'
                            + '<td class="n">' + nf(l.int_PRIX_VENTE) + (l.prixDiff === true ? ' <span class="pp-pas att" title="Prix de vente du BL différent du prix en machine">≠</span>' : '') + '</td>'
                            + '<td><span class="pp-pas ' + s[0] + '">' + s[1] + '</span></td><td class="pp-actions-ligne">' + actionsLigneEntree(ctx, l) + '</td></tr>';
                }).join('') : '<tr><td colspan="11" class="pp-vide">Rien dans cet onglet.</td></tr>') + '</tbody></table></div>'
                + '<div class="pp-sous-pied">' + (ctx.onglet === 'tout' ? '' : (conformes > 1 ? 'Les ' + conformes + ' lignes conformes restent' : (conformes ? 'La ligne conforme reste' : 'Aucune ligne conforme')) + ' dans « Tout ».') + '</div>'
                + piedEntree(ctx, t, btn('btn_enterstock', {cls: 'prim', texte: 'Entrée en stock'}));
    }

    /* ---- variante C : reception au scanner (lecture GS1 du serveur, la meme qu'a la vente) */

    function totalLu(ctx, id) {
        return (ctx.lectures[id] || []).reduce(function (s, x) {
            return s + x.n;
        }, 0);
    }
    function lireCode(ctx, code) {
        var local = null;
        ctx.lignes.forEach(function (l) {
            if (!local && String(l.lg_FAMILLE_CIP) === code) {
                local = l;
            }
        });
        if (local) {
            ajouterLecture(ctx, local, null, null, 'CIP saisi');
            return;
        }
        ctx.derniere = {attente: true, code: code};
        rendre(ctx);
        Ext.Ajax.request({
            method: 'GET', url: '../api/v1/presentations-saisies/bon/' + encodeURIComponent(ctx.ecran.getNameintern()) + '/gs1',
            params: {code: code},
            success: function (r) {
                var o = Ext.JSON.decode(r.responseText, true) || {};
                var l = o.success ? ligneParId(ctx, o.ligneId) : null;
                if (l) {
                    ajouterLecture(ctx, l, o.lot || null, o.peremption || null, o.gs1 ? 'étiquette GS1' : 'code-barres');
                } else {
                    ctx.derniere = {erreur: o.msg || 'Code non reconnu.'};
                    rendre(ctx);
                }
            },
            failure: function () {
                ctx.derniere = {erreur: 'Lecture impossible : le serveur ne répond pas.'};
                rendre(ctx);
            }
        });
    }
    function ajouterLecture(ctx, l, lot, peremption, source) {
        var id = l.lg_BON_LIVRAISON_DETAIL, liste = ctx.lectures[id] || (ctx.lectures[id] = []), g = null;
        liste.forEach(function (x) {
            if (!g && x.lot === lot && x.peremption === peremption) {
                g = x;
            }
        });
        if (!g) {
            g = {lot: lot, peremption: peremption, n: 0};
            liste.push(g);
        }
        g.n++;
        ctx.sel = id;
        ctx.derniere = {ligne: id, lot: lot, peremption: peremption, source: source, heure: Ext.Date.format(new Date(), 'H:i:s')};
        rendre(ctx);
        var tr = ctx.vue.getEl().dom.querySelector('tr.sel');
        if (tr && tr.scrollIntoView) {
            tr.scrollIntoView({block: 'nearest'});
        }
    }
    function corrigerLecture(ctx, id, n) {
        var liste = ctx.lectures[id] || [];
        var autres = liste.slice(1).reduce(function (s, x) {
            return s + x.n;
        }, 0);
        if (!liste.length) {
            return;
        }
        liste[0].n = Math.max(0, n - autres);
        if (totalLu(ctx, id) === 0) {
            delete ctx.lectures[id];
        }
        rendre(ctx);
    }
    function peremptionLisible(p) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p || '');
        return m ? m[2] + '/' + m[1] : (p || '');
    }

    function entreeC(ctx) {
        var t = totauxEntree(ctx), complets = 0, boites = 0, lignesLues = 0;
        ctx.lignes.forEach(function (l) {
            var lu = totalLu(ctx, l.lg_BON_LIVRAISON_DETAIL);
            if (lu) {
                lignesLues++;
                boites += lu;
            }
            if (lu >= recue(l) && recue(l) > 0) {
                complets++;
            }
        });
        var d = ctx.derniere, carte;
        if (!d) {
            carte = '<div class="pp-dernier vide"><small>Dernière lecture</small><br>Aucune lecture pour l\'instant.</div>';
        } else if (d.attente) {
            carte = '<div class="pp-dernier vide"><small>Lecture en cours…</small></div>';
        } else if (d.erreur) {
            carte = '<div class="pp-dernier erreur" role="alert"><small>Dernière lecture</small><br><b>' + enc(d.erreur) + '</b></div>';
        } else {
            var l = ligneParId(ctx, d.ligne) || {}, lu = totalLu(ctx, d.ligne), recu = recue(l);
            carte = '<div class="pp-dernier" role="status"><small>Dernière lecture · ' + enc(d.heure) + ' · ' + enc(d.source) + '</small><br><b>' + enc(l.lg_FAMILLE_NAME) + '</b><br>'
                    + (d.lot ? 'Lot <b>' + enc(d.lot) + '</b> · ' : '<span class="pp-gris">sans lot</span> · ')
                    + (d.peremption ? 'péremption <b>' + enc(peremptionLisible(d.peremption)) + '</b> · ' : '')
                    + 'lu <b>' + lu + ' / ' + recu + '</b> ' + (lu >= recu ? '<span class="pp-pas ok">complet</span>' : '<span class="pp-pas att">en cours</span>') + '</div>';
        }
        var manque = '';
        if (gestionLot(ctx)) {
            manque = '<div class="pp-note">Gestion des lots active : une boîte lue sans lot (CIP tapé, code-barres simple) est comptée, mais son lot se saisit par « Saisir ».</div>';
        }
        return titreEntree(ctx)
                + '<div class="pp-scan"><div><input class="pp-recherche grande" data-pp-scan data-pp-focus="scan" autocomplete="off" '
                + 'placeholder="⌕ Scannez une boîte (GS1) ou tapez le CIP, puis Entrée" aria-label="Scanner une boîte ou taper un CIP">'
                + '<div class="pp-gris pp-aide">Chaque lecture ajoute 1 à « Lu » ; corrigez « Lu » sur la ligne au besoin. Rien n\'est enregistré avant « Enregistrer les lectures ».</div>'
                + manque + '</div>' + carte + '</div>' + message(ctx)
                + '<div class="pp-corps"><table class="pp-g"><thead><tr><th>CIP</th><th>Désignation</th><th class="n">Cdé</th><th class="n">Reçu</th><th class="n">Lu</th>'
                + '<th>Lots lus</th><th>Pointage</th><th>État</th><th></th></tr></thead><tbody>'
                + ctx.lignes.map(function (l) {
                    var id = l.lg_BON_LIVRAISON_DETAIL, lu = totalLu(ctx, id), recu = recue(l);
                    var lots = (ctx.lectures[id] || []).map(function (x) {
                        return x.lot ? enc(x.lot) + (x.peremption ? ' · ' + enc(peremptionLisible(x.peremption)) : '') + ' (' + x.n + ')' : 'sans lot (' + x.n + ')';
                    }).join('<br>');
                    var etat = lu >= recu && recu > 0 ? '<span class="pp-pas ok">complet</span>' : (lu ? '<span class="pp-pas att">en cours</span>' : '<span class="pp-pas info">non lu</span>');
                    return '<tr data-pp-sel="' + enc(id) + '" class="' + (ctx.sel === id ? 'sel' : '') + '"><td>' + enc(l.lg_FAMILLE_CIP) + '</td><td class="des">' + enc(l.lg_FAMILLE_NAME) + '</td>'
                            + '<td class="n">' + nf(l.int_QTE_CMDE) + '</td><td class="n">' + nf(recu) + '</td>'
                            + '<td class="n">' + (lu ? '<input class="pp-qte-champ" type="number" min="0" value="' + lu + '" data-pp-lu="' + enc(id) + '" data-pp-focus="lu-' + enc(id) + '" aria-label="Boîtes lues">' : '<b>0</b>') + '</td>'
                            + '<td>' + lots + '</td><td>' + (l.checked ? '<span class="pp-pas ok" title="Quantité pointée ' + nf(l.checkedQuantity) + '">Pointé ' + nf(l.checkedQuantity) + '</span>' : '<span class="pp-gris">—</span>') + '</td>'
                            + '<td>' + etat + '</td><td class="pp-actions-ligne">' + actionsLigneEntree(ctx, l) + '</td></tr>';
                }).join('') + '</tbody></table></div>'
                + '<div class="pp-pied"><b data-pp-total="complets">' + complets + ' / ' + t.lignes + ' produits complets</b>'
                + chiffre('Boîtes lues', nf(boites), '', ' data-pp-total="lues"') + chiffre('UG', nf(t.ug), '', ' data-pp-total="ug"')
                + '<span class="pp-espace"></span>'
                + (boites ? '<button type="button" class="pp-btn" data-pp-methode="enregistrer-lectures" data-pp-arme="lectures" data-pp-confirmer="Confirmer : ' + boites
                        + ' boîte' + (boites > 1 ? 's' : '') + ' sur ' + lignesLues + ' ligne' + (lignesLues > 1 ? 's' : '') + ' ?">Enregistrer les lectures (' + boites + ')</button>' : '')
                + btnMethode('ug', 'Vérifier les UG saisies') + btn('btn_cancel') + btn('btn_enterstock', {cls: 'prim', texte: 'Entrée en stock'}) + '</div>';
    }

    /** Pointage (API existante de la reception mobile), puis lots lus par l'action existante d'ajout de lot. */
    function enregistrerLectures(ctx) {
        var e = ctx.ecran, d = e.getOdatasource() || {}, taches = [], sansLot = 0;
        Object.keys(ctx.lectures).forEach(function (id) {
            var lu = totalLu(ctx, id);
            taches.push({url: '../api/v1/commande/bon/items/checked-quantities', corps: {id: id, checkedQuantity: lu}});
            if (gestionLot(ctx)) {
                ctx.lectures[id].forEach(function (x) {
                    if (x.lot && x.peremption) {
                        taches.push({url: '../api/v1/commande/add-lot', corps: {freeQty: 0, qty: x.n, dateUsine: null, datePeremption: x.peremption,
                                idBonDetail: id, numLot: x.lot, directImport: d.directImport}});
                    } else {
                        sansLot += x.n;
                    }
                });
            }
        });
        var erreurs = 0, suivant = function () {
            var tache = taches.shift();
            if (!tache) {
                ctx.lectures = {};
                ctx.derniere = null;
                ctx.message = erreurs ? {niveau: 'ko', texte: erreurs + ' enregistrement(s) refusé(s) par le serveur.'}
                : {niveau: 'ok', texte: 'Lectures enregistrées' + (sansLot ? ' ; ' + sansLot + ' boîte(s) sans lot : lot à saisir par « Saisir ».' : '.')};
                ctx.grille.getStore().reload();
                return;
            }
            Ext.Ajax.request({
                method: 'POST', url: tache.url, headers: {'Content-Type': 'application/json'}, params: Ext.JSON.encode(tache.corps),
                success: function (r) {
                    var o = Ext.JSON.decode(r.responseText || '{}', true) || {};
                    if (o.success === false) {
                        erreurs++;
                    }
                    suivant();
                },
                failure: function () {
                    erreurs++;
                    suivant();
                }
            });
        };
        ctx.message = {niveau: 'info', texte: 'Enregistrement des lectures…'};
        rendre(ctx);
        suivant();
    }

    /* ------------------------------------------------------------------ actions de ligne et methodes */

    /** Grille minimale pour appeler les actions de ligne d'origine (elles lisent grid.getStore().getAt(i)). */
    function grilleDe(ctx, l) {
        var rec = Ext.create('testextjs.model.BonLivraisonDetail', l), st = ctx.grille.getStore();
        return {getStore: function () {
                return {getAt: function () {
                        return rec;
                    }, reload: function () {
                        st.reload();
                    }, load: function () {
                        st.load();
                    }};
            }};
    }
    function actionLigne(ctx, action, l, el) {
        if (!l) {
            return;
        }
        var e = ctx.ecran;
        if (action === 'saisir') {
            e.onAddProductClick(grilleDe(ctx, l), 0);
        } else if (action === 'retirer') {
            e.onRemoveLotClick(grilleDe(ctx, l), 0);
        } else if (action === 'article') {
            e.managePrice(grilleDe(ctx, l), 0);
        } else if (action === 'pointer') {
            el.disabled = true;
            el.textContent = 'Pointage…';
            Ext.Ajax.request({
                method: 'POST', url: '../api/v1/commande/bon/items/checked-quantities', headers: {'Content-Type': 'application/json'},
                params: Ext.JSON.encode({id: l.lg_BON_LIVRAISON_DETAIL, checkedQuantity: recue(l)}),
                success: function () {
                    l.checked = true;
                    l.checkedQuantity = recue(l);
                    ctx.message = null;
                    rendre(ctx);
                },
                failure: function () {
                    ctx.message = {niveau: 'ko', texte: 'Le pointage n\'a pas été enregistré.'};
                    rendre(ctx);
                }
            });
        }
    }
    function methode(ctx, cle, el) {
        var e = ctx.ecran;
        if (cle === 'ug') {
            e.showFreeQtyProducts();
        } else if (cle === 'imprimer-commande') {
            e.onPdfClick();
        } else if (cle === 'filtre-prix') {
            ctx.filtrePrix = !ctx.filtrePrix;
            rendre(ctx);
        } else if (cle === 'enregistrer-lectures') {
            armer(ctx, el, 'lectures', el.getAttribute('data-pp-confirmer'), function () {
                enregistrerLectures(ctx);
            });
        }
    }

    var RENDUS = {
        suggestion: {A: suggestionA, B: suggestionB, C: suggestionC},
        commande: {A: commandeA, B: commandeB, C: commandeC},
        entree: {A: entreeA, B: entreeB, C: entreeC}
    };

    return {
        appliquerSiConcerne: appliquerSiConcerne,
        choix: choix,
        /* pour les tests d'ecran : etat de la variante montee (lecture seule) */
        etat: function () {
            var c = courant;
            var occupe = (c && c.enCours) || 0;
            if (c && !c.detruit && (c.totauxEnCours || c.lecture || c.grille.getStore().isLoading())) {
                occupe++;
            }
            return c && !c.detruit ? {cle: c.cle, v: c.v, lignes: c.lignes.length, charge: c.charge, enCours: occupe} : null;
        }
    };
})();
