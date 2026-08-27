/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.AddLot;
import commonTasks.dto.ArticleDTO;
import commonTasks.dto.VenteDetailsDTO;
import dal.TUser;
import enumeration.MargeEnum;
import java.io.IOException;
import java.util.Date;
import java.util.List;
import javax.ejb.Local;
import org.apache.commons.lang3.tuple.Pair;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.dto.UpdateProduit;

/**
 *
 * @author DICI
 */
@Local
public interface FicheArticleService {

    JSONObject produitPerimes(String query, int nbreMois, String dtStart, String dtEnd, String codeFamile,
            String codeRayon, String codeGrossiste, int start, int limit) throws JSONException;

    Pair<commonTasks.dto.LotDTO, List<commonTasks.dto.LotDTO>> produitPerimes(String query, int nbreMois,
            String dtStart, String dtEnd, String codeFamile, String codeRayon, String codeGrossiste, int start,
            int limit, boolean all);

    /**
     * Nombre de lots concernes uniquement (une seule requete COUNT) : utilise par le badge de la cloche de
     * notifications, qui n'a pas besoin de la liste ni du resume valorise.
     */
    long produitPerimesCount(String query, int nbreMois, String dtStart, String dtEnd, String codeFamile,
            String codeRayon, String codeGrossiste);

    /* Visualisation des perimes (peremptionquery) : exports et creation d'inventaire sur la liste filtree */
    byte[] exportPerimesCsv(String query, int nbreMois, String dtStart, String dtEnd, String codeFamile,
            String codeRayon, String codeGrossiste) throws java.io.IOException;

    byte[] exportPerimesExcel(String query, int nbreMois, String dtStart, String dtEnd, String codeFamile,
            String codeRayon, String codeGrossiste) throws java.io.IOException;

    java.util.Set<String> perimesProduitIds(String query, int nbreMois, String dtStart, String dtEnd, String codeFamile,
            String codeRayon, String codeGrossiste);

    JSONObject createInventairePerimes(String query, int nbreMois, String dtStart, String dtEnd, String codeFamile,
            String codeRayon, String codeGrossiste) throws JSONException;

    JSONObject modifierArticleDatePeremption(String lgFAMILLEID, String dtperemption) throws JSONException;

    /**
     * Corrige le code EAN d'un article, et de son deconditionne s'il en a un.
     *
     * <p>
     * Un produit et son detail designent la meme boite : ils portent le meme code, et la correction porte donc sur les
     * deux, quel que soit celui sur lequel on a clique. Si le code demande appartient deja a un AUTRE article, rien
     * n'est ecrit et le nom du porteur actuel est renvoye - deux articles au meme code EAN, c'est une douchette qui
     * n'en retrouve qu'un.
     *
     * @param lgFAMILLEID
     *            article sur lequel l'utilisateur a clique, produit ou deconditionne
     * @param codeEan
     *            code demande, tel que saisi
     */
    JSONObject modifierCodeEan(String lgFAMILLEID, String codeEan) throws JSONException;

    /**
     * Code EAN actuel d'un article, pour le presenter avant correction.
     *
     * <p>
     * Renvoie aussi le nombre d'articles du groupe - produit et deconditionne - afin que l'ecran puisse annoncer sur
     * quoi portera la correction.
     *
     * @param lgFAMILLEID
     *            article sur lequel l'utilisateur a clique
     */
    JSONObject lireCodeEan(String lgFAMILLEID) throws JSONException;

    List<ArticleDTO> articleSurStock(TUser u, String query, String codeFamile, String codeRayon, String codeGrossiste,
            int nbreMois, int nbreConsommation, int start, int limit, boolean all);

    JSONObject articleSurStock(TUser u, String query, String codeFamile, String codeRayon, String codeGrossiste,
            int nbreMois, int nbreConsommation, int start, int limit) throws JSONException;

    JSONObject comparaisonStock(TUser u, String query, MargeEnum filtreStock, MargeEnum filtreSeuil, String codeFamile,
            String codeRayon, String codeGrossiste, int stock, int seuil, int start, int limit) throws JSONException;

    List<ArticleDTO> comparaisonStock(TUser u, String query, MargeEnum filtreStock, MargeEnum filtreSeuil,
            String codeFamile, String codeRayon, String codeGrossiste, int stock, int seuil, int start, int limit,
            boolean all);

    Date getDateDerniereVente(String idProduit, String empl);

