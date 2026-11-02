package rest.service.impl.serveur;

import java.lang.management.ManagementFactory;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.commons.lang3.StringUtils;
import rest.service.impl.serveur.ReglagesServeur.Reglage;

/**
 * STABILITE DU SERVEUR : reglages en place et conseilles (MariaDB, Payara) de la machine et du domaine en cours, base
 * commune de l'ecran, de l'application des reglages et du releve de chaque poste (demande du 02/11).
 */
public final class CalculReglages {

    public int postes;
    public long ram;
    public ConfigPayara payara;
    public Map<String, String> variables;
    public boolean serveur, mariadbLocale;
    public List<Reglage> tous = new ArrayList<>(), payaraReglages = new ArrayList<>();
    public String xml = "";
    public ApplicationPayara.Domaine domaine;

    CalculReglages() {
    }

    /**
     * @param serveur
     *            poste declare « serveur » (application.mode), sinon caisse
     * @param hote
     *            nom de cette machine, pour savoir si la base est locale
     * @param dossierVidages
     *            dossier conseille pour les vidages memoire (barres obliques)
     * @param dossierLogs
     *            dossier des journaux (barres obliques)
     */
    public static CalculReglages calculer(int postes, Map<String, String> variables, boolean serveur, String hote,
            String dossierVidages, String dossierLogs) throws java.io.IOException {
        CalculReglages c = new CalculReglages();
        c.postes = postes;
        String racine = System.getProperty("com.sun.aas.instanceRoot");
        String xml = "";
        if (racine != null) {
            java.nio.file.Path domaine = Paths.get(racine, "config", "domain.xml");
            if (Files.isRegularFile(domaine)) {
                xml = new String(Files.readAllBytes(domaine), StandardCharsets.UTF_8);
                c.xml = xml;
            }
        }
        c.payara = ConfigPayara.lire(xml);
        c.domaine = ApplicationPayara.domaine(StringUtils.defaultString(racine, "domain1"), xml);
        c.ram = MesureServeur.ramMachine();
        c.variables = variables;
        c.serveur = serveur;
        c.mariadbLocale = !c.payara.lu || c.payara.poolUrl.isEmpty()
                || ConfigPayara.locale(ConfigPayara.hoteBase(c.payara.poolUrl), hote);
        for (Reglage x : ReglagesServeur.comparer(c.ram, Runtime.getRuntime().availableProcessors(),
                Runtime.getRuntime().maxMemory(), c.variables, c.postes, c.payara.lu ? c.payara.poolMax : -1, c.serveur,
                c.mariadbLocale)) {
            /* la memoire du serveur Java est traitee avec les options de Payara (-Xms et -Xmx ensemble) */
            if (!(c.payara.lu && "Xmx".equals(x.cle))) {
                c.tous.add(x);
            }
        }
        if (c.payara.lu) {
            c.payaraReglages = c.payara.comparer(ManagementFactory.getRuntimeMXBean().getInputArguments(),
                    ReglagesServeur.heapConseille(c.ram), c.serveur, c.mariadbLocale, dossierVidages, dossierLogs);
        }
        c.tous.addAll(c.payaraReglages);
        return c;
    }
}
