Ext.define('testextjs.view.dashboard', {
    extend: 'Ext.panel.Panel',
    xtype: 'dashboard',
    id: 'dashboard-panel',
//    cls: 'custompanel',
    cls: 'panelcontainer',
    requires: [
        'testextjs.view.tableaubord.TableauBord'
    ],
    layout: 'fit',
    autoScroll: false,
    width: '99%',
    // height: valheight,
    height: Ext.getBody().getViewSize().height,
//    autoHeight: true,

    //bodyBorder: 'false',
    border: false,
    /*
     * Retours du 25/10 (point 4 : plus d'iframe) : le tableau de bord est toujours le composant ExtJS
     * testextjs.view.tableaubord.TableauBord. L'ancien (dashboard.html dans son iframe, choisi par
     * KEY_TABLEAU_BORD_VERSION = ANCIEN) ne s'affiche plus ; la page est conservee, mais plus ouverte.
     */
    initComponent: function () {
        var me = this;
        me.items = [{xtype: 'tableaubord'}];
        me.callParent();
        me.on('afterrender', me.ajusterHauteur, me, {single: true});
    },

    /* Le panneau prend la hauteur de la fenetre alors qu'il commence sous l'en-tete : le bas sortait de l'ecran. Il
       prend la place reellement disponible, et la reprend quand la fenetre change de taille. */
    ajusterHauteur: function () {
        var me = this;
        var ajuster = function () {
            if (!me.isDestroyed && me.rendered) {
                me.setHeight(Math.max(400, Ext.getBody().getViewSize().height - me.getEl().getTop() - 6));
            }
        };
        ajuster();
        Ext.EventManager.onWindowResize(ajuster);
        me.on('destroy', function () {
            Ext.EventManager.removeResizeListener(ajuster);
        });
    }

});
