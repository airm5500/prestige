package rest.service.impl;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import commonTasks.dto.GardeCommandeDTO;
import commonTasks.dto.GardeKpiDTO;
import commonTasks.dto.GardeVendeurDTO;
import commonTasks.dto.GardeProduitDTO;
import commonTasks.dto.GardeReglementDTO;
import commonTasks.dto.GardeTrancheDTO;
import commonTasks.dto.GardeVenteDTO;
import commonTasks.dto.GardeVenteLigneDTO;
import util.Constant;
import util.MobileMoney;

/**
 * L'analyse d'une garde : ce qui s'est vendu, quand, et dans quelles proportions.
 *
 * <p>
 * Deux choses ne peuvent pas etre deleguees aux ecrans existants, et ce sont les seules que cette classe calcule :
 * </p>
 * <ul>
 * <li>la <b>repartition par tranche horaire</b>, qu'aucun ecran ne propose, et qui est precisement ce qu'on veut savoir
 * d'une nuit de garde : a quelle heure l'activite se concentre ;</li>
 * <li>la <b>classification ABC sur la fenetre exacte</b> de la garde. La procedure ABC de l'application travaille au
 * jour : une garde de 20 h a 8 h y deviendrait deux journees pleines, et le classement serait celui de l'activite
 * diurne, pas de la garde. Le calcul est donc refait ici, avec les MEMES seuils de cumul.</li>
 * </ul>
 *
 * <p>
 * Tout le reste -- chiffre d'affaires par type de vente, reglements, articles vendus -- est deja affiche par des ecrans
 * existants : la garde leur transmet sa periode plutot que de reconstruire des etats concurrents qui finiraient par
 * diverger.
 * </p>
 *
 * <p>
 * La classe ne connait ni la base ni le conteneur : elle transforme une liste de lignes de vente deja lue. C'est ce qui
 * permet de la verifier ligne a ligne, sans deploiement.
 * </p>
 */
public final class AnalyseGarde {

    /** Seuils de cumul par defaut, ceux de la procedure ABC de l'application. */
    public static final double SEUIL_A_DEFAUT = 80D;
    public static final double SEUIL_B_DEFAUT = 95D;

    private AnalyseGarde() {
    }

    /**
     * Repartition de l'activite par tranche horaire.
     *
     * <p>
     * Les tranches sont construites a partir du DEBUT de la garde, pas de minuit : une garde qui commence a 20 h 30
     * donne des tranches 20 h 30 - 22 h 30, 22 h 30 - 00 h 30, etc. Decouper sur les heures rondes couperait la
     * premiere tranche en deux et la rendrait incomparable aux suivantes.
     * </p>
     *
     * <p>
     * Toutes les tranches sont rendues, y compris celles sans aucune vente : une heure creuse est une information, et
     * l'omettre laisserait croire a une continuite qui n'existe pas.
     * </p>
     *
     * @param heuresParTranche
     *            largeur d'une tranche en heures ; une valeur nulle ou negative vaut une heure
     */
    public static List<GardeTrancheDTO> tranches(LocalDateTime debut, LocalDateTime fin,
            List<GardeVenteLigneDTO> lignes, int heuresParTranche) {
        List<GardeTrancheDTO> tranches = new ArrayList<>();
        if (debut == null || fin == null || !fin.isAfter(debut)) {
            return tranches;
        }
        int largeur = heuresParTranche > 0 ? heuresParTranche : 1;
        LocalDateTime borne = debut;
        while (borne.isBefore(fin)) {
            LocalDateTime suivante = borne.plusHours(largeur);
            if (suivante.isAfter(fin)) {
                suivante = fin;
            }
            GardeTrancheDTO tranche = new GardeTrancheDTO();
            tranche.setDebut(borne);
            tranche.setFin(suivante);
            tranches.add(tranche);
            borne = suivante;
        }
        if (lignes != null) {
            for (GardeVenteLigneDTO ligne : lignes) {
                GardeTrancheDTO tranche = trancheDe(tranches, ligne.getDateOperation());
                if (tranche != null) {
                    tranche.ajouter(ligne.getVenteId(), ligne.getQuantite(), ligne.getMontant());
                }
            }
        }
        return tranches;
    }

