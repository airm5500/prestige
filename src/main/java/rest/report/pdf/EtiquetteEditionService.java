package rest.report.pdf;

import dal.TEtiquette;
import dal.TFamille;
import dal.TOfficine;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import toolkits.parameters.commonparameter;
import toolkits.utils.conversion;
import toolkits.utils.date;

/**
 * Alimente le moteur d'edition NOUVEAU (planche PDF vectorielle) a partir des etiquettes du menu Gestion etiquettes.
 *
 * Le moteur ANCIEN construit ces memes etiquettes dans deux pages JSP (ws_generate_pdf.jsp pour une ligne de la grille,
 * ws_generate_etiquette_pdf.jsp pour l'etiquettage massif) via JasperReports. Les donnees portees par une etiquette
 * sont les memes dans les deux moteurs : nom abrege de l'officine, designation et CIP du produit, prix de vente et date
 * du jour. Le grossiste, present sur les etiquettes issues d'un bon de livraison, n'existe pas ici : la ligne
 * correspondante n'affiche donc que la date, comme dans le modele JasperReports.
 *
 * @author koben
 */
@Stateless
public class EtiquetteEditionService {

    private static final Logger LOG = Logger.getLogger(EtiquetteEditionService.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /**
     * Etiquettes d'une ligne de la grille Gestion etiquettes : int_NUMBER exemplaires du meme produit, comme le fait
     * ws_generate_pdf.jsp.
     */
    public List<LabelSheetPdf.LabelData> etiquettesDeLaLigne(String idEtiquette) {
        TEtiquette etiquette = em.find(TEtiquette.class, idEtiquette);
        if (etiquette == null) {
            LOG.log(Level.WARNING, "etiquette introuvable : {0}", idEtiquette);
            return new ArrayList<>();
        }
        return construire(Collections.singletonList(etiquette));
    }

    /**
     * Etiquettes du panier d'etiquettage massif : toutes les lignes en preparation, chacune repetee int_NUMBER fois,
     * dans l'ordre retenu par ws_generate_etiquette_pdf.jsp.
     *
     * Le moteur ANCIEN passe par listeEtiquette("", is_Process), dont le filtre de recherche vide se traduit par un
     * LIKE '%%%' : celui-ci ecarterait une ligne dont le CIP, la designation et l'EAN13 seraient tous nuls. On ne
     * conserve ici que le critere utile, le statut.
     */
    public List<LabelSheetPdf.LabelData> etiquettesEnPreparation() {
        List<TEtiquette> etiquettes = em
                .createQuery("SELECT t FROM TEtiquette t WHERE t.strSTATUT = ?1 ORDER BY t.dtUPDATED DESC",
                        TEtiquette.class)
                .setParameter(1, commonparameter.statut_is_Process).getResultList();
        return construire(etiquettes);
    }

    /**
     * Solde le panier apres l'edition de la planche : les lignes en preparation passent a l'etat « editee ».
     *
     * <p>
     * Sans cela elles restent en preparation, et la vue de creation groupee les represente a la reouverture : on rouvre
     * l'ecran et on retrouve les articles qu'on vient d'imprimer, sans savoir s'ils l'ont ete. C'est la meme regle que
     * pour une ligne editee a l'unite ; elle n'avait jamais ete appliquee au panier.
     *
     * @return le nombre de lignes soldees
     */
    public int solderPanier() {
        try {
            return em.createQuery("UPDATE TEtiquette t SET t.strSTATUT = ?1, t.dtUPDATED = ?2 WHERE t.strSTATUT = ?3")
                    .setParameter(1, commonparameter.statut_Read).setParameter(2, new Date())
                    .setParameter(3, commonparameter.statut_is_Process).executeUpdate();
        } catch (Exception e) {
            // Le PDF est deja parti au navigateur : un echec ici ne doit pas casser l'edition.
            LOG.log(Level.SEVERE, "solderPanier", e);
            return 0;
        }
    }

    /**
     * Marque la ligne comme editee, exactement comme le moteur ANCIEN le fait en fin de generation : sans cela
     * l'etiquette resterait indefiniment a l'etat « a editer » dans la grille.
     */
    public void marquerImprimee(String idEtiquette) {
        try {
            TEtiquette etiquette = em.find(TEtiquette.class, idEtiquette);
            if (etiquette != null) {
                etiquette.setStrSTATUT(commonparameter.statut_Read);
                em.merge(etiquette);
            }
        } catch (Exception e) {
            // Le PDF est deja parti au navigateur : un echec ici ne doit pas casser l'edition.
            LOG.log(Level.SEVERE, "marquerImprimee " + idEtiquette, e);
        }
    }

    private List<LabelSheetPdf.LabelData> construire(List<TEtiquette> etiquettes) {
        List<LabelSheetPdf.LabelData> labels = new ArrayList<>();
        String dateDuJour = date.DateToString(new Date(), date.formatterShortBis);
        String nomOfficine = nomOfficine();
        for (TEtiquette etiquette : etiquettes) {
            TFamille famille = etiquette.getLgFAMILLEID();
            if (famille == null) {
                continue;
            }
            String prix = conversion.AmountFormat(famille.getIntPRICE(), ' ') + " CFA";
            int exemplaires = nombreExemplaires(etiquette.getIntNUMBER());
            for (int i = 0; i < exemplaires; i++) {
                labels.add(new LabelSheetPdf.LabelData(nomOfficine, "", famille.getStrDESCRIPTION(),
                        famille.getIntCIP(), prix, dateDuJour)
                                .source(famille.getLgFAMILLEID(), ean(famille),
                                        jour(etiquette.getDtPEROMPTION() != null ? etiquette.getDtPEROMPTION()
                                                : famille.getDtPEREMPTION()),
                                        null)
                                .grossisteProduit(famille.getLgGROSSISTEID() == null ? null
                                        : famille.getLgGROSSISTEID().getStrLIBELLE()));
            }
        }
        return labels;
    }

    /** int_NUMBER est stocke en texte : une valeur absente ou illisible ne doit pas faire echouer l'edition. */
    static int nombreExemplaires(String intNumber) {
        try {
            int valeur = Integer.parseInt(StringUtils.trimToEmpty(intNumber));
            return Math.max(valeur, 0);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private String nomOfficine() {
        try {
            TOfficine officine = em.find(TOfficine.class, "1");
            return officine != null ? officine.getStrNOMABREGE() : "";
        } catch (Exception e) {
            LOG.log(Level.WARNING, "nomOfficine", e);
            return "";
        }
    }

    /** EAN de l'etiquette GS1 : code EAN du fabricant, sinon l'EAN du produit. */
    public static String ean(TFamille f) {
        return StringUtils.isNotBlank(f.getCodeEanFabriquant()) ? f.getCodeEanFabriquant().trim()
                : StringUtils.trimToNull(f.getIntEAN13());
    }

    static java.time.LocalDate jour(Date d) {
        return d == null ? null : new java.sql.Date(d.getTime()).toLocalDate();
    }

    /**
     * Retours du 10/10 (point 5) : etiquettes 2D GS1 (QR ou DataMatrix). Pour chaque etiquette : lot et peremption du
     * lot du BL (reference de livraison) s'il est connu, sinon le lot en stock le plus proche de peremption (FEFO),
     * sinon la peremption connue du produit ; EAN du fabricant ; CIP.
     */
    @SuppressWarnings("unchecked")
    public void completerGs1(List<LabelSheetPdf.LabelData> labels, String type) {
        java.util.Map<String, Object[]> lots = new java.util.HashMap<>();
        /* longueur du code d'etiquette, lue une fois par impression */
        int[] longueurCode = { 0 };
        java.time.format.DateTimeFormatter jj = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        for (LabelSheetPdf.LabelData l : labels) {
            if (l.getFamilleId() == null) {
                continue;
            }
            String cle = l.getFamilleId() + "|" + StringUtils.defaultString(l.getRefLivraison());
            Object[] lot = lots.computeIfAbsent(cle, k -> {
                javax.persistence.Query q = em
                        .createNativeQuery("SELECT int_NUM_LOT, dt_PEREMPTION FROM t_lot"
                                + " WHERE lg_FAMILLE_ID = ?1 AND int_NUM_LOT IS NOT NULL AND int_NUM_LOT <> ''"
                                + (l.getRefLivraison() != null ? " AND str_REF_LIVRAISON = ?2"
                                        : " AND current_stock > 0")
                                + " ORDER BY dt_PEREMPTION IS NULL, dt_PEREMPTION, dt_CREATED")
                        .setParameter(1, l.getFamilleId());
                if (l.getRefLivraison() != null) {
                    q.setParameter(2, l.getRefLivraison());
                }
                List<Object[]> r = q.setMaxResults(1).getResultList();
                return r.isEmpty() ? new Object[] { null, null } : r.get(0);
            });
            String numLot = lot[0] == null ? null : String.valueOf(lot[0]).trim();
            java.time.LocalDate per = lot[1] instanceof Date ? jour((Date) lot[1]) : l.getPeremptionConnue();
            String brute = Gs1.brute(l.getEan(), per, numLot, l.getCip());
            l.code2D(type, brute.isEmpty() ? null : brute, numLot, per == null ? null : per.format(jj));
            if (!LabelSheetPdf.CODE_BARRES.equals(l.getCode())) {
                if (longueurCode[0] == 0) {
                    longueurCode[0] = longueurDuRegistre();
                }
                String code = attribuerCodeUnique(l.getFamilleId(), longueurCode[0]);
                if (code != null) {
                    longueurCode[0] = code.length();
                }
                l.codeUnique(code);
            }
        }
    }

    /** Alphabet du code d'etiquette : sans 0 / O ni 1 / I, que l'on confond a la lecture. */
    static final String ALPHABET_CODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final java.security.SecureRandom HASARD = new java.security.SecureRandom();

    static String tirerCode(java.util.Random hasard) {
        return tirerCode(hasard, 5);
    }

    static String tirerCode(java.util.Random hasard, int longueur) {
        StringBuilder b = new StringBuilder(longueur);
        for (int i = 0; i < longueur; i++) {
            b.append(ALPHABET_CODE.charAt(hasard.nextInt(ALPHABET_CODE.length())));
        }
        return b.toString();
    }

    /** Nombre de codes possibles a cette longueur (32 puissance longueur). */
    static long capacite(int longueur) {
        long c = 1;
        for (int i = 0; i < longueur; i++) {
            c *= ALPHABET_CODE.length();
        }
        return c;
    }

    /**
     * Longueur a utiliser : 5 tant que moins de 90 % des codes a 5 caracteres sont pris, puis 6, 7, 8. Au-dela de 90 %,
     * les tirages butent trop souvent sur un code deja donne.
     */
    static int longueurPour(java.util.function.IntToLongFunction dejaDonnes) {
        for (int l = 5; l < 8; l++) {
            if (dejaDonnes.applyAsLong(l) < capacite(l) * 9 / 10) {
                return l;
            }
        }
        return 8;
    }

    /**
     * Retours du 10/10 : code propre a une etiquette, jamais reproduit. 5 caracteres, puis 6, 7 et 8 quand les codes
     * d'une longueur s'epuisent. Le code est inscrit au registre (cle primaire) : s'il est deja pris, un autre est tire
     * ; apres 50 tirages infructueux, on passe a la longueur suivante. Sans code libre, l'etiquette part sans code
     * plutot qu'avec un doublon.
     */
    int longueurDuRegistre() {
        return longueurPour(l -> ((Number) em
                .createNativeQuery("SELECT COUNT(*) FROM t_etiquette_code WHERE CHAR_LENGTH(code) = ?1")
                .setParameter(1, l).getSingleResult()).longValue());
    }

    String attribuerCodeUnique(String familleId, int longueurDepart) {
        for (int longueur = Math.max(5, longueurDepart); longueur <= 8; longueur++) {
            for (int essai = 0; essai < 50; essai++) {
                String code = tirerCode(HASARD, longueur);
                int n = em
                        .createNativeQuery("INSERT IGNORE INTO t_etiquette_code (code, lg_FAMILLE_ID, dt_CREATED)"
                                + " VALUES (?1, ?2, NOW())")
                        .setParameter(1, code).setParameter(2, familleId).executeUpdate();
                if (n == 1) {
                    return code;
                }
            }
        }
        LOG.log(Level.SEVERE, "Aucun code d'etiquette libre jusqu'a 8 caracteres");
        return null;
    }
}
