package rest.service.impl.activite;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import rest.service.dto.ActiviteAnalysesDTO;
import rest.service.dto.ActiviteAnalysesDTO.Cellule;
import rest.service.dto.ActiviteAnalysesDTO.Constat;
import rest.service.dto.ActiviteAnalysesDTO.Grossiste;
import rest.service.dto.ActiviteAnalysesDTO.Heure;
import rest.service.dto.ActiviteAnalysesDTO.Indicateur;
import rest.service.dto.ActiviteAnalysesDTO.Jour;
import rest.service.dto.ActiviteAnalysesDTO.Operateur;
import rest.service.dto.ActiviteAnalysesDTO.Tranche;

/**
 * Calculs de l'onglet « Analyses » (sans base : les lignes sont lues par le service). Memes regles que les requetes
 * docs/requetes/temps_saisie_ventes.sql et temps_saisie_bl.sql :
 * <ul>
 * <li>saisie d'une vente : de son ouverture a sa derniere ligne ; duree : jusqu'a l'encaissement ;</li>
 * <li>vente ecartee des moyennes : duree negative ou de plus d'une heure (vente oubliee ouverte) ;</li>
 * <li>vente longue : plus de 10 minutes par defaut, critere reglable (SeuilDuree) ; ecartees comprises ;</li>
 * <li>BL : de la creation de la commande a la derniere ligne du BL ; ecarte au-dela de 4 h (commande preparee a
 * l'avance, debut reel inconnu) ;</li>
 * <li>jour travaille : jour ou au moins une vente a ete encaissee.</li>
 * </ul>
 */
public final class AgregatsActivite {

    public static final long VENTE_MAX_SECONDES = 3600;
    public static final long VENTE_LONGUE_SECONDES = 600;
    public static final long BL_MAX_SECONDES = 4 * 3600;
    /**
     * Plan du 09/11, point 10 : temps au clavier compte au plus pour une vente (15 min) ; au-dela, la vente est restee
     * ouverte sans saisie (client absent, poste quitte) et fausserait la charge du jour.
     */
    public static final long CLAVIER_VENTE_MAX_SECONDES = 900;

    private AgregatsActivite() {
    }

    /** Une vente encaissee (lue par le service). */
    public static final class Vente {

        final String employeId;
        final LocalDateTime ouverture;
        final LocalDateTime derniereLigne;
        final LocalDateTime encaissement;
        final long lignes;
        final long montant;
        /** plan du 08/11, point 15.5 : type de vente (libelle de {@link #typeVente}) */
        final String type;
        /**
         * plan du 09/11, point 10 : prevente reprise en caisse (vendeur different de la caissiere) ; sa saisie n'est
         * pas celle de l'operateur, elle est ecartee de sa vitesse.
         */
        final boolean reprise;

        public String employeId() {
            return employeId;
        }

        public LocalDateTime ouvertureVente() {
            return ouverture;
        }

        public Vente(String employeId, LocalDateTime ouverture, LocalDateTime derniereLigne, LocalDateTime encaissement,
                long lignes, long montant) {
            this.employeId = employeId;
            this.ouverture = ouverture;
            this.derniereLigne = derniereLigne;
            this.encaissement = encaissement;
            this.lignes = lignes;
            this.montant = montant;
            this.type = "Autre";
            this.reprise = false;
        }

        /** Plan du 08/11, point 15.5 : avec le type de vente (identifiant t_type_vente et avoir). */
        public Vente(String employeId, LocalDateTime ouverture, LocalDateTime derniereLigne, LocalDateTime encaissement,
                long lignes, long montant, String typeVenteId, boolean avoir) {
            this(employeId, ouverture, derniereLigne, encaissement, lignes, montant, typeVenteId, avoir, false);
        }

        /** Plan du 09/11, point 10 : avec l'indication de prevente reprise en caisse. */
        public Vente(String employeId, LocalDateTime ouverture, LocalDateTime derniereLigne, LocalDateTime encaissement,
                long lignes, long montant, String typeVenteId, boolean avoir, boolean reprise) {
            this.employeId = employeId;
            this.ouverture = ouverture;
            this.derniereLigne = derniereLigne;
            this.encaissement = encaissement;
            this.lignes = lignes;
            this.montant = montant;
            this.type = typeVente(typeVenteId, avoir);
            this.reprise = reprise;
        }

        long duree() {
            return Duration.between(ouverture, encaissement).getSeconds();
        }

        /**
         * Saisie : de l'ouverture a la derniere ligne, jamais plus que la vente elle-meme (plan du 09/11, point 10 :
         * une ligne retouchee apres l'encaissement donnait des milliers de secondes par ligne).
         */
        long saisie() {
            return Math.max(0, Math.min(Duration.between(ouverture, derniereLigne).getSeconds(), duree()));
        }

        /** Temps au clavier compte dans la charge du jour : la saisie, plafonnee a 15 min. */
        long clavier() {
            return Math.min(saisie(), CLAVIER_VENTE_MAX_SECONDES);
        }

