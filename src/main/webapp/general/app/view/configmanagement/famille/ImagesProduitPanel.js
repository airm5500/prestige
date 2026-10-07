/* global Ext */

/*
 * IMAGES PRODUIT (plan d'octobre, section 6) : panneau commun au detail (lecture) et a la modification de la fiche.
 *
 * Image principale en grand (vignette ; un clic ouvre l'image dans un onglet), autres images en miniatures. En
 * modification et avec le droit P_PRODUIT_IMAGES_MAJ : « Ajouter » (ou « Modifier » si une image existe : la nouvelle
 * devient principale et remplace l'ancienne), « Retirer », et un clic sur une miniature la rend principale. JPG, PNG
 * ou WEBP, 5 Mo au plus (verifie par le serveur sur le contenu reel du fichier).
 */
Ext.define('testextjs.view.configmanagement.famille.ImagesProduitPanel', {
    extend: 'Ext.panel.Panel',
    xtype: 'imagesproduitpanel',
    cls: 'img-produit',
    familleId: null,
    /** true : boutons d'edition (sous reserve du droit). */
    edition: false,
    bodyPadding: 6,
    minHeight: 200,

    initComponent: function () {
        var me = this;
        me.html = '<div class="img-zone"><div class="img-vide">Chargement…</div></div>';
        me.dockedItems = me.edition ? [{
                xtype: 'toolbar', dock: 'bottom', itemId: 'barreImages', hidden: true,
                items: [{
                        xtype: 'form', itemId: 'formImage', border: false, bodyStyle: 'background:transparent', layout: 'hbox',
                        items: [{xtype: 'filefield', name: 'image', itemId: 'champImage', buttonOnly: true, hideLabel: true,
                                buttonText: 'Ajouter', buttonConfig: {itemId: 'btnAjouterImage'},
                                listeners: {change: function () {
                                        me.envoyer();
                                    }}},
                            {xtype: 'hiddenfield', name: 'principale', itemId: 'champPrincipale', value: 'false'}]
                    }, '->', {text: 'Retirer', itemId: 'btnRetirerImage', hidden: true, handler: function () {
                            me.retirer();
                        }}]
            }] : [];
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.getEl().on('click', me.surClic, me, {delegate: '[data-img]'});
            me.charger();
        });
    },

    charger: function () {
        var me = this;
        if (!me.familleId) {
            me.dessiner({data: [], creation: true});
            return;
        }
        Ext.Ajax.request({
            method: 'GET', url: '../api/v1/produit-images/' + encodeURIComponent(me.familleId),
            success: function (r) {
                if (!me.isDestroyed) {
                    me.dessiner(Ext.decode(r.responseText, true) || {data: []});
                }
            }
        });
    },

    dessiner: function (o) {
        var me = this, enc = Ext.String.htmlEncode, data = o.data || [], principale = data[0];
        me.donnees = data;
        me.modifiable = !!o.modifiable && me.edition;
        var html;
        if (o.creation) {
            html = '<div class="img-vide">Enregistrez d\'abord l\'article pour lui ajouter une image.</div>';
        } else if (!principale) {
            html = '<div class="img-vide">Aucune image</div>';
        } else {
            html = '<a class="img-principale" data-img="ouvrir" data-id="' + enc(principale.id) + '" title="Ouvrir l\'image dans un onglet">'
                    + '<img src="' + enc(principale.vignette) + '" alt="Image du produit"></a>'
                    + (data.length > 1 ? '<div class="img-miniatures">' + Ext.Array.map(data.slice(1), function (i) {
                        return '<img data-img="' + (me.modifiable ? 'principale' : 'ouvrir') + '" data-id="' + enc(i.id) + '" src="' + enc(i.vignette)
                                + '" title="' + (me.modifiable ? 'Choisir comme image principale' : 'Ouvrir') + '">';
                    }).join('') + '</div>' : '');
        }
        /* retours du 07/10 : le fichier de l'image principale et le dossier des images, lisibles et copiables */
        if (principale && principale.fichier) {
            html += '<div class="img-chemin" title="Chemin du fichier sur le serveur (en base, table t_famille_image : '
                    + enc(principale.chemin) + ')">Fichier : <span>' + enc(principale.fichier) + '</span></div>';
        } else if (o.dossier && !o.creation) {
            html += '<div class="img-chemin">Dossier des images : <span>' + enc(o.dossier) + '</span></div>';
        }
        me.update('<div class="img-zone">' + html + '</div>');
        var barre = me.down('#barreImages');
        if (barre) {
            barre.setVisible(me.modifiable);
            var bouton = me.down('#champImage');
            if (bouton && bouton.button) {
                bouton.button.setText(principale ? 'Modifier' : 'Ajouter');
            }
            me.down('#champPrincipale').setValue(principale ? 'true' : 'false');
            me.down('#btnRetirerImage').setVisible(!!principale);
        }
    },

    surClic: function (e, cible) {
        var me = this, action = cible.getAttribute('data-img'), id = cible.getAttribute('data-id');
        e.preventDefault();
        if (action === 'ouvrir') {
            window.open('../api/v1/produit-images/' + encodeURIComponent(me.familleId) + '/' + encodeURIComponent(id) + '/fichier');
        } else if (action === 'principale') {
            Ext.Ajax.request({
                method: 'PUT', url: '../api/v1/produit-images/' + encodeURIComponent(me.familleId) + '/' + encodeURIComponent(id) + '/principale',
                callback: function () {
                    me.charger();
                }
            });
        }
    },

    envoyer: function () {
        var me = this, form = me.down('#formImage').getForm();
        form.submit({
            url: '../api/v1/produit-images/' + encodeURIComponent(me.familleId),
            waitMsg: 'Envoi de l\'image…',
            success: function () {
                me.charger();
            },
            failure: function (f, action) {
                var r = action && action.result;
                if (r && r.success) {
                    me.charger();
                    return;
                }
                Ext.MessageBox.alert('Image du produit', (r && r.message) || 'L\'image n\'a pas pu être enregistrée.');
                me.charger();
            }
        });
    },

    retirer: function () {
        var me = this, p = (me.donnees || [])[0];
        if (!p) {
            return;
        }
        Ext.MessageBox.confirm('Image du produit', 'Retirer l\'image principale de ce produit ?', function (btn) {
            if (btn !== 'yes') {
                return;
            }
            Ext.Ajax.request({
                method: 'DELETE', url: '../api/v1/produit-images/' + encodeURIComponent(me.familleId) + '/' + encodeURIComponent(p.id),
                callback: function () {
                    me.charger();
                }
            });
        });
    }
});
