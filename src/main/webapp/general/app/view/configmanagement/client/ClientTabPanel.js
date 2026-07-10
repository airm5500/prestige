/* global Ext */

/**
 * Gestion des clients en deux onglets :
 * - "Gestion des Clients" (contenu historique de la vue)
 * - "Suivi de consommation" (consommation de tous les clients sur une periode)
 *
 * Le xtype 'clientmanager' (ouvert par le menu) est porte par ce conteneur.
 */
Ext.define('testextjs.view.configmanagement.client.ClientTabPanel', {
    extend: 'Ext.tab.Panel',
    xtype: 'clientmanager',
    requires: [
        'testextjs.view.configmanagement.client.ClientManager',
        'testextjs.view.configmanagement.client.SuiviConsoClients'
    ],

    width: '97%',
    height: 'auto',
    minHeight: 620,
    cls: 'custompanel',
    activeTab: 0,
    plain: true,
    items: [
        {
            xtype: 'clientgestion',
            title: 'Gestion des Clients'
        },
        {
            xtype: 'suiviconsoclients',
            title: 'Suivi de consommation'
        }
    ]
});
