Ceci est ma tentative de résolution du défi de stéganographie de @lmd-dev.
Bon, d'abord merci à https://www.alrj.org/docs/formats/bmp/BMP.htm de nous expliquer comment fonctionne un bitmap... et à lmd de l'avoir renseigné dans l'énoncé du défi.

Maintenant, commençons par ouvrir un fichier en python, en mode lecture binaire. Jusque là, pas trop compliqué:
```python
bitmap = open("./lmd-defi-stegano.bmp", "rb")
```
Pour me simplifier la tâche, j'ai également ouvert le fichier dans https://hexed.it/ pour pouvoir comparer et savoir ce que je cherche...
Justement, on sait que le message se trouve dans les pixels de l'image, donc on peut directement aller chercher l'offset de l'image qui se trouve à `0x0A`. Pour cela, il suffit de lire les 0x0A premiers octets sans rien en faire (oui les 0x0A premiers, parce que l'octet en 0x0A est en réalité le 0x0B-ième, puisqu'on commence à 0x00):
```python
bitmap.read(0x0A)
```
Bon on est arrivé à l'offset, il ne reste plus qu'à le lire... ou pas? Si on lit les 4 octets suivants (oui, parce que l'offset est écrit sous forme de DWORD, c'est-à-dire un nombre stocké sur 4 octets), on obtient 0x36, 0x00, 0x00, 0x00, ce qui voudrait dire que l'image commence à 0x36000000? Mais mon fichier n'est même pas aussi grand! Mais si on lit la doc, on voit que les lignes sont écrites de bas en haut, ça sent le monde à l'envers... Je me dis donc que les octets sont certainement écrits du plus faible au plus fort, et qu'il faut donc les lire dans l'autre sens. En effet, 0x00000036 me paraît plus cohérent, et en comparant le 0x36-ième octet dans hexedit et la valeur que me donne paint.net pour le pixel inférieur gauche, je constate qu'il s'agit bien de #C8D2E2 (oui, même les pixels sont écrits à l'envers...).
En python, ça donne donc ça:
```python
bitmap_size_bytes = bitmap.read(4)
bitmap_size = int.from_bytes(bitmap_size_bytes, 'little')
```
On obtient d'abord des bytes, qu'il faut convertir en int, et le `'little'` est là pour indiquer qu'il faut lire les octets du moins signifiant au plus signifiant.

On peut maintenant se rendre au début de l'image, qui est à la position déterminée par `bitmap_size`. En faisant le calcul, comme on a déjà parcouru les 0x0E premiers octets du fichier, on ne doit donc en lire que `image_offset - 0xE`:
```python
bitmap.read(image_offset - 0xE)
```
Chouette! On est enfin arrivé au contenu qui nous intéresse! Il ne reste plus qu'à le lire...
Pour ça, on va lire le fichier 4 octets par 4 octets, puisqu'un caractère se cache réparti dans 4 octets:
```python
char_encoded_bytes = bitmap.read(4)
char_decoded = 0
for j in range(4):
  char_decoded |= (char_encoded_bytes[j] & 0b00000011) << j * 2
print(chr(char_decoded))
```
Bon, il faut être familier avec les opérations binaires, mais en gros, pour chaque octet, je prends les 2 dernier bits (d'où le `& 0b00000011`), et je les colle dans la variable `char_decoded`.

Il y a toujours un problème que je n'ai pas réglé...  Je sais où chercher mes données, je sais comment les lire, mais comment je sais où je dois m'arrêter? Je vais donc rechercher dans l'entête du fichier la taille de celui-ci. Elle se trouve à la position `0x02`:
```python
bitmap = open("./lmd-defi-stegano.bmp", "rb")

bitmap.read(0x02)

bitmap_size_bytes = bitmap.read(4)
bitmap_size = int.from_bytes(bitmap_size_bytes, 'little')

bitmap_size_bytes = bitmap.read(4)
```
Ils sont également écrits à l'envers, donc même opération que tout à l'heure. Attention, il ne faut pas oublier de ne lire que 4 octets après ça, puisqu'on en a déjà passé 6 pour lire la taille du fichier sur les 0xA (10) qu'on doit passer au total.

Maintenant, on devrait avoir tout ce qu'il faut pour lire notre fichier décodé: on peut boucler sur les dernier octets jusqu'à la fin du fichier:
```python
for i in range(image_offset, bitmap_size, 4):
  char_encoded_bytes = bitmap.read(4)
  char_decoded = 0
  for j in range(4):
    char_decoded |= (char_encoded_bytes[j] & 0b00000011) << j * 2
  print(chr(char_decoded), end="")
```
Le `end=""` est là pour empêcher le retour à la ligne et donc permettre d'afficher les caractères à la suite les uns des autres.

On lance le programme, et...

Bon, soit je n'ai pas bien écrit mon code de décodage, soit le texte n'est pas codé sur l'intégralité de l'image, qui est d'ailleurs... assez longue. Mais comme je sais que je code sans jamais faire d'erreur (et peut-être aussi que j'ai remonté la console et constaté que le texte était bien là), je me dis que c'est la deuxième option. Pour résoudre ce problème, je me suis dit qu'on allait arrêter de lire le fichier dès que ce n'est plus du texte. En python il existe la méthode `isascii()` sur les caractères, qui permet de savoir si on a bien affaire à des caractères ascii. Je rajoute donc la ligne suivante dans ma boucle:
```python
if not chr(char_decoded).isascii(): break
```
Ce qui donne au final:
```python
bitmap = open("./lmd-defi-stegano.bmp", "rb")
bitmap.read(0x02)
bitmap_size_bytes = bitmap.read(4)
bitmap_size = int.from_bytes(bitmap_size_bytes, 'little')
bitmap.read(0x04)

image_offset_bytes = bitmap.read(4)
image_offset = int.from_bytes(image_offset_bytes, 'little')
print("Offset de l'image: ", hex(image_offset))
print("Nombre d'octets ignorés: ", image_offset - 0xE)
bitmap.read(image_offset - 0xE)

for i in range(image_offset, bitmap_size, 4):
  char_encoded_bytes = bitmap.read(4)
  char_decoded = 0
  for j in range(4):
    char_decoded |= (char_encoded_bytes[j] & 0b00000011) << j * 2
  if not chr(char_decoded).isascii(): break
  print(chr(char_decoded), end="")

bitmap.close()
```
Bien sûr, on oublie pas de fermer le fichier quand on a fini...

Cependant, le code n'est pas encore parfait. En effet, il reste à la fin du texte un `∟`, qui est un caractère ascii (code 28). On aurait pu assez facilement le résoudre avec un test de sortie un peu plus précis, mais bon, il est 2h30 au matin, et j'ai cours dans 6h30... Je vous laisse donc le soin de le paufiner vous-même :)
