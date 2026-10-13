/* global Ext */

/*
 * SET VALORISATION (besoins du 11/10, lot 4) : valorisation SIMULEE, API v1/set-valorisation, droit P_SET_VALORISATION
 * (donne a aucun role par defaut). Point de depart : le stock de l'officine ou un fichier importe (CSV, XLS, XLSX ;
 * rien n'est conserve). Les quantites sont ajustees proportionnellement pour atteindre la valeur cible, au prix
 * d'achat ou au prix de vente. Rien n'est ecrit dans le stock ; l'ecran et les editions portent la mention SIMULATION.
 * Aucune fenetre : messages dans la barre d'etat de l'ecran.
 */
Ext.define('testextjs.view.stockmanagement.valorisation.SetValorisation', {
    extend: 'Ext.panel.Panel',
    xtype: 'setvalorisation',
    title: 'Set valorisation — simulation',
    frame: true,
    width: '98%',
    height: 680,
    cls: 'setvalorisation',
    layout: {type: 'vbox', align: 'stretch'},
    URL: '../api/v1/set-valorisation/',

    initComponent: function () {
        var me = this;
        me.styles();
        me.source = 'STOCK';
        me.lignesImport = null;
        me.store = Ext.create('Ext.data.Store', {
            fields: ['cip', 'designation', {name: 'qte', type: 'int'}, {name: 'qteAjustee', type: 'int'},
                {name: 'prix', type: 'float'}, {name: 'valeurDepart', type: 'float'}, {name: 'valeurAjustee', type: 'float'}],
            data: []
        });
        me.items = [
            {xtype: 'component', itemId: 'bandeau', html: '<div class="setvalo-bandeau"><i class="fa-solid fa-triangle-exclamation"></i> '
                        + '<b>SIMULATION — ne reflète pas le stock réel.</b> Rien n\'est écrit dans le stock ; un fichier importé n\'est pas conservé. '
                        + 'Chaque utilisation est journalisée.</div>'},
            {xtype: 'container', layout: {type: 'hbox', align: 'middle'}, padding: '8 10 0 10', defaults: {margin: '0 10 0 0'}, items: [
                    {xtype: 'button', itemId: 'srcStock', text: 'Stock de l\'officine', enableToggle: true, toggleGroup: 'setvalo-source',
                        allowDepress: false, pressed: true, iconCls: 'fa fa-cubes', toggleHandler: function (b, presse) {
                            if (presse) {
                                me.choisirSource('STOCK');
                            }
                        }},
                    {xtype: 'button', itemId: 'srcImport', text: 'Fichier importé', enableToggle: true, toggleGroup: 'setvalo-source',
                        allowDepress: false, iconCls: 'fa fa-file-excel-o', toggleHandler: function (b, presse) {
                            if (presse) {
                                me.choisirSource('IMPORT');
                            }
                        }},
                    {xtype: 'filefield', itemId: 'fichier', name: 'fichier', buttonOnly: true, hideLabel: true, hidden: true,
                        buttonText: 'Importer un fichier (CSV, XLS, XLSX)',
                        listeners: {change: function (f, v) {
                                if (v) {
                                    me.importer();
                                }
                            }}},
                    {xtype: 'component', itemId: 'infoSource', flex: 1, html: ''}
                ]},
            {xtype: 'container', layout: {type: 'hbox', align: 'middle'}, padding: '8 10 0 10', defaults: {margin: '0 10 0 0'}, items: [
                    {xtype: 'combobox', itemId: 'base', fieldLabel: 'Valoriser au', labelWidth: 80, width: 250, editable: false,
                        queryMode: 'local', displayField: 't', valueField: 'v', value: 'PA',
                        store: Ext.create('Ext.data.Store', {fields: ['v', 't'], data: [{v: 'PA', t: 'Prix d\'achat'}, {v: 'PV', t: 'Prix de vente'}]}),
                        listeners: {change: function () {
                                me.afficherDepart();
                            }}},
                    {xtype: 'numberfield', itemId: 'cible', fieldLabel: 'Valeur cible', labelWidth: 80, width: 260, minValue: 1,
                        hideTrigger: true, allowDecimals: false, enableKeyEvents: true,
                        listeners: {specialkey: function (f, e) {
                                if (e.getKey() === e.ENTER) {
                                    me.calculer();
                                }
                            }}},
                    {xtype: 'button', itemId: 'calculer', text: 'Calculer la simulation', iconCls: 'fa fa-calculator', cls: 'btn-primary', handler: function () {
                            me.calculer();
                        }},
                    {xtype: 'button', itemId: 'pdf', text: 'PDF', disabled: true, handler: function () {
                            me.editer('pdf');
                        }},
                    {xtype: 'button', itemId: 'excel', text: 'Excel', disabled: true, handler: function () {
                            me.editer('excel');
                        }},
                    {xtype: 'component', itemId: 'etat', flex: 1, html: ''}
                ]},
            {xtype: 'component', itemId: 'tuiles', padding: '6 4 0 4', html: ''},
            {xtype: 'container', layout: {type: 'hbox', align: 'middle'}, padding: '0 10 4 10', items: [
                    {xtype: 'textfield', itemId: 'recherche', emptyText: 'Rechercher (CIP ou désignation)', width: 320, enableKeyEvents: true,
                        listeners: {change: function (f, v) {
                                me.filtrer(v);
                            }}}]},
            {xtype: 'gridpanel', itemId: 'grille', flex: 1, store: me.store, columnLines: true,
                plugins: [{ptype: 'bufferedrenderer'}],
                viewConfig: {emptyText: '<div class="setvalo-vide">Indiquez une valeur cible puis « Calculer la simulation ».</div>', deferEmptyText: false},
                columns: [
                    {text: 'CIP', dataIndex: 'cip', width: 110},
                    {text: 'Désignation', dataIndex: 'designation', flex: 1, minWidth: 220},
                    {text: 'Qté de départ', dataIndex: 'qte', width: 110, align: 'right', renderer: me.nombre},
                    {text: 'Qté simulée', dataIndex: 'qteAjustee', width: 130, align: 'right', renderer: function (v, m, r) {
                            var d = v - r.get('qte');
                            return '<b>' + me.nombre(v) + '</b>' + (d === 0 ? '' : ' <span class="' + (d > 0 ? 'setvalo-plus' : 'setvalo-moins') + '">'
                                    + (d > 0 ? '+' : '−') + me.nombre(Math.abs(d)) + '</span>');
                        }},
                    {text: 'Prix unitaire', dataIndex: 'prix', width: 110, align: 'right', renderer: me.nombre},
                    {text: 'Valeur de départ', dataIndex: 'valeurDepart', width: 130, align: 'right', renderer: me.nombre},
                    {text: 'Valeur simulée', dataIndex: 'valeurAjustee', width: 150, align: 'right', renderer: function (v) {
                            return '<b>' + me.nombre(v) + '</b>';
                        }}
                ]}
        ];
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.chargerDepart();
        });
    },

    styles: function () {
        if (document.getElementById('setvalo-styles')) {
            return;
        }
        Ext.util.CSS.createStyleSheet(
                '.setvalo-bandeau{margin:8px 10px 0;padding:8px 12px;border-radius:6px;background:#fdecea;color:#8a1c1c;border:1px solid #f5b7b1}'
                + '.setvalo-tuiles{display:flex;flex-wrap:wrap;gap:10px;padding:4px 6px}'
                + '.setvalo-tuile{flex:1 1 150px;min-width:150px;border:1px solid #d5dbe1;border-left:5px solid #1f6fb2;border-radius:8px;background:#fff;padding:8px 10px}'
                + '.setvalo-tuile .t{font-size:11px;color:#5d6d7e;text-transform:uppercase;letter-spacing:.3px}'
                + '.setvalo-tuile .n{font-size:20px;font-weight:bold;color:#1b2631;margin-top:2px}'
                + '.setvalo-tuile.cible{border-left-color:#8e44ad}.setvalo-tuile.obtenu{border-left-color:#c0392b}'
                + '.setvalo-tuile.obtenu .n:after{content:" SIMULATION";font-size:10px;color:#c0392b;vertical-align:middle;margin-left:6px}'
                + '.setvalo-plus{color:#1e8449;font-size:11px}.setvalo-moins{color:#c0392b;font-size:11px}'
                + '.setvalo-info{color:#34495e}.setvalo-erreur{color:#c0392b;font-weight:bold}.setvalo-ok{color:#1e8449}'
                + '.setvalo-vide{padding:20px;color:#7f8c8d}', 'setvalo-styles');
    },

    esc: function (v) {
        return Ext.String.htmlEncode(v === null || v === undefined ? '' : String(v));
    },

    nombre: function (v) {
        var n = Math.round(Number(v || 0));
        return (n < 0 ? '−' : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    },

    etat: function (texte, classe) {
        this.down('#etat').update(texte ? '<span class="' + (classe || 'setvalo-info') + '">' + this.esc(texte) + '</span>' : '');
    },

    appel: function (methode, chemin, corps, rappel) {
        var me = this;
        Ext.Ajax.request({
            url: me.URL + chemin, method: methode, jsonData: corps || undefined,
            success: function (r) {
                rappel(Ext.decode(r.responseText, true) || {success: false, message: 'Réponse illisible.'});
            },
            failure: function (r) {
                rappel({success: false, message: r.status === 401 ? 'Session expirée.' : 'Le serveur ne répond pas.'});
            }
        });
    },

    chargerDepart: function () {
        var me = this;
        me.appel('GET', 'depart', null, function (o) {
            if (!o.success) {
                me.etat(o.message, 'setvalo-erreur');
                me.down('#calculer').disable();
                return;
            }
            me.departStock = o;
            me.afficherDepart();
        });
    },

    /* valeur de depart de la source choisie, a la base choisie */
    depart: function () {
        var d = this.source === 'IMPORT' ? this.departImport : this.departStock;
        if (!d) {
            return null;
        }
        return {valeur: this.down('#base').getValue() === 'PV' ? d.valeurPV : d.valeurPA, lignes: d.nbLignes};
    },

    afficherDepart: function () {
        var me = this, d = me.depart(), info = me.down('#infoSource');
        if (me.source === 'IMPORT' && !me.departImport) {
            info.update('<span class="setvalo-info">Importez un fichier : colonnes CIP ou Désignation, Quantité, Prix achat et/ou Prix vente (titres en première ligne).</span>');
        } else if (d) {
            info.update('<span class="setvalo-info">' + (me.source === 'IMPORT' ? me.esc(me.departImport.fichier) + ' : ' : 'Stock de l\'officine : ')
                    + me.nombre(d.lignes) + ' produit(s), valeur de départ <b>' + me.nombre(d.valeur) + '</b> au '
                    + (me.down('#base').getValue() === 'PV' ? 'prix de vente' : 'prix d\'achat')
                    + (me.source === 'IMPORT' && me.departImport.ignorees ? ' · ' + me.departImport.ignorees + ' ligne(s) ignorée(s)' : '') + '</span>');
        }
        me.vider();
    },

    vider: function () {
        var me = this;
        me.resultat = null;
        me.store.removeAll();
        me.down('#tuiles').update('');
        me.down('#pdf').disable();
        me.down('#excel').disable();
    },

    choisirSource: function (s) {
        var me = this;
        me.source = s;
        me.down('#fichier').setVisible(s === 'IMPORT');
        me.etat('');
        me.afficherDepart();
    },

    importer: function () {
        var me = this, champ = me.down('#fichier'), dom = champ.fileInputEl && champ.fileInputEl.dom;
        if (!dom || !dom.files || !dom.files.length) {
            return;
        }
        var donnees = new FormData(), f = dom.files[0];
        donnees.append('fichier', f, f.name);
        var x = new XMLHttpRequest();
        x.open('POST', me.URL + 'import');
        x.onload = function () {
            me.setLoading(false);
            var o = Ext.JSON.decode(x.responseText, true) || {success: false, message: 'Réponse illisible.'};
            if (o.success) {
                me.lignesImport = o.lignes;
                me.departImport = {valeurPA: o.valeurPA, valeurPV: o.valeurPV, nbLignes: o.nbLignes, fichier: o.fichier, ignorees: o.ignorees};
                me.etat('Colonnes reconnues — ' + o.colonnes, 'setvalo-ok');
            } else {
                me.etat(o.message, 'setvalo-erreur');
            }
            me.afficherDepart();
        };
        x.onerror = function () {
            me.setLoading(false);
            me.etat('Le serveur ne répond pas.', 'setvalo-erreur');
        };
        me.setLoading('Lecture du fichier...');
        x.send(donnees);
        champ.reset();
    },

    demande: function () {
        var me = this, d = {source: me.source, base: me.down('#base').getValue(), cible: me.down('#cible').getValue()};
        if (me.source === 'IMPORT') {
            d.lignes = me.lignesImport || [];
        }
        return d;
    },

    calculer: function () {
        var me = this, cible = me.down('#cible').getValue();
        if (me.source === 'IMPORT' && !me.lignesImport) {
            me.etat('Importez d\'abord un fichier.', 'setvalo-erreur');
            return;
        }
        if (!cible || cible <= 0) {
            me.etat('Indiquez une valeur cible positive.', 'setvalo-erreur');
            me.down('#cible').focus();
            return;
        }
        me.setLoading('Calcul...');
        me.appel('POST', 'calculer', me.demande(), function (o) {
            me.setLoading(false);
            if (!o.success) {
                me.vider();
                me.etat(o.message, 'setvalo-erreur');
                return;
            }
            me.resultat = o;
            me.store.loadData(o.lignes || []);
            me.filtrer(me.down('#recherche').getValue());
            me.afficherTuiles(o);
            me.down('#pdf').enable();
            me.down('#excel').enable();
            me.etat('Simulation calculée : rien n\'a été écrit dans le stock.', 'setvalo-ok');
        });
    },

    afficherTuiles: function (o) {
        var me = this, t = function (cls, titre, valeur) {
            return '<div class="setvalo-tuile ' + cls + '"><div class="t">' + titre + '</div><div class="n">' + valeur + '</div></div>';
        };
        me.down('#tuiles').update('<div class="setvalo-tuiles">'
                + t('', 'Valeur de départ', me.nombre(o.valeurDepart))
                + t('cible', 'Valeur cible', me.nombre(o.cible))
                + t('obtenu', 'Valeur simulée', me.nombre(o.valeurObtenue))
                + t('', 'Écart à la cible', me.nombre(o.ecart))
                + t('', 'Coefficient', Ext.util.Format.number(o.coefficient, '0.0000').replace('.', ','))
                + t('', 'Quantités', me.nombre(o.qteDepart) + ' → ' + me.nombre(o.qteAjustee))
                + '</div>');
    },

    filtrer: function (v) {
        var s = this.store, q = (v || '').trim().toLowerCase();
        s.clearFilter(!!q);
        if (q) {
            s.filterBy(function (r) {
                return String(r.get('cip')).toLowerCase().indexOf(q) >= 0 || String(r.get('designation')).toLowerCase().indexOf(q) >= 0;
            });
        }
    },

    /* edition PDF (nouvel onglet) ou Excel (telechargement), demande en JSON */
    editer: function (type) {
        var me = this;
        if (!me.resultat) {
            return;
        }
        me.setLoading('Édition...');
        fetch(me.URL + type, {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(me.demande())}).then(function (r) {
            return r.blob().then(function (b) {
                return {type: r.headers.get('Content-Type') || '', blob: b};
            });
        }).then(function (x) {
            me.setLoading(false);
            if (x.type.indexOf('text/html') === 0) {
                x.blob.text().then(function (h) {
                    var m = /<p>([\s\S]*?)<\/p>/.exec(h);
                    me.etat(m ? Ext.String.htmlDecode(m[1]) : 'Édition impossible.', 'setvalo-erreur');
                });
                return;
            }
            var url = URL.createObjectURL(x.blob);
            if (type === 'pdf') {
                window.open(url, '_blank');
            } else {
                var a = document.createElement('a');
                a.href = url;
                a.download = 'set_valorisation_simulation.xlsx';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
            setTimeout(function () {
                URL.revokeObjectURL(url);
            }, 60000);
        })['catch'](function () {
            me.setLoading(false);
            me.etat('Le serveur ne répond pas.', 'setvalo-erreur');
        });
    }
});
