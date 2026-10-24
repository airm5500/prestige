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

        public String employeId() {
            return employeId;
        }

        public Vente(String employeId, LocalDateTime ouverture, LocalDateTime derniereLigne, LocalDateTime encaissement,
                long lignes, long montant) {
            this.employeId = employeId;
            this.ouverture = ouverture;
            this.derniereLigne = derniereLigne;
            this.encaissement = encaissement;
            this.lignes = lignes;
            this.montant = montant;
        }

        long duree() {
            return Duration.between(ouverture, encaissement).getSeconds();
        }

        long saisie() {
            return Math.max(0, Duration.between(ouverture, derniereLigne).getSeconds());
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

        long total() {
            return commande == null || finSaisie == null ? -1 : Duration.between(commande, finSaisie).getSeconds();
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
                j.setSaisieVentes(j.getSaisieVentes() + v.saisie());
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
            Totaux t = totaux(vs, List.of(), 0, seuil);
            long retenues = vs.stream().filter(Vente::retenue).count();
            l.add(Operateur.builder().id(id).nom(noms.getOrDefault(id, "?")).jours(t.jours).ventes(t.ventes)
                    .ventesParJour(arrondi(t.ventesParJour()))
                    .lignesParVente(arrondi(retenues == 0 ? 0 : (double) t.lignes / retenues))
                    .secondesParLigne(arrondi(t.secondesParLigne())).chiffreAffaires(t.montant)
                    .panierMoyen(Math.round(t.panier())).ventesLongues(t.longues).build());
        });
        l.sort(Comparator.comparingLong(Operateur::getVentes).reversed());
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
        for (Bl b : bls) {
            if (b.livraison == null) {
                n[3]++;
                continue;
            }
            long j = ChronoUnit.DAYS.between(b.livraison, b.creation.toLocalDate());
            n[j <= 0 ? 0 : j == 1 ? 1 : 2]++;
        }
        List<Tranche> l = new ArrayList<>();
        l.add(Tranche.builder().code("J0").libelle("Le jour même").nombre(n[0]).build());
        l.add(Tranche.builder().code("J1").libelle("Le lendemain").nombre(n[1]).build());
        l.add(Tranche.builder().code("J2").libelle("2 jours ou plus après").nombre(n[2]).build());
        if (n[3] > 0) {
            l.add(Tranche.builder().code("SANS").libelle("Date de livraison absente").nombre(n[3]).build());
        }
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
