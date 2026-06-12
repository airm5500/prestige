/* global Ext, panel, valheight */

Ext.define('testextjs.view.sm_user.mainmenu.MainMenuManager', {
    extend: 'Ext.form.Panel',
    xtype: 'mainmenumanager',
    id: 'mainmenumanager',
    requires: [
        'Ext.ux.IFrame'
    ],
    layout: 'fit',
    /*layout: 'anchor',
     defaults: {
     anchor: '100%'
     },*/
    title: '',
    width: '98%',
    height: valheight,
    resizable: true,
    //bodyBorder: 'false',
    border: false,
    config: {
        odatasource: '',
        odatatasourceparent: '',
        parentview: '',
        mode: '',
        titre: '',
        nameintern: ''
    },
    initComponent: function () {

        var me = this;
        var url_order_component = "../general/home/index.jsp?mode=SIMPLE";

        this.items = [{
                xtype: "component",
                border: false,
                autoEl: {
                    tag: "iframe",
                    src: url_order_component,
                    frameBorder: 0,
                    style: "border:none;"
                }
            }],
                this.callParent();

        /* Le metro occupe TOUT l'espace du content panel : on se cale sur
         * la taille de son corps et on suit ses redimensionnements.
         * Ce listener est attache apres celui du controleur (centerContent),
         * il s'execute donc apres lui et neutralise son decalage tl+20px.
         * Aucune autre vue n'est impactee. */
        this.on('afterrender', function () {
            var cp = Ext.getCmp('content-panel');
            if (!cp) {
                return;
            }
            var sync = function () {
                if (!me.rendered || me.isDestroyed || !cp.body) {
                    return;
                }
                me.setSize(cp.body.getWidth(true), cp.body.getHeight(true));
                me.alignTo(cp.body, 'tl-tl', [0, 0]);
            };
            sync();
            cp.on('resize', sync);
            me.on('destroy', function () {
                cp.un('resize', sync);
            }, me, {single: true});
        }, this, {single: true, delay: 50});

    }

});

function OpenView_Mainmenu() {
    testextjs.app.getController('App').onLoadNewComponent("mainmenumanager", "", "");
}

function OpenMyCompteView() {
    testextjs.app.getController('App').onLoadNewComponent("myaccountmanager", "Mon compte", "");
}


// preenregistrementmanager
function OpenView_preenregistrementmanager() {
    testextjs.app.getController('App').onLoadNewComponent("preenregistrementmanager", "Pre Enregistrement", "");
}

// cloturerventemanager
function OpenView_cloturerventemanager() {
    testextjs.app.getController('App').onLoadNewComponent("cloturerventemanager", "Cloturer une vente", "");
}

// ventemanager
function OpenView_ventemanager() {
    testextjs.app.getController('App').onLoadNewComponent("ventemanager", "Gerer vente", "");
}

// devismanager
function OpenView_devismanager() {
    testextjs.app.getController('App').onLoadNewComponent("devismanager", "Gerer Devis", "");
}

//  categorieayantdroitmanager
function OpenView_categorieayantdroitmanager() {
    testextjs.app.getController('App').onLoadNewComponent("categorieayantdroitmanager", "Gerer Categorie Ayant Droit", "");
}

//  codegestionmanager
function OpenView_codegestionmanager() {
    testextjs.app.getController('App').onLoadNewComponent("codegestionmanager", "Gerer Societe", "");
}

//  contreindicationmanager
function OpenView_contreindicationmanager() {
    testextjs.app.getController('App').onLoadNewComponent("contreindicationmanager", "Gerer Contre Indication", "");
}

//  escomptesocietemanager
function OpenView_escomptesocietemanager() {
    testextjs.app.getController('App').onLoadNewComponent("escomptesocietemanager", "Gerer Escompte societe", "");
}

//  famillemanager
function OpenView_famillemanager() {
    testextjs.app.getController('App').onLoadNewComponent("famillemanager", "Gerer Familles", "");
}

//  grossistemanager
function OpenView_grossistemanager() {
    testextjs.app.getController('App').onLoadNewComponent("grossistemanager", "Gerer Grossistes", "");
}

//  groupefamillemanager
function OpenView_groupefamillemanager() {
    testextjs.app.getController('App').onLoadNewComponent("groupefamillemanager", "Gerer Groupe Famille", "");
}

// @kouassi medecinmanager
function OpenView_medecinmanager() {
    testextjs.app.getController('App').onLoadNewComponent("medecinmanager", "Gerer Medecin", "");
}

//  optimisationquantitemanager
function OpenView_optimisationquantitemanager() {
    testextjs.app.getController('App').onLoadNewComponent("optimisationquantitemanager", "Gerer Optimisation quantite", "");
}

//  remisemanager
function OpenView_remisemanager() {
    testextjs.app.getController('App').onLoadNewComponent("remisemanager", "Gerer Remise", "");
}

//  regimecaissemanager
function OpenView_regimecaissemanager() {
    testextjs.app.getController('App').onLoadNewComponent("regimecaissemanager", "Gerer Regime Caisse", "");
}

//  risquemanager
function OpenView_risquemanager() {
    testextjs.app.getController('App').onLoadNewComponent("risquemanager", "Gerer Risque", "");
}

//  tranchemanager
function OpenView_tranchemanager() {
    testextjs.app.getController('App').onLoadNewComponent("tranchemanager", "Gerer Tranche", "");
}

//  typeremisemanager
function OpenView_typeremisemanager() {
    testextjs.app.getController('App').onLoadNewComponent("typeremisemanager", "Gerer Type Remise", "");
}

//  typerisquemanager
function OpenView_typerisquemanager() {
    testextjs.app.getController('App').onLoadNewComponent("typerisquemanager", "Gerer Type Risque", "");
}

//  typesocietemanager
function OpenView_typesocietemanager() {
    testextjs.app.getController('App').onLoadNewComponent("typesocietemanager", "Gerer Type Societe", "");
}

//  villemanager
function OpenView_villemanager() {
    testextjs.app.getController('App').onLoadNewComponent("villemanager", "Gerer Ville", "");
}


function getSousMenuView(str_componant, title) {
    testextjs.app.getController('App').onLoadNewComponent(str_componant, title, "");
}
function loadMainMenu() {
//    var viewtodisplay='mainmenumanager';
var viewtodisplay=xtypeload;
    
  var user=  sessionStorage.getItem('connecteduser');
 
    testextjs.app.getController('App').onLoadNewComponent(viewtodisplay, "", "");
}

function ReloadIframe() {
    if (window.confirm("Voulez-vous revenir au menu principal ?") == true) {
        //window.location = 'index.html';
        //document.getElementById(mainmenumanagerID).contentDocument.location.reload(true);
        window.location.reload();
    } else {

    }
}
;





