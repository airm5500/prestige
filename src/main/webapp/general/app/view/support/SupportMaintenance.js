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

        // Les pieces jointes ne suivent pas le motif generique ci-dessus : elles portent un parametre d'anciennete et
        // interrogent leur propre point d'entree (le comptage parcourt l'arborescence des fichiers, il ne doit pas
        // ralentir le chargement des autres compteurs).
        function joursPiecesJointes() {
            const champ = me.down('#numJoursPJ');
            const valeur = champ ? parseInt(champ.getValue(), 10) : 0;
            return (valeur && valeur > 0) ? valeur : 365;
        }

        function chargerComptesPiecesJointes() {
            const label = me.down('#lblPiecesJointes');
            if (label) {
                label.setText('Calcul en cours...', false);
            }
            Ext.Ajax.request({
                method: 'GET',
                url: '../api/v1/support/maintenance/pieces-jointes',
                params: {jours: joursPiecesJointes()},
                success: function (response) {
                    const result = Ext.JSON.decode(response.responseText, true) || {};
                    if (!result.success) {
                        Ext.Msg.alert('Message', result.msg || 'Impossible de calculer le volume des pièces jointes');
                        return;
                    }
                    const c = result.data || {};
                    if (!label) {
                        return;
                    }
                    if (!c.dossierPresent) {
                        label.setText('Aucun dossier de pièces jointes sur ce serveur.', false);
                        return;
                    }
                    label.setText(c.fichiers + ' fichier(s), ' + c.volumeMo + ' Mo au total — <span style="color:'
                            + (c.totalLibereMo > 0 ? '#b35c00' : '#555') + ';">' + c.totalLibereMo
                            + ' Mo libérables</span> (' + c.liberables + ' fichier(s) de plus de ' + c.jours
                            + ' jours, ' + c.orphelins + ' orphelin(s))', false);
                },
                failure: function () {
                    Ext.Msg.alert('Message', 'Un problème avec le serveur');
                }
            });
        }

        function purgerPiecesJointes() {
            const jours = joursPiecesJointes();
            Ext.Msg.confirm('Confirmation', 'Cette action est IRRÉVERSIBLE.<br/><br/>'
                    + '<b>Libérer l\'espace des pièces jointes</b><br/>'
                    + 'Les fichiers joints aux demandes de plus de ' + jours + ' jours, ainsi que les fichiers '
                    + 'orphelins, seront supprimés du disque. Les demandes elles-mêmes sont conservées.'
                    + '<br/><br/>Confirmer la libération ?', function (btn) {
                if (btn !== 'yes') {
                    return;
                }
                const progress = Ext.MessageBox.wait('Libération en cours . . .', 'Veuillez patienter');
                Ext.Ajax.request({
                    method: 'POST',
                    url: '../api/v1/support/maintenance/vider?action=PIECES_JOINTES&jours=' + jours,
                    headers: {'Content-Type': 'application/json'},
                    success: function (response) {
                        progress.hide();
                        const result = Ext.JSON.decode(response.responseText, true) || {};
                        if (!result.success) {
                            Ext.Msg.alert('Message', result.msg || 'Échec de la libération');
                            return;
                        }
                        const res = result.data || {};
                        Ext.Msg.alert('Message', (res.fichiers || 0) + ' fichier(s) supprimé(s), '
                                + (res.volumeMo || 0) + ' Mo libérés (' + (res.demandes || 0)
                                + ' demande(s) concernée(s), ' + (res.orphelins || 0) + ' orphelin(s)).'
                                + '<br/>L\'action a été tracée dans le journal des événements.');
                        chargerComptesPiecesJointes();
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

        cartes.push({
            xtype: 'panel',
            frame: true,
            margin: '0 0 14 0',
            bodyPadding: 12,
            title: 'Libérer l\'espace des pièces jointes',
            items: [
                {
                    xtype: 'component',
                    html: 'Supprime du disque les fichiers joints aux demandes « Me contacter » plus anciennes que '
                            + 'l\'ancienneté choisie, ainsi que les fichiers orphelins (plus référencés par aucune '
                            + 'demande). <b>La demande elle-même n\'est jamais supprimée</b> : son objet, son message '
                            + 'et son historique restent consultables ; seul le fichier quitte le disque, et la demande '
                            + 'porte alors la mention de sa purge.',
                    style: 'color:#555;margin-bottom:8px;'
                },
                {
                    xtype: 'numberfield',
                    itemId: 'numJoursPJ',
                    fieldLabel: 'Ancienneté (jours)',
                    labelWidth: 130,
                    width: 230,
                    value: 365,
                    minValue: 1,
                    maxValue: 3650,
                    allowBlank: false,
                    style: 'margin-bottom:8px;'
                },
                {
                    xtype: 'label',
                    itemId: 'lblPiecesJointes',
                    text: 'Calcul en cours...',
                    style: 'font-weight:bold;display:block;margin-bottom:10px;'
                },
                {
                    xtype: 'container',
                    layout: {type: 'hbox'},
                    defaults: {margin: '0 8 0 0'},
                    items: [
                        {
                            xtype: 'button',
                            text: 'Recalculer',
                            handler: chargerComptesPiecesJointes
                        },
                        {
                            xtype: 'button',
                            text: 'Libérer l\'espace',
                            iconCls: 'icon-delete',
                            handler: purgerPiecesJointes
                        }
                    ]
                }
            ]
        });

        function chargerTousLesCompteurs() {
            chargerCompteurs();
            chargerComptesPiecesJointes();
        }

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
                    handler: chargerTousLesCompteurs
                }
            ],
            items: cartes,
            listeners: {
                afterrender: function () {
                    chargerTousLesCompteurs();
                }
            }
        });
        me.callParent(arguments);
    }
});
