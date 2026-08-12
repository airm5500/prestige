Ext.define('testextjs.view.sm_user.language.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addlanguage',
    id: 'addlanguageID',
    requires: [
    'Ext.form.*',
    'Ext.window.Window'
    ],
    height: 500,
    width: 700,
    title: 'Add language',
    autoScroll: true,
    bodyPadding: 10,
    // html: testextjs.DummyText.extraLongText,
    constrain: true ,
    initComponent: function() {

        var field = new Ext.form.field.Text({
            renderTo: document.body
        }), fieldHeight = field.getHeight(),
        padding = 5,
        remainingHeight;

        field.destroy();
        var form = new Ext.form.Panel({
            border: false,
            fieldDefaults: {
                labelWidth: 60
            },
            defaultType: 'textfield',
            bodyPadding: padding,

            items: [{
                fieldLabel: 'Name',
                name: 'Nom',
                padding: 10,
                anchor:'80%'  // anchor width by percentage
            },{
                fieldLabel: 'Description',
                name: 'Description',
                padding: 10,
                anchor: '80%'  // anchor width by percentage
            },{
                fieldLabel: 'Designation',
                name: 'Designation',
                padding: 10,
                anchor: '80%'  // anchor width by percentage
            } ]
        });



      /*  new Ext.window.Window({
            autoShow: true,
            title: 'Ajouter skin',
            width: 500,
            height:300,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,

            buttons: [{
                text: 'Enregistrer'
            },{
                text: 'Annuler',
                handler: this.onbtnsave

            }]
        });*/


    }
});


