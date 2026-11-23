package rest.service.impl.journal;

import dal.TFamille;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import org.apache.commons.lang3.StringUtils;
import rest.service.impl.achats.ModificationBl;

/**
 * Retours du 23/11, proposition 1 : trace d'une modification de la fiche article (qui, quand, quel champ, avant →
 * apres).
 * <ul>
 * <li>{@link #photo} : les champs de la fiche, mis en forme, dans l'ordre de l'ecran ;</li>
 * <li>{@link #ecarts} : les champs reellement changes entre deux photos ;</li>
 * <li>{@link #description} : la ligne du journal (255 caracteres au plus) ; le detail, une ligne par champ, est celui
 * des BL ({@link ModificationBl#detail}, relu par {@link ModificationBl#lire}).</li>
 * </ul>
 * La ligne du journal porte l'identifiant de la fiche (str_TYPE_LOG) : l'onglet « Historique » la retrouve meme si le
 * CIP change ensuite.
 */
public final class ModificationFiche {

    /** Longueur de la colonne str_DESCRIPTION. */
    public static final int LONGUEUR_DESCRIPTION = 255;

    private static final LinkedHashMap<String, Function<TFamille, String>> CHAMPS = new LinkedHashMap<>();

    static {
        CHAMPS.put("Libellé", f -> ModificationBl.texte(f.getStrNAME()));
        CHAMPS.put("Désignation", f -> ModificationBl.texte(f.getStrDESCRIPTION()));
        CHAMPS.put("CIP", f -> ModificationBl.texte(f.getIntCIP()));
        CHAMPS.put("CIP 2", f -> ModificationBl.texte(f.getIntCIP2()));
        CHAMPS.put("CIP 3", f -> ModificationBl.texte(f.getIntCIP3()));
        CHAMPS.put("CIP 4", f -> ModificationBl.texte(f.getIntCIP4()));
        CHAMPS.put("EAN 13", f -> ModificationBl.texte(f.getIntEAN13()));
        CHAMPS.put("EAN fabricant", f -> ModificationBl.texte(f.getCodeEanFabriquant()));
        CHAMPS.put("PSCODE", f -> ModificationBl.texte(f.getStrPSCODE()));
        CHAMPS.put("Prix de vente", f -> ModificationBl.montant(f.getIntPRICE()));
        CHAMPS.put("Prix TIPS", f -> ModificationBl.montant(f.getIntPRICETIPS()));
        CHAMPS.put("Prix d'achat facture", f -> ModificationBl.montant(f.getIntPAF()));
        CHAMPS.put("Prix d'achat tarif", f -> ModificationBl.montant(f.getIntPAT()));
        // 0 et vide disent la meme chose (pas de prix de reference) : le formulaire renvoie vide pour 0
        CHAMPS.put("Prix de référence",
                f -> ModificationBl.montant(f.getCmuPrice() == null || f.getCmuPrice() == 0 ? null : f.getCmuPrice()));
        CHAMPS.put("Taux de marque", f -> ModificationBl.montant(f.getIntTAUXMARQUE()));
        CHAMPS.put("Tableau", f -> ModificationBl.texte(f.getIntT()));
        CHAMPS.put("Code S", f -> ModificationBl.montant(f.getIntS()));
        CHAMPS.put("Grossiste",
                f -> ModificationBl.texte(f.getLgGROSSISTEID() == null ? null : f.getLgGROSSISTEID().getStrLIBELLE()));
        CHAMPS.put("Famille", f -> ModificationBl
                .texte(f.getLgFAMILLEARTICLEID() == null ? null : f.getLgFAMILLEARTICLEID().getStrLIBELLE()));
        CHAMPS.put("Code acte",
                f -> ModificationBl.texte(f.getLgCODEACTEID() == null ? null : f.getLgCODEACTEID().getStrLIBELLEE()));
        CHAMPS.put("Code gestion", f -> ModificationBl
                .texte(f.getLgCODEGESTIONID() == null ? null : f.getLgCODEGESTIONID().getStrCODEBAREME()));
        CHAMPS.put("TVA", f -> f.getLgCODETVAID() == null || f.getLgCODETVAID().getIntVALUE() == null ? "(vide)"
                : f.getLgCODETVAID().getIntVALUE() + " %");
        CHAMPS.put("Type d'étiquette", f -> ModificationBl
                .texte(f.getLgTYPEETIQUETTEID() == null ? null : f.getLgTYPEETIQUETTEID().getStrDESCRIPTION()));
        CHAMPS.put("Remise",
                f -> ModificationBl.texte(f.getLgREMISEID() == null ? null : f.getLgREMISEID().getStrNAME()));
        CHAMPS.put("Code remise", f -> ModificationBl.texte(f.getStrCODEREMISE()));
        CHAMPS.put("Taux de remboursement", f -> ModificationBl.texte(f.getStrCODETAUXREMBOURSEMENT()));
        CHAMPS.put("Emplacement",
                f -> ModificationBl.texte(f.getLgZONEGEOID() == null ? null : f.getLgZONEGEOID().getStrLIBELLEE()));
        CHAMPS.put("Code géo", f -> ModificationBl.texte(f.getStrCODEGEOARTICLE()));
        CHAMPS.put("Code géo réserve", f -> ModificationBl.texte(f.getStrCODEGEOARTICLERESERVE()));
        CHAMPS.put("Colisage", f -> ModificationBl.montant(f.getIntCOLISAGE()));
        CHAMPS.put("Quantité détail", f -> ModificationBl.montant(f.getIntNUMBERDETAIL()));
        // le seuil affiche par la fiche est int_SEUIL_MIN (l'enregistrement le recopie dans int_STOCK_REAPROVISONEMENT)
        CHAMPS.put("Seuil de réapprovisionnement", f -> ModificationBl.montant(f.getIntSEUILMIN()));
        CHAMPS.put("Quantité de réapprovisionnement", f -> ModificationBl.montant(f.getIntQTEREAPPROVISIONNEMENT()));
        CHAMPS.put("Réserve", f -> oui(f.getBoolRESERVE()));
        CHAMPS.put("Seuil de réserve", f -> ModificationBl.montant(f.getIntSEUILRESERVE()));
        CHAMPS.put("Seuil mini rayon", f -> ModificationBl.montant(f.getIntSEUILMINIRAYON()));
        CHAMPS.put("Calcul du seuil", f -> oui(f.getBoolCALCULSEUIL()));
        CHAMPS.put("Suggérable", f -> oui(f.getBoolSUGGERABLE()));
        CHAMPS.put("Remise autorisée", f -> oui(f.getBoolREMISE()));
        CHAMPS.put("Q1", f -> ModificationBl.montant(f.getIntQ1SEUILREAPPRO()));
        CHAMPS.put("Q2", f -> ModificationBl.montant(f.getIntQ2QTEREAPPRO()));
        CHAMPS.put("Date de péremption", f -> date(f.getDtPEREMPTION()));
        CHAMPS.put("Laboratoire",
                f -> ModificationBl.texte(f.getLaboratoire() == null ? null : f.getLaboratoire().getLibelle()));
        CHAMPS.put("Gamme", f -> ModificationBl.texte(f.getGamme() == null ? null : f.getGamme().getLibelle()));
        CHAMPS.put("Statut", f -> statut(f.getStrSTATUT()));
    }