        /** Vente saisie par l'operateur lui-meme (retenue, pas une prevente reprise). */
        boolean saisieParLui() {
            return retenue() && !reprise;
        }

        /**
         * Vente mesuree pour la vitesse : saisie par l'operateur et d'au moins 2 lignes. La vente et sa premiere ligne
         * naissent a la meme seconde : la saisie mesure les intervalles entre lignes, une vente d'une ligne n'en a
         * aucun.
         */
        boolean mesuree() {
            return saisieParLui() && lignes >= 2;
        }

        /** Secondes entre deux lignes saisies (vente mesuree). */
        double secondesEntreLignes() {
            return (double) saisie() / (lignes - 1);
        }

        boolean retenue() {
            long d = duree();
            return d >= 0 && d <= VENTE_MAX_SECONDES && lignes > 0;
        }
    }

    /** Un BL entre (lu par le service). */
    public static final class Bl {

        final String employeId;
        final String grossiste;
        final LocalDateTime commande;
        final LocalDateTime creation;
        final LocalDateTime finSaisie;
        final LocalDate livraison;
        final long lignes;

        public String employeId() {
            return employeId;
        }

        public Bl(String employeId, String grossiste, LocalDateTime commande, LocalDateTime creation,
                LocalDateTime finSaisie, LocalDate livraison, long lignes) {
            this.employeId = employeId;
            this.grossiste = grossiste;
            this.commande = commande;
            this.creation = creation;
            this.finSaisie = finSaisie;
            this.livraison = livraison;
            this.lignes = lignes;
        }

        /**
         * Plan du 09/11, point 10 : temps de saisie du BL, de son ouverture (creation du BL) a sa derniere ligne. Il
         * etait compte depuis la commande, ce qui ajoutait l'attente de la livraison.
         */
        long total() {
            return creation == null || finSaisie == null ? -1 : Duration.between(creation, finSaisie).getSeconds();
        }

        boolean retenu() {
            long t = total();
            return t >= 0 && t <= BL_MAX_SECONDES && lignes > 0;
        }
    }

    /** Totaux d'une periode, pour la comparaison avec la precedente. */
    public static final class Totaux {

        public long ventes;
        public long jours;
        public long lignes;
        public long saisie;
        public long montant;
        public long bl;
        public long blRetard;
        public long annulations;
        public long longues;

        double ventesParJour() {
            return jours == 0 ? 0 : (double) ventes / jours;
        }

        double secondesParLigne() {
            return lignes == 0 ? 0 : (double) saisie / lignes;
        }

        double panier() {
            return ventes == 0 ? 0 : (double) montant / ventes;
        }

        double partBlRetard() {
            return bl == 0 ? 0 : 100.0 * blRetard / bl;
        }
    }

    public static Totaux totaux(List<Vente> ventes, List<Bl> bls, long annulations) {
        return totaux(ventes, bls, annulations, SeuilDuree.defaut());
    }

    /** Totaux ; « longues » compte les ventes retenues par le critere de duree choisi (retour du 24/10). */
    public static Totaux totaux(List<Vente> ventes, List<Bl> bls, long annulations, SeuilDuree seuil) {
        Totaux t = new Totaux();
        Set<LocalDate> jours = new HashSet<>();
        for (Vente v : ventes) {
            t.ventes++;
            t.montant += v.montant;
            jours.add(v.encaissement.toLocalDate());
            if (seuil.retient(v.duree())) {
                t.longues++;
            }
            if (v.retenue()) {
                t.lignes += v.lignes;
                t.saisie += v.saisie();
            }
        }
        t.jours = jours.size();
        for (Bl b : bls) {
            t.bl++;
            if (b.livraison != null && ChronoUnit.DAYS.between(b.livraison, b.creation.toLocalDate()) >= 2) {
                t.blRetard++;
            }
        }
        t.annulations = annulations;
        return t;
    }

    public static List<Heure> heures(List<Vente> ventes) {
        long[] n = new long[24], somme = new long[24], retenues = new long[24];
        for (Vente v : ventes) {
            int h = v.ouverture.getHour();
            n[h]++;
            if (v.retenue()) {
                somme[h] += v.saisie();
                retenues[h]++;
            }
        }
        List<Heure> l = new ArrayList<>();
        for (int h = 0; h < 24; h++) {
            if (n[h] > 0) {
                l.add(Heure.builder().heure(h).ventes(n[h])
                        .saisieMoyenne(retenues[h] == 0 ? 0 : Math.round((double) somme[h] / retenues[h])).build());
            }
        }
        return l;
    }

    public static List<Cellule> carte(List<Vente> ventes) {
        Map<Integer, Long> m = new TreeMap<>();
        for (Vente v : ventes) {
            int cle = v.ouverture.getDayOfWeek().getValue() * 100 + v.ouverture.getHour();
            m.merge(cle, 1L, Long::sum);
        }
        List<Cellule> l = new ArrayList<>();
        m.forEach((k, n) -> l.add(Cellule.builder().jour(k / 100).heure(k % 100).ventes(n).build()));
        return l;
    }