    /**
     * Repartition de l'activite par tranche d'HEURE DU JOUR, agregee sur toute la periode (retour du 08/09).
     *
     * <p>
     * Une garde d'une semaine decoupee en tranches consecutives donnait sept fois les memes heures, et personne ne
     * lisait plus rien. Ici chaque tranche est une heure du jour - 20 h a 22 h, par exemple - et cumule TOUS les jours
     * de la periode : c'est bien la question posee, « a quelle heure l'activite se concentre-t-elle ? ». Les tranches
     * partent de minuit, sur des heures rondes, pour etre les memes d'une garde a l'autre et donc comparables.
     * </p>
     *
     * <p>
     * Les 24 heures sont rendues, y compris celles hors de la fenetre de la garde : une tranche vide est une
     * information. Le nombre de « clients » d'une tranche est le nombre de ventes distinctes, comme au recapitulatif
     * caisse / recette.
     * </p>
     */
    public static List<GardeTrancheDTO> tranchesParHeureDuJour(List<GardeVenteLigneDTO> lignes, int heuresParTranche) {
        return tranchesParHeureDuJour(lignes, heuresParTranche, null, null);
    }

    /**
     * Les tranches de la periode, avec pour chacune le nombre d'heures de la garde qu'elle couvre (H2).
     *
     * <p>
     * C'est ce qui permet de ramener les clients d'une tranche a l'heure : une garde de deux nuits a traverse deux fois
     * la tranche 20h - 22h, soit quatre heures ; les clients qui s'y sont presentes se repartissent sur ces quatre
     * heures, pas sur deux.
     * </p>
     */
    public static List<GardeTrancheDTO> tranchesParHeureDuJour(List<GardeVenteLigneDTO> lignes, int heuresParTranche,
            LocalDateTime debut, LocalDateTime fin) {
        List<GardeTrancheDTO> tranches = new ArrayList<>();
        int largeur = heuresParTranche > 0 && heuresParTranche <= 24 && 24 % heuresParTranche == 0 ? heuresParTranche
                : 1;
        for (int h = 0; h < 24; h += largeur) {
            GardeTrancheDTO tranche = new GardeTrancheDTO();
            tranche.setHeureDuJour(h, h + largeur);
            tranches.add(tranche);
        }
        if (lignes != null) {
            for (GardeVenteLigneDTO ligne : lignes) {
                if (ligne.getDateOperation() == null) {
                    continue;
                }
                int indice = ligne.getDateOperation().getHour() / largeur;
                if (indice >= 0 && indice < tranches.size()) {
                    tranches.get(indice).ajouter(ligne.getVenteId(), ligne.getCleClient(), ligne.getQuantite(),
                            ligne.getMontant());
                }
            }
        }
        if (debut != null && fin != null && fin.isAfter(debut)) {
            // Heure par heure, du debut a la fin : chaque heure entamee compte pour la tranche qui la contient.
            // Borne haute : une garde ne dure pas plus d'un an ; au-dela, on s'arrete la.
            int[] heures = new int[tranches.size()];
            LocalDateTime curseur = debut.withMinute(0).withSecond(0).withNano(0);
            int garde = 0;
            while (curseur.isBefore(fin) && garde++ < 24 * 366) {
                heures[curseur.getHour() / largeur]++;
                curseur = curseur.plusHours(1);
            }
            for (int t = 0; t < tranches.size(); t++) {
                tranches.get(t).setHeuresCouvertes(heures[t]);
            }
        }
        return tranches;
    }