    Date getDateEntreeStock(String idProduit);

    Date getDateBonLivraison(String idProduit);

    Date getDateInventaire(String idProduit, String empl);

    List<VenteDetailsDTO> produitConsomamation(TUser u, String query, String dtStart, String dtEnd, String id);

    JSONObject produitConsomamation(TUser u, String query, String dtStart, String dtEnd, String id, int start,
            int limit) throws JSONException;

    boolean updateProduitAccount(String id, boolean account);

    JSONObject produitAccounts(String query, String rayon, String filtre, TUser u, int start, int limit)
            throws JSONException;

    JSONObject saisiePerimes(String query, String dtStart, String dtEnd, TUser u, String codeFamile, String codeRayon,
            String codeGrossiste, int start, int limit) throws JSONException;

    List<VenteDetailsDTO> saisiePerimes(String query, String dtStart, String dtEnd, String codeFamile, String codeRayon,
            String codeGrossiste, Integer grouby, int start, int limit, boolean all);

    byte[] exportSaisiePerimesCsv(String query, String dtStart, String dtEnd, String codeFamile, String codeRayon,
            String codeGrossiste) throws IOException;

    byte[] exportSaisiePerimesExcel(String query, String dtStart, String dtEnd, String codeFamile, String codeRayon,
            String codeGrossiste) throws IOException;

    JSONObject createInventaireSaisiePerimes(String query, String dtStart, String dtEnd, String codeFamile,
            String codeRayon, String codeGrossiste) throws JSONException;

    void addLot(AddLot addLot);

    void updateProduitLiteInfo(UpdateProduit updateProduit);

    /** Liste paginee des produits pour l'ecran MAJ SEUIL (filtres famille, emplacement, classe ABC + recherche). */
    JSONObject majSeuilList(String codeFamille, String zoneGeoId, String search, String classeAbcId, int start,
            int limit);

    /** MAJ groupee de Q1/Q2 par produit : mode SELECTED (ids) ou ALL (filtre moins uncheckedIds). */
    JSONObject majSeuilApply(String mode, String codeFamille, String zoneGeoId, String search, String classeAbcId,
            List<String> ids, List<String> uncheckedIds, Integer q1, Integer q2);

    /**
     * Liste paginee des produits pour l'ecran MAJ SELECTIVE. Memes filtres que l'ecran : emplacement, famille, code
     * tableau, code TVA, code remise, laboratoire, gamme, recherche libre. Chaque ligne porte la valeur actuelle des
     * donnees modifiables, pour que l'on voie ce que l'on s'apprete a changer.
     */
    JSONObject majSelectiveList(String zoneGeoId, String codeFamille, String codeTableau, String codeTvaId,
            String codeRemise, String laboratoireId, String gammeId, String search, int start, int limit);

    /** Valeurs de code tableau reellement presentes dans le fichier articles, pour alimenter le filtre. */
    JSONObject majSelectiveCodesTableau();

    /**
     * MAJ groupee d'UNE seule donnee sur les produits retenus : mode SELECTED (ids coches) ou ALL (tout le filtre,
     * moins les exceptions decochees).
     *
     * @param champ
     *            GROSSISTE, FAMILLE, TVA, CODE_REMISE, CODE_TABLEAU, LABORATOIRE ou GAMME
     * @param valeur
     *            la valeur a affecter, verifiee avant toute ecriture pour les champs qui referencent une autre table
     */
    JSONObject majSelectiveApply(String mode, String zoneGeoId, String codeFamille, String codeTableau,
            String codeTvaId, String codeRemise, String laboratoireId, String gammeId, String search, List<String> ids,
            List<String> uncheckedIds, String champ, String valeur);

    byte[] buildComparaisonExcel(TUser u, String query, MargeEnum filtreStock, MargeEnum filtreSeuil, String codeFamile,
            String codeRayon, String codeGrossiste, int stock, int seuil) throws JSONException;

    byte[] buildComparaisonCsv(TUser u, String query, MargeEnum filtreStock, MargeEnum filtreSeuil, String codeFamile,
            String codeRayon, String codeGrossiste, int stock, int seuil) throws JSONException;

    JSONObject createInventaireComparaison(TUser u, String query, MargeEnum filtreStock, MargeEnum filtreSeuil,
            String codeFamile, String codeRayon, String codeGrossiste, int stock, int seuil) throws JSONException;

}
