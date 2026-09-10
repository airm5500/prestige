package rest.service.impl;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import org.apache.commons.lang3.StringUtils;

import commonTasks.dto.AnalyseOrdonnancierLigneDTO;
import commonTasks.dto.VenteDTO;
import commonTasks.dto.VenteDetailsDTO;

/**
 * L'analyse du registre de l'ordonnancier : ce qui sort le plus, pour qui, et sur prescription de qui.
 *
 * <p>
 * Le calcul porte sur EXACTEMENT la population du registre : les ventes cloturees rattachees a un medecin, et parmi
 * leurs produits, ceux qui sont soumis a ordonnance ET porteurs d'un code tableau. Une analyse qui compterait autre
 * chose que ce que l'onglet voisin affiche serait inexploitable : on ne saurait plus laquelle des deux croire.
 * </p>
 *
 * <p>
 * La classe ne connait ni la base ni le conteneur : elle transforme une liste de ventes deja lue. C'est ce qui permet
 * de la verifier ligne a ligne, sans deploiement.
 * </p>
 */
public final class AnalyseOrdonnancier {

    /** Une vente comptee une fois par regroupement, meme si elle y apporte plusieurs produits. */
    public static final class Cumul {

        private final String libelle;
        private final String complement;
        private final Set<String> ventes = new TreeSet<>();
        private long quantite;
        private long montant;

        Cumul(String libelle, String complement) {
            this.libelle = libelle;
            this.complement = complement;
        }

        void ajouter(String venteId, long quantiteLigne, long montantLigne) {
            if (StringUtils.isNotBlank(venteId)) {
                ventes.add(venteId);
            }
            quantite += quantiteLigne;
            montant += montantLigne;
        }

        public String getLibelle() {
            return libelle;
        }

        public String getComplement() {
            return complement;
        }

        /** Nombre de delivrances distinctes, et non de lignes : deux produits d'une meme vente font UNE delivrance. */
        public int getDelivrances() {
            return ventes.size();
        }

        public long getQuantite() {
            return quantite;
        }

        public long getMontant() {
            return montant;
        }
    }

    /** Ce que l'analyse rend : les indicateurs d'ensemble et les trois palmares. */
    public static final class Resultat {

        private int delivrances;
        private int lignes;
        private int produitsDistincts;
        private int clientsDistincts;
        private int medecinsDistincts;
        private long quantiteTotale;
        private long montantTotal;
        private List<Cumul> topProduits = new ArrayList<>();
        private List<Cumul> topClients = new ArrayList<>();
        private List<Cumul> topMedecins = new ArrayList<>();

        public int getDelivrances() {
            return delivrances;
        }

        public int getLignes() {
            return lignes;
        }

        public int getProduitsDistincts() {
            return produitsDistincts;
        }

        public int getClientsDistincts() {
            return clientsDistincts;
        }

        public int getMedecinsDistincts() {
            return medecinsDistincts;
        }

        public long getQuantiteTotale() {
            return quantiteTotale;
        }

        public long getMontantTotal() {
            return montantTotal;
        }

        public List<Cumul> getTopProduits() {
            return topProduits;
        }

        public List<Cumul> getTopClients() {
            return topClients;
        }

        public List<Cumul> getTopMedecins() {
            return topMedecins;
        }
    }

    /** Ce qui figure dans la colonne « section » des sorties a plat. */
    public static final String SECTION_PRODUIT = "Produit";
    public static final String SECTION_CLIENT = "Client";
    public static final String SECTION_MEDECIN = "Médecin";

    private AnalyseOrdonnancier() {
    }

