# Compare deux captures PNG pixel a pixel (test d'ecran 3 du cas 2 du 03/11/2026).
# Sortie : « taille AxB / taille CxD ; pixels differents N sur T ; ecart maxi M » ; code 0 si memes dimensions et
# ecart maxi <= tolerance (defaut 1 sur 255 : arrondi de couleur du rendu, invisible), 1 sinon.
import sys
from PIL import Image, ImageChops

a = Image.open(sys.argv[1]).convert('RGB')
b = Image.open(sys.argv[2]).convert('RGB')
tolerance = int(sys.argv[3]) if len(sys.argv) > 3 else 1
if a.size != b.size:
    print('taille %dx%d / taille %dx%d ; dimensions differentes' % (a.size + b.size))
    sys.exit(1)
d = ImageChops.difference(a, b)
ecarts = [max(p) for p in d.getdata()]
differents = sum(1 for e in ecarts if e > tolerance)
maxi = max(ecarts) if ecarts else 0
print('taille %dx%d ; pixels differents (au-dela de %d) %d sur %d ; ecart maxi %d' % (a.size[0], a.size[1], tolerance, differents, len(ecarts), maxi))
sys.exit(0 if differents == 0 else 1)
