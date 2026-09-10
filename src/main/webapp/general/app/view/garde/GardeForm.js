/* global Ext */

/*
 * Saisie d'une garde : un libelle, et deux bornes portant l'HEURE.
 *
 * La date et l'heure sont deux champs separes plutot qu'un champ date-heure : ExtJS 4 n'en propose
 * pas, et deux champs specialises (calendrier d'un cote, liste d'heures de l'autre) se saisissent
 * plus vite qu'une chaine libre a formater soi-meme.
 */
Ext.define('testextjs.view.garde.GardeForm', {
    extend: 'Ext.window.Window',
    xtype: 'gardeform',
    modal: true,
    autoShow: true,
    width: 470,
    layout: {type: 'fit'},

    config: {
        /** La garde a modifier ; null pour une creation. */
        garde: null
    },

    constructor: function (config) {
        var me = this;
        config = config || {};
        me.initConfig(config);
        var garde = me.getGarde();
        Ext.apply(config, {
            title: garde ? 'Modifier la garde' : 'Nouvelle garde',
            items: [{
                    xtype: 'form',
                    itemId: 'formulaireGarde',
                    bodyPadding: 12,
                    defaults: {anchor: '100%', labelWidth: 130},
                    items: [{
                            xtype: 'textfield',
                            itemId: 'gardeLibelle',
                            fieldLabel: 'Libell&eacute;',
                            maxLength: 120,
                            allowBlank: false,
                            emptyText: 'Nuit du 5 au 6 septembre',
                            value: garde ? garde.get('libelle') : ''
                        }, {
                            xtype: 'fieldcontainer',
                            fieldLabel: 'D&eacute;but',
                            layout: 'hbox',
                            items: [{
                                    xtype: 'datefield', itemId: 'gardeJourDebut', flex: 1,
                                    format: 'd/m/Y', submitFormat: 'Y-m-d', allowBlank: false,
                                    value: garde ? Ext.Date.parse(garde.get('jourDebut'), 'Y-m-d') : new Date()
                                }, {
                                    xtype: 'timefield', itemId: 'gardeHeureDebut', width: 100,
                                    margin: '0 0 0 6', format: 'H:i', submitFormat: 'H:i',
                                    increment: 30, allowBlank: false,
                                    value: garde ? garde.get('heureDebut') : '20:00'
                                }]
                        }, {
                            xtype: 'fieldcontainer',
                            fieldLabel: 'Fin',
                            layout: 'hbox',
                            items: [{
                                    xtype: 'datefield', itemId: 'gardeJourFin', flex: 1,
                                    format: 'd/m/Y', submitFormat: 'Y-m-d', allowBlank: false,
                                    value: garde ? Ext.Date.parse(garde.get('jourFin'), 'Y-m-d') : new Date()
                                }, {
                                    xtype: 'timefield', itemId: 'gardeHeureFin', width: 100,
                                    margin: '0 0 0 6', format: 'H:i', submitFormat: 'H:i',
                                    increment: 30, allowBlank: false,
                                    value: garde ? garde.get('heureFin') : '08:00'
                                }]
                        }, {
                            xtype: 'displayfield',
                            value: 'Une garde va typiquement de 20 h &agrave; 8 h le lendemain : '
                                    + 'pensez &agrave; avancer la date de fin d\'un jour.'
                        }]
                }],
            buttons: [
                {text: 'Enregistrer', itemId: 'gardeEnregistrer', iconCls: 'check_icon'},
                {
                    text: 'Annuler',
                    handler: function (bouton) {
                        bouton.up('window').close();
                    }
                }
            ]
        });
        me.callParent([config]);
    },

    /** Les valeurs saisies, au format attendu par le serveur. */
    valeurs: function () {
        var me = this;
        var jour = function (itemId) {
            var valeur = me.down('#' + itemId).getValue();
            return valeur ? Ext.Date.format(valeur, 'Y-m-d') : '';
        };
        var heure = function (itemId) {
            var champ = me.down('#' + itemId);
            var valeur = champ.getValue();
            // Un timefield rend une Date quand la valeur vient de la liste, une chaine quand elle
            // a ete tapee : les deux formes doivent partir identiques.
            return Ext.isDate(valeur) ? Ext.Date.format(valeur, 'H:i') : (valeur || '');
        };
        return {
            id: me.getGarde() ? me.getGarde().get('id') : '',
            libelle: me.down('#gardeLibelle').getValue(),
            dateDebut: jour('gardeJourDebut') + ' ' + heure('gardeHeureDebut'),
            dateFin: jour('gardeJourFin') + ' ' + heure('gardeHeureFin')
        };
    }
});
