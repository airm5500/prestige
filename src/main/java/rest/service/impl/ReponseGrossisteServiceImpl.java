package rest.service.impl;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.annotation.security.PermitAll;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;

import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.json.JSONArray;
import org.json.JSONObject;

import dal.TOrder;
import dal.TOrderDetail;
import rest.service.ReponseGrossisteService;

/**
 * Lecture d'un fichier de reponse grossiste et confrontation aux lignes de la commande.
 *
 * <p>
 * Rien n'est ecrit ici : la methode rend un compte rendu que l'ecran affiche. L'application des quantites est un second
 * geste, explicite, et elle ne porte que sur les lignes reconnues sans ambiguite.
 */
@PermitAll
@Stateless
public class ReponseGrossisteServiceImpl implements ReponseGrossisteService {

    private static final Logger LOG = Logger.getLogger(ReponseGrossisteServiceImpl.class.getName());

    /** Colonnes du fichier convenu ; la designation est facultative. */
    private static final int COL_CIP_ENVOYE = 0;
    private static final int COL_QTE_COMMANDEE = 1;
    private static final int COL_CIP_REPONSE = 2;
    private static final int COL_QTE_RECUE = 3;
    private static final int COL_PRIX_ACHAT = 4;
    private static final int COL_DESIGNATION = 5;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public JSONObject analyser(String commandeId, String nomFichier, InputStream contenu) {
        JSONObject reponse = new JSONObject();
        try {
            TOrder commande = em.find(TOrder.class, commandeId);
            if (commande == null) {
                return reponse.put("success", false).put("message", "Commande introuvable.");
            }
            List<String[]> lignes = lire(nomFichier, contenu);
            if (lignes.isEmpty()) {
                return reponse.put("success", false).put("message", "Le fichier ne contient aucune ligne exploitable.");
            }

            // Lignes de la commande, rangees par code : le fichier designe les produits par leur code, jamais par
            // l'identifiant interne. On indexe TOUS les codes que l'export de la commande peut emettre - EAN 13, code
            // article chez ce grossiste, CIP - sans quoi le fichier rendu par le grossiste ne se rattacherait a rien.
            Map<String, TOrderDetail> parCode = new HashMap<>();
            List<TOrderDetail> details = em
                    .createQuery("SELECT d FROM TOrderDetail d WHERE d.lgORDERID.lgORDERID = ?1", TOrderDetail.class)
                    .setParameter(1, commandeId).getResultList();
            Map<String, String> codesGrossiste = codesChezLeGrossiste(commande);
            for (TOrderDetail d : details) {
                indexer(parCode, d, codesGrossiste);
            }

            JSONArray reconnues = new JSONArray();
            JSONArray aArbitrer = new JSONArray();
            JSONArray rejetees = new JSONArray();

            int numero = 0;
            for (String[] l : lignes) {
                numero++;
                String cipEnvoye = valeur(l, COL_CIP_ENVOYE);
                String cipReponse = valeur(l, COL_CIP_REPONSE);
                String designation = valeur(l, COL_DESIGNATION);
                Integer qteCommandee = entier(valeur(l, COL_QTE_COMMANDEE));
                Integer qteRecue = entier(valeur(l, COL_QTE_RECUE));
                Integer prixAchat = entier(valeur(l, COL_PRIX_ACHAT));

                if (StringUtils.isBlank(cipEnvoye)) {
                    rejetees.put(ligneJson(numero, cipEnvoye, cipReponse, designation, qteCommandee, qteRecue,
                            prixAchat, "Code produit absent"));
                    continue;
                }
                if (qteRecue == null) {
                    rejetees.put(ligneJson(numero, cipEnvoye, cipReponse, designation, qteCommandee, qteRecue,
                            prixAchat, "Quantité reçue illisible"));
                    continue;
                }
                TOrderDetail detail = parCode.get(normaliser(cipEnvoye));
                if (detail == null) {
                    rejetees.put(ligneJson(numero, cipEnvoye, cipReponse, designation, qteCommandee, qteRecue,
                            prixAchat, "Ce produit n'est pas dans la commande"));
                    continue;
                }

                JSONObject json = ligneJson(numero, cipEnvoye, cipReponse, designation, qteCommandee, qteRecue,
                        prixAchat, null);
                json.put("detailId", detail.getLgORDERDETAILID());
                json.put("produit", detail.getLgFAMILLEID() != null ? detail.getLgFAMILLEID().getStrNAME() : "");
                json.put("qteCommandeeSysteme", detail.getIntNUMBER());

                /*
                 * Substitution : le grossiste a servi un AUTRE produit que celui demande. On ne l'applique jamais
                 * d'office - la ligne de commande porte un produit precis, son prix et son stock ; y verser la quantite
                 * d'un autre produit fausserait l'entree en stock. Ces lignes sont montrees a part pour que l'officine
                 * tranche.
                 */
                if (StringUtils.isNotBlank(cipReponse) && !normaliser(cipReponse).equals(normaliser(cipEnvoye))
                        && parCode.get(normaliser(cipReponse)) != detail) {
                    /*
                     * Le code de reponse qui designe le MEME produit sous un autre de ses codes (EAN contre CIP, code
                     * article du grossiste) n'est pas une substitution : c'est le meme article, on n'ennuie pas
                     * l'officine avec.
                     */
                    json.put("motif", "Produit substitué par le grossiste (" + cipEnvoye + " → " + cipReponse + ")");
                    aArbitrer.put(json);
                    continue;
                }
                if (qteCommandee != null && detail.getIntNUMBER() != null
                        && !qteCommandee.equals(detail.getIntNUMBER())) {
                    json.put("motif", "Quantité commandée du fichier (" + qteCommandee + ") différente de la commande ("
                            + detail.getIntNUMBER() + ")");
                    aArbitrer.put(json);
                    continue;
                }
                if (detail.getIntNUMBER() != null && qteRecue > detail.getIntNUMBER()) {
                    json.put("motif", "Quantité reçue (" + qteRecue + ") supérieure à la quantité commandée ("
                            + detail.getIntNUMBER() + ")");
                    aArbitrer.put(json);
                    continue;
                }
                /*
                 * Non servi. On ne met PAS la ligne a zero d'office : une ligne de commande a zero n'a pas de sens et
                 * le geste attendu est de la supprimer, ce que l'ecran sait deja faire ligne a ligne. On la signale.
                 */
                if (qteRecue == 0) {
                    json.put("motif", "Non servi par le grossiste : supprimez la ligne si vous le souhaitez");
                    aArbitrer.put(json);
                    continue;
                }
                reconnues.put(json);
            }

            return reponse.put("success", true).put("commande", commande.getStrREFORDER()).put("lues", lignes.size())
                    .put("reconnues", reconnues).put("aArbitrer", aArbitrer).put("rejetees", rejetees);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "analyser la reponse grossiste de la commande " + commandeId, e);
            return reponse.put("success", false).put("message", "Lecture du fichier impossible : " + e.getMessage());
        }
    }

    @Override
    public JSONObject appliquer(String commandeId, List<rest.service.dto.ReponseGrossisteLigneDTO> lignes) {
        JSONObject reponse = new JSONObject();
        try {
            TOrder commande = em.find(TOrder.class, commandeId);
            if (commande == null) {
                return reponse.put("success", false).put("message", "Commande introuvable.");
            }
            /*
             * Une commande deja passee ou transformee en bon de livraison ne se retouche pas : les quantites y sont
             * devenues des engagements. On refuse plutot que d'ecrire en silence.
             */
            if (!util.Constant.STATUT_IS_PROGRESS.equals(commande.getStrSTATUT())) {
                return reponse.put("success", false).put("message",
                        "Cette commande n'est plus en cours : les quantités ne peuvent plus être"
                                + " modifiées depuis l'import.");
            }
            if (lignes == null || lignes.isEmpty()) {
                return reponse.put("success", false).put("message", "Aucune ligne à appliquer.");
            }

            int appliquees = 0;
            JSONArray ecartees = new JSONArray();
            java.util.Date maintenant = new java.util.Date();
            for (rest.service.dto.ReponseGrossisteLigneDTO ligne : lignes) {
                if (ligne == null || StringUtils.isBlank(ligne.getDetailId()) || ligne.getQteRecue() == null
                        || ligne.getQteRecue() <= 0) {
                    ecartees.put(new JSONObject().put("detailId", ligne == null ? "" : ligne.getDetailId()).put("motif",
                            "Quantité absente ou nulle"));
                    continue;
                }
                TOrderDetail detail = em.find(TOrderDetail.class, ligne.getDetailId());
                if (detail == null || detail.getLgORDERID() == null
                        || !commandeId.equals(detail.getLgORDERID().getLgORDERID())) {
                    ecartees.put(new JSONObject().put("detailId", ligne.getDetailId()).put("motif",
                            "Ligne absente de cette commande"));
                    continue;
                }
                int quantite = ligne.getQteRecue();
                detail.setIntNUMBER(quantite);
                detail.setIntQTEREPGROSSISTE(quantite);
                detail.setIntQTEMANQUANT(quantite);
                // Le montant de la ligne suit la quantite ; le prix d'achat unitaire, lui, n'est pas touche.
                detail.setIntPRICE(quantite * (detail.getIntPAFDETAIL() == null ? 0 : detail.getIntPAFDETAIL()));
                detail.setDtUPDATED(maintenant);
                em.merge(detail);
                appliquees++;
            }
            commande.setDtUPDATED(maintenant);
            em.merge(commande);
            return reponse.put("success", true).put("appliquees", appliquees).put("ecartees", ecartees).put("message",
                    appliquees + " ligne(s) mise(s) à jour.");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "appliquer la reponse grossiste de la commande " + commandeId, e);
            return reponse.put("success", false).put("message", "Mise à jour impossible : " + e.getMessage());
        }
    }

    /**
     * Codes article de ce grossiste, par identifiant de produit. C'est le code que l'export de la commande envoie quand
     * le produit n'a pas d'EAN 13 ; le grossiste le renvoie tel quel.
     */
    private Map<String, String> codesChezLeGrossiste(TOrder commande) {
        Map<String, String> codes = new HashMap<>();
        if (commande.getLgGROSSISTEID() == null) {
            return codes;
        }
        List<Object[]> lignes = em.createQuery(
                "SELECT fg.lgFAMILLEID.lgFAMILLEID, fg.strCODEARTICLE FROM TFamilleGrossiste fg"
                        + " WHERE fg.lgGROSSISTEID.lgGROSSISTEID = ?1 AND fg.strCODEARTICLE IS NOT NULL",
                Object[].class).setParameter(1, commande.getLgGROSSISTEID().getLgGROSSISTEID()).getResultList();
        for (Object[] ligne : lignes) {
            codes.putIfAbsent((String) ligne[0], (String) ligne[1]);
        }
        return codes;
    }

    /** Range une ligne de commande sous tous les codes par lesquels le grossiste peut la designer. */
    private void indexer(Map<String, TOrderDetail> parCode, TOrderDetail detail, Map<String, String> codesGrossiste) {
        if (detail.getLgFAMILLEID() == null) {
            return;
        }
        for (String code : new String[] { detail.getLgFAMILLEID().getIntEAN13(),
                codesGrossiste.get(detail.getLgFAMILLEID().getLgFAMILLEID()), detail.getLgFAMILLEID().getIntCIP(),
                detail.getLgFAMILLEID().getCodeEanFabriquant() }) {
            if (StringUtils.isNotBlank(code)) {
                parCode.putIfAbsent(normaliser(code), detail);
            }
        }
    }

    private static JSONObject ligneJson(int numero, String cipEnvoye, String cipReponse, String designation,
            Integer qteCommandee, Integer qteRecue, Integer prixAchat, String motif) {
        JSONObject json = new JSONObject().put("ligne", numero).put("cipEnvoye", StringUtils.defaultString(cipEnvoye))
                .put("cipReponse", StringUtils.defaultString(cipReponse))
                .put("designation", StringUtils.defaultString(designation))
                .put("qteCommandee", qteCommandee == null ? JSONObject.NULL : qteCommandee)
                .put("qteRecue", qteRecue == null ? JSONObject.NULL : qteRecue)
                .put("prixAchat", prixAchat == null ? JSONObject.NULL : prixAchat);
        if (motif != null) {
            json.put("motif", motif);
        }
        return json;
    }

    /** Les codes se comparent sans espaces ni zeros de tete : un CIP saisi « 08010185 » vaut « 8010185 ». */
    static String normaliser(String code) {
        String net = StringUtils.trimToEmpty(code).replace(" ", "");
        while (net.length() > 1 && net.charAt(0) == '0') {
            net = net.substring(1);
        }
        return net;
    }

    static String valeur(String[] ligne, int colonne) {
        return colonne < ligne.length ? StringUtils.trimToEmpty(ligne[colonne]) : "";
    }

    static Integer entier(String texte) {
        if (StringUtils.isBlank(texte)) {
            return null;
        }
        try {
            return (int) Math.round(Double.parseDouble(texte.replace(",", ".").replace(" ", "")));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Lit le fichier, CSV ou classeur Excel. Le format convenu n'a PAS de ligne d'en-tete ; une premiere ligne dont la
     * quantite recue n'est pas un nombre est neanmoins ignoree, pour accepter un fichier qui en porterait une.
     */
    static List<String[]> lire(String nomFichier, InputStream contenu) throws IOException {
        List<String[]> lignes = new ArrayList<>();
        String nom = nomFichier == null ? "" : nomFichier.toLowerCase();
        if (nom.endsWith(".xls") || nom.endsWith(".xlsx")) {
            try (Workbook classeur = WorkbookFactory.create(contenu)) {
                Sheet feuille = classeur.getSheetAt(0);
                for (Row ligne : feuille) {
                    String[] cellules = new String[6];
                    boolean vide = true;
                    for (int c = 0; c < 6; c++) {
                        cellules[c] = celluleTexte(ligne.getCell(c));
                        vide = vide && cellules[c].isEmpty();
                    }
                    if (!vide) {
                        lignes.add(cellules);
                    }
                }
            }
        } else {
            try (BufferedReader lecteur = new BufferedReader(new InputStreamReader(contenu, StandardCharsets.UTF_8))) {
                String ligne;
                while ((ligne = lecteur.readLine()) != null) {
                    if (ligne.trim().isEmpty()) {
                        continue;
                    }
                    lignes.add(ligne.split(";", -1));
                }
            }
        }
        if (!lignes.isEmpty() && entier(valeur(lignes.get(0), COL_QTE_RECUE)) == null
                && entier(valeur(lignes.get(0), COL_QTE_COMMANDEE)) == null) {
            lignes.remove(0);
        }
        return lignes;
    }

    /** Contenu d'une cellule sous forme de texte, sans le « .0 » des nombres entiers. */
    private static String celluleTexte(Cell cellule) {
        if (cellule == null) {
            return "";
        }
        try {
            if (cellule.getCellType() == CellType.NUMERIC) {
                double d = cellule.getNumericCellValue();
                return d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d);
            }
            return cellule.toString().trim();
        } catch (Exception e) {
            return cellule.toString().trim();
        }
    }
}
