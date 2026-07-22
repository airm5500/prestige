/* global Ext */

/**
 * Centre de Support - Maintenance : actions de vidage controle des tables de travail.
 * Chaque action affiche le nombre de lignes concernees, demande confirmation, puis est tracee
 * dans le journal des evenements (type MAINTENANCE). Ecran concu comme une liste de cartes :
 * les prochaines actions s'ajoutent en completant simplement le tableau ACTIONS ci-dessous.
 */
Ext.define('testextjs.view.support.SupportMaintenance', {
    extend: 'Ext.panel.Panel',
    xtype: 'supportmaintenance',
    frame: true,
    title: 'Centre de Support - Maintenance',
    iconCls: 'icon-grid',
    width: '90%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    autoScroll: true,
    bodyPadding: 16,

    initComponent: function () {
        const me = this;

        const ACTIONS = [
            {
                action: 'ETIQUETTES',
                titre: 'Vider les étiquettes',
                description: 'Supprime toutes les lignes de la file des étiquettes (sous-menu Étiquettes).',
                compteur: function (counts) {
                    return counts.etiquettes + ' ligne(s)';
                }
            },
            {
                action: 'SUGGESTIONS',
                titre: 'Vider les suggestions',
                description: 'Supprime toutes les suggestions de commande et leurs détails (les détails sont supprimés en premier).',
                compteur: function (counts) {
                    return counts.suggestions + ' suggestion(s) et ' + counts.suggestionDetails + ' détail(s)';
                }
            },
            {
                action: 'COMMANDES_EN_COURS',
                titre: 'Vider les commandes en cours',
                description: 'Supprime uniquement les commandes au statut « en cours » (is_Process) et leurs détails (détails supprimés en premier). Les commandes réceptionnées ne sont jamais touchées.',
                compteur: function (counts) {
                    return counts.commandesEnCours + ' commande(s) et ' + counts.commandeDetails + ' détail(s)';
                }
            },
            {
                action: 'LOTS_PERIMES_FANTOMES',
                titre: 'Vider les stocks fantômes des lots périmés',
                description: 'Remet à zéro le stock des lots déjà périmés dont toutes les unités ont en réalité été vendues '
                        + '(le stock disponible du produit est déjà entièrement couvert par ses lots non périmés) : '
                        + 'ces lots disparaissent de la recherche des produits périmés. '
                        + 'Les lots périmés réellement encore en rayon ne sont jamais touchés. Aucune ligne n\'est supprimée.',
                unite: 'lot(s) remis à zéro',
                compteur: function (counts) {
                    return counts.lotsPerimesFantomes + ' lot(s) sur ' + counts.produitsPerimesFantomes
                            + ' produit(s), soit ' + counts.unitesPerimesFantomes + ' unité(s) fantôme(s)';
                }
            }
        ];

        function chargerCompteurs() {
            Ext.Ajax.request({
                method: 'GET',
                url: '../api/v1/support/maintenance/counts',
                success: function (response) {
                    const result = Ext.JSON.decode(response.responseText, true) || {};
                    if (!result.success) {
                        Ext.Msg.alert('Message', result.msg || 'Impossible de charger les compteurs');
                        return;
                    }
                    const counts = result.data || {};
                    Ext.Array.each(ACTIONS, function (a) {
                        const label = me.down('#lbl' + a.action);
                        if (label) {
                            label.setText('Données concernées : ' + a.compteur(counts), false);
                        }
                    });
                },
                failure: function () {
                    Ext.Msg.alert('Message', 'Un problème avec le serveur');
                }
            });
        }

        function executer(actionDef) {
            Ext.Msg.confirm('Confirmation', 'Cette action est IRRÉVERSIBLE.<br/><br/>'
                    + '<b>' + actionDef.titre + '</b><br/>' + actionDef.description
                    + '<br/><br/>Confirmer le vidage ?', function (btn) {
                if (btn !== 'yes') {
                    return;
                }
                const progress = Ext.MessageBox.wait('Vidage en cours . . .', 'Veuillez patienter');
                Ext.Ajax.request({
                    method: 'POST',
                    url: '../api/v1/support/maintenance/vider?action=' + encodeURIComponent(actionDef.action),
                    headers: {'Content-Type': 'application/json'},
                    success: function (response) {
                        progress.hide();
                        const result = Ext.JSON.decode(response.responseText, true) || {};
                        if (!result.success) {
                            Ext.Msg.alert('Message', result.msg || 'Échec du vidage');
                            return;
                        }
                        const res = result.data || {};
                        let msg = 'Vidage effectué : ' + (res.lignes || 0) + ' '
                                + (actionDef.unite || 'ligne(s) supprimée(s)');
                        if (res.details !== undefined) {
                            msg += ' (+ ' + res.details + ' détail(s))';
                        }
                        Ext.Msg.alert('Message', msg + '.<br/>L\'action a été tracée dans le journal des événements.');
                        chargerCompteurs();
                    },
                    failure: function () {
                        progress.hide();
                        Ext.Msg.alert('Message', 'Un problème avec le serveur');
                    }
                });
            });
        }

        const cartes = Ext.Array.map(ACTIONS, function (a) {
            return {
                xtype: 'panel',
                frame: true,
                margin: '0 0 14 0',
                bodyPadding: 12,
                title: a.titre,
                items: [
                    {
                        xtype: 'component',
                        html: a.description,
                        style: 'color:#555;margin-bottom:8px;'
                    },
                    {
                        xtype: 'label',
                        itemId: 'lbl' + a.action,
                        text: 'Données concernées : chargement...',
                        style: 'font-weight:bold;display:block;margin-bottom:10px;'
                    },
                    {
                        xtype: 'button',
                        text: 'Vider',
                        iconCls: 'icon-delete',
                        handler: function () {
                            executer(a);
                        }
                    }
                ]
            };
        });

        Ext.applyIf(me, {
            tbar: [
                {
                    xtype: 'component',
                    html: '<b>Actions de maintenance</b> — chaque vidage est définitif et tracé dans le journal des événements (Diagnostic & bugs).'
                },
                '->',
                {
                    xtype: 'button',
                    text: 'Actualiser les compteurs',
                    handler: chargerCompteurs
                }
            ],
            items: cartes,
            listeners: {
                afterrender: function () {
                    chargerCompteurs();
                }
            }
        });
        me.callParent(arguments);
    }
});
