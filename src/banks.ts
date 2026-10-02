export interface Bank {
  /** 3-digit financial institution code assigned by the Bank of Thailand */
  code: string
  abbr: string
  nameTh: string
  nameEn: string
}

// Bank of Thailand institution codes, cross-checked against two published lists
// (see docs/banks.md). Domestic banks first, then foreign branches.
const list: Bank[] = [
  { code: '002', abbr: 'BBL', nameTh: 'ธนาคารกรุงเทพ', nameEn: 'Bangkok Bank' },
  { code: '004', abbr: 'KBANK', nameTh: 'ธนาคารกสิกรไทย', nameEn: 'Kasikornbank' },
  { code: '006', abbr: 'KTB', nameTh: 'ธนาคารกรุงไทย', nameEn: 'Krungthai Bank' },
  { code: '011', abbr: 'TTB', nameTh: 'ธนาคารทหารไทยธนชาต', nameEn: 'TMBThanachart Bank' },
  { code: '014', abbr: 'SCB', nameTh: 'ธนาคารไทยพาณิชย์', nameEn: 'Siam Commercial Bank' },
  { code: '022', abbr: 'CIMBT', nameTh: 'ธนาคารซีไอเอ็มบี ไทย', nameEn: 'CIMB Thai Bank' },
  { code: '024', abbr: 'UOBT', nameTh: 'ธนาคารยูโอบี', nameEn: 'United Overseas Bank (Thai)' },
  { code: '025', abbr: 'BAY', nameTh: 'ธนาคารกรุงศรีอยุธยา', nameEn: 'Bank of Ayudhya' },
  { code: '030', abbr: 'GSB', nameTh: 'ธนาคารออมสิน', nameEn: 'Government Savings Bank' },
  { code: '033', abbr: 'GHB', nameTh: 'ธนาคารอาคารสงเคราะห์', nameEn: 'Government Housing Bank' },
  {
    code: '034',
    abbr: 'BAAC',
    nameTh: 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร',
    nameEn: 'Bank for Agriculture and Agricultural Cooperatives',
  },
  {
    code: '035',
    abbr: 'EXIM',
    nameTh: 'ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย',
    nameEn: 'Export-Import Bank of Thailand',
  },
  {
    code: '066',
    abbr: 'IBANK',
    nameTh: 'ธนาคารอิสลามแห่งประเทศไทย',
    nameEn: 'Islamic Bank of Thailand',
  },
  { code: '067', abbr: 'TISCO', nameTh: 'ธนาคารทิสโก้', nameEn: 'TISCO Bank' },
  { code: '069', abbr: 'KKP', nameTh: 'ธนาคารเกียรตินาคินภัทร', nameEn: 'Kiatnakin Phatra Bank' },
  { code: '070', abbr: 'ICBCT', nameTh: 'ธนาคารไอซีบีซี (ไทย)', nameEn: 'ICBC (Thai)' },
  { code: '071', abbr: 'TCRB', nameTh: 'ธนาคารไทยเครดิต', nameEn: 'Thai Credit Bank' },
  {
    code: '073',
    abbr: 'LHBANK',
    nameTh: 'ธนาคารแลนด์ แอนด์ เฮ้าส์',
    nameEn: 'Land and Houses Bank',
  },
  { code: '079', abbr: 'ANZ', nameTh: 'ธนาคารเอเอ็นแซด (ไทย)', nameEn: 'ANZ Bank (Thai)' },
  {
    code: '080',
    abbr: 'SMTB',
    nameTh: 'ธนาคารซูมิโตโม มิตซุย ทรัสต์ (ไทย)',
    nameEn: 'Sumitomo Mitsui Trust Bank (Thai)',
  },
  { code: '088', abbr: 'CLICX', nameTh: 'ธนาคารคลิกซ์', nameEn: 'CLICX Bank' },
  {
    code: '098',
    abbr: 'SME D',
    nameTh: 'ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย',
    nameEn: 'SME Development Bank of Thailand',
  },

  { code: '008', abbr: 'JPM', nameTh: 'ธนาคารเจพีมอร์แกน เชส', nameEn: 'JPMorgan Chase Bank' },
  {
    code: '009',
    abbr: 'OCBC',
    nameTh: 'ธนาคารโอเวอร์ซี-ไชนีส แบงกิ้ง คอร์ปอเรชั่น',
    nameEn: 'Oversea-Chinese Banking Corporation',
  },
  { code: '010', abbr: 'MUFG', nameTh: 'ธนาคารเอ็ม ยู เอฟ จี', nameEn: 'MUFG Bank' },
  { code: '017', abbr: 'CITI', nameTh: 'ธนาคารซิตี้แบงก์', nameEn: 'Citibank' },
  {
    code: '018',
    abbr: 'SMBC',
    nameTh: 'ธนาคารซูมิโตโม มิตซุย แบงกิ้ง คอร์ปอเรชั่น',
    nameEn: 'Sumitomo Mitsui Banking Corporation',
  },
  {
    code: '020',
    abbr: 'SCBT',
    nameTh: 'ธนาคารสแตนดาร์ดชาร์เตอร์ด (ไทย)',
    nameEn: 'Standard Chartered Bank (Thai)',
  },
  { code: '023', abbr: 'RHB', nameTh: 'ธนาคารอาร์ เอช บี', nameEn: 'RHB Bank' },
  {
    code: '026',
    abbr: 'MEGA',
    nameTh: 'ธนาคารเมกะ สากลพาณิชย์',
    nameEn: 'Mega International Commercial Bank',
  },
  { code: '027', abbr: 'BOFA', nameTh: 'ธนาคารแห่งอเมริกา', nameEn: 'Bank of America' },
  { code: '029', abbr: 'IOB', nameTh: 'ธนาคารอินเดียนโอเวอร์ซีส์', nameEn: 'Indian Overseas Bank' },
  {
    code: '031',
    abbr: 'HSBC',
    nameTh: 'ธนาคารฮ่องกงและเซี่ยงไฮ้แบงกิ้งคอร์ปอเรชั่น',
    nameEn: 'HSBC',
  },
  { code: '032', abbr: 'DB', nameTh: 'ธนาคารดอยซ์แบงก์', nameEn: 'Deutsche Bank' },
  { code: '039', abbr: 'MHCB', nameTh: 'ธนาคารมิซูโฮ', nameEn: 'Mizuho Bank' },
  { code: '045', abbr: 'BNPP', nameTh: 'ธนาคารบีเอ็นพี พารีบาส์', nameEn: 'BNP Paribas' },
  { code: '052', abbr: 'BOC', nameTh: 'ธนาคารแห่งประเทศจีน', nameEn: 'Bank of China' },
]

export const banks: ReadonlyMap<string, Bank> = new Map(list.map((b) => [b.code, b]))

/** Look up a bank by its 3-digit code. Accepts numbers or unpadded strings ("14", 14). */
export function getBank(code: string | number): Bank | undefined {
  return banks.get(String(code).padStart(3, '0'))
}
