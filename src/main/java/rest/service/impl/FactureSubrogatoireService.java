package rest.service.impl;

import dal.TPreenregistrementCompteClientTiersPayent;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.conversion;
import toolkits.utils.date;

/**
 * FACTURES SUBROGATOIRES (ecran « facturesubrogatoire ») passees en API, demande de l'officine du 05/10.
 *
 * <p>
 * Meme liste que l'ancienne page ws_facture_subrogatoire.jsp (conservee) : meme vue v_facture_subrogatoire, memes
 * filtres (periode et heures, recherche « commence par » sur le client, le bon, la reference ou le ticket, tiers
 * payant, operateur et emplacement selon les droits), meme regroupement par reference, meme ordre, et meme regle
 * historique : une vente n'est gardee que si sa reference de bon differe de celle de la vente gardee juste avant. Les
 * valeurs rendues ont les memes noms et le meme format. Seule difference : la requete est parametree au lieu d'etre
 * concatenee.
 */
@Stateless
public class FactureSubrogatoireService {

    private static final Logger LOG = Logger.getLogger(FactureSubrogatoireService.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Une vente de la liste, telle que la page JSP la construisait. */
    public static class Vente {

        private final String id;
        private final String reference;
        private final String caissier;
        private final int brut;
        private final Date jour;
        private final String typeVente;
        private final String client;
        private final int net;
        private final int remise;
        private final String refBon;

        Vente(String id, String reference, String caissier, int brut, Date jour, String typeVente, String client,
                int net, int remise, String refBon) {
            this.id = id;
            this.reference = reference;
            this.caissier = caissier;
            this.brut = brut;
            this.jour = jour;
            this.typeVente = typeVente;
            this.client = client;
            this.net = net;
            this.remise = remise;
            this.refBon = refBon;
        }

        public String getReference() {
            return reference;
        }

        public String getDate() {
            return date.DateToString(jour, date.formatterShort);
        }

        public String getHeure() {
            return date.DateToString(jour, date.NomadicUiFormat_Time);
        }

        public String getCaissier() {
            return caissier;
        }

        public String getClient() {
            return client;
        }

        public String getRefBon() {
            return refBon;
        }

        public Integer getBrut() {
            return brut;
        }

        public Integer getRemise() {
            return remise;
        }

        public Integer getNet() {
            return net;
        }

        /** Tiers payants de la vente, en texte simple (edition). */
        private String tiersPayants = "";

        public String getTiersPayants() {
            return tiersPayants;
        }
    }

    private static String texte(Object o) {
        return o == null ? null : o.toString();
    }

    private static int entier(Object o) {
        return o == null ? 0 : ((Number) o).intValue();
    }

    /**
     * Les ventes de la periode, dans l'ordre et avec le regroupement de la page JSP.
     *
     * @param debut
     *            jour de debut AAAA-MM-JJ
     * @param fin
     *            jour de fin AAAA-MM-JJ
     * @param hDebut
     *            heure de debut HH:mm
     * @param hFin
     *            heure de fin HH:mm
     * @param recherche
     *            debut du client, du bon, de la reference ou du ticket (vide : tout)
     * @param tiersPayantId
     *            tiers payant, ou null pour tous
     * @param utilisateurId
     *            operateur, ou null pour tous (droit str_SHOW_VENTE)
     * @param emplacementId
     *            emplacement, ou null pour tous (droit P_SHOW_ALL_ACTIVITY)
     */
    public List<Vente> lister(String debut, String fin, String hDebut, String hFin, String recherche,
            String tiersPayantId, String utilisateurId, String emplacementId) {
        List<Vente> sortie = new ArrayList<>();
        try {
            String debutRecherche = StringUtils.defaultString(recherche) + "%";
            @SuppressWarnings("unchecked")
            List<Tuple> lignes = em.createNativeQuery("SELECT v.lg_PREENREGISTREMENT_ID AS id, v.str_REF AS reference,"
                    + " v.str_FIRST_LAST_NAME_CAISSIER AS caissier, v.int_PRICE AS brut, v.dt_UPDATED AS jour,"
                    + " v.str_TYPE_VENTE AS typeVente, v.str_FIRST_LAST_NAME AS client, v.int_PRICE_TOTAL AS net,"
                    + " v.int_PRICE_REMISE AS remise, v.str_REF_BON AS refBon"
                    + " FROM v_facture_subrogatoire v WHERE v.int_PRICE > 0 AND v.b_IS_CANCEL = false"
                    + " AND v.lg_EMPLACEMENT_ID LIKE ?1 AND (v.dt_UPDATED >= ?2 AND v.dt_UPDATED <= ?3)"
                    + " AND (v.str_FIRST_NAME_CUSTOMER LIKE ?4 OR v.str_LAST_NAME_CUSTOMER LIKE ?4"
                    + " OR v.str_FIRST_LAST_NAME LIKE ?4 OR v.str_REF_BON LIKE ?4 OR v.str_REF LIKE ?4"
                    + " OR v.str_REF_TICKET LIKE ?4) AND v.lg_USER_ID LIKE ?5 AND v.lg_TIERS_PAYANT_ID LIKE ?6"
                    + " GROUP BY v.str_REF ORDER BY v.dt_UPDATED ASC", Tuple.class)
                    .setParameter(1, emplacementId == null ? "%%" : emplacementId).setParameter(2, debut + " " + hDebut)
                    .setParameter(3, fin + " " + hFin).setParameter(4, debutRecherche)
                    .setParameter(5, utilisateurId == null ? "%%" : utilisateurId)
                    .setParameter(6, StringUtils.isEmpty(tiersPayantId) ? "%%" : tiersPayantId).getResultList();
            String precedent = null;
            for (Tuple t : lignes) {
                String refBon = StringUtils.defaultString(texte(t.get("refBon")));
                // Regle historique de la page JSP : la vente n'est gardee que si son bon differe du precedent garde.
                if (precedent != null && precedent.equalsIgnoreCase(refBon)) {
                    continue;
                }
                precedent = refBon;
                sortie.add(new Vente(texte(t.get("id")), texte(t.get("reference")), texte(t.get("caissier")),
                        entier(t.get("brut")), (Date) t.get("jour"), texte(t.get("typeVente")), texte(t.get("client")),
                        entier(t.get("net")), entier(t.get("remise")), refBon));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "factures subrogatoires", e);
        }
        return sortie;
    }

    /** Les tiers payants d'une vente, comme la page JSP les lisait (statut clos, pourcentage decroissant). */
    private List<TPreenregistrementCompteClientTiersPayent> tiersPayants(String venteId) {
        return em.createQuery(
                "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = ?1 AND t.strSTATUT = ?2 ORDER BY t.intPERCENT DESC",
                TPreenregistrementCompteClientTiersPayent.class).setParameter(1, venteId)
                .setParameter(2, commonparameter.statut_is_Closed).getResultList();
    }

    /** Detail depliable de la ligne, au caractere pres celui de la page JSP. */
    private String detailHtml(String venteId) {
        String html = "";
        for (TPreenregistrementCompteClientTiersPayent o : tiersPayants(venteId)) {
            html = "<span style='display: inline-block; width: 350px;'><b>Tiers payant</b>: "
                    + o.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getStrFULLNAME()
                    + "</span><span style='display: inline-block; width: 350px;'><b>Montant</b>: "
                    + conversion.AmountFormat(o.getIntPRICE(), '.')
                    + "</span><span style='display: inline-block; width: 350px;'><b>Pourcentage</b>: "
                    + o.getIntPERCENT() + "</span><span style='display: inline-block; width: 350px;'><b>Ref.Bon</b>: "
                    + o.getStrREFBON() + "</span><br>" + html;
        }
        return html;
    }

    /** Tiers payants en texte simple, pour l'edition : « NOM (80 %) bon REF ; ... ». */
    private String detailTexte(String venteId) {
        List<String> parts = new ArrayList<>();
        for (TPreenregistrementCompteClientTiersPayent o : tiersPayants(venteId)) {
            parts.add(
                    o.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getStrFULLNAME() + " (" + o.getIntPERCENT()
                            + " %)" + (StringUtils.isNotBlank(o.getStrREFBON()) ? " bon " + o.getStrREFBON() : ""));
        }
        return String.join(" ; ", parts);
    }

    /** Une page de la liste, aux noms et formats de la page JSP ; total = nombre de ventes de la periode. */
    public JSONObject page(List<Vente> ventes, int start, int limit) {
        JSONArray resultats = new JSONArray();
        int debut = Math.max(start, 0), fin = Math.min(ventes.size(), debut + (limit > 0 ? limit : ventes.size()));
        for (int i = debut; i < fin; i++) {
            Vente v = ventes.get(i);
            resultats.put(new JSONObject().put("lg_PREENREGISTREMENT_ID", v.id).put("str_REF", v.reference)
                    .put("lg_USER_CAISSIER_ID", v.caissier).put("int_PRICE", String.valueOf(v.brut))
                    .put("dt_CREATED", v.getDate()).put("str_hour", v.getHeure())
                    .put("str_FAMILLE_ITEM", detailHtml(v.id)).put("str_TYPE_VENTE", v.typeVente)
                    .put("lg_USER_VENDEUR_ID", v.client).put("int_PRICE_FORMAT", conversion.AmountFormat(v.brut, '.'))
                    .put("str_REF_BON", v.refBon).put("int_PRICE_REMISE_FORMAT", conversion.AmountFormat(v.remise, '.'))
                    .put("VENTE_NET_FORMAT", conversion.AmountFormat(v.net, '.')).put("int_PRICE_REMISE", v.remise)
                    .put("VENTE_NET", v.net));
        }
        return new JSONObject().put("total", ventes.size()).put("results", resultats);
    }

    /** Les ventes avec leurs tiers payants en texte, pour l'edition PDF. */
    public List<Vente> pourEdition(List<Vente> ventes) {
        for (Vente v : ventes) {
            v.tiersPayants = detailTexte(v.id);
        }
        return ventes;
    }
}
