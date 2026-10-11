package etiquetagepro;

import java.io.OutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.function.UnaryOperator;
import rest.report.pdf.Gs1;
import rest.report.pdf.LabelSheetPdf;

/**
 * Etiquettage Pro : des lignes de produits aux etiquettes imprimees, avec le moteur de planches de Prestige
 * ({@link LabelSheetPdf}) : memes formats, memes dessins (code-barres du CIP ; QR code ou DataMatrix GS1 avec le nom de
 * la pharmacie, le CIP, le prix, le grossiste et le code propre a l'etiquette). Une ligne en erreur n'est pas imprimee.
 * Rien n'est ecrit dans les fiches articles.
 */
public final class MoteurEtiquettes {

    /** Garde-fou : etiquettes par impression (environ 300 planches de 65). */
    public static final int MAX_ETIQUETTES = 20000;
    private static final DateTimeFormatter JJ_MM_AAAA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private MoteurEtiquettes() {
    }

    /** Nombre d'etiquettes que donneront ces lignes (lignes imprimables seulement). */
    public static int total(List<LigneEtiquette> lignes) {
        int n = 0;
        for (LigneEtiquette l : lignes) {
            if (l.imprimable()) {
                n += l.getNombre();
            }
        }
        return n;
    }

    /** Prix affiche : « 1 500 CFA » ; avec decimales « 12,50 EUR ». */
    public static String prixAffiche(BigDecimal prix, String monnaie) {
        if (prix == null) {
            return "";
        }
        BigDecimal p = prix.stripTrailingZeros();
        String chiffres;
        if (p.scale() <= 0) {
            chiffres = String.format(java.util.Locale.ROOT, "%,d", p.toBigInteger()).replace(',', ' ');
        } else {
            BigDecimal d = prix.setScale(2, RoundingMode.HALF_UP);
            chiffres = String.format(java.util.Locale.ROOT, "%,d", d.toBigInteger()).replace(',', ' ') + ","
                    + d.remainder(BigDecimal.ONE).abs().movePointRight(2).setScale(0, RoundingMode.HALF_UP)
                            .toPlainString().replaceAll("^(\\d)$", "0$1");
        }
        return monnaie == null || monnaie.isEmpty() ? chiffres : chiffres + " " + monnaie;
    }

    /** Etiquettes des lignes imprimables, chacune repetee selon son nombre. */
    public static List<LabelSheetPdf.LabelData> etiquettes(List<LigneEtiquette> lignes, OptionsImpression o,
            RegistreCodes registre) {
        if (total(lignes) > MAX_ETIQUETTES) {
            throw new IllegalArgumentException("Trop d'étiquettes en une fois (" + total(lignes) + ", " + MAX_ETIQUETTES
                    + " au plus) : imprimez en plusieurs fois.");
        }
        List<LabelSheetPdf.LabelData> resultat = new ArrayList<>();
        for (LigneEtiquette l : lignes) {
            if (!l.imprimable()) {
                continue;
            }
            String cip = l.valeur(Zone.CIP);
            /* retours du 11/10 : le type d'etiquette du produit, s'il en a un et que l'impression suit les produits */
            String type = o.typeCodePour(cip);
            boolean deuxD = !LabelSheetPdf.CODE_BARRES.equals(type);
            String date = l.valeur(Zone.DATE).isEmpty() ? o.getDateParDefaut() : l.valeur(Zone.DATE);
            String prix = prixAffiche(l.getPrix(), o.getMonnaie());
            String brute = deuxD ? Gs1.brute(l.valeur(Zone.EAN), l.getPeremption(), l.valeur(Zone.LOT), cip) : null;
            String per = l.getPeremption() == null ? null : l.getPeremption().format(JJ_MM_AAAA);
            String lot = l.valeur(Zone.LOT).isEmpty() ? null : l.valeur(Zone.LOT);
            for (int i = 0; i < l.getNombre(); i++) {
                LabelSheetPdf.LabelData d = new LabelSheetPdf.LabelData(o.getOfficine(), l.valeur(Zone.GROSSISTE),
                        l.valeur(Zone.DESIGNATION), cip, prix, date).mention(l.valeur(Zone.MENTION))
                                .codeGeo(l.valeur(Zone.CODE_GEO));
                if (deuxD && brute != null && !brute.isEmpty()) {
                    d.codeEtendu(type, brute, lot, per);
                    d.codeUnique(registre == null ? null : registre.attribuer(cip));
                }
                resultat.add(d);
            }
        }
        return resultat;
    }

