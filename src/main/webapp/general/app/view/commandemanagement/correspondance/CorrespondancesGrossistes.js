/* global Ext, PrestigeToast */

/*
 * GESTION DES COMMANDES > « Correspondance grossistes » (lot 3 de l'étude du 08/11). File de validation des
 * correspondances entre les codes lus chez les grossistes et les produits Prestige :
 *  - par défaut « À traiter » : propositions à valider (par la désignation, code ou CIP ambigus), correspondances
 *    contredites par un BL, contradictions signalées sur une correspondance validée ou rejetée ;
 *  - pour chaque code : désignation du grossiste face aux candidats, dosages et conditionnements en évidence ;
 *  - « Valider » (un candidat), « Autre produit » (recherche par CIP, EAN ou désignation), « Rejeter » : confirmés
 *    dans le bouton lui-même, sans fenêtre ; « Proposer par désignation » relance le rapprochement des codes non
 *    reconnus à l'import.
 * Décisions réservées au droit P_CORRESPONDANCE_GROSSISTES ; sinon lecture seule. Routes :
 * ../api/v1/correspondance-grossiste.
 */
Ext.define('testextjs.view.commandemanagement.correspondance.CorrespondancesGrossistes', {
    extend: 'Ext.panel.Panel',
    xtype: 'correspondancesgrossistes',
    layout: 'fit',
    border: false,
    header: false,
    config: {
        nameintern: '',
        titre: '',
        odatasource: ''
    },

    URL: '../api/v1/correspondance-grossiste',
    DROIT: 'P_CORRESPONDANCE_GROSSISTES',
    PAGE: 30,

    ETATS: [
        {code: 'A_TRAITER', libelle: 'À traiter'},
        {code: 'PROPOSEE', libelle: 'À valider'},
        {code: 'CONTREDITE', libelle: 'Contredites'},
        {code: 'VALIDEE', libelle: 'Validées'},
        {code: 'REJETEE', libelle: 'Rejetées'},
        {code: 'AUTO_EXACTE', libelle: 'Automatiques'}
    ],
    LIB_ETAT: {AUTO_EXACTE: 'Automatique', PROPOSEE: 'À valider', VALIDEE: 'Validée', REJETEE: 'Rejetée', CONTREDITE: 'Contredite'},
    LIB_MOTIF: {
        DESIGNATION: 'proposé par la désignation', CODE_AMBIGU: 'code porté par plusieurs produits',
        DESACCORD_CODE_CLE: 'code et CIP en désaccord', CLE_AMBIGUE: 'CIP porté par plusieurs produits',
        INTROUVABLE: 'aucun produit proche', RECU_EN_BL: 'appris d\'un BL', CODE_GROSSISTE_CONNU: 'code déjà connu',
        CLE_UNIQUE: 'même CIP ou EAN'
    },

    initComponent: function () {
        var me = this;
        me.etat = {filtre: 'A_TRAITER', grossiste: '', lignes: [], total: 0, droit: false, mesures: null};
        me.items = [{xtype: 'component', itemId: 'cgrCorps', autoScroll: true, html: '<div class="cgr"><div class="cgr-attente">Chargement…</div></div>'}];
        me.callParent(arguments);
        me.styles();
        me.on('afterrender', function () {
            me.racine = me.down('#cgrCorps').getEl().dom.querySelector('.cgr');
            me.ecouter();
            me.demarrer();
        }, me, {single: true});
        me.on('destroy', function () {
            (me.minuteurs || []).forEach(clearTimeout);
        });
    },

    styles: function () {
        if (Ext.get('correspondances-grossistes-styles')) {
            return;
        }
        Ext.util.CSS.createStyleSheet(
                '.cgr{font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#1b2a3a;background:#f3f5f8;min-height:100%}'
                + '.cgr-attente{padding:30px;color:#64748b}'
                + '.cgr-barre{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px 14px;background:#fff;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:2}'
                + '.cgr-titre{font-size:16px;font-weight:600;margin-right:6px}'
                + '.cgr-barre select{font:inherit;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;background:#fff}'
                + '.cgr-lib{color:#64748b;font-size:12px}.cgr-espace{flex:1}'
                + '.cgr-lecture{color:#9a3412;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:3px 8px;font-size:12px}'
                + '.cgr-btn{border:1px solid #cbd5e1;background:#fff;border-radius:7px;padding:4px 10px;cursor:pointer;font:inherit;font-size:12px;white-space:nowrap}'
                + '.cgr-btn:hover{background:#f1f5f9}.cgr-btn:disabled{opacity:.5;cursor:default}'
                + '.cgr-btn.cgr-primaire{background:#2563eb;border-color:#2563eb;color:#fff}.cgr-btn.cgr-primaire:hover{background:#1d4ed8}'
                + '.cgr-btn.cgr-confirme{background:#b91c1c;border-color:#b91c1c;color:#fff}'
                + '.cgr-liste{padding:12px 14px;display:flex;flex-direction:column;gap:10px}'
                + '.cgr-vide{padding:30px;text-align:center;color:#64748b;background:#fff;border:1px dashed #cbd5e1;border-radius:10px}'
                + '.cgr-carte{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px}'
                + '.cgr-tete{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 10px}'
                + '.cgr-gros{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b}'
                + '.cgr-code{font-family:Consolas,monospace;background:#f1f5f9;border-radius:4px;padding:0 5px}'
                + '.cgr-des{font-weight:600;font-size:14px}'
                + '.cgr-badge{font-size:11px;border-radius:10px;padding:1px 8px;background:#e2e8f0}'
                + '.cgr-PROPOSEE{background:#fef3c7;color:#92400e}.cgr-CONTREDITE{background:#fee2e2;color:#991b1b}'
                + '.cgr-VALIDEE{background:#dcfce7;color:#166534}.cgr-REJETEE{background:#e5e7eb;color:#374151}.cgr-AUTO_EXACTE{background:#dbeafe;color:#1e40af}'
                + '.cgr-score{margin-left:auto;font-size:12px;color:#64748b}'
                + '.cgr-info{margin-top:4px;font-size:12px;color:#475569}.cgr-alerte{color:#b91c1c}'
                + '.cgr-cands{margin-top:8px;display:flex;flex-direction:column;gap:4px}'
                + '.cgr-cand{display:flex;align-items:center;gap:10px;padding:5px 8px;border-radius:7px;background:#f8fafc}'
                + '.cgr-cand .cgr-nom{flex:1}.cgr-cand small{color:#64748b}'
                + '.cgr-dose{background:#fde68a;border-radius:3px;padding:0 2px;font-weight:600}'
                + '.cgr-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}'
                + '.cgr-recherche{margin-top:8px;padding:8px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc}'
                + '.cgr-recherche input{width:100%;box-sizing:border-box;font:inherit;padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px}'
                + '.cgr-suite{text-align:center;padding:0 14px 14px}',
                'correspondances-grossistes-styles');
    },

    // ------------------------------------------------------------------ outils

    html: function (s) {
        return s === null || s === undefined ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    /** Désignation échappée, dosages et conditionnements en évidence. */
    designation: function (s) {
        return this.html(s).replace(/(\d+(?:[.,]\d+)?\s*(?:MCG|MG|ML|UI|KG|CL|G|L|%)?)(?![A-Za-z0-9])/gi, '<span class="cgr-dose">$1</span>');
    },

    appel: function (methode, chemin, corps, fin) {
        Ext.Ajax.request({
            url: this.URL + '/' + chemin, method: methode,
            headers: corps ? {'Content-Type': 'application/json'} : undefined,
            jsonData: corps || undefined,
            callback: function (opts, succes, rep) {
                fin(Ext.decode(rep && rep.responseText, true) || {}, rep ? rep.status : 0);
            }
        });
    },

    // ------------------------------------------------------------------ chargement

    demarrer: function () {
        var me = this;
        Ext.Ajax.request({
            url: '../api/v1/user/droits', method: 'GET',
            callback: function (o, succes, rep) {
                me.etat.droit = !!(rep && rep.responseText && rep.responseText.indexOf(me.DROIT) >= 0);
                me.charger(false);
            }
        });
    },

    charger: function (suite) {
        var me = this;
        var start = suite ? me.etat.lignes.length : 0;
        me.appel('GET', 'mesures', null, function (m) {
            me.etat.mesures = m;
            me.appel('GET', 'liste?etat=' + encodeURIComponent(me.etat.filtre) + '&grossiste=' + encodeURIComponent(me.etat.grossiste)
                    + '&start=' + start + '&limit=' + me.PAGE, null, function (l) {
                        me.etat.lignes = (suite ? me.etat.lignes : []).concat(l.data || []);
                        me.etat.total = l.total || 0;
                        me.rendre();
                    });
        });
    },

    // ------------------------------------------------------------------ rendu

    rendre: function () {
        var me = this, e = me.etat, m = e.mesures || {};
        var grossistes = {};
        (m.data || []).forEach(function (x) {
            grossistes[x.cleGrossiste] = x.grossiste || x.cleGrossiste;
        });
        var aTraiter = {}, totalATraiter = 0;
        (m.aTraiter || []).forEach(function (x) {
            aTraiter[x.cleGrossiste] = x.nombre;
            totalATraiter += x.nombre;
        });
        var h = ['<div class="cgr-barre"><span class="cgr-titre">Correspondance grossistes</span>'];
        h.push('<label class="cgr-lib">Grossiste <select data-filtre="grossiste"><option value="">Tous</option>');
        Object.keys(grossistes).sort(function (a, b) {
            return String(grossistes[a]).localeCompare(String(grossistes[b]));
        }).forEach(function (g) {
            h.push('<option value="' + me.html(g) + '"' + (g === e.grossiste ? ' selected' : '') + '>' + me.html(grossistes[g])
                    + (aTraiter[g] ? ' (' + aTraiter[g] + ' à traiter)' : '') + '</option>');
        });
        h.push('</select></label><label class="cgr-lib">État <select data-filtre="etat">');
        me.ETATS.forEach(function (x) {
            h.push('<option value="' + x.code + '"' + (x.code === e.filtre ? ' selected' : '') + '>' + x.libelle
                    + (x.code === 'A_TRAITER' ? ' (' + totalATraiter + ')' : '') + '</option>');
        });
        h.push('</select></label><span class="cgr-lib" data-e2e="compte">' + e.total + ' correspondance' + (e.total > 1 ? 's' : '') + '</span>');
        h.push('<span class="cgr-espace"></span>');
        var dc = m.dernierCalcul;
        if (dc && dc.fin) {
            h.push('<span class="cgr-lib" data-e2e="dernier-calcul">Dernier calcul ' + me.html(dc.fin) + '</span>');
        }
        if (e.droit) {
            h.push('<button class="cgr-btn" data-action="rapprocher" title="Propose des produits, par leur désignation, pour les codes non reconnus à l\'import. Rien n\'est validé d\'office.">Proposer par désignation</button>');
        } else {
            h.push('<span class="cgr-lecture">Lecture seule : droit « Correspondances grossistes » requis pour décider</span>');
        }
        h.push('</div><div class="cgr-liste">');
        if (!e.lignes.length) {
            h.push('<div class="cgr-vide">Aucune correspondance ' + (e.filtre === 'A_TRAITER' ? 'à traiter' : 'dans cet état') + '.</div>');
        }
        e.lignes.forEach(function (x) {
            h.push(me.carte(x));
        });
        h.push('</div>');
        if (e.lignes.length < e.total) {
            h.push('<div class="cgr-suite"><button class="cgr-btn" data-action="suite">Afficher ' + Math.min(me.PAGE, e.total - e.lignes.length)
                    + ' de plus (' + (e.total - e.lignes.length) + ' restantes)</button></div>');
        }
        me.racine.innerHTML = h.join('');
    },

    carte: function (x) {
        var me = this, d = me.etat.droit;
        var h = ['<div class="cgr-carte" data-id="' + x.id + '">'];
        h.push('<div class="cgr-tete"><span class="cgr-gros">' + me.html(x.grossiste || x.cleGrossiste) + '</span>'
                + '<span class="cgr-code" title="Code chez le grossiste">' + me.html(x.codeGrossiste) + '</span>'
                + '<span class="cgr-des" data-e2e="designation">' + me.designation(x.designationGrossiste || '(désignation inconnue)') + '</span>'
                + '<span class="cgr-badge cgr-' + x.etat + '" data-e2e="etat">' + (me.LIB_ETAT[x.etat] || x.etat) + '</span>'
                + (me.LIB_MOTIF[x.motif] ? '<span class="cgr-lib">' + me.LIB_MOTIF[x.motif] + '</span>' : '')
                + (x.score !== null && x.score !== undefined ? '<span class="cgr-score" data-e2e="score">score ' + Math.round(x.score * 100) + ' %</span>' : '')
                + '</div>');
        if (x.familleId) {
            h.push('<div class="cgr-info" data-e2e="retenu">' + (x.etat === 'VALIDEE' ? 'Validé' : 'Retenu') + ' : <b>' + me.designation(x.famille) + '</b>'
                    + (x.familleCip ? ' <small>CIP ' + me.html(x.familleCip) + '</small>' : '')
                    + (x.utilisateurValidation ? ' <small>par ' + me.html(x.utilisateurValidation) + ' le ' + me.html(x.dateValidation) + '</small>' : '') + '</div>');
        }
        if (x.familleContradictionId) {
            h.push('<div class="cgr-info cgr-alerte" data-e2e="contradiction">Reçu en BL pour un autre produit : <b>' + me.designation(x.familleContradiction)
                    + '</b> <small>(' + x.nbContradictions + ' fois, dernière le ' + me.html(x.dateDerniereContradiction) + ')</small></div>');
        }
        if (x.nbConfirmations) {
            h.push('<div class="cgr-info">Confirmé par ' + x.nbConfirmations + ' BL</div>');
        }
        var proposes = [];
        (x.candidatsDetail || []).forEach(function (c) {
            if (c.familleId !== x.familleId) {
                proposes.push(c);
            }
        });
        if (x.familleContradictionId && x.familleContradictionId !== x.familleId && !proposes.some(function (c) {
            return c.familleId === x.familleContradictionId;
        })) {
            proposes.push({familleId: x.familleContradictionId, famille: x.familleContradiction});
        }
        if (d && x.familleId && (x.etat !== 'VALIDEE' || x.familleContradictionId)) {
            proposes.unshift({familleId: x.familleId, famille: x.famille, cip: x.familleCip});
        }
        if (proposes.length) {
            h.push('<div class="cgr-cands">');
            proposes.forEach(function (c) {
                h.push('<div class="cgr-cand" data-famille="' + me.html(c.familleId) + '"><span class="cgr-nom">' + me.designation(c.famille || c.familleId)
                        + (c.cip ? ' <small>CIP ' + me.html(c.cip) + '</small>' : '') + '</span>'
                        + (d ? '<button class="cgr-btn cgr-primaire" data-action="valider" data-famille="' + me.html(c.familleId) + '">Valider ce produit</button>' : '')
                        + '</div>');
            });
            h.push('</div>');
        }
        if (d) {
            h.push('<div class="cgr-actions"><button class="cgr-btn" data-action="autre">Autre produit…</button>'
                    + (x.etat !== 'REJETEE' || x.familleContradictionId ? '<button class="cgr-btn" data-action="rejeter">Rejeter</button>' : '')
                    + '</div><div class="cgr-recherche" data-e2e="recherche" style="display:none"><input type="text" placeholder="CIP, EAN ou désignation du produit Prestige" data-action="chercher">'
                    + '<div class="cgr-cands" data-e2e="resultats"></div></div>');
        }
        h.push('</div>');
        return h.join('');
    },

    // ------------------------------------------------------------------ actions

    ecouter: function () {
        var me = this;
        me.racine.addEventListener('change', function (ev) {
            var f = ev.target.getAttribute('data-filtre');
            if (f) {
                me.etat[f === 'etat' ? 'filtre' : 'grossiste'] = ev.target.value;
                me.charger(false);
            }
        });
        me.racine.addEventListener('click', function (ev) {
            var b = ev.target.closest('button[data-action]');
            if (b && !b.disabled) {
                me.action(b, b.getAttribute('data-action'));
            }
        });
        me.racine.addEventListener('input', function (ev) {
            if (ev.target.getAttribute('data-action') === 'chercher') {
                var champ = ev.target;
                clearTimeout(me.attenteRecherche);
                me.attenteRecherche = setTimeout(function () {
                    me.chercher(champ);
                }, 300);
            }
        });
    },

    /** Bouton à confirmer : premier clic, le texte devient la question ; second clic dans les 6 s, l'action. */
    confirmer: function (b, question, faire) {
        var me = this;
        if (b.getAttribute('data-confirme') === '1') {
            b.removeAttribute('data-confirme');
            b.classList.remove('cgr-confirme');
            faire();
            return;
        }
        var texte = b.textContent;
        b.setAttribute('data-confirme', '1');
        b.classList.add('cgr-confirme');
        b.textContent = question;
        me.minuteurs = me.minuteurs || [];
        me.minuteurs.push(setTimeout(function () {
            if (!me.isDestroyed && b.isConnected && b.getAttribute('data-confirme') === '1') {
                b.removeAttribute('data-confirme');
                b.classList.remove('cgr-confirme');
                b.textContent = texte;
            }
        }, 6000));
    },

    ligne: function (b) {
        var carte = b.closest('.cgr-carte'), id = carte && Number(carte.getAttribute('data-id'));
        var x = null;
        this.etat.lignes.forEach(function (l) {
            if (l.id === id) {
                x = l;
            }
        });
        return x;
    },

    action: function (b, action) {
        var me = this;
        if (action === 'suite') {
            me.charger(true);
        } else if (action === 'rapprocher') {
            me.confirmer(b, 'Confirmer : proposer pour les codes non reconnus ?', function () {
                b.disabled = true;
                b.textContent = 'Rapprochement en cours…';
                me.appel('POST', 'rapprocher', {}, function (o) {
                    var c = o.calcul || {};
                    PrestigeToast.afficher(o.success ? c.codesLus + ' code(s) non reconnu(s) lu(s) : ' + c.creees + ' nouvelle(s) proposition(s), '
                            + c.modifiees + ' mise(s) à jour, ' + c.conservees + ' déjà décidée(s)' : (o.msg || 'Rapprochement impossible.'),
                            {niveau: o.success ? 'ok' : 'erreur'});
                    me.charger(false);
                });
            });
        } else if (action === 'autre') {
            var zone = b.closest('.cgr-carte').querySelector('.cgr-recherche');
            zone.style.display = zone.style.display === 'none' ? '' : 'none';
            if (zone.style.display === '') {
                zone.querySelector('input').focus();
            }
        } else if (action === 'valider' || action === 'rejeter') {
            var x = me.ligne(b);
            if (!x) {
                return;
            }
            var famille = b.getAttribute('data-famille');
            me.confirmer(b, action === 'valider' ? 'Confirmer la validation ?' : 'Confirmer le rejet ?', function () {
                b.disabled = true;
                me.appel('POST', x.id + '/' + action, {familleId: famille, version: x.version}, function (o, statut) {
                    PrestigeToast.afficher(o.msg || 'Non enregistré.', {niveau: o.success ? 'ok' : 'erreur'});
                    if (o.success && o.ligne) {
                        // la ligne reste a sa place si elle est encore dans le filtre (Validees, Rejetees), sinon elle sort
                        if (o.ligne.etat === me.etat.filtre) {
                            me.etat.lignes = me.etat.lignes.map(function (l) {
                                return l.id === x.id ? o.ligne : l;
                            });
                        } else {
                            me.etat.lignes = me.etat.lignes.filter(function (l) {
                                return l.id !== x.id;
                            });
                            me.etat.total--;
                        }
                        me.appel('GET', 'mesures', null, function (m) {
                            me.etat.mesures = m;
                            me.rendre();
                        });
                    } else if (statut === 409) {
                        me.charger(false);
                    } else {
                        b.disabled = false;
                        me.rendre();
                    }
                });
            });
        }
    },

    chercher: function (champ) {
        var me = this, zone = champ.parentNode.querySelector('[data-e2e=resultats]');
        var q = champ.value.trim();
        if (q.length < 2) {
            zone.innerHTML = '';
            return;
        }
        me.appel('GET', 'fiches?q=' + encodeURIComponent(q), null, function (o) {
            if (!champ.isConnected || champ.value.trim() !== q) {
                return;
            }
            var h = [];
            (o.data || []).forEach(function (c) {
                h.push('<div class="cgr-cand" data-famille="' + me.html(c.familleId) + '"><span class="cgr-nom">' + me.designation(c.famille)
                        + (c.cip ? ' <small>CIP ' + me.html(c.cip) + '</small>' : '') + '</span>'
                        + '<button class="cgr-btn cgr-primaire" data-action="valider" data-famille="' + me.html(c.familleId) + '">Valider ce produit</button></div>');
            });
            zone.innerHTML = h.length ? h.join('') : '<div class="cgr-lib">Aucun produit actif trouvé.</div>';
        });
    }
});
