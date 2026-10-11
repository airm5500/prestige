package etiquetagepro.disposition;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import rest.report.pdf.ContenuEtendu;
import rest.report.pdf.Gs1;
import rest.report.pdf.LabelSheetPdf;

/**
 * Ce que contient le code d'une etiquette, selon son type et sa disposition : CIP (code-barres), chaine GS1 (QR et
 * DataMatrix, inchangee), ou contenu etendu avec les informations cochees « dans le code » (DataMatrix+, QR+).
 */
public final class ContenuCode {

    private ContenuCode() {
    }

    /** Cle du contenu etendu de chaque element qu'on peut mettre dans le code. */
    static String cle(ElementEtiquette e) {
        switch (e) {
        case DESIGNATION:
            return ContenuEtendu.NOM;
        case PRIX:
            return ContenuEtendu.PRIX;
        case PHARMACIE:
            return ContenuEtendu.PHA;
        case GROSSISTE:
            return ContenuEtendu.GRO;
        case CODE_GEO:
            return ContenuEtendu.GEO;
        case CODE_UNIQUE:
            return ContenuEtendu.COD;
        default:
            return null;
        }
    }

    /**
     * Contenu du code. {@code valeurs} : texte de chaque element (le prix tel qu'imprime) ; {@code gs1Brute} : chaine
     * GS1 de l'etiquette (CIP, lot, peremption, EAN) ; {@code peremption} affichee jj/mm/aaaa.
     */
    public static String contenu(Disposition d, Map<ElementEtiquette, String> valeurs, String cip, String gs1Brute,
            String lot, String peremption, String ean) {
        String type = d.getTypeCode();
        if (LabelSheetPdf.CODE_BARRES.equals(type)) {
            return cip == null ? "" : cip.trim();
        }
        if (!d.estEtendu()) {
            return gs1Brute;
        }
        Map<String, String> infos = new HashMap<>();
        for (Placement p : d.getPlacements()) {
            String c = cle(p.getElement());
            if (c != null && p.isDansLeCode()) {
                String v = valeurs.get(p.getElement());
                infos.put(c, ContenuEtendu.PRIX.equals(c) ? ContenuEtendu.prixChiffres(v) : v);
            }
        }
        if (LabelSheetPdf.DATAMATRIX_PLUS.equals(type)) {
            return ContenuEtendu.dataMatrixPlus(gs1Brute, infos);
        }
        infos.put(ContenuEtendu.CIP, cip);
        infos.put(ContenuEtendu.LOT, lot);
        infos.put(ContenuEtendu.PER, peremption);
        infos.put(ContenuEtendu.EAN, ean);
        return ContenuEtendu.qrPlus(infos);
    }

    /**
     * Contenu le plus long possible pour cette disposition (CIP de 13 chiffres, lot de 20 caracteres, chaque
     * information cochee a sa longueur maximale) : la lisibilite est controlee sur ce cas, elle vaut donc pour tous les
     * produits.
     */
    public static String pireCas(Disposition d) {
        String cip = "3400930000014", lot = "ABCDEFGHJKLMNPQRSTUV", ean = "3400930000014";
        String brute = Gs1.brute(ean, LocalDate.of(2029, 12, 31), lot, cip);
        Map<ElementEtiquette, String> valeurs = new HashMap<>();
        for (ElementEtiquette e : ElementEtiquette.values()) {
            String c = cle(e);
            if (c != null) {
                int n = ContenuEtendu.longueurMax(c);
                valeurs.put(e, ContenuEtendu.PRIX.equals(c) ? "999999999.99"
                        : "ABCDEFGHJKLMNPQRSTUVWXYZABCDEFGHJKLMNPQRSTUVWXYZ".substring(0, Math.min(n, 48)));
            }
        }
        return contenu(d, valeurs, cip, brute, lot, "31/12/2029", ean);
    }
}
