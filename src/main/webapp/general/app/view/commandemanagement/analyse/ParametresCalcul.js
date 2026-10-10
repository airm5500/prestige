/* global Ext */

/*
 * Retours du 10/10 : parametres de calcul des previsions (ecran PREVISIONS) ou du risque de rupture (ecran RISQUE),
 * modifiables directement dans l'ecran (pas de fenetre) par qui a le droit P_PREVISION_PARAMETRER ; en lecture seule
 * sinon. Chaque champ porte son explication, ses bornes et sa valeur par defaut. Le serveur controle tout avant
 * d'ecrire.
 */
Ext.define('testextjs.view.commandemanagement.analyse.ParametresCalcul', {
    extend: 'Ext.panel.Panel',
    xtype: 'parametrescalcul',
    cls: 'param-calcul',
    title: 'Paramètres de calcul',
    collapsible: true,
    bodyPadding: '8 12',
    ecran: 'PREVISIONS',
    /** appele apres un enregistrement reussi (ex. recharger la liste) */
    apresEnregistrement: null,
    layout: {type: 'table', columns: 2, tableAttrs: {style: {width: '100%'}}},

    initComponent: function () {
        var me = this;
        me.items = [{xtype: 'component', itemId: 'chargement', html: '<span style="color:#7f8c8d">Chargement…</span>', colspan: 2}];
        me.dockedItems = [{xtype: 'toolbar', dock: 'bottom', itemId: 'barreParam', hidden: true, items: [
                    {xtype: 'component', itemId: 'etatParam', html: ''}, '->',
                    {text: 'Valeurs par défaut', itemId: 'btnDefauts', tooltip: 'Remet les valeurs d\'origine dans les champs (rien n\'est enregistré tant que vous ne cliquez pas sur Enregistrer)',
                        handler: function () {
                            me.remettreDefauts();
                        }},
                    {text: 'Enregistrer', itemId: 'btnEnregistrer', iconCls: 'save', tooltip: 'Enregistrer les paramètres modifiés',
                        handler: function () {
                            me.enregistrer();
                        }}]}];
        me.callParent(arguments);
        me.on('afterrender', me.charger, me);
    },

    charger: function () {
        var me = this;
        Ext.Ajax.request({url: '../api/v1/analyse-commande/parametres', method: 'GET', params: {ecran: me.ecran},
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (me.isDestroyed) {
                    return;
                }
                if (!o.success) {
                    me.removeAll();
                    me.add({xtype: 'component', colspan: 2, html: '<span style="color:#b42318">' + Ext.String.htmlEncode(o.msg || 'Paramètres indisponibles') + '</span>'});
                    return;
                }
                me.afficher(o.data || [], !!o.modifiable);
            }});
    },

    afficher: function (liste, modifiable) {
        var me = this, enc = Ext.String.htmlEncode;
        me.modifiable = modifiable;
        me.definitions = liste;
        Ext.suspendLayouts();
        me.removeAll();
        Ext.Array.each(liste, function (p) {
            me.add({
                xtype: 'numberfield', itemId: 'p-' + p.cle, name: p.cle, cle: p.cle, defaut: p.defaut, initial: p.valeur,
                fieldLabel: enc(p.libelle) + ' <span class="param-unite">(' + enc(p.unite) + ')</span>', labelWidth: 250,
                labelSeparator: '', width: 360, margin: '3 18 3 0', value: p.valeur, minValue: p.min, maxValue: p.max,
                allowDecimals: false, allowBlank: false, readOnly: !modifiable, hideTrigger: !modifiable,
                minText: 'Valeur minimale : ' + p.min, maxText: 'Valeur maximale : ' + p.max,
                afterLabelTextTpl: '',
                listeners: {
                    render: function (c) {
                        Ext.tip.QuickTipManager.register({target: c.labelEl, text: enc(p.aide) + '<br><i>Par défaut : ' + p.defaut + ' ' + enc(p.unite)
                                    + ' · entre ' + p.min + ' et ' + p.max + '</i>'});
                    },
                    change: function () {
                        me.majEtat();
                    }
                }
            });
        });
        Ext.resumeLayouts(true);
        var barre = me.down('#barreParam');
        barre.setVisible(true);
        me.down('#btnEnregistrer').setVisible(modifiable);
        me.down('#btnDefauts').setVisible(modifiable);
        me.majEtat();
    },

    champs: function () {
        return this.query('numberfield');
    },

    modifies: function () {
        return Ext.Array.filter(this.champs(), function (c) {
            return c.getValue() !== c.initial;
        });
    },

    majEtat: function () {
        var me = this, n = me.modifies().length, etat = me.down('#etatParam');
        if (!etat) {
            return;
        }
        etat.update(!me.modifiable ? '<span style="color:#7f8c8d">Lecture seule : la modification demande le droit « Paramètres des prévisions ».</span>'
                : (n ? '<b style="color:#b45309">' + n + ' modification(s) non enregistrée(s)</b>' : '<span style="color:#7f8c8d">Survolez un libellé pour son explication.</span>'));
    },

    remettreDefauts: function () {
        Ext.Array.each(this.champs(), function (c) {
            c.setValue(c.defaut);
        });
    },

    enregistrer: function () {
        var me = this, valeurs = {}, invalides = Ext.Array.filter(me.champs(), function (c) {
            return !c.isValid();
        });
        if (invalides.length) {
            Ext.MessageBox.alert('Paramètres de calcul', 'Corrigez les valeurs en rouge (survolez-les pour le détail).');
            return;
        }
        Ext.Array.each(me.modifies(), function (c) {
            valeurs[c.cle] = c.getValue();
        });
        if (!Ext.Object.getSize(valeurs)) {
            Ext.MessageBox.alert('Paramètres de calcul', 'Aucune modification à enregistrer.');
            return;
        }
        Ext.Ajax.request({url: '../api/v1/analyse-commande/parametres', method: 'POST', jsonData: valeurs,
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    Ext.MessageBox.alert('Paramètres de calcul', o.msg || 'Enregistrement refusé.');
                    return;
                }
                Ext.Array.each(me.champs(), function (c) {
                    c.initial = c.getValue();
                });
                me.majEtat();
                me.down('#etatParam').update('<b style="color:#17795f">Enregistré.</b> <span style="color:#3b4a5a">'
                        + (me.ecran === 'RISQUE' ? 'La liste est recalculée avec les nouvelles valeurs.'
                                : 'Les quantités recommandées en tiennent compte au prochain calcul (cette nuit) ou par « Recalculer maintenant ».') + '</span>');
                if (Ext.isFunction(me.apresEnregistrement)) {
                    me.apresEnregistrement();
                }
            }});
    }
});
