# Bank codes

`sendingBank` in a slip QR is the 3-digit financial institution code assigned by the
Bank of Thailand. The table in [`src/banks.ts`](../src/banks.ts) was cross-checked
against these lists (October 2026):

- 2C2P payout bank codes, Thailand section: https://developer.2c2p.com/docs/payout-bank-code
- Thunder Solution bank code reference: https://document.thunder.in.th/en/reference/bank-codes

Domestic banks below appear in both lists. 066, 079, 080 and the foreign branches
come from the 2C2P list only. 088 (CLICX, Thailand's first virtual bank, licensed by
the Bank of Thailand in May 2026) appears in both.

| Code | Abbr.  | Bank                                               |
| ---- | ------ | -------------------------------------------------- |
| 002  | BBL    | Bangkok Bank                                       |
| 004  | KBANK  | Kasikornbank                                       |
| 006  | KTB    | Krungthai Bank                                     |
| 011  | TTB    | TMBThanachart Bank                                 |
| 014  | SCB    | Siam Commercial Bank                               |
| 022  | CIMBT  | CIMB Thai Bank                                     |
| 024  | UOBT   | United Overseas Bank (Thai)                        |
| 025  | BAY    | Bank of Ayudhya (Krungsri)                         |
| 030  | GSB    | Government Savings Bank                            |
| 033  | GHB    | Government Housing Bank                            |
| 034  | BAAC   | Bank for Agriculture and Agricultural Cooperatives |
| 035  | EXIM   | Export-Import Bank of Thailand                     |
| 066  | IBANK  | Islamic Bank of Thailand                           |
| 067  | TISCO  | TISCO Bank                                         |
| 069  | KKP    | Kiatnakin Phatra Bank                              |
| 070  | ICBCT  | ICBC (Thai)                                        |
| 071  | TCRB   | Thai Credit Bank                                   |
| 073  | LHBANK | Land and Houses Bank                               |
| 079  | ANZ    | ANZ Bank (Thai)                                    |
| 080  | SMTB   | Sumitomo Mitsui Trust Bank (Thai)                  |
| 088  | CLICX  | CLICX Bank (virtual bank, opened June 2026)        |
| 098  | SME D  | SME Development Bank of Thailand                   |

Foreign bank branches: 008 JPMorgan Chase, 009 OCBC, 010 MUFG, 017 Citibank,
018 SMBC, 020 Standard Chartered (Thai), 023 RHB, 026 Mega International Commercial
Bank, 027 Bank of America, 029 Indian Overseas Bank, 031 HSBC, 032 Deutsche Bank,
039 Mizuho, 045 BNP Paribas, 052 Bank of China.

Left out on purpose: codes of banks that no longer exist (065 Thanachart, merged into
TTB) and codes no source could confirm. Unknown codes still parse; you get the raw
code in `sendingBank` and a warning instead of `bank`.

Found a missing or wrong entry? Open an issue with a link to the source.
