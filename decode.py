# On ouvre le fichier en mode binaire
bitmap = open("./lmd-defi-stegano.bmp", "rb")

# On passe les premiers octets pour arriver à la taille du bitmap qui se trouve à 0x02
bitmap.read(0x02)

# On récupère la taille du bitmap (c'est un DWORD)
bitmap_size_bytes = bitmap.read(4)                           # b'\xF6\xC6\x2D\x00'
bitmap_size = int.from_bytes(bitmap_size_bytes, 'little')    # 0x2DC6F6

# On passe les octets suivants pour arriver à l'offset de l'image qui se trouve à 0x0A
bitmap.read(0x04)

# On récupère l'offset de l'image
image_offset_bytes = bitmap.read(4)                          # b'\x36\x00\x00\x00'
image_offset = int.from_bytes(image_offset_bytes, 'little')  # 0x36
print("Offset de l'image: ", hex(image_offset))

# On se rend jusqu'au début de l'image
print("Nombre d'octets ignorés: ", image_offset - 0xE)
bitmap.read(image_offset - 0xE)

# On lit les octets 4 par 4 et on les convertit en un caractère
for i in range(image_offset, bitmap_size, 4):
  char_encoded_bytes = bitmap.read(4)
  char_decoded = 0
  for j in range(4):
    char_decoded |= (char_encoded_bytes[j] & 0b00000011) << j * 2
  if not chr(char_decoded).isascii(): break
  print(chr(char_decoded), end="")

bitmap.close()