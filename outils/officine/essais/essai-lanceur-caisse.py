"""Essai du lanceur de caisse (8-lanceur-caisse.ps1), retour du 16/11.

Un faux Prestige local passe par les etapes d'un vrai demarrage, a des instants fixes :
  rien n'ecoute -> 404 (Payara sans Prestige) -> 200 pret=false (prechauffage) -> 200 pret=true.
Le « navigateur » est cmd.exe, qui ecrit l'adresse ouverte dans un fichier : on compte les ouvertures et leur instant.

Cas :
  A  demarrage complet, sans fenetre : ouvre une seule fois, jamais avant « pret », etapes dans l'ordre
  B  Prestige deja pret : ouvre tout de suite (moins de 3 s), sans attendre
  C  version ancienne sans champ « pret » : ouvre
  D  jamais pret : code 1 au bout du delai, rien d'ouvert
  E  double clic : la deuxieme copie s'arrete, une seule ouverture
  F  demarrage complet avec la fenetre : la fenetre se ferme d'elle-meme et la caisse s'ouvre une fois
  G  fenetre, delai depasse : « Reessayer » apparait ; clic (UI Automation) apres le retour du serveur -> ouverture

  H  rien n'ecoute, pas de service : Payara lance une seule fois (asadmin start-domain domain1), puis ouverture
  I  asadmin introuvable : pas de plantage, la fenetre le dit, rien d'ouvert
  J  serveur d'un autre poste : rien n'est lance sur ce poste

  Tous les cas passent un asadmin d'essai (inexistant ou factice) : aucun vrai Payara n'est jamais lance.
  --ancien : remplace le lanceur par l'ancien raccourci (ouverture immediate) ; A doit alors echouer.
Usage : python -I essai-lanceur-caisse.py [--ancien]
"""
import http.server
import json
import os
import socket
import subprocess
import sys
import tempfile
import threading
import time

ICI = os.path.dirname(os.path.abspath(__file__))
LANCEUR = os.path.join(ICI, '..', '8-lanceur-caisse.ps1')
ANCIEN = '--ancien' in sys.argv
sys.stdout.reconfigure(encoding='utf-8')
echecs = []


def verifier(cas, condition, texte):
    print(('  ok   ' if condition else '  ECHEC ') + f'{cas} : {texte}')
    if not condition:
        echecs.append(f'{cas} : {texte}')


def port_libre():
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    p = s.getsockname()[1]
    s.close()
    return p


class FauxPrestige:
    """phases : liste de (a_partir_de_s, etat) ; etat dans 'arrete', '404', 'prechauffage', 'pret', 'ancien'."""

    def __init__(self, phases, declencheur=None):
        self.phases = phases
        self.declencheur = declencheur  # fichier : tout reste 'arrete' tant qu'il n'existe pas
        self.port = port_libre()
        self.t0 = time.time()
        self.serveur = None
        self.fin = False
        self.fil = threading.Thread(target=self.piloter, daemon=True)
        self.fil.start()

    def etat(self):
        e = 'arrete'
        t0 = self.t0
        if self.declencheur:
            if not os.path.exists(self.declencheur):
                return 'arrete'
            t0 = os.path.getmtime(self.declencheur)
        for debut, nom in self.phases:
            if time.time() - t0 >= debut:
                e = nom
        return e

    def piloter(self):
        faux = self

        class Gestion(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                e = faux.etat()
                if e == '404' or not self.path.endswith('/api/v1/app/info'):
                    self.send_response(404); self.end_headers(); return
                corps = {'nom': 'Prestige', 'version': 'essai', 'connecte': False}
                if e != 'ancien':
                    corps['pret'] = e == 'pret'
                    corps['demarrageSecondes'] = int(time.time() - faux.t0)
                donnees = json.dumps(corps).encode()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(donnees)

            def log_message(self, *a):
                pass

        while not self.fin:
            if self.serveur is None and self.etat() != 'arrete':
                self.serveur = http.server.ThreadingHTTPServer(('127.0.0.1', self.port), Gestion)
                threading.Thread(target=self.serveur.serve_forever, daemon=True).start()
            time.sleep(0.1)

    def arreter(self):
        self.fin = True
        if self.serveur:
            self.serveur.shutdown()
            self.serveur.server_close()

    @property
    def url(self):
        return f'http://127.0.0.1:{self.port}/prestige'


def lancer(faux, dossier, sans_fenetre=True, delai=60, attendre=True, asadmin=None, url=None):
    marque = os.path.join(dossier, 'ouvertures.txt')
    journal = os.path.join(dossier, 'journal.txt')
    if ANCIEN:
        # ancien raccourci : la caisse s'ouvre tout de suite, pret ou pas
        cmd = f'cmd.exe /c echo {faux.url}>>"{marque}"'
    else:
        cmd = ['powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', LANCEUR,
               '-Url', url or faux.url, '-Navigateur', 'cmd.exe',
               '-ArgumentsNavigateur', f'/c echo {{url}}>>"{marque}"',
               '-NomService', '', '-Asadmin', asadmin or os.path.join(dossier, 'absent', 'asadmin.bat'),
               '-DelaiMax', str(delai), '-Journal', journal]
        if sans_fenetre:
            cmd.append('-SansFenetre')
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8',
                         errors='replace')
    if not attendre:
        return p, marque, journal
    sortie, _ = p.communicate(timeout=delai + 60)
    return p.returncode, marque, journal, sortie


