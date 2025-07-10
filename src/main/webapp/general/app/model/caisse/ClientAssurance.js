/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* global Ext */

Ext.define('testextjs.model.caisse.ClientAssurance', {
    extend: 'Ext.data.Model',
    idProperty: 'lgCLIENTID',
    fields: [
        {
            name: 'lgCLIENTID',
            type: 'string'
        },
        {
            name: 'fullName',
            type: 'string'
        },

        {
            name: 'strFIRSTNAME',
            type: 'string'
        },
        {
            name: 'strLASTNAME',
            type: 'string'
        },
        {
            name: 'strADRESSE',
            type: 'string'
        }, {
            name: 'lgTYPECLIENTID',
            type: 'string'
        }, {
            name: 'strSEXE',
            type: 'string'
        }, {
            name: 'strNUMEROSECURITESOCIAL',
            type: 'string'
        }, {
            name: 'tiersPayants',
            type: 'auto'
        },
        {name: 'preenregistrementstp', auto: 'auto'}
        , {
            name: 'ayantDroits',
            type: 'auto'
        }, {
            name: 'dtNAISSANCE',
            type: 'string'
        }, {
            name: 'strCODEPOSTAL',
            type: 'string'
        }, {
            name: 'lgVILLEID',
            type: 'string'
        }
        , {
            name: 'lgCOMPANYID',
            type: 'string'
        }, {
            name: 'lgRISQUEID',
            type: 'string'
        }, {
            name: 'lgCATEGORIEAYANTDROITID',
            type: 'string'
        }, {
            name: 'intPOURCENTAGE',
            type: 'number'
        }, {
            name: 'intPRIORITY',
            type: 'number'
        }
        , {
            name: 'dbPLAFONDENCOURS',
            type: 'number'

        }, {
            name: 'bIsAbsolute',
            type: 'boolean'

        }, {
            name: 'dblQUOTACONSOMENSUELLE',
            type: 'number'

        }, {
            name: 'lgTIERSPAYANTID',
            type: 'string'
        }, {
            name: 'compteTp',
            type: 'string'
        },
        {
            name: 'remiseId',
            type: 'string'
        }
        , {
            name: 'email',
            type: 'string'
        }, {
            name: 'libelleTypeClient',
            type: 'string'
        }

    ]
});
