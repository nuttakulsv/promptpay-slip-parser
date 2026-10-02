# Changelog

## 0.1.0 - 2026-10-02

First release.

- `parseSlip` for bank Slip Verify mini-QR and TrueMoney Wallet slips, with CRC check and padding of short CRCs
- `readSlip` / `readQrCodes` to find QR codes in PNG, JPEG, WebP, GIF and BMP images (Node and browser)
- `createSlipGuard` with an atomic in-memory store to block reused slips
- `verifySlip`, `checkTransfer` and `matchesAccount` to compare bank API answers with what you expect
- `parsePromptPay`, `createPromptPay` and `createBillPayment` for PromptPay payment QR codes
- Bank table with 37 BOT institution codes
- CLI: read slips from files, arguments or stdin; make PromptPay QR images
- Browser demo that decodes slips without uploading them