    /**
     * Les vendeurs de la garde (H3), du plus gros chiffre au plus petit.
     *
     * <p>
     * Le chiffre et la marge d'un vendeur sont ceux des lignes qu'il a vendues, avec la meme formule que l'ABC ; ses
     * clients se comptent comme partout ailleurs (client rattache, ou la vente pour une vente anonyme).
     * </p>
     */
    public static List<GardeVendeurDTO> vendeurs(List<GardeVenteLigneDTO> lignes) {
        Map<String, GardeVendeurDTO> table = new LinkedHashMap<>();
        for (GardeVenteLigneDTO ligne : lignes == null ? new ArrayList<GardeVenteLigneDTO>() : lignes) {
            String id = ligne.getVendeurId() == null || ligne.getVendeurId().isEmpty() ? "?" : ligne.getVendeurId();
            GardeVendeurDTO vendeur = table.computeIfAbsent(id,
                    cle -> new GardeVendeurDTO(cle,
                            ligne.getVendeurNom() == null || ligne.getVendeurNom().trim().isEmpty() ? "(sans vendeur)"
                                    : ligne.getVendeurNom().trim()));
            vendeur.ajouter(ligne.getVenteId(), ligne.getCleClient(), ligne.getMontant(), ligne.getMarge());
        }
        List<GardeVendeurDTO> vendeurs = new ArrayList<>(table.values());
        vendeurs.sort(Comparator.comparingLong(GardeVendeurDTO::getMontant).reversed()
                .thenComparing(GardeVendeurDTO::getNom));
        return vendeurs;
    }

    /**
     * Les produits commandes pendant la garde, rapproches de ce qui s'en est vendu pendant la meme garde (H3).
     *
     * <p>
     * Les commandes sont deja cumulees par produit ; on y reporte la quantite vendue lue dans les lignes. Un produit
     * commande sans une unite vendue est « non vendu ». Le classement met ces derniers en tete : c'est eux qu'on veut
     * voir.
     * </p>
     */
    public static List<GardeCommandeDTO> commandesRapprochees(List<GardeCommandeDTO> commandes,
            List<GardeVenteLigneDTO> lignes) {
        Map<String, Long> vendues = new LinkedHashMap<>();
        for (GardeVenteLigneDTO ligne : lignes == null ? new ArrayList<GardeVenteLigneDTO>() : lignes) {
            vendues.merge(ligne.getProduitId(), ligne.getQuantite(), Long::sum);
        }
        List<GardeCommandeDTO> resultat = new ArrayList<>();
        for (GardeCommandeDTO c : commandes == null ? new ArrayList<GardeCommandeDTO>() : commandes) {
            c.setQuantiteVendue(vendues.getOrDefault(c.getProduitId(), 0L));
            resultat.add(c);
        }
        resultat.sort(Comparator.comparing(GardeCommandeDTO::isNonVendu).reversed()
                .thenComparing(Comparator.comparingLong(GardeCommandeDTO::getQuantiteCommandee).reversed())
                .thenComparing(GardeCommandeDTO::getLibelle));
        return resultat;
    }

