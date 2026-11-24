package rest.service.impl;

import dal.OrderDetailLot;
import dal.TOrderDetail;
import dal.TUser;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.Resource;
import javax.ejb.EJB;
import javax.ejb.SessionContext;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.pdf.Gs1;
import rest.service.OrderService;
import rest.service.dto.OrderDetailDTO;
import util.PeremptionSaisie;

/**
 * Plan du 21/11, point 16.1 : lot et date de peremption saisis en commande en cours (parametre
 * KEY_SAISIE_PEREMPTION_COMMANDE, a 0 par defaut).
 *
 * <p>
 * Les lots sont ranges au meme endroit qu'apres un import Tedis ou un scan d'etiquette (colonne JSON
 * {@code t_order_detail.lots}, date au format JJ/MM/AAAA) : la creation du BL les reprend tels quels. Regles :
 * <ul>
 * <li>un meme numero de lot saisi deux fois : les quantites s'additionnent, jamais deux lignes pour un meme lot ;</li>
 * <li>la somme des quantites des lots ne depasse jamais la quantite de la ligne : sinon, refus avec un message (reponse
 * du 22/11, question 13) ;</li>
 * <li>date lue par {@link PeremptionSaisie} (01/27 = 31/01/2027, 010127 = 01/01/2027) ; date passee ou impossible
 * refusee.</li>
 * </ul>
 */
@Stateless
public class LotsCommandeService {

    static final DateTimeFormatter JJMMAAAA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private OrderService orderService;
    @Resource
    private SessionContext contexte;

    /* =========================================================================== regles (sans base) */

    /** Copies neuves des lots, le lot {@code numero} ajoute ou cumule (meme numero : quantites additionnees). */
    static List<OrderDetailLot> ajouter(List<OrderDetailLot> lots, String numero, String date, int qte) {
        List<OrderDetailLot> l = new ArrayList<>();
        boolean trouve = false;
        for (OrderDetailLot x : lots == null ? new ArrayList<OrderDetailLot>() : lots) {
            OrderDetailLot c = new OrderDetailLot(x.getNumeroLot(), x.getDatePeremption(), x.getQuantity());
            c.setQuantityGratuit(x.getQuantityGratuit());
            if (numero.equalsIgnoreCase(StringUtils.trimToEmpty(x.getNumeroLot())) && !trouve) {
                c.setQuantity(x.getQuantity() + qte);
                c.setDatePeremption(date != null ? date : x.getDatePeremption());
                trouve = true;
            }
            l.add(c);
        }
        if (!trouve) {
            l.add(new OrderDetailLot(numero, date, qte));
        }
        return l;
    }

    static int somme(List<OrderDetailLot> lots) {
        int s = 0;
        for (OrderDetailLot x : lots) {
            s += x.getQuantity();
        }
        return s;
    }

    /** Message de refus si la somme des lots depasse la quantite de la ligne, null sinon. */
    static String controlerSomme(List<OrderDetailLot> lots, int quantiteLigne) {
        int s = somme(lots);
        return s > quantiteLigne
                ? "La somme des quantités des lots (" + s + ") dépasse la quantité de la ligne (" + quantiteLigne + ")."
                : null;
    }

    /** Lecture d'un numero de lot saisi : 1 a 20 caracteres, sans separateur GS1. */
    static String motifNumero(String numero) {
        if (numero == null || numero.isEmpty()) {
            return "Numéro de lot vide.";
        }
        if (numero.length() > 20 || numero.indexOf('\u001d') >= 0) {
            return "Numéro de lot illisible (20 caractères au plus).";
        }
        return null;
    }

    static String json(List<OrderDetailLot> lots) {
        JSONArray a = new JSONArray();
        lots.forEach(x -> a.put(new JSONObject().put("numeroLot", x.getNumeroLot())
                .put("datePeremption", x.getDatePeremption() == null ? JSONObject.NULL : x.getDatePeremption())
                .put("quantity", x.getQuantity()).put("quantityGratuit", x.getQuantityGratuit())));
        return a.toString();
    }

    /* =========================================================================== operations */

