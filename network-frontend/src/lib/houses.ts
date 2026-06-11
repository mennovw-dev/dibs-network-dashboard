import type { ListingNode } from '../types'

export interface HouseProfile {
  photo: string
  neighborhood: string
  street: string
  postcode: string
  bio: string
  /* Naam-aliassen zoals ze in de staging-DB kunnen voorkomen. */
  aliases: string[]
}

/* staging-pack-v1 — 8 Utrechtse huizen met gegenereerde foto's in /public/houses. */
export const HOUSE_CATALOG: HouseProfile[] = [
  {
    photo: '/houses/h_01.png',
    neighborhood: 'Lombok',
    street: 'Kanaalstraat 142',
    postcode: '3531 CL',
    bio: 'Gezellig huis met 5 man in Lombok, we koken bijna elke dag samen. Zoeken iemand erbij die het niet erg vindt dat de afwas soms een dagje blijft staan. Vrijdagborrel is min of meer verplicht.',
    aliases: ['het kanaalhuis', 'kanaalstraat-huis', 'kanaalstraat'],
  },
  {
    photo: '/houses/h_02.png',
    neighborhood: 'Wittevrouwen',
    street: 'Poortstraat 49',
    postcode: '3572 HC',
    bio: 'Studentenhuis, beerpong staat altijd klaar. We zoeken een nieuwe huisgenoot voor de kamer op zolder. Niet kunnen koken is geen probleem, wij ook niet echt.',
    aliases: ['huize poortstraat', 'poortstraat'],
  },
  {
    photo: '/houses/h_03.png',
    neighborhood: 'Oudwijk',
    street: 'Oudwijkerdwarsstraat 88',
    postcode: '3581 LD',
    bio: 'Klein en hecht huisje, we doen veel samen maar je hoeft niet altijd aan te haken. Kamer komt vrij omdat een huisgenoot gaat afstuderen. Op zoek naar iemand die normaal doet.',
    aliases: ['het oudwijkhuis', 'oudwijkhuis', 'oudwijkerdwarsstraat'],
  },
  {
    photo: '/houses/h_04.png',
    neighborhood: 'Zuilen',
    street: 'Amsterdamsestraatweg 503',
    postcode: '3553 EE',
    bio: 'Betaalbaar huis met een grote keuken, hier wordt veel samen gegeten. Zoeken iemand erbij die af en toe meekookt. Verder gewoon chill, geen huisregels-drama.',
    aliases: ['de straatweg', 'amsterdamsestraatweg-pand', 'amsterdamsestraatweg'],
  },
  {
    photo: '/houses/h_05.png',
    neighborhood: 'Tuinwijk',
    street: 'Adelaarstraat 21',
    postcode: '3514 CB',
    bio: 'Rustig huis, prima als je tijdens tentamens wat focus nodig hebt. We hangen wel samen maar het is geen feesthuis. Zoeken een nieuwe huisgenoot die dat ook fijn vindt.',
    aliases: ['tuinwijkhuis', 'adelaarstraat'],
  },
  {
    photo: '/houses/h_06.png',
    neighborhood: 'Lombok',
    street: 'Damstraat 25',
    postcode: '3531 BT',
    bio: 'Vrolijk huis midden in Lombok, deur staat eigenlijk altijd open. Er komt een kamer vrij op de eerste verdieping. Kom vooral langs voor een hospiteeravond, dan zie je het wel.',
    aliases: ['damstraat'],
  },
  {
    photo: '/houses/h_07.png',
    neighborhood: 'Vogelenbuurt',
    street: 'Merelstraat 30',
    postcode: '3514 CN',
    bio: 'Vier huisgenoten, allemaal andere studies, werkt verrassend goed. We zoeken iemand erbij die het gezellig houdt maar ook z\'n eigen ding doet. Fietsenschuur achter is een groot pluspunt.',
    aliases: ['huize merel', 'merelstraat'],
  },
  {
    photo: '/houses/h_08.png',
    neighborhood: 'Wittevrouwen',
    street: 'Bekkerstraat 64',
    postcode: '3572 SK',
    bio: 'Huis met veel huisavonden en een paar mensen bij studentenverenigingen. Kamer komt vrij in de zomer. Zoeken iemand die graag meedoet maar geen verplichting hoor.',
    aliases: ['bekkerstraat'],
  },
]

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
}

function stableIndex(id: string, modulo: number): number {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return hash % modulo
}

function matchProfile(node: ListingNode): HouseProfile {
  const name = normalize(node.name ?? '')
  if (name) {
    const direct = HOUSE_CATALOG.find((h) =>
      h.aliases.some((a) => name.includes(a) || a.includes(name)),
    )
    if (direct) {
      return direct
    }
  }
  // Deterministische fallback: elke node krijgt altijd een (stabiele) foto + profiel.
  return HOUSE_CATALOG[stableIndex(node.id, HOUSE_CATALOG.length)]
}

/* Verrijkt een node met foto/wijk/straat/postcode/bio. Bestaande velden hebben voorrang. */
export function enrichNode(node: ListingNode): ListingNode & {
  photo: string
  bio: string
} {
  const profile = matchProfile(node)
  return {
    ...node,
    photo: profile.photo,
    bio: profile.bio,
    neighborhood: node.neighborhood ?? profile.neighborhood,
    street: node.street ?? profile.street,
    postcode: node.postcode ?? profile.postcode,
  }
}

export type EnrichedNode = ReturnType<typeof enrichNode>