def asadmin_factice(dossier):
    """asadmin.bat qui note ses arguments au lieu de lancer Payara."""
    appels = os.path.join(dossier, 'asadmin-appels.txt')
    chemin = os.path.join(dossier, 'asadmin.bat')
    with open(chemin, 'w') as f:
        f.write(f'@echo %*>>"{appels}"\n')
    return appels, chemin


def ouvertures(marque):
    """[(instant de modification du fichier, nombre de lignes)] ; le fichier n'existe qu'apres une ouverture."""
    for _ in range(20):  # cmd.exe est lance sans attendre : laisser 2 s a l'ecriture
        if os.path.exists(marque):
            break
        time.sleep(0.1)
    if not os.path.exists(marque):
        return 0, None
    time.sleep(0.5)
    with open(marque, encoding='mbcs', errors='replace') as f:
        lignes = [l.strip() for l in f if l.strip()]
    return len(lignes), os.path.getmtime(marque)


def etapes(journal):
    if not os.path.exists(journal):
        return []
    with open(journal, encoding='utf-8-sig') as f:
        return [l.split(' ', 1)[1].strip() for l in f if ' ' in l]


def cas_complet(nom, sans_fenetre):
    with tempfile.TemporaryDirectory() as d:
        faux = FauxPrestige([(3, '404'), (6, 'prechauffage'), (9, 'pret')])
        code, marque, journal, sortie = lancer(faux, d, sans_fenetre=sans_fenetre)
        n, quand = ouvertures(marque)
        pret_a = faux.t0 + 9
        verifier(nom, code == 0, f'code de sortie 0 (lu : {code})')
        verifier(nom, n == 1, f'une seule ouverture (lu : {n})')
        verifier(nom, quand is not None and quand >= pret_a - 0.2,
                 'ouverture apres « pret » ' + (f'({quand - faux.t0:.1f} s, pret a 9 s)' if quand else '(aucune)'))
        verifier(nom, quand is not None and quand <= pret_a + 4, 'ouverture au plus 4 s apres « pret »')
        e = [x for x in etapes(journal) if x.startswith('etape') or x.startswith('ouverture')]
        attendu = ['etape arrete', 'etape chargement', 'etape prechauffage', 'etape pret', f'ouverture {faux.url}']
        verifier(nom, e == attendu, f'etapes dans l\'ordre {e}')
        faux.arreter()


