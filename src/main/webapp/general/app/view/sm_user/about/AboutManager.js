Ext.define('testextjs.view.sm_user.about.AboutManager', {
    extend: 'Ext.window.Window',
    xtype: 'aboutmanager',
    id: 'aboutmanagerID',
   // frame: true,
    title: 'A Propos',
    bodyPadding: 10,
    //autoScroll: true,
    width: 365,
    height:650,

    /*fieldDefaults: {
        labelAlign: 'right',
        labelWidth: 115,
        msgTarget: 'side'  
    },*/
    initComponent: function() {




        var Version_Produit = new Ext.form.field.Display(
        {
            xtype: 'displayfield',
            fieldLabel: 'Version.Produit:',
            forId: 'myFieldId',
            value: '<span style="color: blue;">'+'PRESTIGE 3'+'</span>',
            margin: '0 0 0 10'
        });


        var Date_Edition = new Ext.form.field.Display(
        {
            xtype: 'displayfield',
            fieldLabel: 'Date.Edition:',
            forId: 'myFieldId',
            value: '<span style="color: blue;">'+'03/2014'+'</span>',
            margin: '0 0 0 10'
        });

        var Description = new Ext.form.field.Display(
        {
            xtype: 'displayfield',
            fieldLabel: 'Description:',
            forId: 'myFieldId',
            value: '<span style="color: blue;">'+'Prestige 3 est un logiciel qui facilite la gestion de votre officine'+'</span>',
            margin: '0 0 0 10'
        });

        

        this.items = [{
            /* plan du 09/11, point 16 : icone Prestige 3 */
            xtype: 'component',
            html: '<div style="display:flex;align-items:center;gap:12px;margin:0 0 8px 4px">'
                    + '<img class="about-icone" src="../resources/images/icone-prestige/icone-prestige-48.png?v=3" width="48" height="48" alt="">'
                    + '<span style="font:700 18px Segoe UI,Tahoma,sans-serif;letter-spacing:1px;color:#2d1a8f">PRESTIGE 3</span></div>'
        }, {
            xtype: 'image',
            src: 'resources/images/about.jpg',
            mode: 'image',
            anchor: '100%'
        },
        {
            xtype: 'fieldset',
            title: 'Detail.Infos.Logiciel',
            defaultType: 'textfield',
            defaults: {
                anchor: '100%'
            },
            items: [
            Version_Produit,
            Date_Edition,
            Description
            ]
        }];

        this.callParent();
    }/*,
    buttons: [

    {
        text: 'Fermer',
        id: 'btn_FermerID',
        name: 'btn_Fermer',
        disabled: true,
        formBind: true,
        handler: function() {
            // alert("close")
            close();

        }

    }]*/

      

});





































