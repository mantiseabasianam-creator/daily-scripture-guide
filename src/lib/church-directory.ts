export const CHURCH_TRADITIONS = [
  "Presbyterian",
  "Catholic",
  "Apostolic",
  "Baptist",
  "Methodist",
  "Non-denominational",
] as const;

export const NATIONS = [
  "United States",
  "Canada",
  "United Kingdom",
  "Nigeria",
  "Australia",
] as const;

type ChurchTradition = (typeof CHURCH_TRADITIONS)[number];
type Nation = (typeof NATIONS)[number];

const CHURCH_NAMES: Record<Nation, Record<ChurchTradition, string>> = {
  "United States": {
    Presbyterian: "Presbyterian Church (USA)",
    Catholic: "Catholic Church in the United States",
    Apostolic: "Apostolic Church in the United States",
    Baptist: "Baptist churches in the United States",
    Methodist: "United Methodist Church",
    "Non-denominational": "Non-denominational churches in the United States",
  },
  Canada: {
    Presbyterian: "Presbyterian Church in Canada",
    Catholic: "Catholic Church in Canada",
    Apostolic: "Apostolic churches in Canada",
    Baptist: "Canadian Baptist churches",
    Methodist: "Methodist churches in Canada",
    "Non-denominational": "Non-denominational churches in Canada",
  },
  "United Kingdom": {
    Presbyterian: "Presbyterian Church in the United Kingdom",
    Catholic: "Catholic Church in the United Kingdom",
    Apostolic: "Apostolic churches in the United Kingdom",
    Baptist: "Baptist churches in the United Kingdom",
    Methodist: "Methodist Church in the United Kingdom",
    "Non-denominational": "Non-denominational churches in the United Kingdom",
  },
  Nigeria: {
    Presbyterian: "Presbyterian Church of Nigeria",
    Catholic: "Catholic Church in Nigeria",
    Apostolic: "Apostolic Church Nigeria",
    Baptist: "Nigeria Baptist Convention",
    Methodist: "Methodist Church Nigeria",
    "Non-denominational": "Non-denominational churches in Nigeria",
  },
  Australia: {
    Presbyterian: "Presbyterian Church of Australia",
    Catholic: "Catholic Church in Australia",
    Apostolic: "Apostolic churches in Australia",
    Baptist: "Baptist churches in Australia",
    Methodist: "Methodist churches in Australia",
    "Non-denominational": "Non-denominational churches in Australia",
  },
};

export function getChurchName(nation: string, tradition: string): string {
  if (
    NATIONS.includes(nation as Nation) &&
    CHURCH_TRADITIONS.includes(tradition as ChurchTradition)
  ) {
    return CHURCH_NAMES[nation as Nation][tradition as ChurchTradition];
  }
  return `${tradition} Church in ${nation}`;
}