    /** Planche PDF des lignes imprimables. */
    public static void pdf(OutputStream sortie, List<LigneEtiquette> lignes, OptionsImpression o,
            RegistreCodes registre, UnaryOperator<String> configuration) throws Exception {
        pdf(sortie, lignes, o, registre, configuration, null);
    }

    /**
     * Planche PDF avec les dispositions personnalisees (null : dessin historique ; les codes etendus prennent la
     * disposition proposee). Une disposition illisible sur ce format n'est pas imprimee : le message dit pourquoi.
     */
    public static void pdf(OutputStream sortie, List<LigneEtiquette> lignes, OptionsImpression o,
            RegistreCodes registre, UnaryOperator<String> configuration, LabelSheetPdf.SourceDisposition dispositions)
            throws Exception {
        LabelSheetPdf.SheetFormat format = o.planche(configuration);
        java.util.Set<String> types = new java.util.LinkedHashSet<>();
        for (LigneEtiquette l : lignes) {
            if (l.imprimable()) {
                types.add(o.typeCodePour(l.valeur(Zone.CIP)));
            }
        }
        for (String t : types) {
            controlerLisible(dispositionEffective(t, format, dispositions));
        }
        List<LabelSheetPdf.LabelData> e = etiquettes(lignes, o, registre);
        if (e.isEmpty()) {
            throw new IllegalArgumentException("Aucune étiquette à imprimer : corrigez les lignes en erreur.");
        }
        LabelSheetPdf.write(sortie, e, o.getPositionDepart(), format, dispositions);
    }

    /** Refuse une disposition illisible sur son format, avec la raison. */
    public static void controlerLisible(etiquetagepro.disposition.Disposition d) {
        if (d != null) {
            etiquetagepro.disposition.ControleDisposition.Resultat r = etiquetagepro.disposition.ControleDisposition
                    .controler(d);
            if (!r.valide()) {
                StringBuilder m = new StringBuilder("Étiquette illisible sur ce format (")
                        .append(etiquetagepro.disposition.Disposition
                                .cle(d.getTypeCode(), d.getLargeur(), d.getHauteur()).replace('|', ' '))
                        .append(") : ");
                for (etiquetagepro.disposition.ControleDisposition.Probleme p : r.problemes) {
                    if (p.bloquant) {
                        m.append(p.message).append(' ');
                    }
                }
                throw new IllegalArgumentException(
                        m.append("Ajustez-la dans l'onglet Personnalisation ou choisissez une planche plus grande.")
                                .toString());
            }
        }
    }

    /** Disposition qui servira pour ce type et cette planche (null : dessin historique). */
    public static etiquetagepro.disposition.Disposition dispositionEffective(String type,
            LabelSheetPdf.SheetFormat format, LabelSheetPdf.SourceDisposition dispositions) {
        float[] dim = LabelSheetPdf.dimension(format);
        etiquetagepro.disposition.Disposition d = dispositions == null ? null : dispositions.pour(type, dim[0], dim[1]);
        if (d == null && (LabelSheetPdf.QR_PLUS.equals(type) || LabelSheetPdf.DATAMATRIX_PLUS.equals(type))) {
            d = etiquetagepro.disposition.Disposition.parDefaut(type, dim[0], dim[1]);
        }
        return d;
    }

    /** Page de test de la planche (contours numerotes), pour caler l'imprimante. */
    public static void pageDeTest(OutputStream sortie, OptionsImpression o, UnaryOperator<String> configuration)
            throws Exception {
        LabelSheetPdf.writeTestPage(sortie, o.planche(configuration));
    }
}
