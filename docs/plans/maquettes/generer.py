from commun import *
def carte(t, titre, corps, extra=""):
    return f'<div class="carte {t}" draggable="true"{extra}><div class="tete"><span class="poignee">⠿</span>{titre}<span class="x" title="Masquer">✕</span></div><div class="corps">{corps}</div></div>'
ENTETE=lambda s: f'''<header><div><h1>TABLEAU DE BORD</h1><div class="sous">{s}</div></div><div class="esp"></div>
<button class="btn sombre" onclick="basculerEdition(this)">Personnaliser</button><button class="btn sombre">Actualiser</button></header>'''
BAND='<div class="bandeau-edition">Mode personnalisation : glissez les cartes par la poignée ⠿ pour les déplacer, ✕ pour les masquer. La disposition est enregistrée par utilisateur.</div>'
FIN="document.querySelectorAll('.x').forEach(x=>x.onclick=()=>x.closest('[draggable]').remove());document.querySelectorAll('[data-dd]').forEach(glisserDeposer);brancherAnnees();"

# 1 : Classique en grille
k="".join(f'<div draggable="true">{kpi_html(x)}</div>' for x in kpis())
c1=ENTETE("Proposition 1 : grille classique (indicateurs en haut, cartes 2 colonnes)")+f'''<main style="padding:16px">{BAND}
<div data-dd style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:14px">{k}</div>
<div data-dd style="display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:14px">
{carte("t-bleu","Évolution du chiffre d'affaires (M FCFA)",courbe_html(),' style="grid-column:1/-1"')}
{carte("t-vert","Top 5 des ventes du mois",top_html())}{carte("t-ambre","Alertes",alertes_html())}
{carte("t-violet","Achats par grossiste",gros_html())}{carte("t-cyan","Encaissements du jour",caisse_html())}
{carte("t-rose","Encours tiers payants",tp_html())}{carte("t-bleu","Valorisation du stock",valo_html())}</div></main>'''
open("tableau-de-bord-1-grille.html","w").write(page("Tableau de bord 1",c1,FIN))

# 2 : Pilotage avec colonne d'alertes à droite
k2="".join(f'<div draggable="true">{kpi_html(x)}</div>' for x in kpis()[:4])
c2=ENTETE("Proposition 2 : pilotage (zone principale + colonne d'actions à faire)")+f'''<main style="padding:16px;display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:14px">
<div>{BAND}<div data-dd style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">{k2}</div>
<div data-dd style="display:flex;flex-direction:column;gap:14px">{carte("t-bleu","Chiffre d'affaires mensuel",courbe_html(260))}
<div draggable="true" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">{carte("t-vert","Top 5 des ventes",top_html())}{carte("t-violet","Achats par grossiste",gros_html())}</div></div></div>
<aside data-dd style="display:flex;flex-direction:column;gap:14px">{carte("t-rose","À traiter aujourd'hui",alertes_html())}
{carte("t-cyan","Encaissements du jour",caisse_html())}{carte("t-ambre","Stock",valo_html()+'<div style="margin-top:10px">'+kpi_html(kpis()[4])+'</div>')}
{carte("t-bleu","Encours tiers payants",tp_html())}</aside></main>'''
open("tableau-de-bord-2-pilotage.html","w").write(page("Tableau de bord 2",c2,FIN+"if(innerWidth<900)document.querySelector('main').style.gridTemplateColumns='1fr';"))

# 3 : Onglets thématiques
ong=[("Ventes",f'<div data-dd style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:14px">{"".join(f"<div draggable=true>{kpi_html(x)}</div>" for x in kpis()[:4])}</div><div data-dd style="display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:14px">{carte("t-bleu","CA mensuel",courbe_html(),chr(32)+"style=grid-column:1/-1")}{carte("t-vert","Top 5",top_html())}{carte("t-cyan","Encaissements",caisse_html())}</div>'),
 ("Achats & stock",f'<div data-dd style="display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:14px">{carte("t-violet","Achats par grossiste",gros_html())}{carte("t-ambre","Valorisation",valo_html())}{carte("t-rose","Alertes stock",alertes_html())}</div>'),
 ("Tiers payants",f'<div data-dd style="display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:14px">{carte("t-bleu","Encours",tp_html())}{carte("t-vert","Encaissements",caisse_html())}</div>')]
tabs="".join(f'<button class="btn{" prim" if i==0 else ""}" data-o="{i}">{n}</button>' for i,(n,_) in enumerate(ong))
panes="".join(f'<section data-p="{i}" style="{"" if i==0 else "display:none"}">{h}</section>' for i,(_,h) in enumerate(ong))
c3=ENTETE("Proposition 3 : onglets par thème (Ventes / Achats & stock / Tiers payants)")+f'<main style="padding:16px">{BAND}<div style="display:flex;gap:6px;margin-bottom:14px">{tabs}</div>{panes}</main>'
open("tableau-de-bord-3-onglets.html","w").write(page("Tableau de bord 3",c3,FIN+"""document.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-o]').forEach(x=>x.classList.remove('prim'));b.classList.add('prim');document.querySelectorAll('[data-p]').forEach(s=>s.style.display=s.dataset.p==b.dataset.o?'':'none');brancherAnnees();});"""))