    /**
     * Ajoute le produit a la commande (meme chemin que « item/add ») ET son lot, en une seule transaction : un lot
     * refuse n'ajoute rien.
     */
    public JSONObject ajouterAvecLot(OrderDetailDTO dto, String numeroSaisi, String dateSaisie, TUser user) {
        String numero = StringUtils.trimToEmpty(numeroSaisi);
        String motif = motifNumero(numero);
        if (motif != null) {
            return refus(motif, "lot");
        }
        PeremptionSaisie.Resultat date = PeremptionSaisie.lire(dateSaisie, LocalDate.now());
        if (!date.isValide()) {
            return refus(date.getMotif(), "peremption");
        }
        int qte = dto.getQte() == null ? 0 : dto.getQte();
        if (qte <= 0) {
            return refus("Quantité nulle.", "quantite");
        }
        JSONObject ajout = orderService.addItem(dto, user);
        String commande = ajout.optString("orderId", null);
        if (commande == null) {
            contexte.setRollbackOnly();
            return refus(StringUtils.defaultIfBlank(ajout.optString("msg", null), "Commande introuvable."), null);
        }
        em.flush();
        List<TOrderDetail> lignes = em
                .createQuery("SELECT d FROM TOrderDetail d WHERE d.lgORDERID.lgORDERID = :o"
                        + " AND d.lgFAMILLEID.lgFAMILLEID = :f", TOrderDetail.class)
                .setParameter("o", commande).setParameter("f", dto.getFamilleId()).getResultList();
        if (lignes.isEmpty()) {
            contexte.setRollbackOnly();
            return refus("La ligne de commande n'a pas été créée.", null);
        }
        TOrderDetail d = lignes.get(0);
        em.refresh(d);
        List<OrderDetailLot> lots = ajouter(d.getLots(), numero, date.getDate().format(JJMMAAAA), qte);
        String depasse = controlerSomme(lots, d.getIntNUMBER());
        if (depasse != null) {
            contexte.setRollbackOnly();
            return refus(depasse, "quantite");
        }
        ecrire(d.getLgORDERDETAILID(), lots);
        return ajout.put("success", true).put("itemId", d.getLgORDERDETAILID()).put("lots", new JSONArray(json(lots)))
                .put("peremption", date.getDate().format(JJMMAAAA));
    }

    /* ====================================== scan d'un DataMatrix dans la petite fenetre du lot (reponse du 22/11) */

    public static final String CONFORME = "CONFORME", DIFFERENT = "DIFFERENT", INCONNU = "INCONNU";

    private static String code(String s) {
        String c = StringUtils.deleteWhitespace(StringUtils.defaultString(s));
        String sansZeros = StringUtils.stripStart(c, "0");
        return sansZeros.isEmpty() ? c : sansZeros;
    }

    /**
     * Le code produit lu sur la boite est-il celui du produit de la ligne ? CONFORME : le CIP (240) ou l'EAN du GTIN
     * (01) est l'un des codes connus du produit ; DIFFERENT : la boite porte un code de meme nature que ceux du produit
     * (CIP lu face aux codes du produit, EAN lu face a un EAN connu) et aucun ne correspond ; INCONNU : rien a
     * comparer. Zeros de tete et espaces ignores.
     *
     * @param eans
     *            EAN connus du produit (EAN-13, EAN fabricant)
     * @param autres
     *            autres codes connus (CIP du produit, codes article des grossistes)
     */
    static String comparerProduit(Gs1.Contenu c, List<String> eans, List<String> autres) {
        List<String> connus = new ArrayList<>();
        List<String> eansConnus = new ArrayList<>();
        for (String e : eans) {
            if (StringUtils.isNotBlank(e)) {
                eansConnus.add(code(e));
                connus.add(code(e));
            }
        }
        for (String a : autres) {
            if (StringUtils.isNotBlank(a)) {
                connus.add(code(a));
            }
        }
        String cip = StringUtils.isBlank(c.cip) ? null : code(c.cip);
        String ean = c.gtin == null ? null : code(Gs1.ean13(c.gtin));
        if ((cip != null && connus.contains(cip)) || (ean != null && connus.contains(ean))) {
            return CONFORME;
        }
        if ((cip != null && !connus.isEmpty()) || (ean != null && !eansConnus.isEmpty())) {
            return DIFFERENT;
        }
        return INCONNU;
    }

    /**
     * Lecture d'un code scanne dans le champ du lot : lot et peremption (JJ/MM/AAAA) ; {@code complet} quand le code
     * porte le produit (01), le lot (10) et la peremption (17) : l'ecran ajoute alors la ligne sans attendre Entree,
     * sauf si {@code produit} vaut DIFFERENT (la boite n'est pas celle du produit choisi : avertissement).
     */
    @SuppressWarnings("unchecked")
    public JSONObject lireCode(String code, String familleId) {
        Gs1.Contenu c = Gs1.lire(code);
        JSONObject r = new JSONObject().put("success", c.lot != null || c.peremption != null);
        r.put("lot", c.lot == null ? "" : c.lot);
        r.put("peremption", c.peremption == null ? "" : c.peremption.format(JJMMAAAA));
        r.put("complet", c.gtin != null && c.lot != null && c.peremption != null);
        String produit = INCONNU;
        if (StringUtils.isNotBlank(familleId) && (c.gtin != null || c.cip != null)) {
            List<Object[]> f = em
                    .createNativeQuery(
                            "SELECT int_CIP, int_EAN13, code_ean_fabriquant FROM t_famille WHERE lg_FAMILLE_ID = ?1")
                    .setParameter(1, familleId).getResultList();
            if (!f.isEmpty()) {
                List<String> autres = new ArrayList<>();
                autres.add(texte(f.get(0)[0]));
                for (Object x : em
                        .createNativeQuery("SELECT str_CODE_ARTICLE FROM t_famille_grossiste WHERE lg_FAMILLE_ID = ?1")
                        .setParameter(1, familleId).getResultList()) {
                    autres.add(texte(x));
                }
                produit = comparerProduit(c, java.util.Arrays.asList(texte(f.get(0)[1]), texte(f.get(0)[2])), autres);
            }
        }
        r.put("produit", produit);
        if (DIFFERENT.equals(produit)) {
            r.put("message", "Le code de cette boîte (" + (c.cip != null ? "CIP " + c.cip : "EAN " + Gs1.ean13(c.gtin))
                    + ") n'est pas celui du produit choisi : vérifiez la boîte, puis Entrée pour valider.");
        }
        return r;
    }

