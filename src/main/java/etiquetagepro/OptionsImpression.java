package etiquetagepro;

import java.util.HashMap;
import java.util.Map;
import java.util.function.UnaryOperator;
import rest.report.pdf.LabelSheetPdf;

/**
 * Etiquettage Pro : choix d'impression. Type de code (code-barres standard, DataMatrix, QR code), planche (memes
 * modeles que Prestige, ou format libre : colonnes, lignes, dimensions et calage donnes a l'ecran), premiere position,
 * nom de la pharmacie, monnaie du prix et date imprimee par defaut. Rien n'est enregistre : ces choix valent pour
 * l'impression.
 */
public final class OptionsImpression {

    private String typeCode = LabelSheetPdf.CODE_BARRES;
    private String modele;
    private final Map<String, String> format = new HashMap<>();
    private int positionDepart = 1;
    private String officine = "";
    private String monnaie = "CFA";
    private String dateParDefaut = "";
    /** Retours du 11/10 : type d'etiquette de chaque produit (CIP -> code), prioritaire sur le type choisi. */
    private Map<String, String> codesParCip = new HashMap<>();
    private boolean parProduit;

    public OptionsImpression typeCode(String t) {
        /* Etiquettage Pro : les 3 codes habituels et les codes etendus QR+ / DataMatrix+ (hors vente) */
        this.typeCode = LabelSheetPdf.typeCodeEtendu(t);
        return this;
    }

    public String getTypeCode() {
        return typeCode;
    }

    /**
     * Imprimer selon le type d'etiquette de chaque produit : un CIP present dans {@code codes} prend son code, les
     * autres le type choisi.
     */
    public OptionsImpression parProduit(boolean p, Map<String, String> codes) {
        this.parProduit = p;
        this.codesParCip = codes == null ? new HashMap<>() : new HashMap<>(codes);
        return this;
    }

    public boolean isParProduit() {
        return parProduit;
    }

    /** Code d'etiquette pour ce CIP : le type du produit si l'impression suit les produits, sinon le type choisi. */
    public String typeCodePour(String cip) {
        String c = parProduit && cip != null ? codesParCip.get(cip.trim()) : null;
        return c == null ? typeCode : LabelSheetPdf.typeCodeEtendu(c);
    }

    public OptionsImpression modele(String m) {
        this.modele = m;
        return this;
    }

    public String getModele() {
        return modele;
    }

    /**
     * Reglage de planche pris a l'ecran (cle KEY_ETIQUETTE_... de {@link LabelSheetPdf}) ; prioritaire sur la
     * configuration.
     */
    public OptionsImpression reglage(String cle, String valeur) {
        if (cle != null && cle.startsWith("KEY_ETIQUETTE_") && valeur != null && !valeur.trim().isEmpty()) {
            format.put(cle, valeur.trim());
        }
        return this;
    }

    public OptionsImpression positionDepart(int p) {
        this.positionDepart = Math.max(1, p);
        return this;
    }

    public int getPositionDepart() {
        return positionDepart;
    }

    public OptionsImpression officine(String o) {
        this.officine = o == null ? "" : o.trim();
        return this;
    }

    public String getOfficine() {
        return officine;
    }

    public OptionsImpression monnaie(String m) {
        this.monnaie = m == null ? "" : m.trim();
        return this;
    }

    public String getMonnaie() {
        return monnaie;
    }

    public OptionsImpression dateParDefaut(String d) {
        this.dateParDefaut = d == null ? "" : d.trim();
        return this;
    }

    public String getDateParDefaut() {
        return dateParDefaut;
    }

    /** Geometrie de la planche : reglages de l'ecran, a defaut la configuration donnee (peut etre null). */
    public LabelSheetPdf.SheetFormat planche(UnaryOperator<String> configuration) {
        UnaryOperator<String> lecteur = cle -> format.containsKey(cle) ? format.get(cle)
                : configuration != null ? configuration.apply(cle) : null;
        String m = modele;
        if (m == null || m.trim().isEmpty()) {
            m = lecteur.apply(LabelSheetPdf.KEY_MODELE);
        }
        return LabelSheetPdf.formatFor(m, lecteur);
    }
}
