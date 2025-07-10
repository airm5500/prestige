//recuperation de la hauteur et largeur de l'ecran
var valheight = screen.height;
var valwidth = screen.width;
var xtypeload = localStorage.getItem("xtypeuser");
//alert("xtypeload:-----"+xtypeload);
//var xtypeload = 'mainmenumanager'; //a decommenter apres
//var xtypeload = 'dashboard';

//fin recuperation de la hauteur et largeur de l'ecran

if(valheight >= 900) {
    valheight = 595;
} else if(valheight < 900 && valheight >= 768) {
    valheight = 580;   
}
if(valwidth >= 1600) {
    valwidth = 1300;
} else if(valwidth < 1600 && valwidth >= 1366) {
    valwidth = 1050;
}


Ext.define('testextjs.view.Navigation', {
    extend: 'Ext.tree.Panel',
    xtype: 'navigation',
//    title: 'Menu',
    rootVisible: false,
    useArrows: false,
    frame: true,
    title: 'Prestige Navigation Menu',
    width: 350,
    height: 300,
    initComponent: function() {
//        testextjs.app.getController('App').inituserName();
        Ext.apply(this, {
            store: new Ext.data.TreeStore({
                proxy: {
                    type: 'ajax',
                    url: '../webservices/menumanagement/ws_tree_menu.jsp'
                },
                /*sorters: [
                 {
                 property: 'leaf',
                 direction: 'ASC'
                 }, {
                 property: 'text',
                 direction: 'ASC'
                 }],*/
            })/*,
             tbar: [{
             text: 'Get checked nodes',
             scope: this,
             handler: this.onCheckedNodesClick
             }]*/
        });
        this.callParent();

        this.listeners = {
            /* 'afterrender': function(n) 
             {
             console.log('afterrender');
             console.log(n);
             },
             'click': function(n)
             {
             console.log('click');
             console.log(n);
             },*/
            itemclick: function(s, r) {
//                alert(r.data.text + " " + r.data.id);
//                this.callItemMenu(r.data.id, r.data.text); // a decommenter en cas de probleme
                this.callItemMenu(s, r);

                //this.getView().expand(this);
            },
            collapse: function() { //fermeture
//                alert('collapsed');
            },
            expand: function() { // ouverture 
//                alert('expand')
            }

        };


    },
    callItemMenu: function(parent, component) {

        //alert("idComponent "+idComponent);
        if (typeof component.data.id !== 'undefined') {
            testextjs.app.getController('App').onLoadNewComponent(component.data.id, component.data.text, "");
        } else {
            //alert(component.data.text);
            
        }

    },
    /*  callItemMenu: function(idComponent, title) { //a decommenter en cas de probleme
     //alert("idComponent "+idComponent);
     if (typeof idComponent != 'undefined') {
     testextjs.app.getController('App').onLoadNewComponent(idComponent, title, "");
     } 
     
     },*/
    onCheckedNodesClick: function() {

        var records = this.getView().getChecked(),
                names = [];

        Ext.Array.each(records, function(rec) {
            names.push(rec.get('text'));
        });

        Ext.MessageBox.show({
            title: 'Selected Nodes',
            msg: names.join('<br />'),
            icon: Ext.MessageBox.INFO
        });
    }
});