    /**
     * Les indicateurs reels d'une garde (H2), a partir de ce qui a ete lu : les lignes (chiffre, marge), les ventes au
     * grain du ticket (clients, credit), les reglements (chiffre par mode) et le nombre de ventes ratees.
     *
     * <p>
     * Le chiffre d'affaires et la marge sont ceux des lignes, les memes que l'analyse ABC et les tranches : une seule
     * verite. Est a credit toute vente dont une part n'est pas encaissee au comptoir : la part prise en charge par un
     * tiers (type de vente autre que comptant) et le reglement differe.
     * </p>
     */
    public static GardeKpiDTO kpi(Indicateurs indicateurs, List<GardeVenteDTO> ventes,
            List<GardeReglementDTO> reglements, int rates) {
        GardeKpiDTO k = new GardeKpiDTO();
        Indicateurs i = indicateurs == null ? new Indicateurs() : indicateurs;
        k.setVentes(i.getVentes());
        k.setMontant(i.getMontant());
        k.setMarge(i.getMarge());
        k.setDureeMinutes(i.getDureeMinutes());
        k.setRates(Math.max(0, rates));
        java.util.Set<String> clients = new java.util.HashSet<>();
        java.util.Set<String> ventesACredit = new java.util.HashSet<>();
        long montantCredit = 0L;
        for (GardeVenteDTO v : ventes == null ? new ArrayList<GardeVenteDTO>() : ventes) {
            clients.add(v.getCleClient());
            if (v.getPartPriseEnCharge() > 0) {
                ventesACredit.add(v.getVenteId());
                montantCredit += v.getPartPriseEnCharge();
            }
        }
        for (GardeReglementDTO r : reglements == null ? new ArrayList<GardeReglementDTO>() : reglements) {
            String type = r.getTypeReglementId();
            if (Constant.TYPE_REGLEMENT_ESPECE.equals(type)) {
                k.setCaEspeces(k.getCaEspeces() + r.getMontant());
            } else if (Constant.MODE_CHEQUE.equals(type)) {
                k.setCaCheque(k.getCaCheque() + r.getMontant());
            } else if (Constant.MODE_CB.equals(type)) {
                k.setCaCarte(k.getCaCarte() + r.getMontant());
            } else if (Constant.REGL_DIFF.equals(type)) {
                k.setCaDiffere(k.getCaDiffere() + r.getMontant());
                ventesACredit.add(r.getVenteId());
                montantCredit += r.getMontant();
            } else if (MobileMoney.est(type)) {
                k.setCaMobile(k.getCaMobile() + r.getMontant());
            } else {
                k.setCaAutres(k.getCaAutres() + r.getMontant());
            }
        }
        k.setClients(clients.size());
        k.setClientsCredit(ventesACredit.size());
        k.setMontantCredit(montantCredit);
        return k;
    }

    /** Cle de tri des produits classes : chiffre d'affaires (defaut), quantite ou marge. */
    public enum TriProduits {
        MONTANT, QUANTITE, MARGE;

        public static TriProduits depuis(String valeur) {
            if (valeur == null) {
                return MONTANT;
            }
            switch (valeur.trim().toLowerCase()) {
            case "quantite":
                return QUANTITE;
            case "marge":
                return MARGE;
            default:
                return MONTANT;
            }
        }
    }

    /**
     * Vue filtree et triee du classement (retour du 08/09) : une classe (ou toutes), un ordre, et les N premiers.
     *
     * <p>
     * Le classement lui-meme reste calcule sur TOUS les produits, par chiffre d'affaires : la classe d'un produit ne
     * change pas parce qu'on regarde les cent premiers ou parce qu'on trie par marge. Seule la lecture change.
     * </p>
     *
     * @param classe
     *            A, B ou C ; vide pour toutes
     * @param limite
     *            nombre de lignes rendues ; zero ou negatif pour toutes
     */
    public static List<GardeProduitDTO> filtrer(List<GardeProduitDTO> classes, String classe, TriProduits tri,
            int limite) {
        return filtrer(classes, classe, tri, limite, "", "", "");
    }