def main():
    print('A. demarrage complet, sans fenetre')
    cas_complet('A', True)
    if ANCIEN:
        print(f'\n{len(echecs)} echec(s) (attendu avec --ancien)')
        sys.exit(1 if echecs else 0)

    print('B. deja pret')
    with tempfile.TemporaryDirectory() as d:
        faux = FauxPrestige([(0, 'pret')])
        time.sleep(0.5)
        t = time.time()
        code, marque, journal, _ = lancer(faux, d)
        n, quand = ouvertures(marque)
        verifier('B', code == 0 and n == 1, f'une ouverture, code 0 (lu : {n}, {code})')
        verifier('B', quand is not None and quand - t < 3, 'ouverture en moins de 3 s')
        verifier('B', etapes(journal)[0] == 'etape pret', 'premiere sonde : pret')
        faux.arreter()

    print('C. version ancienne sans champ « pret »')
    with tempfile.TemporaryDirectory() as d:
        faux = FauxPrestige([(0, 'ancien')])
        time.sleep(0.5)
        code, marque, _, _ = lancer(faux, d)
        n, _ = ouvertures(marque)
        verifier('C', code == 0 and n == 1, f'une ouverture (lu : {n}, code {code})')
        faux.arreter()

    print('D. jamais pret')
    with tempfile.TemporaryDirectory() as d:
        faux = FauxPrestige([(0, '404')])
        t = time.time()
        code, marque, journal, _ = lancer(faux, d, delai=6)
        n, _ = ouvertures(marque)
        verifier('D', code == 1, f'code de sortie 1 (lu : {code})')
        verifier('D', n == 0, f'rien d\'ouvert (lu : {n})')
        verifier('D', 6 <= time.time() - t < 20, f'arret apres le delai ({time.time() - t:.1f} s)')
        verifier('D', any(x.startswith('delai depasse') for x in etapes(journal)), 'journal : delai depasse')
        faux.arreter()

    print('E. double clic')
    with tempfile.TemporaryDirectory() as d:
        faux = FauxPrestige([(0, '404'), (8, 'pret')])
        p1, marque, journal = lancer(faux, d, attendre=False)
        time.sleep(3)
        code2, _, _, sortie2 = lancer(faux, d)
        p1.communicate(timeout=60)
        n, _ = ouvertures(marque)
        verifier('E', code2 == 0 and 'deja lance' in sortie2, 'la deuxieme copie s\'arrete aussitot')
        verifier('E', p1.returncode == 0 and n == 1, f'une seule ouverture (lu : {n})')
        faux.arreter()

    print('F. demarrage complet, avec la fenetre')
    cas_complet('F', False)

    print('G. fenetre, delai depasse puis « Reessayer »')
    with tempfile.TemporaryDirectory() as d:
        faux = FauxPrestige([(0, '404')])
        p, marque, journal = lancer(faux, d, sans_fenetre=False, delai=5, attendre=False)
        fin = time.time() + 30
        while time.time() < fin and not any(x.startswith('delai depasse') for x in etapes(journal)):
            time.sleep(0.5)
        verifier('G', any(x.startswith('delai depasse') for x in etapes(journal)), 'journal : delai depasse')
        verifier('G', p.poll() is None, 'la fenetre reste ouverte')
        texte = lire_fenetre(p.pid)
        verifier('G', 'Prestige ne répond pas' in texte and 'Réessayer' in texte,
                 f'fenetre : « Prestige ne répond pas » et « Réessayer » ({texte!r})')
        faux.phases = [(0, 'pret')]
        clic = cliquer(p.pid, 'Réessayer')
        try:
            p.communicate(timeout=30)
        except subprocess.TimeoutExpired:
            print('  fenetre apres le clic : ' + lire_fenetre(p.pid) + ' ; clic : ' + clic)
            p.kill()
            p.communicate()
        n, _ = ouvertures(marque)
        verifier('G', p.returncode == 0 and n == 1, f'apres « Reessayer » : une ouverture (lu : {n}, code {p.returncode})')
        verifier('G', 'nouvel essai' in etapes(journal), 'journal : nouvel essai')
        faux.arreter()

    print('H. pas de service : Payara lance par le lanceur')
    with tempfile.TemporaryDirectory() as d:
        appels, faux_asadmin = asadmin_factice(d)
        faux = FauxPrestige([(0, '404'), (3, 'pret')], declencheur=appels)
        code, marque, journal, _ = lancer(faux, d, asadmin=faux_asadmin)
        n, quand = ouvertures(marque)
        lus = open(appels).read().split() if os.path.exists(appels) else []
        verifier('H', ' '.join(lus) == 'start-domain domain1',
                 f'asadmin appele une seule fois : start-domain domain1 (lu : {lus})')
        verifier('H', code == 0 and n == 1, f'une ouverture, code 0 (lu : {n}, {code})')
        verifier('H', quand is not None and os.path.exists(appels) and quand >= os.path.getmtime(appels) + 3 - 0.2,
                 'ouverture apres le demarrage de Payara')
        e = etapes(journal)
        verifier('H', e[:2] == ['etape arrete', 'payara lance : start-domain domain1'], f'journal : {e[:3]}')
        faux.arreter()

    print('I. asadmin introuvable, avec la fenetre')
    with tempfile.TemporaryDirectory() as d:
        faux = FauxPrestige([])
        p, marque, journal = lancer(faux, d, sans_fenetre=False, delai=30, attendre=False)
        time.sleep(4)
        texte = lire_fenetre(p.pid)
        verifier('I', 'Payara introuvable' in texte and 'appelez le support' in texte, f'fenetre : {texte!r}')
        verifier('I', p.poll() is None, 'pas de plantage, la fenetre reste ouverte')
        p.kill()
        p.communicate()
        n, _ = ouvertures(marque)
        verifier('I', n == 0, "rien d'ouvert")
        faux.arreter()

    print("J. serveur d'un autre poste")
    with tempfile.TemporaryDirectory() as d:
        appels, faux_asadmin = asadmin_factice(d)
        faux = FauxPrestige([])
        code, marque, journal, _ = lancer(faux, d, delai=3, asadmin=faux_asadmin,
                                          url='http://serveur-essai.invalid:8080/prestige')
        verifier('J', not os.path.exists(appels), 'asadmin jamais appele')
        verifier('J', code == 1, f'delai depasse, code 1 (lu : {code})')
        verifier('J', any('rien a demarrer' in x for x in etapes(journal)), 'journal : rien a demarrer sur ce poste')
        faux.arreter()

    print(f'\n{len(echecs)} echec(s)')
    for e in echecs:
        print('  - ' + e)
    sys.exit(1 if echecs else 0)


