/* global Ext */

Ext.define('testextjs.view.commandemanagement.bonlivraison.XLSXController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.xlsx',
    onTextFieldSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            this.doImport();
        }
    },
    onButtonClickCancel: function (button, e, options) {
        this.lookupReference('formImport').reset();
        this.getView().close();
    },
    onButtonClickSubmit: function (button, e, options) {
        const me = this;
        if (me.lookupReference('formImport').isValid()) {
            me.doImport();
        }
    },
    doImport: function () {
        const me = this;
        const  form = me.lookupReference('formImport');
        form.submit({
            clientValidation: true,
            url: '../commande?action=import',
            waitMsg: 'Patientez...',
            timeout: 1800000,
            scope: me,
            success: 'onImportSuccess',
            failure: 'onImportFailure'

        });
    },
    onImportFailure: function (form, action) {
      //  const result = Ext.util.JSON.decode(action.response.responseText);
        Ext.Msg.show({
            title: 'Error!',
            msg: "Erreur d'importation ",
            icon: Ext.Msg.ERROR,
            buttons: Ext.Msg.OK
        });
    }
    ,
    onImportSuccess: function (form, action) {
        const result = Ext.util.JSON.decode(action.response.responseText);
        Ext.getCmp('i_order_managerID').getStore().load();
        this.getView().close();
        Ext.Msg.show({
            title: 'Info',
            msg: result.success,
            icon: Ext.Msg.INFO,
            buttons: Ext.Msg.OK
        });

    }
});