    /**
     * Le meme filtre, restreint a une famille, un rayon (emplacement) et un grossiste (retour des tests du 09/09). Un
     * critere vide ne filtre pas.
     */
    public static List<GardeProduitDTO> filtrer(List<GardeProduitDTO> classes, String classe, TriProduits tri,
            int limite, String familleId, String rayonId, String grossisteId) {
        List<GardeProduitDTO> vue = new ArrayList<>();
        String voulue = classe == null ? "" : classe.trim().toUpperCase();
        String famille = familleId == null ? "" : familleId.trim();
        String rayon = rayonId == null ? "" : rayonId.trim();
        String grossiste = grossisteId == null ? "" : grossisteId.trim();
        for (GardeProduitDTO p : classes) {
            if ((voulue.isEmpty() || voulue.equals(p.getClasse()))
                    && (famille.isEmpty() || famille.equals(p.getFamilleId()))
                    && (rayon.isEmpty() || rayon.equals(p.getRayonId()))
                    && (grossiste.isEmpty() || grossiste.equals(p.getGrossisteId()))) {
                vue.add(p);
            }
        }
        Comparator<GardeProduitDTO> ordre;
        switch (tri == null ? TriProduits.MONTANT : tri) {
        case QUANTITE:
            ordre = Comparator.comparingLong(GardeProduitDTO::getQuantite).reversed();
            break;
        case MARGE:
            ordre = Comparator.comparingLong(GardeProduitDTO::getMarge).reversed();
            break;
        default:
            ordre = Comparator.comparingLong(GardeProduitDTO::getMontant).reversed();
            break;
        }
        vue.sort(ordre.thenComparing(GardeProduitDTO::getLibelle));
        if (limite > 0 && vue.size() > limite) {
            return new ArrayList<>(vue.subList(0, limite));
        }
        return vue;
    }

    /**
     * La tranche contenant cet instant.
     *
     * <p>
     * Bornes semi-ouvertes : une vente a exactement la borne appartient a la tranche qui commence, jamais aux deux. La
     * derniere tranche inclut sa borne de fin, faute de quoi une vente a la seconde de cloture de la garde serait
     * comptee dans les totaux et perdue dans les tranches -- un ecart d'une seule ligne, donc invisible.
     * </p>
     */
    private static GardeTrancheDTO trancheDe(List<GardeTrancheDTO> tranches, LocalDateTime instant) {
        if (instant == null || tranches.isEmpty()) {
            return null;
        }
        for (GardeTrancheDTO tranche : tranches) {
            if (!instant.isBefore(tranche.getDebut()) && instant.isBefore(tranche.getFin())) {
                return tranche;
            }
        }
        GardeTrancheDTO derniere = tranches.get(tranches.size() - 1);
        return instant.isEqual(derniere.getFin()) ? derniere : null;
    }

    /**
     * Classification ABC des produits vendus pendant la garde.
     *
     * <p>
     * Meme regle que la procedure de l'application : les produits sont ranges par chiffre d'affaires decroissant, et la
     * classe se lit sur le cumul ATTEINT AVANT la ligne. Un produit qui fait a lui seul 90 % du chiffre reste donc en
     * A, au lieu de basculer en C parce que son propre cumul depasse le seuil.
     * </p>
     *
     * @param seuilA
     *            part cumulee en dessous de laquelle un produit est en classe A (80 par defaut)
     * @param seuilB
     *            part cumulee en dessous de laquelle un produit est en classe B (95 par defaut)
     */
    public static List<GardeProduitDTO> classifierAbc(List<GardeVenteLigneDTO> lignes, double seuilA, double seuilB) {
        List<GardeProduitDTO> produits = cumulerParProduit(lignes);
        long total = 0L;
        for (GardeProduitDTO produit : produits) {
            total += produit.getMontant();
        }
        produits.sort(Comparator.comparingLong(GardeProduitDTO::getMontant).reversed()
                .thenComparing(Comparator.comparingLong(GardeProduitDTO::getQuantite).reversed())
                .thenComparing(GardeProduitDTO::getLibelle));
        long cumul = 0L;
        for (GardeProduitDTO produit : produits) {
            long avant = cumul;
            cumul += produit.getMontant();
            if (total <= 0L) {
                // Aucun chiffre d'affaires : parler de classes n'aurait pas de sens. Les produits
                // restent listes, sans classe, plutot que tous ranges en A par division par zero.
                produit.setPart(0D);
                produit.setCumulPart(0D);
                produit.setClasse("");
                continue;
            }
            produit.setPart(produit.getMontant() * 100D / total);
            produit.setCumulPart(cumul * 100D / total);
            double partAvant = avant * 100D / total;
            produit.setClasse(partAvant < seuilA ? "A" : (partAvant < seuilB ? "B" : "C"));
        }
        return produits;
    }