UIA = r'''
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
$racine = [Windows.Automation.AutomationElement]::RootElement
$cond = New-Object Windows.Automation.PropertyCondition([Windows.Automation.AutomationElement]::ProcessIdProperty, {pid})
$fen = $null
for ($i = 0; $i -lt 40 -and -not $fen; $i++) { $fen = $racine.FindFirst('Children', $cond); if (-not $fen) { Start-Sleep -Milliseconds 250 } }
if (-not $fen) { Write-Output 'AUCUNE FENETRE'; exit 2 }
$tous = $fen.FindAll('Descendants', [Windows.Automation.Condition]::TrueCondition)
{action}
'''


def powershell_uia(pid, action):
    script = UIA.replace('{pid}', str(pid)).replace('{action}', action)
    r = subprocess.run(['powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    return (r.stdout + r.stderr).strip()


def lire_fenetre(pid):
    return powershell_uia(pid, "[Console]::OutputEncoding = [Text.Encoding]::UTF8; "
                               "($tous | ForEach-Object { $_.Current.Name } | Where-Object { $_ }) -join ' | '")


def cliquer(pid, libelle):
    # vrai clic de souris au centre du bouton : UI Automation voit les controles WinForms de cette fenetre comme de
    # simples panneaux, sans action « Invoquer »
    return powershell_uia(pid, r"""
$b = $tous | Where-Object { $_.Current.Name -ceq '""" + libelle + r"""' } | Select-Object -First 1
if (-not $b) { Write-Output 'BOUTON ABSENT'; exit 3 }
$r = $b.Current.BoundingRectangle
Add-Type -Namespace Essai -Name Souris -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y); [DllImport("user32.dll")] public static extern void mouse_event(int f, int x, int y, int d, int e);'
[Essai.Souris]::SetCursorPos([int]($r.X + $r.Width / 2), [int]($r.Y + $r.Height / 2)) | Out-Null
Start-Sleep -Milliseconds 150
[Essai.Souris]::mouse_event(2, 0, 0, 0, 0); [Essai.Souris]::mouse_event(4, 0, 0, 0, 0)
""")


if __name__ == '__main__':
    main()
