package rest.service.impl;

import commonTasks.dto.ArticleDTO;
import dal.OrderDetailLot;
import dal.TFamille;
import dal.TOrderDetail;
import dal.TUser;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.report.pdf.ContenuEtendu;
import rest.service.OrderService;
import rest.service.dto.OrderDetailDTO;

/**
 * Reception d'une commande livree par un grossiste qui utilise Etiquettage Pro (retours du 11/10) : dans la commande en
 * cours, le scan d'une etiquette DataMatrix+ ou QR+ donne d'un coup le produit (CIP, sinon EAN), le prix de
 * l'etiquette, le lot et la peremption.
 * <ul>
 * <li>produit connu : la ligne est ajoutee par le chemin habituel (OrderService.addItem : meme regroupement, memes prix
 * d'achat) ; la quantite est 1 par scan ou la quantite saisie apres le scan ; le prix de l'etiquette devient le prix de
 * vente de la ligne par le chemin habituel de modification (mouvement de prix et notification compris) ; le lot et sa
 * peremption s'ajoutent aux lots de la ligne, repris sur le bon de livraison comme ceux d'un import ;</li>
 * <li>produit inconnu : rien n'est ecrit, les informations de l'etiquette sont rendues pour proposer la creation de la
 * fiche (creation par l'enregistrement habituel de la fiche article, avec son droit).</li>
 * </ul>
 * Un code qui n'est pas une etiquette etendue n'est pas traite ici : l'ecran poursuit sa recherche habituelle.
 */
@Stateless
public class ReceptionEtiquetteService {

    public static final int QTE_MAX = 9999;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private OrderService orderService;

    /** Produit actif portant ce CIP, sinon cet EAN (EAN-13 ou EAN fabricant). */
    TFamille produit(String cip, String ean) {
        if (StringUtils.isNotBlank(cip)) {
            List<TFamille> l = em.createQuery("SELECT f FROM TFamille f WHERE f.intCIP = :c AND f.strSTATUT = 'enable'",
                    TFamille.class).setParameter("c", cip.trim()).setMaxResults(1).getResultList();
            if (!l.isEmpty()) {
                return l.get(0);
            }
        }
        if (StringUtils.isNotBlank(ean)) {
            List<TFamille> l = em
                    .createQuery("SELECT f FROM TFamille f WHERE (f.intEAN13 = :e OR f.codeEanFabriquant = :e)"
                            + " AND f.strSTATUT = 'enable'", TFamille.class)
                    .setParameter("e", ean.trim()).setMaxResults(1).getResultList();
            if (!l.isEmpty()) {
                return l.get(0);
            }
        }
        return null;
    }

