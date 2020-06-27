import { FLAGS_ISO_TO_CODE } from '@airbattle/protocol';
import Component from '../component';

export default class Flag extends Component {
  public countryCode: string;

  public code: number;

  constructor(countryCode: string) {
    super();

    this.current = countryCode;
  }

  public set current(countryCode: string) {
    this.countryCode = countryCode.toUpperCase();
    this.code = FLAGS_ISO_TO_CODE[this.countryCode];
  }

  public get current(): string {
    return this.countryCode;
  }
}
