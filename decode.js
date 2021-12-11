const fs = require("fs");

/**
 *   ATTENTION: Ce script est moins bien commenté que la version python.
 *              Si vous voulez découvrir ma démarche et/ou avoir plus de précisions, 
 *              allez voir le README.md et les commentaires du decode.py
 *              Bonne lecture
 */

// On ouvre le fichier
const bitmap = fs.readFileSync("./lmd-defi-stegano.bmp");

/**
 * On cherche le offset image, c'est à dire le début de l'image elle-même
 * L'offset image se trouve à 0x0A
 * On utilise readInt32LE car les données sont encodées avec l'octet le moins signifiant en premier
 */
const image_offset = bitmap.readInt32LE(0x0a);

/**
 * On récupère la taille du fichier qui se trouve à 0x02
 */
const file_size = bitmap.readInt32LE(0x02);

/**
 * On parcourt le fichier en lisant les octets 4 par 4
 */
for (let i = image_offset; i < file_size; i += 4) {
  /**
   * Les données sont encodées sur les 2 derniers bits sur 4 octets, le & permet donc de prendre les deux dernier bits
   * (j'aurais pu mettre 0b11 ou encore 3 mais c'est pour mieux comprendre qu'on travaille avec des octets)
   */
  const part1 = bitmap.at(i) & 0b00000011;
  const part2 = bitmap.at(i + 1) & 0b00000011;
  const part3 = bitmap.at(i + 2) & 0b00000011;
  const part4 = bitmap.at(i + 3) & 0b00000011;

  // On assemble tout ça en décalant quand il faut (j'aurais pu utiliser une boucle et/ou des tableaux pour que ce soit plus propre... j'aurais pu.)
  const decoded_char_code =
    (part1 << 0) | (part2 << 2) | (part3 << 4) | (part4 << 6);
  // On convertit en caractère imprimable
  const decoded_char = String.fromCharCode(decoded_char_code);

  // Si ce n'est pas du texte, on arrête tout
  if (!decoded_char.match(/[a-zA-Z0-9\.\,\ \']/)) break;

  // On affiche le caractère (on utilise stdout.write pour ne pas retourner à la ligne)
  process.stdout.write(decoded_char);
}