    /** Prix de l'etiquette en entier (francs CFA) ; null si absent ou illisible. */
    static Integer prix(String v) {
        String p = ContenuEtendu.prixChiffres(v);
        if (p == null) {
            return null;
        }
        try {
            long x = Math.round(Double.parseDouble(p));
            return x > 0 && x < Integer.MAX_VALUE ? (int) x : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static JSONObject infos(Map<String, String> m) {
        JSONObject j = new JSONObject();
        for (String k : new String[] { ContenuEtendu.CIP, ContenuEtendu.EAN, ContenuEtendu.NOM, ContenuEtendu.PRIX,
                ContenuEtendu.LOT, ContenuEtendu.PER, ContenuEtendu.GRO, ContenuEtendu.PHA }) {
            j.put(k.toLowerCase(java.util.Locale.ROOT), StringUtils.defaultString(m.get(k)));
        }
        Integer p = prix(m.get(ContenuEtendu.PRIX));
        return j.put("prixEntier", p == null ? JSONObject.NULL : p).put("type", m.get("TYPE"));
    }

    /**
     * Scan d'une etiquette dans la commande en cours. {@code ajouter} faux : identification seulement (mode « scan puis
     * quantite ») ; vrai : ajout de {@code qte} boites.
     */
    public JSONObject scanner(String orderId, String grossisteId, String statut, String saisie, int qte,
            boolean ajouter, TUser user) {
        Map<String, String> m = ContenuEtendu.lire(saisie);
        if (m == null) {
            return new JSONObject().put("success", true).put("etendu", false);
        }
        JSONObject r = new JSONObject().put("success", true).put("etendu", true).put("infos", infos(m));
        TFamille f = produit(m.get(ContenuEtendu.CIP), m.get(ContenuEtendu.EAN));
        if (f == null) {
            return r.put("inconnu", true).put("message",
                    "Produit inconnu (CIP " + StringUtils.defaultIfBlank(m.get(ContenuEtendu.CIP), "?")
                            + ") : vérifiez les informations et créez la fiche.");
        }
        r.put("produit",
                new JSONObject().put("id", f.getLgFAMILLEID()).put("nom", f.getStrNAME()).put("cip", f.getIntCIP()));
        if (!ajouter) {
            return r;
        }
        if (StringUtils.isBlank(grossisteId)) {
            return echec("Choisissez d'abord le grossiste de la commande.");
        }
        if (qte < 1 || qte > QTE_MAX) {
            return echec("Quantité invalide (1 à " + QTE_MAX + ").");
        }
        OrderDetailDTO dto = new OrderDetailDTO();
        dto.setFamilleId(f.getLgFAMILLEID());
        dto.setOrderId(StringUtils.defaultIfBlank(orderId, "0"));
        dto.setGrossisteId(grossisteId);
        dto.setStatut(StringUtils.defaultIfBlank(statut, "is_Process"));
        dto.setQte(qte);
        String commande = orderService.addItem(dto, user).optString("orderId", null);
        if (commande == null) {
            return echec("Commande introuvable.");
        }
        em.flush();
        List<TOrderDetail> lignes = em
                .createQuery("SELECT d FROM TOrderDetail d WHERE d.lgORDERID.lgORDERID = :o"
                        + " AND d.lgFAMILLEID.lgFAMILLEID = :f", TOrderDetail.class)
                .setParameter("o", commande).setParameter("f", f.getLgFAMILLEID()).getResultList();
        if (lignes.isEmpty()) {
            return echec("La ligne de commande n'a pas été créée.");
        }
        TOrderDetail d = lignes.get(0);
        String lot = StringUtils.trimToNull(m.get(ContenuEtendu.LOT));
        if (lot != null) {
            /*
             * copies neuves : la colonne JSON n'est reecrite que si la liste change (un lot modifie sur place passerait
             * inapercu)
             */
            List<OrderDetailLot> lots = new ArrayList<>();
            boolean trouve = false;
            for (OrderDetailLot x : d.getLots() == null ? new ArrayList<OrderDetailLot>() : d.getLots()) {
                OrderDetailLot c = new OrderDetailLot(x.getNumeroLot(), x.getDatePeremption(), x.getQuantity());
                c.setQuantityGratuit(x.getQuantityGratuit());
                if (lot.equals(x.getNumeroLot())) {
                    c.setQuantity(x.getQuantity() + qte);
                    if (c.getDatePeremption() == null) {
                        c.setDatePeremption(m.get(ContenuEtendu.PER));
                    }
                    trouve = true;
                }
                lots.add(c);
            }
            if (!trouve) {
                lots.add(new OrderDetailLot(lot, m.get(ContenuEtendu.PER), qte));
            }
            d.setLots(lots);
            em.merge(d);
            em.flush();
            /*
             * OrderDetailLot.equals ne compare que le numero de lot : une quantite changee ne rend pas la ligne « sale
             * » pour Hibernate ; la colonne est donc ecrite directement, au meme format JSON
             */
            org.json.JSONArray json = new org.json.JSONArray();
            lots.forEach(x -> json.put(new JSONObject().put("numeroLot", x.getNumeroLot())
                    .put("datePeremption", x.getDatePeremption() == null ? JSONObject.NULL : x.getDatePeremption())
                    .put("quantity", x.getQuantity()).put("quantityGratuit", x.getQuantityGratuit())));
            em.createNativeQuery("UPDATE t_order_detail SET lots = ?1 WHERE lg_ORDERDETAIL_ID = ?2")
                    .setParameter(1, json.toString()).setParameter(2, d.getLgORDERDETAILID()).executeUpdate();
        }
        Integer p = prix(m.get(ContenuEtendu.PRIX));
        boolean prixModifie = false;
        if (p != null && (d.getIntPRICEDETAIL() == null || d.getIntPRICEDETAIL() != p.intValue())) {
            ArticleDTO a = new ArticleDTO();
            a.setId(d.getLgORDERDETAILID());
            a.setPrixVente(p);
            orderService.modifierProduitPrixVenteCommandeEnCours(a, user);
            prixModifie = true;
        }
        return r.put("orderId", commande).put("qte", qte).put("quantiteLigne", d.getIntNUMBER())
                .put("lot", StringUtils.defaultString(lot))
                .put("peremption", StringUtils.defaultString(m.get(ContenuEtendu.PER)))
                .put("prix", p == null ? JSONObject.NULL : p).put("prixModifie", prixModifie)
                .put("message", qte + " × " + f.getStrNAME() + " ajouté" + (qte > 1 ? "s" : "")
                        + (lot != null ? " (lot " + lot + ")" : "") + (prixModifie ? ", prix de vente " + p : ""));
    }

    private static JSONObject echec(String message) {
        return new JSONObject().put("success", false).put("message", message).put("msg", message);
    }
}
