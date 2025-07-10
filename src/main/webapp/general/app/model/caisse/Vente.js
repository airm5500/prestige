/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* global Ext */

Ext.define('testextjs.model.caisse.Vente', {
    extend: 'Ext.data.Model',
    idProperty: 'lgPREENREGISTREMENTID',
    fields: [
        {
            name: 'lgPREENREGISTREMENTID',
            type: 'string'
        },
          {
            name: 'caution',
            type: 'number'
        },
        {
            name: 'strREF',
            type: 'string'
        },
        {
            name: 'strREFTICKET',
            type: 'string'
        },
        {
            name: 'intPRICE',
            type: 'number'
        },
        {
            name: 'intPRICEREMISE',
            type: 'number'
        },
        {
            name: 'strTYPEVENTE',
            type: 'string'
        },
        {
            name: 'intCUSTPART',
            type: 'number'
        },
        {
            name: 'dtUPDATED',
            type: 'string'
        },
        {
            name: 'dtCREATED',
            type: 'string'
        },
        {
            name: 'HEUREVENTE',
            type: 'string'
        },
        {
            name: 'heure',
            type: 'string'
        }

        , {
            name: 'userFullName',
            type: 'string'
        },
        {
            name: 'strSTATUT',
            type: 'string'
        },
        {
            name: 'lgREMISEID',
            type: 'string'
        },
        {
            name: 'lgUSERVENDEURID',
            type: 'string'
        },
        {
            name: 'lgTYPEVENTEID',
            type: 'string'
        },
        {
            name: 'lgNATUREVENTEID',
            type: 'string'
        },
        {
            name: 'strREFBON',
            type: 'string'
        },
        {
            name: 'typeRemiseId',
            type: 'string'
        }, {
            name: 'details',
            type: 'string'
        },
        {
            name: 'ayantDroit',
            type: 'auto'
        },
        {
            name: 'client',
            type: 'auto'
        },
        {
            name: 'tierspayants',
            type: 'auto'
        }, {
            name: 'remiseDepot',
            type: 'number'
        }
        , {
            name: 'lgTYPEDEPOTID',
            type: 'string'
        }
        , {
            name: 'magasin',
            type: 'auto'
        }, {
            name: 'strNAME',
            type: 'string'
        }, {
            name: 'lgEMPLACEMENTID',
            type: 'string'
        }, {
            name: 'gerantFullName',
            type: 'string'
        }, {
            name: 'desciptiontypedepot',
            type: 'string'
        },
        {
            name: 'lgCLIENTID',
            type: 'string'
        },
        {
            name: 'lgUPDATEDBY',
            type: 'string'
        },
        {
            name: 'lgUSERCAISSIERID',
            type: 'string'
        },
        {
            name: 'userCaissierName',
            type: 'string'
        },
        {
            name: 'avoir',
            type: 'boolean'
        },
        {
            name: 'sansbon',
            type: 'boolean'
        },
        {
            name: 'cancel',
            type: 'boolean'
        }, {
            name: 'beCancel',
            type: 'boolean'
        },
        {
            name: 'clientFullName',
            type: 'string'
        },
        {
            name: 'strTYPEVENTENAME',
            type: 'string'
        },
        {
            name: 'userVendeurName',
            type: 'string'
        },
        {
            name: 'dateAnnulation',
            type: 'string'
        },
        {
            name: 'heureAnnulation',
            type: 'string'
        },
        {
            name: 'modification',
            type: 'boolean'
        }, {
            name: 'modificationClientTp',
            type: 'boolean'
        },
        {
            name: 'copy',
            type: 'boolean'
        },
        {
            name: 'intPRICERESTE',
            type: 'number'
        },
        {
            name: 'mvdate',
            type: 'string'
        },

        {
            name: 'numOrder',
            type: 'string'
        },
        {
            name: 'medecinId',
            type: 'string'
        },
        {
            name: 'nom',
            type: 'string'
        },
        {
            name: 'commentaire',
            type: 'string'
        },
         {
            name: 'canexport',
            type: 'boolean'
        },{
            name: 'modificationVenteDate',
            type: 'boolean'
        }
        
    ]
});