    private static String texte(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    /** Lots d'une ligne, pour la petite vue des lots (double-clic sur LOTS / PÉREMPTION). */
    public JSONObject lire(String itemId) {
        TOrderDetail d = StringUtils.isBlank(itemId) ? null : em.find(TOrderDetail.class, itemId);
        if (d == null) {
            return refus("Ligne de commande introuvable.", null);
        }
        em.refresh(d);
        List<OrderDetailLot> lots = d.getLots() == null ? new ArrayList<>() : d.getLots();
        return new JSONObject().put("success", true).put("itemId", itemId).put("quantite", d.getIntNUMBER())
                .put("produit", d.getLgFAMILLEID().getStrNAME()).put("lots", new JSONArray(json(lots)));
    }

    /**
     * Remplace les lots d'une ligne (petite vue modifiable) : chaque lot recontrole (numero, date, quantite &gt; 0),
     * numeros en double cumules, somme &lt;= quantite de la ligne. Les quantites gratuites existantes sont gardees.
     */
    public JSONObject remplacer(String itemId, JSONArray saisis) {
        TOrderDetail d = StringUtils.isBlank(itemId) ? null : em.find(TOrderDetail.class, itemId);
        if (d == null) {
            return refus("Ligne de commande introuvable.", null);
        }
        em.refresh(d);
        List<OrderDetailLot> lots = new ArrayList<>();
        for (int i = 0; i < saisis.length(); i++) {
            JSONObject o = saisis.getJSONObject(i);
            String numero = StringUtils.trimToEmpty(o.optString("numeroLot", ""));
            String motif = motifNumero(numero);
            if (motif != null) {
                return refus("Ligne " + (i + 1) + " : " + motif, "lot").put("ligne", i);
            }
            PeremptionSaisie.Resultat date = PeremptionSaisie.lire(o.optString("datePeremption", ""), LocalDate.now());
            if (!date.isValide()) {
                return refus("Ligne " + (i + 1) + " : " + date.getMotif(), "peremption").put("ligne", i);
            }
            int qte = o.optInt("quantity", 0);
            if (qte <= 0) {
                return refus("Ligne " + (i + 1) + " : quantité nulle.", "quantite").put("ligne", i);
            }
            lots = ajouter(lots, numero, date.getDate().format(JJMMAAAA), qte);
        }
        /* les quantites gratuites deja connues (import) suivent leur lot */
        for (OrderDetailLot x : lots) {
            for (OrderDetailLot ancien : d.getLots() == null ? new ArrayList<OrderDetailLot>() : d.getLots()) {
                if (x.getNumeroLot().equalsIgnoreCase(StringUtils.trimToEmpty(ancien.getNumeroLot()))) {
                    x.setQuantityGratuit(ancien.getQuantityGratuit());
                }
            }
        }
        String depasse = controlerSomme(lots, d.getIntNUMBER());
        if (depasse != null) {
            return refus(depasse, "quantite");
        }
        ecrire(itemId, lots);
        return lire(itemId).put("message", lots.isEmpty() ? "Lots retirés." : "Lots enregistrés.");
    }

    /**
     * OrderDetailLot.equals ne compare que le numero : une quantite changee ne rend pas la ligne « sale » pour
     * Hibernate ; la colonne est donc ecrite directement, au meme format JSON (comme le scan d'etiquette).
     */
    private void ecrire(String itemId, List<OrderDetailLot> lots) {
        em.flush();
        em.createNativeQuery("UPDATE t_order_detail SET lots = ?1, dt_UPDATED = NOW() WHERE lg_ORDERDETAIL_ID = ?2")
                .setParameter(1, json(lots)).setParameter(2, itemId).executeUpdate();
    }

    private static JSONObject refus(String message, String champ) {
        JSONObject o = new JSONObject().put("success", false).put("message", message).put("msg", message);
        if (champ != null) {
            o.put("champ", champ);
        }
        return o;
    }
}