    public static List<Jour> jours(List<Vente> ventes, List<Bl> bls) {
        Map<LocalDate, Jour> m = new TreeMap<>();
        for (Vente v : ventes) {
            Jour j = m.computeIfAbsent(v.encaissement.toLocalDate(), d -> Jour.builder().date(d.toString()).build());
            j.setVentes(j.getVentes() + 1);
            if (v.retenue()) {
                j.setSaisieVentes(j.getSaisieVentes() + v.clavier());
            }
        }
        for (Bl b : bls) {
            if (b.finSaisie == null) {
                continue;
            }
            Jour j = m.computeIfAbsent(b.finSaisie.toLocalDate(), d -> Jour.builder().date(d.toString()).build());
            j.setBl(j.getBl() + 1);
            if (b.retenu()) {
                j.setSaisieBl(j.getSaisieBl() + b.total());
            }
        }
        return new ArrayList<>(m.values());
    }

    public static List<Operateur> operateurs(List<Vente> ventes, Map<String, String> noms) {
        return operateurs(ventes, noms, SeuilDuree.defaut());
    }

    public static List<Operateur> operateurs(List<Vente> ventes, Map<String, String> noms, SeuilDuree seuil) {
        Map<String, List<Vente>> parEmploye = new LinkedHashMap<>();
        ventes.forEach(v -> parEmploye.computeIfAbsent(v.employeId, k -> new ArrayList<>()).add(v));
        List<Operateur> l = new ArrayList<>();
        parEmploye.forEach((id, vs) -> {
            l.add(vitesse(id, noms.getOrDefault(id, "?"), vs, seuil));
        });
        l.sort(Comparator.comparingLong(Operateur::getVentes).reversed());
        return l;
    }

    /**
     * Plan du 09/11, point 10 : une ligne de vitesse (par operateur ou par type de vente), meme calcul pour les deux.
     * Vitesse = mediane des secondes entre deux lignes des ventes mesurees (saisies par lui, d'au moins 2 lignes,
     * preventes reprises ecartees) : une vente aberrante ne fait plus bouger le chiffre. Lignes par vente sur toutes
     * les ventes saisies par lui.
     */
    static Operateur vitesse(String id, String nom, List<Vente> vs, SeuilDuree seuil) {
        Totaux t = totaux(vs, List.of(), 0, seuil);
        List<Vente> mesurees = new ArrayList<>();
        vs.stream().filter(Vente::mesuree).forEach(mesurees::add);
        long parLui = vs.stream().filter(Vente::saisieParLui).count();
        long lignes = vs.stream().filter(Vente::saisieParLui).mapToLong(v -> v.lignes).sum();
        return Operateur.builder().id(id).nom(nom).jours(t.jours).ventes(t.ventes)
                .ventesParJour(arrondi(t.ventesParJour()))
                .lignesParVente(arrondi(parLui == 0 ? 0 : (double) lignes / parLui))
                .secondesParLigne(arrondi(medianeParLigne(mesurees))).ventesMesurees(mesurees.size())
                .chiffreAffaires(t.montant).panierMoyen(Math.round(t.panier())).ventesLongues(t.longues).build();
    }

    /** Plan du 09/11, point 10 : mediane des secondes entre deux lignes des ventes mesurees ; 0 sans vente. */
    static double medianeParLigne(List<Vente> ventes) {
        double[] d = ventes.stream().filter(Vente::mesuree).mapToDouble(Vente::secondesEntreLignes).sorted().toArray();
        if (d.length == 0) {
            return 0;
        }
        return d.length % 2 == 1 ? d[d.length / 2] : (d[d.length / 2 - 1] + d[d.length / 2]) / 2;
    }

    /** Ordre d'affichage des types de vente. */
    public static final List<String> TYPES_VENTE = List.of("Comptant", "Assurance", "Carnet", "Dépôt", "Avoir",
            "Autre");

    /**
     * Plan du 08/11, point 15.5 : type de vente lisible. Un avoir l'emporte sur le type ; 1 comptant, 2 assurance, 3
     * carnet, 4 et 5 depot (t_type_vente) ; autre sinon.
     */
    public static String typeVente(String typeVenteId, boolean avoir) {
        if (avoir) {
            return "Avoir";
        }
        switch (typeVenteId == null ? "" : typeVenteId.trim()) {
        case "1":
            return "Comptant";
        case "2":
            return "Assurance";
        case "3":
            return "Carnet";
        case "4":
        case "5":
            return "Dépôt";
        default:
            return "Autre";
        }
    }

