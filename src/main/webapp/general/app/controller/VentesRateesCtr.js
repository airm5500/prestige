/* global Ext, testextjs */

/*
 * Ventes ratees : fenetre d'acces rapide (bouton panier du bandeau, liste du jour) et menu de
 * consultation complete (registre filtre, analyse, editions, exports).
 *
 * La pastille du bouton panier compte les PRODUITS DISTINCTS non commandes du jour ; elle est
 * actualisee apres chaque ajout, suppression, rattachement et changement d'etat commande.
 */
Ext.define('testextjs.controller.VentesRateesCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.ventesratees.VentesRateesManager'],

    init: function () {
        this.control({
            'ventesrateesmanager': {
                afterrender: this.onEcranAffiche
            },
            'ventesrateesmanager #btnRechercher': {
                click: this.onRechercher
            },
            'ventesrateesmanager #btnVider': {
                click: this.onViderFiltres
            },
            'ventesrateesmanager #btnNouvelle': {
                click: this.onNouvelleDemandeMenu
            },
            'ventesrateesmanager #btnImprimer': {
                click: this.onImprimer
            },
            'ventesrateesmanager #btnExcel': {
                click: this.onExcel
            },
            'ventesrateesmanager #btnCsv': {
                click: this.onCsv
            },
            'ventesrateesmanager #btnModifier': {
                click: this.onModifier
            },
            'ventesrateesmanager #btnCommander': {
                click: this.onCommanderMenu
            },
            'ventesrateesmanager #btnRattacher': {
                click: this.onRattacher
            },
            'ventesrateesmanager #btnAnalyser': {
                click: this.onAnalyser
            },
            'ventesrateesmanager #filtreProduit': {
                specialkey: this.onToucheEntree
            },
            'ventesrateesmanager #filtreClient': {
                specialkey: this.onToucheEntree
            }
        });
    },

    ecran: function (composant) {
        return composant.up('ventesrateesmanager');
    },

    onEcranAffiche: function (ecran) {
        this.chargerRegistre(ecran);
    },

    onToucheEntree: function (champ, e) {
        if (e.getKey() === e.ENTER) {
            this.chargerRegistre(this.ecran(champ));
        }
    },

    chargerRegistre: function (ecran) {
        var store = ecran.storeRegistre;
        store.getProxy().extraParams = ecran.parametresRegistre();
        store.loadPage(1);
    },

    onRechercher: function (bouton) {
        this.chargerRegistre(this.ecran(bouton));
    },

    onViderFiltres: function (bouton) {
        var ecran = this.ecran(bouton);
        Ext.each(['filtreDebut', 'filtreFin', 'filtreUtilisateur', 'filtreProduit', 'filtreClient', 'filtreMotif'],
                function (id) {
                    ecran.down('#' + id).setValue(null);
                });
        Ext.each(['filtreConnu', 'filtreCommande', 'filtreRattache'], function (id) {
            ecran.down('#' + id).setValue('');
        });
        this.chargerRegistre(ecran);
    },

    onImprimer: function (bouton) {
        var progress = Ext.MessageBox.wait('Génération du PDF . . .', 'Veuillez patienter');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ventes-ratees/recherche/print',
            params: this.ecran(bouton).parametresRegistre(),
            success: function (response) {
                progress.hide();
                var r = Ext.JSON.decode(response.responseText, true) || {};
                if (r.success && r.msg) {
                    window.open(r.msg);
                } else {
                    Ext.Msg.alert('Message', r.msg || 'Le PDF n\'a pas pu être généré.');
                }
            },
            failure: function () {
                progress.hide();
                Ext.Msg.alert('Message', 'Le PDF n\'a pas pu être généré.');
            }
        });
    },

    onExcel: function (bouton) {
        window.open('../api/v1/ventes-ratees/recherche/excel?'
                + Ext.Object.toQueryString(this.ecran(bouton).parametresRegistre()));
    },

    onCsv: function (bouton) {
        window.open('../api/v1/ventes-ratees/recherche/csv?'
                + Ext.Object.toQueryString(this.ecran(bouton).parametresRegistre()));
    },

    selection: function (ecran) {
        var selection = ecran.down('#grilleRegistre').getSelectionModel().getSelection();
        if (!selection.length) {
            Ext.Msg.alert('Message', 'Sélectionnez d\'abord une demande dans la liste.');
            return null;
        }
        return selection[0];
    },

    // ------------------------------------------------------------------ commande

    onCommanderMenu: function (bouton) {
        var me = this, ecran = me.ecran(bouton);
        var record = me.selection(ecran);
        if (!record) {
            return;
        }
        if (record.get('commande')) {
            Ext.Msg.alert('Message', 'Cette demande est déjà commandée.');
            return;
        }
        me.commanderAvecConfirmation(record.get('id'), function () {
            me.chargerRegistre(ecran);
        });
    },

    /**
     * Marquage commande avec la confirmation de commande groupee de la specification : si le produit
     * apparait dans plusieurs demandes actives, proposer « Toutes les lignes / Cette ligne uniquement /
     * Annuler » ; sinon marquer directement la ligne.
     */
    commanderAvecConfirmation: function (id, apres) {
        var me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ventes-ratees/' + id + '/groupe',
            success: function (response) {
                var r = Ext.JSON.decode(response.responseText, true) || {};
                if (!r.success) {
                    Ext.Msg.alert('Message', r.msg || 'Opération impossible.');
                    return;
                }
                if (!r.confirmationNecessaire) {
                    me.commander(id, false, apres);
                    return;
                }
                Ext.Msg.show({
                    title: 'Commande groupée',
                    msg: r.message,
                    icon: Ext.Msg.QUESTION,
                    buttons: Ext.Msg.YESNOCANCEL,
                    buttonText: {yes: 'Toutes les lignes', no: 'Cette ligne uniquement', cancel: 'Annuler'},
                    fn: function (choix) {
                        if (choix === 'yes') {
                            me.commander(id, true, apres);
                        } else if (choix === 'no') {
                            me.commander(id, false, apres);
                        }
                    }
                });
            },
            failure: function () {
                Ext.Msg.alert('Message', 'Opération impossible.');
            }
        });
    },

    commander: function (id, toutes, apres) {
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/ventes-ratees/' + id + '/commander',
            params: Ext.JSON.encode({toutes: toutes}),
            success: function (response) {
                var r = Ext.JSON.decode(response.responseText, true) || {};
                if (!r.success) {
                    Ext.Msg.alert('Message', r.msg || 'Opération impossible.');
                    return;
                }
                prestigeVentesRateesBadge();
                if (apres) {
                    apres(r);
                }
            },
            failure: function () {
                Ext.Msg.alert('Message', 'Opération impossible.');
            }
        });
    },

    // ------------------------------------------------------------------ rattachement

    onRattacher: function (bouton) {
        var me = this, ecran = me.ecran(bouton);
        var record = me.selection(ecran);
        if (!record) {
            return;
        }
        if (record.get('connu')) {
            Ext.Msg.alert('Message', 'Cette demande est déjà liée à un produit de la base.');
            return;
        }
        var comboProduit = me.comboProduit('Produit de la base', 420);
        var fenetre = Ext.create('Ext.window.Window', {
            title: 'Rattacher « ' + record.get('designation') + ' » à un produit',
            modal: true,
            width: 480,
            bodyPadding: 12,
            items: [comboProduit],
            buttons: [{
                    text: 'Rattacher',
                    handler: function () {
                        var familleId = comboProduit.getValue();
                        var choisi = comboProduit.findRecordByValue(familleId);
                        if (!familleId || !choisi) {
                            Ext.Msg.alert('Message', 'Choisissez le produit dans la liste.');
                            return;
                        }
                        Ext.Ajax.request({
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            url: '../api/v1/ventes-ratees/' + record.get('id') + '/rattacher',
                            params: Ext.JSON.encode({familleId: familleId}),
                            success: function (response) {
                                var r = Ext.JSON.decode(response.responseText, true) || {};
                                if (!r.success) {
                                    Ext.Msg.alert('Message', r.msg || 'Le rattachement a échoué.');
                                    return;
                                }
                                fenetre.close();
                                prestigeVentesRateesBadge();
                                me.chargerRegistre(ecran);
                            },
                            failure: function () {
                                Ext.Msg.alert('Message', 'Le rattachement a échoué.');
                            }
                        });
                    }
                }, {
                    text: 'Annuler',
                    handler: function () {
                        fenetre.close();
                    }
                }]
        });
        fenetre.show();
        comboProduit.focus(false, 200);
    },

    // ------------------------------------------------------------------ saisie / modification

    onNouvelleDemandeMenu: function (bouton) {
        var me = this, ecran = me.ecran(bouton);
        me.ouvrirSaisie(null, function () {
            me.chargerRegistre(ecran);
        });
    },

    onModifier: function (bouton) {
        var me = this, ecran = me.ecran(bouton);
        var record = me.selection(ecran);
        if (!record) {
            return;
        }
        me.ouvrirSaisie(record, function () {
            me.chargerRegistre(ecran);
        });
    },

    /** Combo produit : recherche distante « contient » sur le CIP, le nom ou l'EAN ; texte libre accepte. */
    comboProduit: function (label, largeur) {
        var storeProduits = new Ext.data.Store({
            fields: ['id', 'cip', 'designation', {name: 'stock', type: 'int'}],
            proxy: {
                type: 'ajax',
                url: '../api/v1/ventes-ratees/produits',
                reader: {type: 'json', root: 'data'}
            }
        });
        return Ext.create('Ext.form.field.ComboBox', {
            fieldLabel: label,
            labelWidth: 110,
            width: largeur,
            store: storeProduits,
            queryMode: 'remote',
            queryParam: 'q',
            minChars: 2,
            valueField: 'id',
            displayField: 'designation',
            forceSelection: false,
            emptyText: 'CIP, nom du produit, ou texte libre si inconnu',
            listConfig: {
                getInnerTpl: function () {
                    return '<div>{cip} - {designation} <span style="color:#888;">(stock : {stock})</span></div>';
                }
            }
        });
    },

    /**
     * Fenetre de saisie d'une demande (creation ou modification). Le produit se cherche par CIP ou par
     * nom ; un texte qui ne correspond a aucun produit est conserve en saisie libre, avec le CIP libre
     * eventuel. Client, telephone, motif et commentaire appartiennent a la ligne.
     */
    ouvrirSaisie: function (record, apres) {
        var me = this;
        var enModification = !!record;

        var comboProduit = me.comboProduit('Produit demandé', 430);
        var storeMotifs = new Ext.data.Store({
            fields: ['id', 'libelle'],
            proxy: {type: 'ajax', url: '../api/v1/ventes-ratees/motifs', reader: {type: 'json', root: 'data'}},
            autoLoad: true
        });
        var storeClients = new Ext.data.Store({
            fields: ['lgCLIENTID', 'fullName'],
            pageSize: 10,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/list',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        var champCip = Ext.create('Ext.form.field.Text', {
            fieldLabel: 'CIP libre', labelWidth: 110, width: 300,
            emptyText: 'Facultatif, produit inconnu'
        });
        var champQuantite = Ext.create('Ext.form.field.Number', {
            fieldLabel: 'Quantité', labelWidth: 110, width: 200, value: 1, minValue: 1, allowBlank: false
        });
        var comboClient = Ext.create('Ext.form.field.ComboBox', {
            fieldLabel: 'Client standard', labelWidth: 110, width: 430,
            store: storeClients, queryMode: 'remote', queryParam: 'query', minChars: 2,
            valueField: 'lgCLIENTID', displayField: 'fullName', forceSelection: false,
            emptyText: 'Facultatif : nom du client'
        });
        var champTelephone = Ext.create('Ext.form.field.Text', {
            fieldLabel: 'Téléphone', labelWidth: 110, width: 300, emptyText: 'Facultatif'
        });
        var comboMotif = Ext.create('Ext.form.field.ComboBox', {
            fieldLabel: 'Motif', labelWidth: 110, width: 430,
            store: storeMotifs, queryMode: 'local', valueField: 'id', displayField: 'libelle',
            editable: false, emptyText: 'Motif de la vente ratée'
        });
        var champCommentaire = Ext.create('Ext.form.field.TextArea', {
            fieldLabel: 'Commentaire', labelWidth: 110, width: 430, height: 54, emptyText: 'Facultatif'
        });

        if (enModification) {
            if (record.get('connu')) {
                comboProduit.setRawValue(record.get('designation'));
                comboProduit.setDisabled(true);
                champCip.setDisabled(true);
            } else {
                comboProduit.setRawValue(record.get('designation'));
                champCip.setValue(record.get('cip'));
            }
            champQuantite.setValue(record.get('quantite'));
            comboClient.setRawValue(record.get('nomClient'));
            champTelephone.setValue(record.get('telephone'));
            if (record.get('motifId')) {
                storeMotifs.on('load', function () {
                    comboMotif.setValue(record.get('motifId'));
                }, null, {single: true});
            }
            champCommentaire.setValue(record.get('commentaire'));
        }

        var enregistrer = function () {
            var familleId = comboProduit.getValue();
            var choisi = familleId ? comboProduit.findRecordByValue(familleId) : null;
            var designation = choisi ? choisi.get('designation') : Ext.String.trim(comboProduit.getRawValue() || '');
            if (!designation) {
                Ext.Msg.alert('Message', 'Indiquez le produit demandé (recherche ou texte libre).');
                return;
            }
            var clientId = comboClient.getValue();
            var clientChoisi = clientId ? comboClient.findRecordByValue(clientId) : null;
            var donnees = {
                familleId: choisi ? familleId : '',
                cip: choisi ? choisi.get('cip') : (champCip.getValue() || ''),
                designation: designation,
                quantite: champQuantite.getValue() || 1,
                clientId: clientChoisi ? clientId : '',
                nomClient: clientChoisi ? clientChoisi.get('fullName')
                        : Ext.String.trim(comboClient.getRawValue() || ''),
                telephone: champTelephone.getValue() || '',
                motifId: comboMotif.getValue() || '',
                commentaire: champCommentaire.getValue() || ''
            };
            Ext.Ajax.request({
                method: enModification ? 'PUT' : 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/ventes-ratees' + (enModification ? '/' + record.get('id') : ''),
                params: Ext.JSON.encode(donnees),
                success: function (response) {
                    var r = Ext.JSON.decode(response.responseText, true) || {};
                    if (!r.success) {
                        Ext.Msg.alert('Message', r.msg || 'L\'enregistrement a échoué.');
                        return;
                    }
                    prestigeVentesRateesBadge();
                    if (!enModification) {
                        // saisie a la chaine : le formulaire se vide, le curseur revient au produit
                        comboProduit.setValue(null);
                        comboProduit.setRawValue('');
                        champCip.setValue('');
                        champQuantite.setValue(1);
                        comboClient.setValue(null);
                        comboClient.setRawValue('');
                        champTelephone.setValue('');
                        comboMotif.setValue(null);
                        champCommentaire.setValue('');
                        comboProduit.focus(false, 100);
                    } else {
                        fenetre.close();
                    }
                    if (apres) {
                        apres(r);
                    }
                },
                failure: function () {
                    Ext.Msg.alert('Message', 'L\'enregistrement a échoué.');
                }
            });
        };

        var fenetre = Ext.create('Ext.window.Window', {
            title: enModification ? 'Modifier la demande' : 'Nouvelle vente ratée',
            modal: true,
            width: 480,
            bodyPadding: 12,
            layout: {type: 'vbox'},
            items: [comboProduit, champCip, champQuantite, comboClient, champTelephone, comboMotif,
                champCommentaire],
            buttons: [{
                    text: enModification ? 'Enregistrer' : 'Ajouter',
                    handler: enregistrer
                }, {
                    text: 'Fermer',
                    handler: function () {
                        fenetre.close();
                    }
                }]
        });
        fenetre.show();
        // curseur place automatiquement dans le champ de recherche a l'ouverture
        comboProduit.focus(false, 200);
        return fenetre;
    },

    // ------------------------------------------------------------------ analyse

    onAnalyser: function (bouton) {
        var ecran = this.ecran(bouton);
        var progress = Ext.MessageBox.wait('Calcul de l\'analyse . . .', 'Veuillez patienter');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ventes-ratees/analyse',
            params: ecran.parametresAnalyse(),
            success: function (response) {
                progress.hide();
                var r = Ext.JSON.decode(response.responseText, true) || {};
                var conteneur = Ext.get('vr-analyse');
                if (!conteneur) {
                    return;
                }
                if (!r.success) {
                    conteneur.update('L\'analyse n\'a pas pu être calculée.');
                    return;
                }
                conteneur.update(testextjs.controller.VentesRateesCtr.htmlAnalyse(r));
            },
            failure: function () {
                progress.hide();
                Ext.Msg.alert('Message', 'L\'analyse n\'a pas pu être calculée.');
            }
        });
    },

    statics: {
        /** HTML de l'onglet analyse : indicateurs puis classements et evolutions, en tableaux simples. */
        htmlAnalyse: function (r) {
            var e = Ext.String.htmlEncode;
            var ind = r.indicateurs || {};
            var carte = function (valeur, libelle) {
                return '<div style="display:inline-block;min-width:130px;margin:0 10px 10px 0;padding:10px 14px;'
                        + 'border:1px solid #d5dbe3;border-radius:6px;background:#f8fafc;text-align:center;">'
                        + '<div style="font-size:22px;font-weight:bold;color:#1a4f8b;">' + valeur + '</div>'
                        + '<div style="font-size:11px;color:#5a6b80;">' + libelle + '</div></div>';
            };
            var tableau = function (titre, lignes, colonnes) {
                var html = '<div style="display:inline-block;vertical-align:top;margin:0 22px 18px 0;">'
                        + '<div style="font-weight:bold;margin-bottom:6px;">' + titre + '</div>'
                        + '<table style="border-collapse:collapse;font-size:12px;">'
                        + '<tr style="background:#4C9A46;color:#fff;">';
                Ext.each(colonnes, function (c) {
                    html += '<th style="padding:4px 10px;text-align:left;">' + c[1] + '</th>';
                });
                html += '</tr>';
                if (!lignes || !lignes.length) {
                    html += '<tr><td colspan="' + colonnes.length
                            + '" style="padding:6px 10px;color:#888;">Aucune donnée</td></tr>';
                }
                Ext.each(lignes || [], function (l) {
                    html += '<tr>';
                    Ext.each(colonnes, function (c) {
                        var v = l[c[0]];
                        html += '<td style="padding:3px 10px;border-bottom:1px solid #e4e9f0;">'
                                + (typeof v === 'number' ? v : e(String(v == null ? '' : v))) + '</td>';
                    });
                    html += '</tr>';
                });
                return html + '</table></div>';
            };
            var colonnesProduit = [['libelle', 'Produit'], ['demandes', 'Demandes'], ['quantite', 'Qté'],
                ['nonCommandees', 'Non cdées']];
            var colonnesSerie = [['libelle', ''], ['demandes', 'Demandes'], ['quantite', 'Qté']];
            return carte(ind.nbDemandes || 0, 'Demandes')
                    + carte(ind.quantiteTotale || 0, 'Quantité totale demandée')
                    + carte(ind.produitsDistincts || 0, 'Produits distincts')
                    + carte(ind.clientsDistincts || 0, 'Clients distincts')
                    + carte((ind.commandees || 0) + ' (' + (ind.proportionCommandees || 0) + '%)',
                            'Demandes commandées')
                    + carte(ind.nonCommandees || 0, 'Demandes non commandées')
                    + carte(ind.inconnues || 0, 'Saisies libres (produit inconnu)')
                    + '<hr style="border:none;border-top:1px solid #d5dbe3;margin:8px 0 16px;">'
                    + tableau('Produits les plus demandés', r.plusDemandes, colonnesProduit)
                    + tableau('Plus grosses quantités cumulées', r.plusGrossesQuantites, colonnesProduit)
                    + tableau('Produits les plus souvent non commandés', r.plusNonCommandes, colonnesProduit)
                    + tableau('Produits inconnus les plus saisis', r.libresFrequents, colonnesProduit)
                    + tableau('Principaux motifs', r.parMotif, colonnesSerie)
                    + tableau('Demandes par jour', r.parJour, colonnesSerie)
                    + tableau('Par utilisateur', r.parUtilisateur, colonnesSerie);
        }
    },

    // ------------------------------------------------------------------ fenetre d'acces rapide (jour)

    /**
     * Fenetre modale du bouton panier : saisie rapide + demandes de la journee (lignes detaillees et
     * synthese par produit, sans fusion en base).
     */
    ouvrirModale: function () {
        var me = this;
        var existante = Ext.getCmp('vr-modale');
        if (existante) {
            existante.close();
            return;
        }

        var storeJour = new Ext.data.Store({
            fields: ['id', 'cip', 'designation', 'nomClient', 'telephone', 'motif', 'commentaire', 'date',
                'utilisateur', 'etat', {name: 'quantite', type: 'int'}, {name: 'commande', type: 'boolean'},
                {name: 'connu', type: 'boolean'}],
            proxy: {
                type: 'ajax',
                url: '../api/v1/ventes-ratees/jour',
                reader: {type: 'json', root: 'data'}
            },
            autoLoad: false
        });
        var storeSynthese = new Ext.data.Store({
            fields: ['cle', 'cip', 'designation', {name: 'quantiteTotale', type: 'int'},
                {name: 'nbDemandes', type: 'int'}, {name: 'nonCommandees', type: 'int'},
                {name: 'connu', type: 'boolean'}],
            proxy: {
                type: 'ajax',
                url: '../api/v1/ventes-ratees/jour',
                reader: {type: 'json', root: 'groupes'}
            },
            autoLoad: false
        });
        var recharger = function () {
            storeJour.load();
            storeSynthese.load();
            prestigeVentesRateesBadge();
        };

        var etatRenderer = function (v, meta, r) {
            return '<span style="color:' + (r.get('commande') ? '#1e8449' : '#c0392b') + ';font-weight:bold;">'
                    + v + '</span>';
        };

        var grilleJour = Ext.create('Ext.grid.Panel', {
            title: 'Demandes de la journée (détail)',
            store: storeJour,
            flex: 3,
            columns: [
                {header: 'Heure', dataIndex: 'date', width: 100},
                {header: 'CIP', dataIndex: 'cip', width: 80},
                {header: 'Produit / désignation', dataIndex: 'designation', flex: 2,
                    renderer: function (v, meta, r) {
                        var t = Ext.String.htmlEncode(v || '');
                        return r.get('connu') ? t : t + ' <span style="color:#9a6d00;">(libre)</span>';
                    }},
                {header: 'Qté', dataIndex: 'quantite', width: 46, align: 'right'},
                {header: 'Client', dataIndex: 'nomClient', flex: 1},
                {header: 'Motif', dataIndex: 'motif', flex: 1},
                {header: 'État', dataIndex: 'etat', width: 100, renderer: etatRenderer}
            ],
            tbar: [
                {text: 'Marquer commandé', iconCls: 'saveicon', handler: function () {
                        var s = grilleJour.getSelectionModel().getSelection();
                        if (!s.length) {
                            Ext.Msg.alert('Message', 'Sélectionnez d\'abord une demande.');
                            return;
                        }
                        if (s[0].get('commande')) {
                            Ext.Msg.alert('Message', 'Cette demande est déjà commandée.');
                            return;
                        }
                        me.commanderAvecConfirmation(s[0].get('id'), recharger);
                    }},
                {text: 'Supprimer', iconCls: 'cancelicon', handler: function () {
                        var s = grilleJour.getSelectionModel().getSelection();
                        if (!s.length) {
                            Ext.Msg.alert('Message', 'Sélectionnez d\'abord une demande.');
                            return;
                        }
                        Ext.Msg.confirm('Suppression', 'Retirer cette demande du registre ?', function (choix) {
                            if (choix !== 'yes') {
                                return;
                            }
                            Ext.Ajax.request({
                                method: 'DELETE',
                                url: '../api/v1/ventes-ratees/' + s[0].get('id'),
                                success: recharger,
                                failure: function () {
                                    Ext.Msg.alert('Message', 'La suppression a échoué.');
                                }
                            });
                        });
                    }},
                '->',
                {text: 'Ouvrir le menu Ventes ratées', handler: function () {
                        var modale = Ext.getCmp('vr-modale');
                        if (modale) {
                            modale.close();
                        }
                        testextjs.app.getController('App')
                                .onLoadNewComponent('ventesrateesmanager', 'Ventes ratées', '');
                    }}
            ]
        });

        var grilleSynthese = Ext.create('Ext.grid.Panel', {
            title: 'Synthèse du jour (produits cumulés)',
            store: storeSynthese,
            flex: 2,
            columns: [
                {header: 'Produit', dataIndex: 'designation', flex: 2,
                    renderer: function (v, meta, r) {
                        var t = Ext.String.htmlEncode(v || '');
                        return r.get('connu') ? t : t + ' <span style="color:#9a6d00;">(libre)</span>';
                    }},
                {header: 'Demandes', dataIndex: 'nbDemandes', width: 75, align: 'right'},
                {header: 'Qté totale', dataIndex: 'quantiteTotale', width: 75, align: 'right'},
                {header: 'Non cdées', dataIndex: 'nonCommandees', width: 75, align: 'right'}
            ]
        });

        var fenetre = Ext.create('Ext.window.Window', {
            id: 'vr-modale',
            title: '🛒 Ventes ratées - saisie rapide et liste du jour',
            modal: true,
            width: Math.min(1150, Ext.getBody().getViewSize().width - 60),
            height: Math.min(640, Ext.getBody().getViewSize().height - 60),
            layout: {type: 'hbox', align: 'stretch'},
            items: [grilleJour, {xtype: 'splitter'}, grilleSynthese],
            tbar: [{
                    text: 'Nouvelle demande',
                    iconCls: 'addicon',
                    handler: function () {
                        me.ouvrirSaisie(null, recharger);
                    }
                }, '->', {
                    xtype: 'tbtext',
                    id: 'vr-modale-total'
                }],
            listeners: {
                afterrender: function () {
                    recharger();
                    storeJour.on('load', function (s) {
                        var texte = Ext.get('vr-modale-total');
                        if (texte) {
                            texte.update(s.getCount() + ' demande(s) aujourd\'hui');
                        }
                    });
                }
            }
        });
        fenetre.show();
        // la saisie s'ouvre immediatement : curseur dans le champ produit, zone de quantite visible
        me.ouvrirSaisie(null, recharger);
    }
});

/* ------------------------------------------------------------------ bouton panier du bandeau */

/** Actualise la pastille du bouton panier (produits distincts non commandes du jour). */
function prestigeVentesRateesBadge() {
    Ext.Ajax.request({
        method: 'GET',
        url: '../api/v1/ventes-ratees/compteur-jour',
        success: function (response) {
            var r = Ext.JSON.decode(response.responseText, true) || {};
            var badge = Ext.get('vr-badge');
            if (!badge) {
                return;
            }
            var total = r.total || 0;
            if (total > 0) {
                badge.dom.innerHTML = total > 99 ? '99+' : total;
                badge.setStyle('display', 'inline-block');
            } else {
                badge.setStyle('display', 'none');
            }
        }
    });
}

/** Ouvre la fenetre modale des ventes ratees depuis le bouton panier. */
function prestigeShowVentesRatees() {
    testextjs.app.getController('VentesRateesCtr').ouvrirModale();
}