    private ModificationFiche() {
    }

    private static String oui(Boolean b) {
        return b == null ? "(vide)" : (b ? "oui" : "non");
    }

    private static String date(Date d) {
        return d == null ? "(vide)" : new SimpleDateFormat("dd/MM/yyyy").format(d);
    }

    /** Statut en clair : la modification d'une fiche la remet « active » (comportement d'origine). */
    static String statut(String s) {
        if (s == null || s.trim().isEmpty()) {
            return "(vide)";
        }
        switch (s.trim()) {
        case "enable":
            return "active";
        case "disable":
            return "désactivée";
        case "delete":
            return "supprimée";
        default:
            return s.trim();
        }
    }

    /** Les libelles des champs suivis, dans l'ordre de l'ecran. */
    public static List<String> libelles() {
        return new ArrayList<>(CHAMPS.keySet());
    }

    /** Les champs de la fiche, mis en forme ; un champ illisible vaut « (illisible) » sans bloquer la photo. */
    public static Map<String, String> photo(TFamille f) {
        Map<String, String> m = new LinkedHashMap<>();
        for (Map.Entry<String, Function<TFamille, String>> e : CHAMPS.entrySet()) {
            String v;
            try {
                v = e.getValue().apply(f);
            } catch (RuntimeException ex) {
                v = "(illisible)";
            }
            m.put(e.getKey(), v);
        }
        return m;
    }

    /** Les champs changes, dans l'ordre de la photo d'avant ; liste vide : rien n'a change. */
    public static List<ModificationBl.Champ> ecarts(Map<String, String> avant, Map<String, String> apres) {
        List<ModificationBl.Champ> l = new ArrayList<>();
        for (Map.Entry<String, String> e : avant.entrySet()) {
            String a = apres.get(e.getKey());
            ModificationBl.ajouter(l, e.getKey(), String.valueOf(e.getValue()), String.valueOf(a));
        }
        return l;
    }

    /**
     * Ligne du journal : « Modification de la fiche CIP NOM par AUTEUR : champ, champ » ; coupee a 255 caracteres (le
     * detail complet est dans str_DETAIL).
     */
    public static String description(String cip, String nom, String auteur, List<ModificationBl.Champ> champs) {
        StringBuilder libelles = new StringBuilder();
        for (ModificationBl.Champ c : champs) {
            libelles.append(libelles.length() == 0 ? "" : ", ").append(c.libelle.toLowerCase(java.util.Locale.FRENCH));
        }
        return StringUtils.left("Modification de la fiche " + StringUtils.trimToEmpty(cip) + " "
                + StringUtils.trimToEmpty(nom) + " par " + StringUtils.trimToEmpty(auteur) + " : " + libelles,
                LONGUEUR_DESCRIPTION);
    }
}