    /** Les lignes regroupees par produit, sans classement ni part. */
    private static List<GardeProduitDTO> cumulerParProduit(List<GardeVenteLigneDTO> lignes) {
        Map<String, GardeProduitDTO> table = new LinkedHashMap<>();
        if (lignes == null) {
            return new ArrayList<>();
        }
        for (GardeVenteLigneDTO ligne : lignes) {
            // Le produit est identifie par sa cle interne : deux homonymes restent deux lignes,
            // et un produit renomme entre deux gardes ne se dedouble pas.
            GardeProduitDTO produit = table.computeIfAbsent(ligne.getProduitId(), id -> {
                GardeProduitDTO p = new GardeProduitDTO();
                p.setProduitId(id);
                p.setCip(ligne.getCip());
                p.setLibelle(ligne.getLibelle());
                p.setRattachements(ligne.getFamilleId(), ligne.getRayonId(), ligne.getGrossisteId());
                return p;
            });
            produit.setQuantite(produit.getQuantite() + ligne.getQuantite());
            produit.setMontant(produit.getMontant() + ligne.getMontant());
            produit.setMarge(produit.getMarge() + ligne.getMarge());
            produit.setLignes(produit.getLignes() + 1);
        }
        return new ArrayList<>(table.values());
    }

    /** Les indicateurs d'ensemble d'une garde. */
    public static final class Indicateurs {

        private int ventes;
        private int lignes;
        private int produitsDistincts;
        private long quantite;
        private long montant;
        private long marge;
        private long dureeMinutes;

        public long getMarge() {
            return marge;
        }

        /** Taux de marge d'ensemble, en pourcentage du chiffre. */
        public double getTauxMarge() {
            return montant > 0 ? marge * 100D / montant : 0D;
        }

        public int getVentes() {
            return ventes;
        }

        public int getLignes() {
            return lignes;
        }

        public int getProduitsDistincts() {
            return produitsDistincts;
        }

        public long getQuantite() {
            return quantite;
        }

        public long getMontant() {
            return montant;
        }

        public long getDureeMinutes() {
            return dureeMinutes;
        }

        /**
         * Chiffre d'affaires ramene a l'heure.
         *
         * <p>
         * C'est le seul indicateur qui permette de comparer deux gardes de durees differentes : une garde de week-end
         * de 36 h fera toujours plus qu'une nuit de 12 h, sans rien dire de son intensite.
         * </p>
         */
        public long getMontantParHeure() {
            return dureeMinutes > 0 ? Math.round(montant * 60D / dureeMinutes) : 0L;
        }
    }

    public static Indicateurs indicateurs(LocalDateTime debut, LocalDateTime fin, List<GardeVenteLigneDTO> lignes) {
        Indicateurs i = new Indicateurs();
        if (debut != null && fin != null && fin.isAfter(debut)) {
            i.dureeMinutes = java.time.Duration.between(debut, fin).toMinutes();
        }
        if (lignes == null || lignes.isEmpty()) {
            return i;
        }
        java.util.Set<String> ventes = new java.util.HashSet<>();
        java.util.Set<String> produits = new java.util.HashSet<>();
        for (GardeVenteLigneDTO ligne : lignes) {
            i.lignes++;
            i.quantite += ligne.getQuantite();
            i.montant += ligne.getMontant();
            i.marge += ligne.getMarge();
            ventes.add(String.valueOf(ligne.getVenteId()));
            produits.add(String.valueOf(ligne.getProduitId()));
        }
        i.ventes = ventes.size();
        i.produitsDistincts = produits.size();
        return i;
    }
}
