# Contributing

Thanks for taking the time. A few things that keep this project easy to maintain:

- Run `npm test`, `npm run lint` and `npm run typecheck` before opening a pull request.
- New payload formats or bank codes need a source. Link the spec, the bank's developer docs or a public list in the PR.
- Never commit real slips. If you need an image for a test, add it to `scripts/make-fixtures.ts` so the script renders it, marks it SAMPLE, and keeps real names and accounts out.
- Keep the core (`src/` without `image.ts` and `cli.ts`) free of dependencies and browser-safe.
- Bug reports about images that do not decode are welcome. Blur names and account numbers first and keep the QR readable.

## ภาษาไทย

ส่ง PR มาได้เลย ก่อนส่งช่วยรัน `npm test`, `npm run lint`, `npm run typecheck` ให้ผ่าน ถ้าเพิ่มรหัสธนาคารหรือรูปแบบ payload ใหม่ ขอแหล่งอ้างอิงด้วย และห้ามแนบสลิปจริงเด็ดขาด ถ้าต้องใช้รูปทดสอบให้เพิ่มใน `scripts/make-fixtures.ts` แทน