    /**
     * Plan du 08/11, points 15.5 et 15.7 : vitesse par type de vente, memes calculs que la vitesse par operateur (un «
     * operateur » par type : id = nom = type). Seuls les types qui ont des ventes ; ordre de {@link #TYPES_VENTE}.
     */
    public static List<Operateur> typesVente(List<Vente> ventes, SeuilDuree seuil) {
        Map<String, List<Vente>> parType = new LinkedHashMap<>();
        TYPES_VENTE.forEach(t -> parType.put(t, new ArrayList<>()));
        ventes.forEach(v -> parType.computeIfAbsent(v.type, k -> new ArrayList<>()).add(v));
        List<Operateur> l = new ArrayList<>();
        parType.forEach((type, vs) -> {
            if (vs.isEmpty()) {
                return;
            }
            l.add(vitesse(type, type, vs, seuil));
        });
        return l;
    }

    /**
     * Plan du 08/11, point 15.4 : classement des vendeurs en preventes. Ligne lue : [vendeur, encaissees, CA, lignes,
     * annulees, abandonnees]. Total = encaissees + annulees + abandonnees ; taux = (annulees + abandonnees) / total ;
     * vendeurs sans prevente ecartes ; tri par encaissees, puis CA, puis nom.
     */
    public static List<ActiviteAnalysesDTO.Prevente> preventes(List<Object[]> lignes, Map<String, String> noms) {
        List<ActiviteAnalysesDTO.Prevente> l = new ArrayList<>();
        for (Object[] r : lignes) {
            long enc = nombre(r[1]), ca = nombre(r[2]), li = nombre(r[3]), ann = nombre(r[4]), aba = nombre(r[5]);
            long total = enc + ann + aba;
            if (r[0] == null || total == 0) {
                continue;
            }
            String id = String.valueOf(r[0]);
            l.add(ActiviteAnalysesDTO.Prevente.builder().id(id).nom(noms.getOrDefault(id, "?")).encaissees(enc)
                    .chiffreAffaires(ca).lignes(li).annulees(ann).abandonnees(aba).total(total)
                    .lignesParPrevente(arrondi(enc == 0 ? 0 : (double) li / enc))
                    .taux(arrondi(100.0 * (ann + aba) / total)).build());
        }
        l.sort(Comparator.comparingLong(ActiviteAnalysesDTO.Prevente::getEncaissees).reversed()
                .thenComparing(Comparator.comparingLong(ActiviteAnalysesDTO.Prevente::getChiffreAffaires).reversed())
                .thenComparing(ActiviteAnalysesDTO.Prevente::getNom));
        return l;
    }

    private static long nombre(Object o) {
        return o instanceof Number ? Math.max(0, ((Number) o).longValue()) : 0;
    }

    /** Plan du 08/11, point 15.3 : duree prise en caisse -> encaissement retenue (au-dela : caisse laissee ouverte). */
    public static final long PRISE_MAX_SECONDES = 3600;

    /**
     * Plan du 08/11, point 15.3 : lignes [caissiere, montant, duree en secondes ou null], une par prevente encaissee.
     * Duree retenue de 0 a PRISE_MAX_SECONDES ; moyenne arrondie ; mediane (moyenne arrondie des deux du milieu) ; tri
     * : encaissees decroissantes, puis nom.
     */
    public static List<ActiviteAnalysesDTO.VitesseCaissiere> vitesseCaissieres(List<Object[]> lignes,
            Map<String, String> noms) {
        Map<String, long[]> cumul = new LinkedHashMap<>();
        Map<String, List<Long>> durees = new HashMap<>();
        for (Object[] r : lignes) {
            if (r[0] == null) {
                continue;
            }
            String id = String.valueOf(r[0]);
            long[] x = cumul.computeIfAbsent(id, k -> new long[2]);
            x[0]++;
            x[1] += nombre(r[1]);
            List<Long> d = durees.computeIfAbsent(id, k -> new ArrayList<>());
            if (r[2] instanceof Number) {
                long s = ((Number) r[2]).longValue();
                if (s >= 0 && s <= PRISE_MAX_SECONDES) {
                    d.add(s);
                }
            }
        }
        List<ActiviteAnalysesDTO.VitesseCaissiere> l = new ArrayList<>();
        cumul.forEach((id, x) -> {
            List<Long> d = durees.get(id);
            d.sort(null);
            long n = d.size(), somme = d.stream().mapToLong(Long::longValue).sum();
            long mediane = n == 0 ? 0 : n % 2 == 1 ? d.get((int) (n / 2))
                    : Math.round((d.get((int) n / 2 - 1) + d.get((int) n / 2)) / 2.0);
            l.add(ActiviteAnalysesDTO.VitesseCaissiere.builder().id(id).nom(noms.getOrDefault(id, "?")).encaissees(x[0])
                    .chiffreAffaires(x[1]).mesurees(n).tempsMoyen(n == 0 ? 0 : Math.round((double) somme / n))
                    .tempsMedian(mediane).build());
        });
        l.sort(Comparator.comparingLong(ActiviteAnalysesDTO.VitesseCaissiere::getEncaissees).reversed()
                .thenComparing(ActiviteAnalysesDTO.VitesseCaissiere::getNom));
        return l;
    }

