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
                                        : famille.getLgGROSSISTEID().getStrLIBELLE())
                                .codeGeo(codeGeo(famille)));
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

    /** Etiquettage Pro : nom de la pharmacie propose en tete des etiquettes. */
    public String officine() {
        return nomOfficine();
    }

    /**
     * Etiquettage Pro : planche PDF des lignes donnees (impression seule, rien n'est ecrit dans les fiches articles).
     * Les etiquettes 2D recoivent leur code unique du registre t_etiquette_code, comme les autres etiquettes.
     */
    public byte[] etiquetagePro(List<etiquetagepro.LigneEtiquette> lignes, etiquetagepro.OptionsImpression options,
            java.util.function.UnaryOperator<String> configuration) throws Exception {
        java.util.Map<String, String> familles = new java.util.HashMap<>();
        int[] longueur = { 0 };
        etiquetagepro.RegistreCodes registre = cip -> {
            if (longueur[0] == 0) {
                longueur[0] = longueurDuRegistre();
            }
            String famille = familles.computeIfAbsent(StringUtils.defaultString(cip), c -> {
                List<?> r = em.createNativeQuery("SELECT lg_FAMILLE_ID FROM t_famille WHERE int_CIP = ?1 LIMIT 1")
                        .setParameter(1, c).getResultList();
                return r.isEmpty() ? "" : String.valueOf(r.get(0));
            });
            String code = attribuerCodeUnique(famille.isEmpty() ? null : famille, longueur[0]);
            if (code != null) {
                longueur[0] = code.length();
            }
            return code;
        };
        java.io.ByteArrayOutputStream sortie = new java.io.ByteArrayOutputStream();
        etiquetagepro.MoteurEtiquettes.pdf(sortie, lignes, options, registre, configuration,
                this::dispositionEnregistree);
        return sortie.toByteArray();
    }

    /**
     * Etiquettage Pro : produits de Prestige pour ces CIP (designation, prix, EAN, grossiste habituel), pour completer
     * les lignes saisies ou importees. Lecture seule.
     */
    public org.json.JSONObject produitsParCip(java.util.Collection<String> cips) {
        org.json.JSONObject resultat = new org.json.JSONObject();
        java.util.List<String> liste = new ArrayList<>();
        for (String c : cips) {
            if (StringUtils.isNotBlank(c) && liste.size() < 5000) {
                liste.add(c.trim());
            }
        }
        if (liste.isEmpty()) {
            return resultat;
        }
        List<TFamille> familles = em
                .createQuery("SELECT f FROM TFamille f WHERE f.intCIP IN :cips ORDER BY f.strSTATUT", TFamille.class)
                .setParameter("cips", liste).getResultList();
        for (TFamille f : familles) {
            if (resultat.has(f.getIntCIP()) && !"enable".equals(f.getStrSTATUT())) {
                continue;
            }
            if (resultat.has(f.getIntCIP())
                    && "enable".equals(resultat.getJSONObject(f.getIntCIP()).optString("statut"))) {
                continue;
            }
            resultat.put(f.getIntCIP(),
                    new org.json.JSONObject().put("designation", StringUtils.defaultString(f.getStrDESCRIPTION()))
                            .put("prix", f.getIntPRICE() == null ? "" : String.valueOf(f.getIntPRICE()))
                            .put("ean", StringUtils.defaultString(ean(f)))
                            .put("grossiste",
                                    f.getLgGROSSISTEID() == null ? ""
                                            : StringUtils.defaultString(f.getLgGROSSISTEID().getStrLIBELLE()))
                            .put("codeGeo", StringUtils.defaultString(codeGeo(f)))
                            .put("statut", StringUtils.defaultString(f.getStrSTATUT())));
        }
        return resultat;
    }

    /**
     * Personnalisation : code geo (position) principal du produit, celui de sa fiche ; vide si aucun ou si c'est
     * l'emplacement par defaut sans libelle.
     */
    public static String codeGeo(TFamille f) {
        /* retours du 11/10 (validation) : le code geo de l'article (fiche article, str_CODE_GEO_ARTICLE) */
        return f == null ? null : StringUtils.trimToNull(f.getStrCODEGEOARTICLE());
    }

    /* ------------------------------------------- apercu avant impression */

    /**
     * Apercu avant impression des etiquettes de Prestige : nombre d'etiquettes par produit pour la source donnee
     * (PANIER = etiquetage massif en preparation, LIGNE = une ligne de la gestion des etiquettes, BL = un bon de
     * livraison, quantites recues). Lecture seule.
     */
    @SuppressWarnings("unchecked")
    public java.util.Map<String, Integer> etiquettesParProduit(String source, String id) {
        java.util.Map<String, Integer> m = new java.util.LinkedHashMap<>();
        if ("BL".equals(source)) {
            for (Object[] r : (List<Object[]>) em
                    .createNativeQuery("SELECT lg_FAMILLE_ID, SUM(IFNULL(int_QTE_RECUE, 0))"
                            + " FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = ?1 AND lg_FAMILLE_ID IS NOT NULL"
                            + " GROUP BY lg_FAMILLE_ID")
                    .setParameter(1, StringUtils.defaultString(id)).getResultList()) {
                int n = ((Number) r[1]).intValue();
                if (n > 0) {
                    m.put((String) r[0], n);
                }
            }
            return m;
        }
        List<TEtiquette> etiquettes;
        if ("LIGNE".equals(source)) {
            TEtiquette e = id == null ? null : em.find(TEtiquette.class, id);
            etiquettes = e == null ? new ArrayList<>() : Collections.singletonList(e);
        } else {
            etiquettes = em.createQuery("SELECT t FROM TEtiquette t WHERE t.strSTATUT = ?1", TEtiquette.class)
                    .setParameter(1, commonparameter.statut_is_Process).getResultList();
        }
        for (TEtiquette e : etiquettes) {
            if (e.getLgFAMILLEID() != null) {
                m.merge(e.getLgFAMILLEID().getLgFAMILLEID(), nombreExemplaires(e.getIntNUMBER()), Integer::sum);
            }
        }
        return m;
    }

    /** Bons de livraison recents (ou cherches par reference ou identifiant), pour l'apercu avant impression. */
    @SuppressWarnings("unchecked")
    public org.json.JSONArray bonsPourEtiquettes(String recherche) {
        org.json.JSONArray a = new org.json.JSONArray();
        String r = StringUtils.trimToEmpty(recherche);
        javax.persistence.Query q = em.createNativeQuery("SELECT b.lg_BON_LIVRAISON_ID, b.str_REF_LIVRAISON,"
                + " DATE_FORMAT(b.dt_DATE_LIVRAISON, '%d/%m/%Y'), IFNULL(g.str_LIBELLE, ''),"
                + " (SELECT IFNULL(SUM(d.int_QTE_RECUE), 0) FROM t_bon_livraison_detail d WHERE d.lg_BON_LIVRAISON_ID ="
                + " b.lg_BON_LIVRAISON_ID) FROM t_bon_livraison b LEFT JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID"
                + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID WHERE b.str_STATUT <> 'delete'"
                + (r.isEmpty() ? "" : " AND (b.str_REF_LIVRAISON LIKE ?1 OR b.lg_BON_LIVRAISON_ID = ?2)")
                + " ORDER BY b.dt_DATE_LIVRAISON DESC, b.dt_CREATED DESC");
        if (!r.isEmpty()) {
            q.setParameter(1, r + "%").setParameter(2, r);
        }
        for (Object[] x : (List<Object[]>) q.setMaxResults(50).getResultList()) {
            a.put(new org.json.JSONObject().put("id", x[0]).put("ref", StringUtils.defaultString((String) x[1]))
                    .put("date", StringUtils.defaultString((String) x[2])).put("grossiste", x[3])
                    .put("etiquettes", ((Number) x[4]).intValue()));
        }
        return a;
    }

    /** Ecrit un parametre de Prestige (cree s'il manque). */
    public void ecrireParametre(String cle, String valeur, String description) {
        em.createNativeQuery("INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT,"
                + " dt_CREATED, dt_UPDATED) VALUES (?1, ?2, ?3, 'CUSTOMER', 'enable', NOW(), NOW())"
                + " ON DUPLICATE KEY UPDATE str_VALUE = VALUES(str_VALUE), dt_UPDATED = NOW()").setParameter(1, cle)
                .setParameter(2, StringUtils.defaultString(valeur))
                .setParameter(3, StringUtils.defaultString(description)).executeUpdate();
    }

    /* ------------------------------------------------- personnalisation */

    /** Disposition enregistree pour ce type de code et cette dimension, sinon null (dessin historique). */
    @SuppressWarnings("unchecked")
    public etiquetagepro.disposition.Disposition dispositionEnregistree(String type, float largeur, float hauteur) {
        try {
            List<Object> r = em.createNativeQuery("SELECT contenu FROM t_etiquette_disposition WHERE cle = ?1")
                    .setParameter(1, etiquetagepro.disposition.Disposition.cle(type, largeur, hauteur)).getResultList();
            return r.isEmpty() ? null
                    : etiquetagepro.disposition.Disposition.lire(new org.json.JSONObject(String.valueOf(r.get(0))));
        } catch (Exception e) {
            /* une disposition illisible ne doit pas empecher l'impression : dessin historique */
            LOG.log(Level.WARNING, "dispositionEnregistree " + type, e);
            return null;
        }
    }

    /** Dispositions enregistrees du meme type (autres dimensions), la plus recente d'abord. */
    @SuppressWarnings("unchecked")
    public List<etiquetagepro.disposition.Disposition> dispositionsDuType(String type) {
        List<etiquetagepro.disposition.Disposition> l = new ArrayList<>();
        for (Object c : em
                .createNativeQuery(
                        "SELECT contenu FROM t_etiquette_disposition WHERE type_code = ?1 ORDER BY dt_UPDATED DESC")
                .setParameter(1, type).getResultList()) {
            try {
                l.add(etiquetagepro.disposition.Disposition.lire(new org.json.JSONObject(String.valueOf(c))));
            } catch (Exception e) {
                LOG.log(Level.WARNING, "disposition illisible ignoree", e);
            }
        }
        return l;
    }

    /** Liste des dispositions enregistrees (cle, type, dimension, auteur, date). */
    @SuppressWarnings("unchecked")
    public org.json.JSONArray dispositionsEnregistrees() {
        org.json.JSONArray a = new org.json.JSONArray();
        for (Object[] r : (List<Object[]>) em.createNativeQuery(
                "SELECT cle, type_code, largeur_mm, hauteur_mm, modifie_par, DATE_FORMAT(dt_UPDATED, '%d/%m/%Y %H:%i')"
                        + " FROM t_etiquette_disposition ORDER BY type_code, largeur_mm, hauteur_mm")
                .getResultList()) {
            a.put(new org.json.JSONObject().put("cle", r[0]).put("type", r[1]).put("largeur", r[2]).put("hauteur", r[3])
                    .put("par", StringUtils.defaultString((String) r[4])).put("le", r[5]));
        }
        return a;
    }

    /** Enregistre (ou remplace) la disposition de ce type et de cette dimension. */
    public void enregistrerDisposition(etiquetagepro.disposition.Disposition d, String utilisateur) {
        em.createNativeQuery("INSERT INTO t_etiquette_disposition (cle, type_code, largeur_mm, hauteur_mm, contenu,"
                + " modifie_par, dt_UPDATED) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NOW()) ON DUPLICATE KEY UPDATE"
                + " contenu = VALUES(contenu), modifie_par = VALUES(modifie_par), dt_UPDATED = NOW()")
                .setParameter(1, d.cle()).setParameter(2, d.getTypeCode()).setParameter(3, d.getLargeur())
                .setParameter(4, d.getHauteur()).setParameter(5, d.json().toString())
                .setParameter(6, StringUtils.abbreviate(StringUtils.defaultString(utilisateur), 100)).executeUpdate();
    }

    /** Retire la disposition : ce type et cette dimension reviennent au dessin d'origine. */
    public boolean supprimerDisposition(String type, float largeur, float hauteur) {
        return em.createNativeQuery("DELETE FROM t_etiquette_disposition WHERE cle = ?1")
                .setParameter(1, etiquetagepro.disposition.Disposition.cle(type, largeur, hauteur)).executeUpdate() > 0;
    }

    /**
     * Produit de Prestige pour la lecture d'une etiquette : designation, prix actuel, code geo, peremption la plus
     * proche en stock. Lecture seule ; null si le CIP est inconnu.
     */
    @SuppressWarnings("unchecked")
    public org.json.JSONObject produitPourLecture(String cip) {
        if (StringUtils.isBlank(cip)) {
            return null;
        }
        List<TFamille> f = em.createQuery(
                "SELECT f FROM TFamille f WHERE f.intCIP = ?1 ORDER BY CASE WHEN f.strSTATUT = 'enable' THEN 0 ELSE 1 END",
                TFamille.class).setParameter(1, cip.trim()).setMaxResults(1).getResultList();
        if (f.isEmpty()) {
            return null;
        }
        TFamille p = f.get(0);
        return new org.json.JSONObject().put("id", p.getLgFAMILLEID())
                .put("designation", StringUtils.defaultString(p.getStrDESCRIPTION()))
                .put("prix", p.getIntPRICE() == null ? 0 : p.getIntPRICE())
                .put("codeGeo", StringUtils.defaultString(codeGeo(p)))
                .put("grossiste",
                        p.getLgGROSSISTEID() == null ? ""
                                : StringUtils.defaultString(p.getLgGROSSISTEID().getStrLIBELLE()))
                .put("statut", StringUtils.defaultString(p.getStrSTATUT()));
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
            /* code2D pour QR / DataMatrix, et les codes etendus quand le type du produit le demande */
            l.codeEtendu(type, brute.isEmpty() ? null : brute, numLot, per == null ? null : per.format(jj));
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
