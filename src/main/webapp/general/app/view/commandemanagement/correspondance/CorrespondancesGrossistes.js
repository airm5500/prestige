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
    LIB_DISPO: {OUI: 'Disponible', NON: 'Non disponible', AUTRE: 'Autre réponse', INCONNU: 'Pas de réponse'},
    LIB_SOURCE: {PHARMAML: 'PharmaML', EXTRANET: 'Extranet'},
    LIB_REGLAGE: ['PharmaML seul', 'Extranet seul', 'PharmaML et extranet'],
    LIB_ETAT: {AUTO_EXACTE: 'Automatique', PROPOSEE: 'À valider', VALIDEE: 'Validée', REJETEE: 'Rejetée', CONTREDITE: 'Contredite'},
    LIB_MOTIF: {
        DESIGNATION: 'proposé par la désignation', CODE_AMBIGU: 'code porté par plusieurs produits',
        DESACCORD_CODE_CLE: 'code et CIP en désaccord', CLE_AMBIGUE: 'CIP porté par plusieurs produits',
        INTROUVABLE: 'aucun produit proche', RECU_EN_BL: 'appris d\'un BL', CODE_GROSSISTE_CONNU: 'code déjà connu',
        CLE_UNIQUE: 'même CIP ou EAN'
    },

    initComponent: function () {
        var me = this;
        me.etat = {vue: 'file', filtre: 'A_TRAITER', grossiste: '', lignes: [], total: 0, droit: false, mesures: null, produit: null, ecarts: null, aide: false, sources: null};
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
                + '.cgr-suite{text-align:center;padding:0 14px 14px}'
                + '.cgr-produit{padding:12px 14px;display:flex;flex-direction:column;gap:12px}'
                + '.cgr-produit .cgr-recherche{margin:0;background:#fff}'
                + '.cgr-table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}'
                + '.cgr-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;background:#f8fafc;padding:6px 10px;border-bottom:1px solid #e2e8f0}'
                + '.cgr-table td{padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;vertical-align:top}'
                + '.cgr-table td.cgr-n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}'
                + '.cgr-table small{color:#64748b}'
                + '.cgr-sous{font-size:13px;font-weight:600;color:#334155;margin:4px 0 -4px}'
                + '.cgr-ecart{white-space:nowrap}.cgr-ecart.cgr-alerte-ecart{color:#b91c1c;font-weight:600}'
                + '.cgr-pastille{display:inline-block;font-size:11px;border-radius:10px;padding:0 7px;background:#fee2e2;color:#991b1b;margin-left:4px}'
                + '.cgr-btn.cgr-signal{border-color:#fca5a5;color:#991b1b}'
                + '.cgr-aide-btn{width:24px;height:24px;border-radius:50%;padding:0;font-weight:700}'
                + '.cgr-aide{margin:10px 14px 0;padding:10px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;font-size:12px;color:#1e3a8a;line-height:1.5}'
                + '.cgr-seuil input{width:80px;font:inherit;padding:3px 6px;border:1px solid #cbd5e1;border-radius:6px;text-align:right}'
                + '.cgr-dispo{display:block;font-size:12px;line-height:1.4}.cgr-dispo b{font-weight:600}'
                + '.cgr-OUI{color:#166534}.cgr-NON{color:#b91c1c}.cgr-AUTRE,.cgr-INCONNU{color:#92400e}.cgr-echec{color:#64748b;font-style:italic}'
                + '.cgr-table select{font:inherit;padding:3px 6px;border:1px solid #cbd5e1;border-radius:6px;background:#fff}',
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
            // nombre d'ecarts de prix publics (bouton de la barre), puis la file
            me.appel('GET', 'ecarts-prix?limit=1', null, function (ec) {
                m.ecartsPrix = ec.total;
                me.appel('GET', 'liste?etat=' + encodeURIComponent(me.etat.filtre) + '&grossiste=' + encodeURIComponent(me.etat.grossiste)
                        + '&start=' + start + '&limit=' + me.PAGE, null, function (l) {
                            if (me.isDestroyed || me.etat.vue !== 'file') {
                                return;
                            }
                            me.etat.lignes = (suite ? me.etat.lignes : []).concat(l.data || []);
                            me.etat.total = l.total || 0;
                            me.rendre();
                        });
            });
        });
    },

    // ------------------------------------------------------------------ rendu

    rendre: function () {
        var me = this, e = me.etat, m = e.mesures || {};
        if (e.vue === 'produit') {
            me.rendreProduit();
            return;
        }
        if (e.vue === 'ecarts') {
            me.rendreEcarts();
            return;
        }
        if (e.vue === 'sources') {
            me.rendreSources();
            return;
        }
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
        h.push('<button class="cgr-btn" data-action="vue" data-vue="produit" title="Code, correspondance et prix de chaque grossiste pour un produit">Par produit</button>');
        h.push('<button class="cgr-btn' + (m.ecartsPrix ? ' cgr-signal' : '') + '" data-action="vue" data-vue="ecarts" title="Prix public d\'un grossiste différent du prix Prestige">Écarts de prix publics'
                + (m.ecartsPrix !== undefined ? ' <span class="cgr-pastille" data-e2e="nb-ecarts">' + m.ecartsPrix + '</span>' : '') + '</button>');
        var dc = m.dernierCalcul;
        if (dc && dc.fin) {
            h.push('<span class="cgr-lib" data-e2e="dernier-calcul">Dernier calcul ' + me.html(dc.fin) + '</span>');
        }
        if (e.droit) {
            h.push('<button class="cgr-btn" data-action="rapprocher" title="Propose des produits, par leur désignation, pour les codes non reconnus à l\'import. Rien n\'est validé d\'office.">Proposer par désignation</button>');
        } else {
            h.push('<span class="cgr-lecture">Lecture seule : droit « Correspondances grossistes » requis pour décider</span>');
        }
        h.push(me.boutonAide() + '</div>' + me.panneauAide() + '<div class="cgr-liste">');
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

    /** Bouton « ? » et panneau d'aide, communs aux vues. */
    boutonAide: function () {
        return '<button class="cgr-btn cgr-aide-btn" data-action="aide" title="Aide" aria-expanded="' + this.etat.aide + '">?</button>';
    },

    panneauAide: function () {
        if (!this.etat.aide) {
            return '';
        }
        return '<div class="cgr-aide" data-e2e="aide"><b>Correspondance grossistes.</b> Chaque code d\'un grossiste est rattaché à un produit Prestige :'
                + ' automatiquement (même code, même CIP ou EAN), appris d\'un BL, ou validé ici. Une validation l\'emporte à l\'import des fichiers.<br>'
                + '<b>Prix.</b> À chaque BL clôturé, le prix d\'achat et le prix public de chaque ligne sont gardés, une ligne seulement quand un prix change.'
                + ' Le prix public est TTC ; le BL ne dit pas si le prix d\'achat est HT ou TTC.<br>'
                + '<b>Écart de prix public.</b> Le dernier prix public TTC lu chez un grossiste est comparé au prix de vente Prestige du produit (TTC) :'
                + ' écart = prix du grossiste − prix Prestige. Au-delà du seuil réglé (en FCFA, 0 par défaut : tout écart), l\'écart est signalé en rouge'
                + ' et compté dans « Écarts de prix publics ». Le seuil se règle dans cette liste (droit « Correspondances grossistes »).<br>'
                + '<b>Disponibilité.</b> « Vérifier » interroge le grossiste (information produit, jamais une commande) par la source réglée dans'
                + ' « Sources de disponibilité » : PharmaML seul (par défaut), extranet seul, ou les deux, chaque réponse avec sa source et son heure de lecture.'
                + ' Une lecture de moins de 15 minutes est reprise telle quelle ; « Relire » interroge à nouveau. Un échec est affiché tel quel, sans valeur.</div>';
    },

    /** Prix : entier separe par milliers, ou tiret. */
    prix: function (v) {
        return v === null || v === undefined ? '—' : String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
    },

    nature: function (n) {
        return n === 'HT' || n === 'TTC' ? ' <small>' + n + '</small>' : '';
    },

    /** Vue par produit : une ligne par grossiste (code, correspondance, derniers prix lus), puis l'historique. */
    rendreProduit: function () {
        var me = this, pr = me.etat.produit;
        var h = ['<div class="cgr-barre"><span class="cgr-titre">Correspondance grossistes</span><span class="cgr-lib">Par produit</span>'
                    + '<span class="cgr-espace"></span><button class="cgr-btn" data-action="vue" data-vue="ecarts">Écarts de prix publics</button>'
                    + '<button class="cgr-btn" data-action="vue" data-vue="sources">Sources de disponibilité</button>'
                    + '<button class="cgr-btn" data-action="vue" data-vue="file">File de validation</button>' + me.boutonAide() + '</div>' + me.panneauAide()];
        h.push('<div class="cgr-produit"><div class="cgr-recherche"><input type="text" placeholder="CIP, EAN ou désignation du produit Prestige" data-action="chercher-produit">'
                + '<div class="cgr-cands" data-e2e="resultats-produit"></div></div>');
        if (!pr) {
            h.push('<div class="cgr-vide">Choisissez un produit pour voir ses codes et ses prix chez chaque grossiste.</div></div>');
            me.racine.innerHTML = h.join('');
            return;
        }
        h.push('<div class="cgr-des" data-e2e="produit">' + me.designation(pr.famille) + (pr.cip ? ' <small class="cgr-lib">CIP ' + me.html(pr.cip) + '</small>' : '')
                + (pr.charge ? ' <small class="cgr-lib" data-e2e="prix-prestige" data-valeur="' + (pr.prixPrestige === null ? '' : pr.prixPrestige) + '">prix Prestige '
                        + me.prix(pr.prixPrestige) + ' TTC, seuil d\'écart ' + me.prix(pr.seuil) + '</small>' : '') + '</div>');
        if (!pr.charge) {
            h.push('<div class="cgr-attente">Chargement…</div></div>');
            me.racine.innerHTML = h.join('');
            return;
        }
        var lignes = {}, ordre = [];
        var ligne = function (cle, grossiste) {
            if (!lignes[cle]) {
                lignes[cle] = {cle: cle, grossiste: grossiste || cle};
                ordre.push(cle);
            }
            return lignes[cle];
        };
        (pr.correspondances || []).forEach(function (c) {
            if (c.familleId === pr.familleId) {
                var l = ligne(c.cleGrossiste, c.grossiste);
                l.code = l.code || c.codeGrossiste;
                l.etat = l.etat || c.etat;
            }
        });
        (pr.derniers || []).forEach(function (d) {
            var l = ligne(d.cleGrossiste, d.grossiste);
            l.code = l.code || d.code;
            l.prix = d;
        });
        Object.keys(pr.dispos || {}).forEach(function (g) {
            ligne(g, pr.dispos[g].grossiste);
        });
        ordre.sort(function (a, b) {
            return String(lignes[a].grossiste).localeCompare(String(lignes[b].grossiste));
        });
        if (!ordre.length) {
            h.push('<div class="cgr-vide" data-e2e="aucun-grossiste">Aucun code ni prix connu chez les grossistes pour ce produit.</div>');
        } else {
            h.push('<table class="cgr-table" data-e2e="prix-produit"><thead><tr><th>Grossiste</th><th>Code</th><th>Correspondance</th>'
                    + '<th>Dernier prix d\'achat</th><th>Prix public</th><th>Écart / Prestige</th><th>Lu sur</th><th>Disponibilité</th></tr></thead><tbody>');
            ordre.forEach(function (k) {
                var l = lignes[k], d = l.prix || {};
                h.push('<tr data-e2e="ligne-grossiste" data-grossiste="' + me.html(k) + '"><td>' + me.html(l.grossiste) + '</td>'
                        + '<td><span class="cgr-code" data-e2e="code">' + me.html(l.code || '') + '</span></td>'
                        + '<td>' + (l.etat ? '<span class="cgr-badge cgr-' + l.etat + '" data-e2e="etat">' + (me.LIB_ETAT[l.etat] || l.etat) + '</span>' : '<small>aucune</small>') + '</td>'
                        + '<td class="cgr-n" data-e2e="achat" data-valeur="' + (d.prixAchat === undefined || d.prixAchat === null ? '' : d.prixAchat) + '">' + me.prix(d.prixAchat) + me.nature(d.natureAchat) + '</td>'
                        + '<td class="cgr-n" data-e2e="public" data-valeur="' + (d.prixPublic === undefined || d.prixPublic === null ? '' : d.prixPublic) + '">' + me.prix(d.prixPublic) + me.nature(d.naturePublic) + '</td>'
                        + '<td class="cgr-n">' + me.ecart(d.ecartPublic, d.alerteEcart) + '</td>'
                        + '<td data-e2e="lu">' + (d.dateAchat || d.datePublic ? me.html((d.dateAchat || d.datePublic).substring(0, 10)) + (d.refAchat ? ' <small>BL ' + me.html(d.refAchat) + '</small>' : '') : '<small>jamais reçu</small>') + '</td>'
                        + '<td data-e2e="dispo">' + me.dispo(k) + '</td></tr>');
            });
            h.push('</tbody></table>');
        }
        var hist = pr.historique || [];
        if (hist.length) {
            h.push('<div class="cgr-sous">Historique des prix <small class="cgr-lib">(une ligne à chaque changement ; prix public TTC, prix d\'achat HT ou TTC non précisé sur les BL)</small></div>');
            h.push('<table class="cgr-table" data-e2e="historique"><thead><tr><th>Date</th><th>Grossiste</th><th>Prix d\'achat</th><th>Prix public</th><th>Pièce</th></tr></thead><tbody>');
            hist.forEach(function (x) {
                h.push('<tr data-e2e="ligne-historique" data-id="' + x.id + '"><td>' + me.html((x.datePiece || x.dateLecture || '').substring(0, 10)) + '</td><td>' + me.html(x.grossiste || x.cleGrossiste) + '</td>'
                        + '<td class="cgr-n" data-valeur="' + (x.prixAchat === null ? '' : x.prixAchat) + '">' + me.prix(x.prixAchat) + me.nature(x.natureAchat) + '</td>'
                        + '<td class="cgr-n" data-valeur="' + (x.prixPublic === null ? '' : x.prixPublic) + '">' + me.prix(x.prixPublic) + me.nature(x.naturePublic) + '</td>'
                        + '<td>' + (x.source === 'BL' ? 'BL ' + me.html(x.refPiece || x.piece) : me.html(x.source)) + '</td></tr>');
            });
            h.push('</tbody></table>');
        }
        h.push('</div>');
        me.racine.innerHTML = h.join('');
    },

    /** Ecart signe ; rouge et marque « alerte » au-dela du seuil. */
    ecart: function (v, alerte) {
        if (v === null || v === undefined) {
            return '<span class="cgr-ecart" data-e2e="ecart" data-valeur="" title="Pas de prix public TTC ou pas de prix Prestige">—</span>';
        }
        return '<span class="cgr-ecart' + (alerte ? ' cgr-alerte-ecart' : '') + '" data-e2e="ecart" data-valeur="' + v + '" data-alerte="' + (alerte ? 1 : 0) + '"'
                + (alerte ? ' title="Écart au-delà du seuil"' : '') + '>' + (v > 0 ? '+' : v < 0 ? '−' : '') + this.prix(Math.abs(v)) + (alerte ? ' ⚠' : '') + '</span>';
    },

    rendreEcarts: function () {
        var me = this, e = me.etat, ec = e.ecarts;
        var h = ['<div class="cgr-barre"><span class="cgr-titre">Correspondance grossistes</span><span class="cgr-lib">Écarts de prix publics</span>'];
        if (ec) {
            h.push('<span class="cgr-lib" data-e2e="compte-ecarts">' + ec.total + ' écart' + (ec.total > 1 ? 's' : '') + ' au-delà du seuil</span>');
            if (e.droit) {
                h.push('<label class="cgr-lib cgr-seuil">Seuil (FCFA) <input type="number" min="0" step="1" data-e2e="seuil" value="' + ec.seuilEcart + '"></label>'
                        + '<button class="cgr-btn" data-action="seuil">Enregistrer le seuil</button>');
            } else {
                h.push('<span class="cgr-lib" data-e2e="seuil-lu">Seuil ' + me.prix(ec.seuilEcart) + ' FCFA</span>');
            }
        }
        h.push('<span class="cgr-espace"></span><button class="cgr-btn" data-action="vue" data-vue="produit">Par produit</button>'
                + '<button class="cgr-btn" data-action="vue" data-vue="file">File de validation</button>' + me.boutonAide() + '</div>' + me.panneauAide());
        h.push('<div class="cgr-produit">');
        if (!ec) {
            h.push('<div class="cgr-attente">Chargement…</div>');
        } else if (!ec.data.length) {
            h.push('<div class="cgr-vide">Aucun prix public de grossiste ne s\'écarte du prix Prestige au-delà du seuil.</div>');
        } else {
            h.push('<table class="cgr-table" data-e2e="ecarts"><thead><tr><th>Produit</th><th>Grossiste</th><th>Prix public grossiste</th><th>Prix Prestige</th>'
                    + '<th>Écart</th><th>Lu sur</th><th></th></tr></thead><tbody>');
            ec.data.forEach(function (x) {
                h.push('<tr data-e2e="ligne-ecart" data-id="' + x.id + '" data-famille="' + me.html(x.familleId) + '" data-grossiste="' + me.html(x.cleGrossiste) + '">'
                        + '<td>' + me.designation(x.famille) + (x.cip ? ' <small>CIP ' + me.html(x.cip) + '</small>' : '') + '</td><td>' + me.html(x.grossiste || x.cleGrossiste) + '</td>'
                        + '<td class="cgr-n" data-valeur="' + x.prixPublic + '">' + me.prix(x.prixPublic) + '</td><td class="cgr-n" data-valeur="' + x.prixPrestige + '">' + me.prix(x.prixPrestige) + '</td>'
                        + '<td class="cgr-n">' + me.ecart(x.ecart, true) + '</td><td>' + me.html((x.date || '').substring(0, 10)) + (x.refPiece ? ' <small>BL ' + me.html(x.refPiece) + '</small>' : '') + '</td>'
                        + '<td><button class="cgr-btn" data-action="voir-produit" data-famille="' + me.html(x.familleId) + '" data-libelle="' + me.html(x.famille) + '" data-cip="' + me.html(x.cip || '') + '">Voir</button></td></tr>');
            });
            h.push('</tbody></table>');
            if (ec.data.length < ec.total) {
                h.push('<div class="cgr-suite"><button class="cgr-btn" data-action="suite-ecarts">Afficher ' + Math.min(me.PAGE, ec.total - ec.data.length) + ' de plus</button></div>');
            }
        }
        h.push('</div>');
        me.racine.innerHTML = h.join('');
    },

    chargerEcarts: function (suite) {
        var me = this, debut = suite && me.etat.ecarts ? me.etat.ecarts.data.length : 0;
        me.appel('GET', 'ecarts-prix?start=' + debut + '&limit=' + me.PAGE, null, function (o) {
            if (me.isDestroyed) {
                return;
            }
            o.data = (suite && me.etat.ecarts ? me.etat.ecarts.data : []).concat(o.data || []);
            me.etat.ecarts = o;
            if (me.etat.vue === 'ecarts') {
                me.rendre();
            }
        });
    },

    /** Une reponse de disponibilite : statut, detail, source et heure de lecture ; un echec sans valeur. */
    reponseDispo: function (x) {
        var me = this, src = me.LIB_SOURCE[x.source] || x.source;
        if (!x.succes) {
            return '<span class="cgr-dispo cgr-echec" data-e2e="reponse" data-source="' + x.source + '" data-statut="">' + src + ' : ' + me.html(x.msg || 'échec') + '</span>';
        }
        var detail = [];
        if (x.libelle) {
            detail.push(me.html(x.libelle));
        }
        if (x.dateDispo) {
            detail.push('retour le ' + me.html(x.dateDispo));
        }
        if (x.remplacant) {
            detail.push('remplaçant ' + me.html(x.remplacant));
        }
        return '<span class="cgr-dispo" data-e2e="reponse" data-source="' + x.source + '" data-statut="' + me.html(x.statut) + '" data-lu="' + me.html(x.luLe) + '">' + src + ' : <b class="cgr-' + me.html(x.statut) + '">'
                + (me.LIB_DISPO[x.statut] || me.html(x.statut)) + '</b>' + (detail.length ? ' <small>(' + detail.join(', ') + ')</small>' : '')
                + ' <small data-e2e="lu-le">lu le ' + me.html((x.luLe || '').substring(0, 16)) + (x.cache ? ', il y a moins de 15 min' : '') + '</small></span>';
    },

    dispo: function (cle) {
        var me = this, pr = me.etat.produit, v = (pr.verifs || {})[cle], h = [];
        if (v && v.attente) {
            h.push('<span class="cgr-dispo cgr-echec">Interrogation en cours…</span>');
        } else if (v && v.resultats) {
            v.resultats.forEach(function (x) {
                h.push(me.reponseDispo(x));
            });
        } else if (v && v.msg) {
            h.push('<span class="cgr-dispo cgr-echec" data-e2e="reponse" data-statut="">' + me.html(v.msg) + '</span>');
        } else if ((pr.dispos || {})[cle]) {
            h.push('<span data-e2e="derniere">' + me.reponseDispo(pr.dispos[cle]).replace(', il y a moins de 15 min', '') + '</span>');
        }
        h.push('<button class="cgr-btn" data-action="verifier-dispo" data-grossiste="' + me.html(cle) + '"' + (v && v.attente ? ' disabled' : '') + '>Vérifier</button>');
        if (v && v.resultats && v.resultats.some(function (x) {
            return x.cache;
        })) {
            h.push(' <button class="cgr-btn" data-action="relire-dispo" data-grossiste="' + me.html(cle) + '">Relire</button>');
        }
        return h.join('');
    },

    verifierDispo: function (cle, forcer) {
        var me = this, pr = me.etat.produit;
        pr.verifs = pr.verifs || {};
        pr.verifs[cle] = {attente: true};
        me.rendre();
        me.appel('POST', 'produit/' + encodeURIComponent(pr.familleId) + '/disponibilite/' + encodeURIComponent(cle) + (forcer ? '?forcer=true' : ''), null, function (o) {
            if (me.isDestroyed || me.etat.produit !== pr) {
                return;
            }
            pr.verifs[cle] = o.success ? o : {msg: o.msg || 'Vérification impossible.'};
            if (me.etat.vue === 'produit') {
                me.rendre();
            }
        });
    },

    rendreSources: function () {
        var me = this, e = me.etat, so = e.sources;
        var h = ['<div class="cgr-barre"><span class="cgr-titre">Correspondance grossistes</span><span class="cgr-lib">Sources de disponibilité</span>'
                    + '<span class="cgr-espace"></span><button class="cgr-btn" data-action="vue" data-vue="produit">Par produit</button>'
                    + '<button class="cgr-btn" data-action="vue" data-vue="file">File de validation</button>' + me.boutonAide() + '</div>' + me.panneauAide()];
        h.push('<div class="cgr-produit">');
        if (!so) {
            h.push('<div class="cgr-attente">Chargement…</div>');
        } else if (so.erreur) {
            h.push('<div class="cgr-attente cgr-alerte" data-e2e="erreur-sources">' + me.html(so.erreur) + '</div>');
        } else {
            h.push('<table class="cgr-table" data-e2e="sources"><thead><tr><th>Grossiste</th><th>PharmaML</th><th>Source de disponibilité</th><th></th></tr></thead><tbody>');
            so.forEach(function (g) {
                h.push('<tr data-e2e="ligne-source" data-grossiste="' + me.html(g.grossisteId) + '"><td>' + me.html(g.grossiste) + '</td>'
                        + '<td><small>' + (g.pharmaml ? (g.pharmamlActive ? 'lien réglé' : 'désactivé sur la fiche') : 'pas de lien') + '</small></td><td>'
                        + (e.droit ? '<select data-e2e="reglage">' + me.LIB_REGLAGE.map(function (l, i) {
                            return '<option value="' + i + '"' + (i === g.reglage ? ' selected' : '') + '>' + l + '</option>';
                        }).join('') + '</select>' : '<span data-e2e="reglage-lu">' + me.LIB_REGLAGE[g.reglage] + '</span>') + '</td><td>'
                        + (e.droit ? '<button class="cgr-btn" data-action="source-dispo" data-grossiste="' + me.html(g.grossisteId) + '">Enregistrer</button>' : '') + '</td></tr>');
            });
            h.push('</tbody></table>');
        }
        h.push('</div>');
        me.racine.innerHTML = h.join('');
    },

    chargerSources: function () {
        var me = this;
        me.appel('GET', 'sources-disponibilite', null, function (o, statut) {
            if (me.isDestroyed) {
                return;
            }
            me.etat.sources = statut === 200 && o.success ? (o.data || []) : {erreur: o.msg || ('Lecture des sources impossible (' + statut + ').')};
            if (me.etat.vue === 'sources') {
                me.rendre();
            }
        });
    },

    voirProduit: function (familleId, famille, cip) {
        var me = this, pr = {familleId: familleId, famille: famille, cip: cip, charge: false};
        me.etat.produit = pr;
        me.rendre();
        me.appel('GET', 'produit/' + encodeURIComponent(familleId), null, function (c) {
            me.appel('GET', 'produit/' + encodeURIComponent(familleId) + '/prix', null, function (p) {
              me.appel('GET', 'produit/' + encodeURIComponent(familleId) + '/disponibilite', null, function (dp) {
                if (me.isDestroyed || me.etat.produit !== pr) {
                    return;
                }
                pr.dispos = dp.dernieres || {};
                pr.correspondances = c.data || [];
                pr.derniers = p.derniers || [];
                pr.historique = p.historique || [];
                pr.prixPrestige = p.prixPrestige === undefined ? null : p.prixPrestige;
                pr.seuil = p.seuilEcart;
                pr.charge = true;
                me.rendre();
              });
            });
        });
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
            var quoi = ev.target.getAttribute('data-action');
            if (quoi === 'chercher' || quoi === 'chercher-produit') {
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
        } else if (action === 'verifier-dispo' || action === 'relire-dispo') {
            me.verifierDispo(b.getAttribute('data-grossiste'), action === 'relire-dispo');
        } else if (action === 'source-dispo') {
            var tr = b.closest('tr'), reglage = Number(tr.querySelector('[data-e2e=reglage]').value), gid = b.getAttribute('data-grossiste');
            me.confirmer(b, 'Confirmer : ' + me.LIB_REGLAGE[reglage] + ' ?', function () {
                b.disabled = true;
                me.appel('POST', 'sources-disponibilite/' + encodeURIComponent(gid), {reglage: reglage}, function (o) {
                    PrestigeToast.afficher(o.msg || 'Non enregistré.', {niveau: o.success ? 'ok' : 'erreur'});
                    me.chargerSources();
                });
            });
        } else if (action === 'aide') {
            me.etat.aide = !me.etat.aide;
            me.rendre();
        } else if (action === 'suite-ecarts') {
            me.chargerEcarts(true);
        } else if (action === 'seuil') {
            var champ = me.racine.querySelector('[data-e2e=seuil]'), v = Number(champ.value);
            if (champ.value === '' || !(v >= 0) || Math.floor(v) !== v) {
                PrestigeToast.afficher('Seuil : un nombre entier de FCFA, 0 ou plus.', {niveau: 'erreur'});
                return;
            }
            me.confirmer(b, 'Confirmer le seuil de ' + me.prix(v) + ' FCFA ?', function () {
                b.disabled = true;
                me.appel('POST', 'seuil-ecart-prix', {seuil: v}, function (o) {
                    PrestigeToast.afficher(o.msg || 'Non enregistré.', {niveau: o.success ? 'ok' : 'erreur'});
                    me.etat.ecarts = null;
                    me.rendre();
                    me.chargerEcarts(false);
                });
            });
        } else if (action === 'vue') {
            me.etat.vue = b.getAttribute('data-vue');
            if (me.etat.vue === 'file') {
                me.charger(false);
            } else if (me.etat.vue === 'sources') {
                me.etat.sources = null;
                me.rendre();
                me.chargerSources();
            } else if (me.etat.vue === 'ecarts') {
                me.etat.ecarts = null;
                me.rendre();
                me.chargerEcarts(false);
            } else {
                me.rendre();
                me.racine.querySelector('[data-action=chercher-produit]').focus();
            }
        } else if (action === 'voir-produit') {
            me.etat.vue = 'produit';
            me.voirProduit(b.getAttribute('data-famille'), b.getAttribute('data-libelle'), b.getAttribute('data-cip'));
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
                            m.ecartsPrix = (me.etat.mesures || {}).ecartsPrix;
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
        var me = this, produit = champ.getAttribute('data-action') === 'chercher-produit';
        var zone = champ.parentNode.querySelector(produit ? '[data-e2e=resultats-produit]' : '[data-e2e=resultats]');
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
                        + (produit ? '<button class="cgr-btn" data-action="voir-produit" data-famille="' + me.html(c.familleId) + '" data-libelle="' + me.html(c.famille)
                                + '" data-cip="' + me.html(c.cip || '') + '">Voir</button>'
                                : '<button class="cgr-btn cgr-primaire" data-action="valider" data-famille="' + me.html(c.familleId) + '">Valider ce produit</button>') + '</div>');
            });
            zone.innerHTML = h.length ? h.join('') : '<div class="cgr-lib">Aucun produit actif trouvé.</div>';
        });
    }
});
