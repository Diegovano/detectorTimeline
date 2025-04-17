import { parser } from 'sax';

export type XMLFormatType = 'SUMOFormat' | 'ZHFormat';

const saxParser = parser(true);

let tagNames: string[] = [];

const sumoXMLTags = ['tlsStates', 'tlsState'];
const ZHXMLTags = ['Element', 'Timestamp', 'Value'];

saxParser.onopentag = tag => {
  tagNames.push(tag.name);
};

export default function determineXMLFormat (input: string): XMLFormatType | null {
  tagNames = [];

  saxParser.write(input).close();

  const looksLikeSUMO = tagNames.filter(tagName => sumoXMLTags.includes(tagName)).length > 0;
  const looksLikeZH = tagNames.filter(tagName => ZHXMLTags.includes(tagName)).length > 0;

  if (looksLikeSUMO && looksLikeZH) return null;
  if (looksLikeSUMO) return 'SUMOFormat';
  if (looksLikeZH) return 'ZHFormat';
  return null;
}