    public static List<Grossiste> grossistes(List<Bl> bls) {
        Map<String, long[]> m = new LinkedHashMap<>();
        for (Bl b : bls) {
            if (!b.retenu()) {
                continue;
            }
            long[] x = m.computeIfAbsent(b.grossiste == null ? "?" : b.grossiste, k -> new long[3]);
            x[0]++;
            x[1] += b.lignes;
            x[2] += b.total();
        }
        List<Grossiste> l = new ArrayList<>();
        m.forEach((nom, x) -> l.add(Grossiste.builder().nom(nom).bl(x[0]).lignesParBl(arrondi((double) x[1] / x[0]))
                .secondesParLigne(arrondi((double) x[2] / x[1])).build()));
        l.sort(Comparator.comparingDouble(Grossiste::getSecondesParLigne).reversed());
        return l;
    }

    public static List<Tranche> retardBl(List<Bl> bls) {
        long[] n = new long[4];
        /* plan du 08/11, point 15.2 : par tranche, grossiste -> [BL, somme des ecarts en jours] */
        List<Map<String, long[]>> parGrossiste = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            parGrossiste.add(new java.util.TreeMap<>());
        }
        for (Bl b : bls) {
            int t;
            long j = 0;
            if (b.livraison == null) {
                t = 3;
            } else {
                j = ChronoUnit.DAYS.between(b.livraison, b.creation.toLocalDate());
                t = j <= 0 ? 0 : j == 1 ? 1 : 2;
            }
            n[t]++;
            long[] x = parGrossiste.get(t).computeIfAbsent(b.grossiste == null ? "Sans grossiste" : b.grossiste,
                    k -> new long[2]);
            x[0]++;
            x[1] += j;
        }
        List<Tranche> l = new ArrayList<>();
        l.add(Tranche.builder().code("J0").libelle("Le jour même").nombre(n[0])
                .grossistes(grossistesRetard(parGrossiste.get(0), true)).build());
        l.add(Tranche.builder().code("J1").libelle("Le lendemain").nombre(n[1])
                .grossistes(grossistesRetard(parGrossiste.get(1), true)).build());
        l.add(Tranche.builder().code("J2").libelle("2 jours ou plus après").nombre(n[2])
                .grossistes(grossistesRetard(parGrossiste.get(2), true)).build());
        if (n[3] > 0) {
            l.add(Tranche.builder().code("SANS").libelle("Date de livraison absente").nombre(n[3])
                    .grossistes(grossistesRetard(parGrossiste.get(3), false)).build());
        }
        return l;
    }

    /** Grossistes d'une tranche, tri : BL decroissants, puis nom ; delai moyen arrondi au dixieme de jour. */
    static List<ActiviteAnalysesDTO.RetardGrossiste> grossistesRetard(Map<String, long[]> m, boolean avecDelai) {
        List<ActiviteAnalysesDTO.RetardGrossiste> l = new ArrayList<>();
        m.forEach((nom, x) -> l.add(ActiviteAnalysesDTO.RetardGrossiste.builder().nom(nom).bl(x[0])
                .delaiMoyen(avecDelai ? arrondi((double) x[1] / x[0]) : null).build()));
        l.sort(Comparator.comparingLong(ActiviteAnalysesDTO.RetardGrossiste::getBl).reversed()
                .thenComparing(ActiviteAnalysesDTO.RetardGrossiste::getNom));
        return l;
    }

    /** Indicateurs de la periode compares a la precedente. */
    public static List<Indicateur> indicateurs(Totaux t, Totaux p, long employesActifs) {
        return indicateurs(t, p, employesActifs, SeuilDuree.defaut());
    }

    public static List<Indicateur> indicateurs(Totaux t, Totaux p, long employesActifs, SeuilDuree seuil) {
        List<Indicateur> l = new ArrayList<>();
        l.add(indicateur("VENTES", "Ventes encaissées", t.ventes, p.ventes, "NOMBRE", true,
                "Ventes terminées sur la période"));
        l.add(indicateur("VENTES_JOUR", "Ventes par jour travaillé", arrondi(t.ventesParJour()),
                arrondi(p.ventesParJour()), "NOMBRE", true,
                "Jour travaillé : au moins une vente encaissée ce jour-là"));
        l.add(indicateur("SAISIE_LIGNE", "Saisie par ligne", arrondi(t.secondesParLigne()),
                arrondi(p.secondesParLigne()), "DUREE", false,
                "Temps moyen pour scanner ou chercher un article (ventes de plus d'une heure écartées)"));
        l.add(indicateur("PANIER", "Panier moyen", Math.round(t.panier()), Math.round(p.panier()), "MONTANT", true,
                "Montant moyen d'une vente"));
        l.add(indicateur("BL", "BL entrés", t.bl, p.bl, "NOMBRE", true, "Bons de livraison clôturés sur la période"));
        l.add(indicateur("BL_RETARD", "BL saisis à J+2 ou plus", arrondi(t.partBlRetard()), arrondi(p.partBlRetard()),
                "POURCENT", false,
                "Part des BL saisis deux jours ou plus après la livraison : le stock est faux pendant ce temps"));
        l.add(indicateur("ANNULATIONS", "Ventes annulées", t.annulations, p.annulations, "NOMBRE", false,
                "Ventes annulées sur la période"));
        l.add(indicateur("LONGUES", seuil.libelle(), t.longues, p.longues, "NOMBRE", !seuil.versLeHaut(),
                seuil.versLeHaut() ? "Vente laissée ouverte, poste mal utilisé ou client hésitant"
                        : "Ventes rapides : client habitué, ordonnance simple ou vente au comptoir"));
        l.add(Indicateur.builder().code("EMPLOYES").libelle("Employés actifs").valeur(employesActifs).format("NOMBRE")
                .hausseFavorable(true).aide("Employés ayant encaissé une vente ou entré un BL").build());
        return l;
    }

    static Indicateur indicateur(String code, String libelle, double v, double p, String format, boolean hausse,
            String aide) {
        Double evo = p == 0 ? null : arrondi((v - p) * 100.0 / p);
        return Indicateur.builder().code(code).libelle(libelle).valeur(v).precedent(p).evolution(evo).format(format)
                .hausseFavorable(hausse).aide(aide).build();
    }

    /** Constats d'aide a la decision : chacun cite un chiffre de la periode et une piste concrete. */
    public static List<Constat> constats(List<Heure> heures, List<Operateur> ops, List<Grossiste> gros,
            List<Tranche> retard, List<ActiviteAnalysesDTO.Sensible> sensibles, Totaux t, Totaux p) {
        return constats(heures, ops, gros, retard, sensibles, t, p, SeuilDuree.defaut());
    }

    public static List<Constat> constats(List<Heure> heures, List<Operateur> ops, List<Grossiste> gros,
            List<Tranche> retard, List<ActiviteAnalysesDTO.Sensible> sensibles, Totaux t, Totaux p, SeuilDuree seuil) {
        List<Constat> l = new ArrayList<>();
        /* pic d'affluence */
        Heure pic = heures.stream().max(Comparator.comparingLong(Heure::getVentes)).orElse(null);
        double saisieMoy = heures.stream().filter(h -> h.getSaisieMoyenne() > 0).mapToLong(Heure::getSaisieMoyenne)
                .average().orElse(0);
        if (pic != null && saisieMoy > 0) {
            double ecart = (pic.getSaisieMoyenne() - saisieMoy) * 100.0 / saisieMoy;
            if (ecart >= 15) {
                l.add(constat("ALERTE", "Pic de " + pic.getHeure() + " h : la saisie ralentit",
                        pic.getVentes() + " ventes entre " + pic.getHeure() + " h et " + (pic.getHeure() + 1)
                                + " h, saisie " + pourcent(ecart)
                                + " plus lente que la moyenne : un poste de plus à cette heure-là."));
            } else {
                l.add(constat("INFO", "Pic d'affluence à " + pic.getHeure() + " h",
                        pic.getVentes() + " ventes entre " + pic.getHeure() + " h et " + (pic.getHeure() + 1)
                                + " h ; la saisie y reste dans la moyenne."));
            }
        }
        /* operateur nettement plus lent que la mediane (au moins 20 ventes) */
        List<Operateur> fiables = new ArrayList<>();
        ops.stream().filter(o -> o.getVentes() >= 20 && o.getSecondesParLigne() > 0).forEach(fiables::add);
        if (fiables.size() >= 2) {
            double[] v = fiables.stream().mapToDouble(Operateur::getSecondesParLigne).sorted().toArray();
            double mediane = v.length % 2 == 1 ? v[v.length / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
            fiables.stream().filter(o -> o.getSecondesParLigne() >= 1.5 * mediane)
                    .max(Comparator.comparingDouble(Operateur::getSecondesParLigne))
                    .ifPresent(o -> l.add(constat("CONSEIL", "Saisie à accompagner : " + o.getNom(),
                            arrondi(o.getSecondesParLigne()) + " s par ligne contre " + arrondi(mediane)
                                    + " s pour l'équipe : vérifier la "
                                    + "douchette du poste ou proposer une formation (aide, pas classement).")));
        }
        /* grossiste le plus long a saisir (au moins 5 BL chacun : un BL isole ne dit rien) */
        List<Grossiste> comparables = new ArrayList<>();
        gros.stream().filter(g -> g.getBl() >= 5).forEach(comparables::add);
        if (comparables.size() >= 2) {
            Grossiste lent = comparables.get(0), rapide = comparables.get(comparables.size() - 1);
            if (rapide.getSecondesParLigne() > 0 && lent.getSecondesParLigne() >= 2 * rapide.getSecondesParLigne()) {
                l.add(constat("CONSEIL", "BL " + lent.getNom() + " longs à saisir",
                        duree(lent.getSecondesParLigne()) + " par ligne contre " + duree(rapide.getSecondesParLigne())
                                + " chez " + rapide.getNom() + " : demander des BL électroniques ou PharmaML à "
                                + lent.getNom() + "."));
            }
        }
        /* retard de saisie des BL */
        long total = retard.stream().mapToLong(Tranche::getNombre).sum();
        long tard = retard.stream().filter(x -> "J2".equals(x.getCode())).mapToLong(Tranche::getNombre).sum();
        if (total > 0 && tard * 100.0 / total >= 20) {
            l.add(constat("ALERTE", "BL saisis en retard", tard + " BL sur " + total + " ("
                    + pourcent(tard * 100.0 / total)
                    + ") saisis 2 jours ou plus après la livraison : stock faux, ruptures affichées à tort. Objectif : le jour même ou le lendemain."));
        }
        /* annulations concentrees sur un employe */
        sensibles.stream().filter(s -> s.getVentes() >= 50 && s.getAnnulations() >= 3)
                .max(Comparator.comparingDouble(ActiviteAnalysesDTO.Sensible::getTauxAnnulation)).ifPresent(s -> {
                    double moyenne = t.ventes == 0 ? 0 : t.annulations * 1000.0 / t.ventes;
                    if (moyenne > 0 && s.getTauxAnnulation() >= 2 * moyenne) {
                        l.add(constat("ALERTE", "Annulations à vérifier : " + s.getNom(),
                                s.getAnnulations() + " annulations (" + arrondi(s.getTauxAnnulation())
                                        + " pour 1 000 ventes, équipe : " + arrondi(moyenne)
                                        + ") : à rapprocher de la caisse et des ventes modifiées."));
                    }
                });
        /* ventes longues */
        if (seuil.versLeHaut() && t.ventes > 0 && t.longues * 100.0 / t.ventes >= 5) {
            l.add(constat("CONSEIL", "Ventes laissées ouvertes", t.longues + " " + seuil.libelle().toLowerCase() + " ("
                    + pourcent(t.longues * 100.0 / t.ventes) + ") : vérifier les postes et la mise en attente."));
        }
        /* tendance */
        if (p.ventesParJour() > 0) {
            double evo = (t.ventesParJour() - p.ventesParJour()) * 100.0 / p.ventesParJour();
            if (Math.abs(evo) >= 10) {
                l.add(constat(evo > 0 ? "INFO" : "ALERTE", evo > 0 ? "Activité en hausse" : "Activité en baisse",
                        arrondi(t.ventesParJour()) + " ventes par jour travaillé contre " + arrondi(p.ventesParJour())
                                + " sur la période précédente (" + (evo > 0 ? "+" : "") + pourcent(evo) + ")."));
            }
        }
        if (l.isEmpty()) {
            l.add(constat("INFO", "Rien de particulier", "Aucun écart notable sur la période."));
        }
        return l;
    }

    static Constat constat(String niveau, String titre, String texte) {
        return Constat.builder().niveau(niveau).titre(titre).texte(texte).build();
    }

    static double arrondi(double v) {
        return Math.round(v * 10) / 10.0;
    }

    static String pourcent(double v) {
        return String.format(Locale.FRANCE, "%.0f %%", Math.abs(v));
    }

    static String duree(double secondes) {
        long s = Math.round(secondes);
        return s < 60 ? s + " s" : (s / 60) + " min " + String.format("%02d", s % 60) + " s";
    }

    /** Repartition : nombre d'actions par type, pour chaque employe (lignes [employeId, type, nombre]). */
    public static List<ActiviteAnalysesDTO.Repartition> repartition(List<Object[]> lignes, Map<String, String> noms) {
        Map<String, ActiviteAnalysesDTO.Repartition> m = new LinkedHashMap<>();
        for (Object[] r : lignes) {
            String id = String.valueOf(r[0]);
            ActiviteAnalysesDTO.Repartition x = m.computeIfAbsent(id,
                    k -> ActiviteAnalysesDTO.Repartition.builder().id(k).nom(noms.getOrDefault(k, "?")).build());
            x.getActions().merge(String.valueOf(r[1]), ((Number) r[2]).longValue(), Long::sum);
        }
        List<ActiviteAnalysesDTO.Repartition> l = new ArrayList<>(m.values());
        l.sort(Comparator.comparingLong((ActiviteAnalysesDTO.Repartition x) -> x.getActions().values().stream()
                .mapToLong(Long::longValue).sum()).reversed());
        return l;
    }

    /** Operateurs montres un par un dans le graphique des ventes longues ; les suivants vont dans « Autres ». */
    public static final int LONGUES_MAX = 15;
    public static final String ID_AUTRES = "AUTRES";

    /**
     * Graphique des ventes longues : les {@link #LONGUES_MAX} premiers operateurs (ordre de la liste : ventes
     * decroissantes), puis une ligne « Autres (N opérateurs) » qui additionne les suivants. Le total du graphique est
     * ainsi celui de la tuile, quel que soit le nombre d'operateurs.
     */
    public static List<Operateur> longues(List<Operateur> ops, int max) {
        List<Operateur> l = new ArrayList<>();
        long longues = 0, ventes = 0;
        int autres = 0;
        for (int i = 0; i < ops.size(); i++) {
            Operateur o = ops.get(i);
            if (i < max) {
                l.add(Operateur.builder().id(o.getId()).nom(o.getNom()).ventes(o.getVentes())
                        .ventesLongues(o.getVentesLongues()).build());
            } else {
                longues += o.getVentesLongues();
                ventes += o.getVentes();
                autres++;
            }
        }
        if (autres > 0) {
            l.add(Operateur.builder().id(ID_AUTRES)
                    .nom("Autres (" + autres + " opérateur" + (autres > 1 ? "s" : "") + ")").ventes(ventes)
                    .ventesLongues(longues).build());
        }
        return l;
    }

    /** Plan avoir du 08/11, point 1 : ventes minimales pour designer l'operateur le plus rapide. */
    public static final long VENTES_MIN_RAPIDE = 5;

    /**
     * Plan avoir du 08/11, point 1 : resume de la periode, repris par la carte du tableau de bord et par les titres des
     * cartes du menu. Delai moyen des BL : jours entre la livraison et l'entree du BL (0 si saisi avant la livraison),
     * BL sans date de livraison ecartes.
     */
    public static ActiviteAnalysesDTO.Resume resume(Totaux t, List<Bl> bls,
            List<ActiviteAnalysesDTO.Sensible> sensibles, List<Operateur> ops, List<Constat> constats,
            SeuilDuree seuil) {
        long annulations = 0, modifications = 0, jours = 0, mesures = 0;
        for (ActiviteAnalysesDTO.Sensible s : sensibles) {
            annulations += s.getAnnulations();
            modifications += s.getModifications();
        }
        for (Bl b : bls) {
            if (b.livraison != null && b.creation != null) {
                jours += Math.max(0, ChronoUnit.DAYS.between(b.livraison, b.creation.toLocalDate()));
                mesures++;
            }
        }
        Operateur rapide = ops.stream().filter(o -> o.getVentes() >= VENTES_MIN_RAPIDE && o.getSecondesParLigne() > 0)
                .min(Comparator.comparingDouble(Operateur::getSecondesParLigne)
                        .thenComparing(Comparator.comparingLong(Operateur::getVentes).reversed())
                        .thenComparing(Operateur::getNom))
                .orElse(null);
        List<Constat> alertes = new ArrayList<>();
        constats.stream().filter(c -> "ALERTE".equals(c.getNiveau())).forEach(alertes::add);
        return ActiviteAnalysesDTO.Resume.builder().ventesLongues(t.longues).seuilLibelle(seuil.libelle())
                .annulations(annulations).modifications(modifications).actionsSensibles(annulations + modifications)
                .delaiMoyenBl(mesures == 0 ? null : arrondi((double) jours / mesures)).blMesures(mesures)
                .plusRapideId(rapide == null ? null : rapide.getId())
                .plusRapideNom(rapide == null ? null : rapide.getNom())
                .plusRapideSecondesParLigne(rapide == null ? null : rapide.getSecondesParLigne())
                .plusRapideVentes(rapide == null ? 0 : rapide.getVentes()).alertes(alertes.size())
                .premiereAlerte(alertes.isEmpty() ? null : alertes.get(0).getTitre()).build();
    }

    /** Actions sensibles par employe a partir des comptes lus par le service. */
    public static List<ActiviteAnalysesDTO.Sensible> sensibles(Map<String, Long> ventes, Map<String, Long> annulations,
            Map<String, Long> modifications, Map<String, Long> remises, Map<String, String> noms) {
        Set<String> ids = new HashSet<>();
        ids.addAll(annulations.keySet());
        ids.addAll(modifications.keySet());
        ids.addAll(remises.keySet());
        List<ActiviteAnalysesDTO.Sensible> l = new ArrayList<>();
        Map<String, Long> zero = new HashMap<>();
        for (String id : ids) {
            long v = ventes.getOrDefault(id, 0L), a = annulations.getOrDefault(id, 0L);
            l.add(ActiviteAnalysesDTO.Sensible.builder().id(id).nom(noms.getOrDefault(id, "?")).ventes(v).annulations(a)
                    .modifications(modifications.getOrDefault(id, zero.getOrDefault(id, 0L)))
                    .remises(remises.getOrDefault(id, 0L)).tauxAnnulation(v == 0 ? 0 : arrondi(a * 1000.0 / v))
                    .build());
        }
        l.sort(Comparator.comparingLong((ActiviteAnalysesDTO.Sensible s) -> s.getAnnulations() + s.getModifications())
                .reversed()
                .thenComparing(Comparator.comparingLong(ActiviteAnalysesDTO.Sensible::getRemises).reversed()));
        return l;
    }
}
