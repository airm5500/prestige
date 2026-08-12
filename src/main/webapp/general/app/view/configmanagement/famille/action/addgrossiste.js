var url_services_data_famille_grossiste = '../api/v1/famille-grossiste';


var OgridpanelGrossisteID;
var Oview;
var Omode;
var Me;
var ref_add;
var cust_name;
var cust_id;
var cust_account_id;
var Ogrid;
var OmyType;
var OcustGrid;
var lg_FAMILLE_ID;
var ref_grossiste;

var ref;

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.configmanagement.famille.action.addgrossiste', {
    extend: 'Ext.window.Window',
    xtype: 'addgrossiste',
    id: 'addgrossisteID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'Ext.grid.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille',
        'testextjs.model.CompteClient',
        'testextjs.view.sm_user.dovente.action.add'

    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        obtntext: '',
        nameintern: ''
    },
    title: 'Gestion des grossites / articles',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function() {

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        Ogrid = this.getObtntext();
        ref = this.getOdatasource().lg_FAMILLE_ID;

        ref_grossiste = this.getNameintern();

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.FamilleGrossiste',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_famille_grossiste + '?lg_FAMILLE_ID=' + ref,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });




        var form = new Ext.form.Panel({
            width: 800,
            layout: {
                type: 'hbox'
            },
            defaults: {
                flex: 1
            },
            //items: ['gridpanelGrossisteID', 'info_article'],
            autoHeight: true,
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 90,
                anchor: '100%',
                msgTarget: 'side'
            },
            items: [{
                    columnWidth: 0.65,
                    xtype: 'gridpanel',
                    id: 'gridpanelGrossisteID',
                    store: store,
                    height: 400,
                    flex: 2,
                    columns: [
                        {
                            xtype: 'rownumberer',
                            text: 'LG',
                            width: 45,
                            sortable: true/*,
                             locked: true*/
                        },
                        {
                            text: 'GROSSISTE',
                            flex: 1,
                            dataIndex: 'lg_GROSSISTE_LIBELLE'
                        },
                        {
                            text: 'CODE ARTICLE',
                            flex: 1,
                            dataIndex: 'str_CODE_ARTICLE'
                        }, {
                            header: 'PRIX VENTE',
                            dataIndex: 'int_PRICE',
                            renderer: amountformat,
                            align: 'right',
                            flex: 0.7
                        },
                        {
                            header: 'PRIX ACHAT',
                            dataIndex: 'int_PAF',
                            renderer: amountformat,
                            align: 'right',
                            flex: 0.7
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/page_white_edit.png',
                                    tooltip: 'Modifier',
                                    scope: this,
                                    handler: this.onEditClick
                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/delete.png',
                                    tooltip: 'Supprimer',
                                    scope: this,
                                    handler: this.onRemoveClick
                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/accept.png',
                                    tooltip: 'Verifier la disponibilite du produit avec PHARMA ML',
                                    scope: this,
                                    handler: this.onIsProductDispoClick
                                }]
                        }],
                    tbar: [
                        {
                            text: 'Creer',
                            scope: this,
                            handler: this.onAddClick
                        }, '-', {
                            xtype: 'textfield',
                            id: 'rechercher',
                            name: 'user',
                            emptyText: 'Rech',
                            listeners: {
                                'render': function(cmp) {
                                    cmp.getEl().on('keypress', function(e) {
                                        if (e.getKey() === e.ENTER) {
                                            Me.onRechClick();

                                        }
                                    });
                                }
                            }
                        }, {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            scope: this,
                            handler: this.onRechClick
                        }],
                    listeners: {
                        scope: this},
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        dock: 'bottom',
                        displayInfo: true
                    }
                },
                {
                    columnWidth: 0.35,
                    margin: '10 10 10 10',
                    xtype: 'fieldset',
                    title: 'Information du produit',
                    id: 'info_article',
                    flex: 1,
                    layout: 'anchor',
                    defaultType: 'textfield',
                    items: [
                        {
                            xtype: 'displayfield',
                            fieldLabel: 'LIBELLE : ',
                            name: 'dis_str_DESCRIPTION',
                            id: 'dis_str_DESCRIPTION',
                            fieldStyle: "color:blue;",
                            emptyText: 'LIBELLE'
                        },
                        {
                            xtype: 'displayfield',
                            fieldLabel: 'CIP : ',
                            name: 'dis_INT_CIP',
                            id: 'dis_INT_CIP',
                            fieldStyle: "color:blue;",
                            emptyText: 'CIP'
                        },
                        {
                            xtype: 'displayfield',
                            fieldLabel: 'GROSSISTE (par defaut) : ',
                            name: 'dis_lg_GROSSISTE_ID',
                            id: 'dis_lg_GROSSISTE_ID',
                            emptyText: 'Libelle',
                            value: 0,
                            fieldStyle: "color:blue;",
                            align: 'right'

                        }

                    ]

                }]
        });

        this.callParent();
        OgridpanelGrossisteID = Ext.getCmp('gridpanelGrossisteID');

        if (Omode === "detail") {
            lg_FAMILLE_ID = this.getOdatasource().lg_FAMILLE_ID;
            Ext.getCmp('dis_str_DESCRIPTION').setValue(this.getOdatasource().str_NAME);
            Ext.getCmp('dis_INT_CIP').setValue(this.getOdatasource().int_CIP);
            Ext.getCmp('dis_lg_GROSSISTE_ID').setValue(this.getOdatasource().lg_GROSSISTE_ID);


        }

        // L'id 'cltwinID' est reutilise par de nombreuses fenetres de l'application :
        // on detruit l'eventuelle fenetre existante avant d'en creer une nouvelle,
        // sinon le registre d'ids ExtJS est corrompu (zIndexManager undefined).
        var winPrecedente = Ext.getCmp('cltwinID');
        if (winPrecedente && !winPrecedente.isDestroyed) {
            winPrecedente.destroy();
        }
        var win = new Ext.window.Window({
            autoShow: true,
            modal: true,
            id: 'cltwinID',
            title: this.getTitre(),
            width: '80%',
            Height: 500,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Fermer',
                    handler: function() {
                        win.close();
                    }
                }],
            listeners: {// controle sur le button fermé en haut de fenetre
                beforeclose: function() {
                    Ext.getCmp('rechecher').focus();
                }
            }
        });
    },
    onEditClick: function(grid, rowIndex) {

        var refID = this.getOdatasource().lg_FAMILLE_ID;

        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.configmanagement.famille.action.addfamillegrossiste({
            odatasource: rec.data,
            parentview: this,
            ref: refID,
            mode: "updategrossiste",
            type: "grossistemanager",
            titre: "Modification du grossiste [" + this.getOdatasource().str_NAME + "]"
        });
    },
    onAddClick: function() {

        new testextjs.view.configmanagement.famille.action.addfamillegrossiste({
            odatasource: this.getOdatasource(),
            parentview: this,
            ref: this.getOdatasource().lg_FAMILLE_ID,
            mode: "creategrossiste",
            titre: "Ajouter un grossiste [" + this.getOdatasource().str_NAME + "]",
            type: "grossistemanager"
        });
    },
    onRemoveClick: function(grid, rowIndex) {
//        var lg_FAMILLE_ID = this.getOdatasource().lg_FAMILLE_ID;
        Ext.MessageBox.confirm('Message',
                'Confirmation de la suppresssion',
                function(btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            // Suppression en API REST (meme methode metier que la JSP historique)
                            url: '../api/v1/famille-grossiste/' + rec.get('lg_FAMILLE_GROSSISTE_ID'),
                            method: 'DELETE',
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('confirmation', object.errors);
                                    var OGrid = Ext.getCmp('gridpanelGrossisteID');

                                    OGrid.getStore().reload();
                                }
                                grid.getStore().reload();
                            },
                            failure: function(response)
                            {

                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    }
                });


    },
    onRechClick: function() {

        var val = Ext.getCmp('rechercher');
        OgridpanelGrossisteID.getStore().load({
            params: {
                search_value: val.getValue()
            }
        }, url_services_data_famille_grossiste);
    },
    onIsProductDispoClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.Ajax.request({
            // Verification PHARMA ML en API REST (comportement identique au mode JSP historique)
            url: '../api/v1/famille-grossiste/check-dispo/' + rec.get('lg_FAMILLE_GROSSISTE_ID'),
            method: 'GET',
            success: function(response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                } else {
                    Ext.MessageBox.alert('confirmation', object.errors);
                }
            },
            failure: function(response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });

    }
});