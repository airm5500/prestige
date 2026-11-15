/**
 * Plugin for displaying a progressbar inside of a paging toolbar
 * instead of plain text.
 */
Ext.define('Ext.ux.ProgressBarPager', {

    requires: ['Ext.ProgressBar'],
    /**
     * @cfg {Number} width
     * <p>The default progress bar width.  Default is 225.</p>
    */
    width   : 320,
    /**
     * @cfg {String} defaultText
    * <p>The text to display while the store is loading.  Default is 'Loading...'</p>
     */
    defaultText    : 'Loading...',
    /**
     * @cfg {Object} defaultAnimCfg
     * <p>A {@link Ext.fx.Anim Ext.fx.Anim} configuration object.</p>
     */
    defaultAnimCfg : {
		duration: 1000,
		easing: 'bounceOut'	
	},	

    /**
     * Creates new ProgressBarPager.
     * @param {Object} config Configuration options
     */
    constructor : function(config) {
        if (config) {
            Ext.apply(this, config);
        }
    },
    //public
    init : function (parent) {
        var displayItem;
        if (parent.displayInfo) {
            this.parent = parent;

            displayItem = parent.child("#displayItem");
            if (displayItem) {
                parent.remove(displayItem, true);
            }

            this.progressBar = Ext.create('Ext.ProgressBar', {
                text    : this.defaultText,
                width   : this.width,
                animate : this.defaultAnimCfg,
                style: {
                    cursor: 'pointer'
                },
                listeners: {
                    el: {
                        scope: this,
                        click: this.handleProgressBarClick
                    }
                }
            });

            parent.displayItem = this.progressBar;

            // Prestige (15/11) : barre plus large, texte plus grand (classe prestige-pager-barre), et centree dans
            // la barre d'outils : un remplissage de chaque cote (le premier est le « -> » d'origine).
            parent.add(parent.displayItem);
            this.progressBar.addCls('prestige-pager-barre');
            parent.add({xtype: 'tbfill'});
            Ext.apply(parent, this.parentOverrides);
        }
    },
    // private
    // This method handles the click for the progress bar
    // Prestige (15/11) : la taille de page est celle du MAGASIN (la barre n'en a pas : pages valait NaN et la page
    // demandee aussi, d'ou « Page NaN » et une demande rejetee) ; page bornee au nombre de pages ; et le changement
    // passe par « beforechange », comme les fleches de la barre, pour que les ecrans y reposent leurs filtres.
    handleProgressBarClick : function(e){
        var parent = this.parent,
            store = parent.store,
            box = this.progressBar.getBox(),
            xy = e.getXY(),
            position = xy[0]- box.x,
            taille = store.pageSize,
            pages = taille > 0 ? Math.ceil(store.getTotalCount() / taille) : 0,
            newPage;

        if (!(pages > 0) || !(box.width > 0)) {
            return;
        }
        newPage = Math.min(pages, Math.max(Math.ceil(position / (box.width / pages)), 1));
        if (parent.fireEvent('beforechange', parent, newPage) !== false) {
            store.loadPage(newPage);
        }
    },

    // private, overriddes
    parentOverrides  : {
        // private
        // This method updates the information via the progress bar.
        updateInfo : function(){
            if(this.displayItem){
                var count = this.store.getCount(),
                    pageData = this.getPageData(),
                    message = count === 0 ?
                    this.emptyMsg :
                    Ext.String.format(
                        this.displayMsg,
                        pageData.fromRecord, pageData.toRecord, this.store.getTotalCount()
                    ),
                    percentage = pageData.pageCount > 0 ? (pageData.currentPage / pageData.pageCount) : 0;

                this.displayItem.updateProgress(percentage, message, this.animate || this.defaultAnimConfig);
            }
        }
    }
});

