import { Group } from 'timelines-chart';
import Parser from './parser';

class XMLParser extends Parser {
  getAllLabels () {
    return [];
  }

  parse (_requestedLabels: string[] | null): Group[] {
    return [];
  }
}

export default XMLParser;
