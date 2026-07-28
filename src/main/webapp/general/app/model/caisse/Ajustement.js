/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* global Ext */

Ext.define('testextjs.model.caisse.Ajustement', {
    extend: 'Ext.data.Model',
    idProperty: 'lgAJUSTEMENTID',
    fields: [

        {
            name: 'lgAJUSTEMENTID',
            type: 'string'
        },
        {
            name: 'dtUPDATED',
            type: 'string'
        }, {
            name: 'heure',
            type: 'string'
        },
        {
            name: 'lgUSERID',
            type: 'string'
        },
        {
            name: 'userFullName',
            type: 'string'
        },
        {
            name: 'details',
            type: 'string'
        },
        {
            name: 'description',
            type: 'string'
        },
        {
            name: 'commentaire',
            type: 'string'
        },{
            name: 'typeLibelle',
            type: 'string'
        },
        {
            name: 'canCancel',
            type: 'boolean'
        },
        {
            name: 'zone',
            type: 'string'
        },
        {
            name: 'valeurAchat',
            type: 'int'
        },
        {
            name: 'valeurVente',
            type: 'int'
        }


    ]
});