    /**
     * Analyse le registre.
     *
     * @param ventes
     *            les ventes du registre, produits compris
     * @param limite
     *            nombre de lignes gardees dans chaque palmares ; zero ou moins les garde toutes
     */
    public static Resultat analyser(List<VenteDTO> ventes, int limite) {
        Resultat resultat = new Resultat();
        if (ventes == null || ventes.isEmpty()) {
            return resultat;
        }
        Map<String, Cumul> produits = new LinkedHashMap<>();
        Map<String, Cumul> clients = new LinkedHashMap<>();
        Map<String, Cumul> medecins = new LinkedHashMap<>();
        Set<String> ventesRetenues = new TreeSet<>();

        for (VenteDTO vente : ventes) {
            List<VenteDetailsDTO> items = vente.getItems();
            if (items == null || items.isEmpty()) {
                // Une vente rattachee a un medecin mais sans produit reglemente n'entre pas au
                // registre : la compter fausserait le nombre de delivrances.
                continue;
            }
            String venteId = vente.getLgPREENREGISTREMENTID();
            ventesRetenues.add(StringUtils.defaultString(venteId));
            String client = libelleOuInconnu(vente.getClientFullName(), "Client non renseigné");
            String medecin = libelleOuInconnu(vente.getNom(), "Médecin non renseigné");

            for (VenteDetailsDTO item : items) {
                long quantite = item.getIntQUANTITY() != null ? item.getIntQUANTITY() : 0L;
                long montant = item.getIntPRICE() != null ? item.getIntPRICE() : 0L;
                resultat.lignes++;
                resultat.quantiteTotale += quantite;
                resultat.montantTotal += montant;

                // Le produit est identifie par sa cle interne : deux produits homonymes restent
                // deux lignes, et un produit renomme ne se dedouble pas.
                String cleProduit = libelleOuInconnu(item.getLgFAMILLEID(),
                        StringUtils.defaultString(item.getIntCIP()));
                cumul(produits, cleProduit, libelleOuInconnu(item.getStrNAME(), "Produit inconnu"),
                        complementProduit(item)).ajouter(venteId, quantite, montant);
                cumul(clients, client, client, "").ajouter(venteId, quantite, montant);
                cumul(medecins, medecin, medecin, StringUtils.defaultString(vente.getNumOrder())).ajouter(venteId,
                        quantite, montant);
            }
        }
        resultat.delivrances = ventesRetenues.size();
        resultat.produitsDistincts = produits.size();
        resultat.clientsDistincts = clients.size();
        resultat.medecinsDistincts = medecins.size();
        resultat.topProduits = palmares(produits, limite);
        resultat.topClients = palmares(clients, limite);
        resultat.topMedecins = palmares(medecins, limite);
        return resultat;
    }

    /** CIP et code tableau, sous la forme « 8074624 - tableau A ». */
    private static String complementProduit(VenteDetailsDTO item) {
        String cip = StringUtils.defaultString(item.getIntCIP());
        String tableau = StringUtils.defaultString(item.getCodeTableau());
        if (tableau.isEmpty()) {
            return cip;
        }
        return cip.isEmpty() ? "tableau " + tableau : cip + " - tableau " + tableau;
    }

    private static String libelleOuInconnu(String valeur, String defaut) {
        return StringUtils.isBlank(valeur) ? defaut : valeur.trim();
    }

    private static Cumul cumul(Map<String, Cumul> table, String cle, String libelle, String complement) {
        return table.computeIfAbsent(cle, c -> new Cumul(libelle, complement));
    }

    /**
     * Le classement d'un regroupement.
     *
     * <p>
     * Trie par quantite decroissante : c'est le nombre de boites sorties qui interesse le registre, pas le chiffre
     * d'affaires. A quantite egale, le montant departage, puis le libelle, pour que deux executions sur les memes
     * donnees rendent toujours le meme ordre.
     * </p>
     */
    private static List<Cumul> palmares(Map<String, Cumul> table, int limite) {
        List<Cumul> lignes = new ArrayList<>(table.values());
        lignes.sort(Comparator.comparingLong(Cumul::getQuantite).reversed()
                .thenComparing(Comparator.comparingLong(Cumul::getMontant).reversed())
                .thenComparing(Cumul::getLibelle));
        if (limite > 0 && lignes.size() > limite) {
            return new ArrayList<>(lignes.subList(0, limite));
        }
        return lignes;
    }

    /**
     * Les trois palmares mis bout a bout, en une seule table : c'est ce que lisent l'edition PDF et l'export Excel.
     */
    public static List<AnalyseOrdonnancierLigneDTO> aPlat(Resultat resultat) {
        List<AnalyseOrdonnancierLigneDTO> lignes = new ArrayList<>();
        ajouter(lignes, SECTION_PRODUIT, resultat.getTopProduits());
        ajouter(lignes, SECTION_CLIENT, resultat.getTopClients());
        ajouter(lignes, SECTION_MEDECIN, resultat.getTopMedecins());
        return lignes;
    }

    private static void ajouter(List<AnalyseOrdonnancierLigneDTO> lignes, String section, List<Cumul> cumuls) {
        for (Cumul cumul : cumuls) {
            AnalyseOrdonnancierLigneDTO ligne = new AnalyseOrdonnancierLigneDTO();
            ligne.setSection(section);
            ligne.setLibelle(cumul.getLibelle());
            ligne.setComplement(cumul.getComplement());
            ligne.setDelivrances(cumul.getDelivrances());
            ligne.setQuantite(cumul.getQuantite());
            ligne.setMontant(cumul.getMontant());
            lignes.add(ligne);
        }
    }

    /** Resume des indicateurs sur une ligne, pour l'en-tete du PDF et le titre de l'Excel. */
    public static String indicateursTexte(Resultat r) {
        return r.getDelivrances() + " délivrance(s) - " + r.getLignes() + " ligne(s) - " + r.getProduitsDistincts()
                + " produit(s) distinct(s) - " + r.getClientsDistincts() + " client(s) - " + r.getMedecinsDistincts()
                + " médecin(s) - " + r.getQuantiteTotale() + " unité(s) - " + r.getMontantTotal() + " au total";
    }
}
