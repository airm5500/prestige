package rest.service.impl;

import com.itextpdf.text.BaseColor;
import com.itextpdf.text.Document;
import com.itextpdf.text.Element;
import com.itextpdf.text.Font;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.Phrase;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;

/**
 * Retour du 05/11 : menu « Historique » de l'ordonnancier. Il retrace les ventes des produits concernes, « sensibles »
 * ou de l'ordonnancier (soumis a ordonnance avec un code tableau), avec ou sans medecin : le registre, lui, ne garde
 * que les ventes rattachees a un medecin.
 *
 * <p>
 * Colonnes : date, numero de ticket (le meme que sur le ticket imprime), produit, quantite, client, prescripteur,
 * vendeur. Filtres : periode, produit (CIP ou nom), categorie. Ici : la requete et sa mise en forme, sans etat, pour
 * que la grille, l'export Excel et l'impression lisent exactement la meme chose.
 * </p>
 */
public final class HistoriqueOrdonnancier {

    public static final String CATEGORIE_SENSIBLE = "sensible";
    public static final String CATEGORIE_ORDONNANCIER = "ordonnancier";

    static final String[] TITRES = { "Date", "Ticket", "Produit", "Qté", "Client", "Prescripteur", "Vendeur" };

    private static final BaseColor ENTETE = new BaseColor(0x1e, 0x3a, 0x5f);

    /** Une ligne vendue d'un produit sensible : la regle de TFamille.estProduitOrdonnancier. */
    private static final String SENSIBLE = "IFNULL(f.is_sensible, 0) = 1";
    private static final String ORDONNANCIER = "(IFNULL(f.is_scheduled, 0) = 1 AND TRIM(IFNULL(f.int_T, '')) <> '')";

    private HistoriqueOrdonnancier() {
    }

    /** La requete, ses criteres en parametres positionnels (?1, ?2...) dans l'ordre de {@link #parametres}. */
    public static final class Criteres {
        private final String where;
        private final List<Object> parametres;

        Criteres(String where, List<Object> parametres) {
            this.where = where;
            this.parametres = parametres;
        }

        public String getWhere() {
            return where;
        }

        public List<Object> getParametres() {
            return parametres;
        }
    }

    static final String FROM = " FROM t_preenregistrement_detail d"
            + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
            + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID";

    static final String JOINTURES = " LEFT JOIN t_client c ON c.lg_CLIENT_ID = p.lg_CLIENT_ID"
            + " LEFT JOIN medecin m ON m.id = p.medecin_id"
            + " LEFT JOIN t_user u ON u.lg_USER_ID = p.lg_USER_VENDEUR_ID";

    static final String COLONNES = "SELECT p.dt_UPDATED, p.str_REF, p.str_REF_TICKET, f.int_CIP, f.str_NAME,"
            + " d.int_QUANTITY, TRIM(CONCAT(IFNULL(c.str_FIRST_NAME, ''), ' ', IFNULL(c.str_LAST_NAME, ''))),"
            + " IFNULL(m.nom, ''), TRIM(CONCAT(IFNULL(u.str_FIRST_NAME, ''), ' ', IFNULL(u.str_LAST_NAME, ''))),"
            + " IFNULL(f.is_sensible, 0), " + ORDONNANCIER;

    static final String ORDRE = " ORDER BY p.dt_UPDATED DESC, p.str_REF DESC, d.lg_PREENREGISTREMENT_DETAIL_ID";

    /**
     * Ventes closes, non annulees, de la periode (bornes comprises), des seuls produits concernes.
     *
     * @param produit
     *            debut de CIP, ou partie du nom ; vide : tous les produits concernes
     * @param categorie
     *            {@link #CATEGORIE_SENSIBLE}, {@link #CATEGORIE_ORDONNANCIER} ; autre chose : les deux
     */
    public static Criteres criteres(LocalDate du, LocalDate au, String produit, String categorie) {
        List<Object> parametres = new ArrayList<>();
        StringBuilder w = new StringBuilder(
                " WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND d.int_QUANTITY > 0");
        parametres.add(java.sql.Timestamp.valueOf(du.atStartOfDay()));
        w.append(" AND p.dt_UPDATED >= ?").append(parametres.size());
        parametres.add(java.sql.Timestamp.valueOf(au.plusDays(1).atStartOfDay()));
        w.append(" AND p.dt_UPDATED < ?").append(parametres.size());
        if (CATEGORIE_SENSIBLE.equals(categorie)) {
            w.append(" AND ").append(SENSIBLE);
        } else if (CATEGORIE_ORDONNANCIER.equals(categorie)) {
            w.append(" AND ").append(ORDONNANCIER);
        } else {
            w.append(" AND (").append(SENSIBLE).append(" OR ").append(ORDONNANCIER).append(')');
        }
        String p = StringUtils.trimToEmpty(produit);
        if (!p.isEmpty()) {
            parametres.add(p + "%");
            int cip = parametres.size();
            parametres.add("%" + p.toUpperCase() + "%");
            w.append(" AND (f.int_CIP LIKE ?").append(cip).append(" OR UPPER(f.str_NAME) LIKE ?")
                    .append(parametres.size()).append(')');
        }
        return new Criteres(w.toString(), parametres);
    }

    /**
     * Une ligne lue, mise en forme.
     *
     * @param voirReference
     *            KEY_SHOW_NUMERO_TICKET a 1 : le ticket imprime porte la reference de la vente, sinon son numero de
     *            ticket ; l'historique montre le meme
     */
    public static JSONObject ligne(Object[] r, boolean voirReference) {
        Date le = r[0] instanceof Date ? (Date) r[0] : null;
        String ticket = voirReference ? texte(r[1]) : texte(r[2]);
        boolean sensible = nombre(r[9]) == 1;
        boolean ordonnancier = nombre(r[10]) == 1;
        return new JSONObject().put("date", le == null ? "" : new SimpleDateFormat("dd/MM/yyyy HH:mm").format(le))
                .put("ticket", ticket).put("cip", texte(r[3])).put("produit", texte(r[4])).put("quantite", nombre(r[5]))
                .put("client", texte(r[6])).put("prescripteur", texte(r[7])).put("vendeur", texte(r[8]))
                .put("categorie", sensible && ordonnancier ? "Sensible, ordonnancier"
                        : sensible ? "Sensible" : ordonnancier ? "Ordonnancier" : "");
    }

    /** Le produit tel qu'affiche : nom, puis CIP entre parentheses. */
    public static String produit(JSONObject l) {
        String cip = l.optString("cip");
        return l.optString("produit") + (cip.isEmpty() ? "" : " (" + cip + ")");
    }

    public static String libelleCategorie(String categorie) {
        return CATEGORIE_SENSIBLE.equals(categorie) ? "Produits sensibles"
                : CATEGORIE_ORDONNANCIER.equals(categorie) ? "Produits de l'ordonnancier" : "Sensibles et ordonnancier";
    }

    private static String texte(Object o) {
        return o == null ? "" : o.toString().trim();
    }

    private static long nombre(Object o) {
        return o instanceof Number ? ((Number) o).longValue() : o == null ? 0 : Long.parseLong(o.toString().trim());
    }

    /** L'impression : A4 paysage, ecrite directement (aucun modele d'edition de l'officine). */
    public static byte[] pdf(List<JSONObject> lignes, long total, String officine, String sousTitre) throws Exception {
        ByteArrayOutputStream sortie = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4.rotate(), 24, 24, 24, 24);
        PdfWriter.getInstance(doc, sortie);
        doc.open();
        Font titre = new Font(Font.FontFamily.HELVETICA, 13, Font.BOLD, ENTETE);
        Font normal = new Font(Font.FontFamily.HELVETICA, 8, Font.NORMAL, BaseColor.BLACK);
        Font gras = new Font(Font.FontFamily.HELVETICA, 8, Font.BOLD, BaseColor.WHITE);
        doc.add(new Paragraph(StringUtils.defaultString(officine).toUpperCase(), normal));
        doc.add(new Paragraph("HISTORIQUE DES PRODUITS SENSIBLES ET DE L'ORDONNANCIER", titre));
        doc.add(new Paragraph(sousTitre, normal));
        doc.add(new Paragraph(" ", normal));
        PdfPTable t = new PdfPTable(new float[] { 9, 7, 26, 4, 18, 16, 14 });
        t.setWidthPercentage(100);
        t.setHeaderRows(1);
        for (String s : TITRES) {
            PdfPCell c = new PdfPCell(new Phrase(s, gras));
            c.setBackgroundColor(ENTETE);
            t.addCell(c);
        }
        for (JSONObject l : lignes) {
            String[] v = { l.optString("date"), l.optString("ticket"), produit(l),
                    String.valueOf(l.optLong("quantite")), l.optString("client"), l.optString("prescripteur"),
                    l.optString("vendeur") };
            for (int k = 0; k < v.length; k++) {
                PdfPCell c = new PdfPCell(new Phrase(v[k], normal));
                if (k == 3) {
                    c.setHorizontalAlignment(Element.ALIGN_RIGHT);
                }
                t.addCell(c);
            }
        }
        doc.add(t);
        doc.add(new Paragraph(total + " ligne(s)", new Font(Font.FontFamily.HELVETICA, 9, Font.BOLD, BaseColor.BLACK)));
        doc.close();
        return sortie.toByteArray();
    }
}
