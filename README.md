# Urban Pronto WhatsApp Bot (v1.0)

WhatsApp Cloud API se chalne wala home services booking bot. Customer "Hi" bhejta hai,
service choose karta hai (Home Cleaning / AC Service / Plumber), naam-location-time deta hai,
aur booking confirm ho jaati hai. Admin ko WhatsApp par notification jaati hai.

## Ye repo GitHub par upload karne ka tareeka

1. GitHub par apni repository kholo.
2. **Add file → Upload files** par jao.
3. Is poore folder (`saudi-service-bot`) ke andar ki SAARI files aur folders (`src/` sameet)
   drag-and-drop karo. `node_modules` folder kabhi upload mat karna (waise wo hai hi nahi yahan).
4. Commit karo.

> Important: Purani koi `Dockerfile` agar repo me pehle se hai to use DELETE kar dena -
> yahi wo file thi jo "secret VERIFY_TOKEN not found" wala error de rahi thi. Ye project
> Nixpacks (Railway ka default builder) use karta hai, Dockerfile ki zaroorat nahi.

## Railway par deploy karna

1. Railway project kholo → **Variables** tab.
2. Ye environment variables add karo (`.env.example` file dekho reference ke liye):
   - `WHATSAPP_TOKEN`
   - `PHONE_NUMBER_ID`
   - `BUSINESS_ACCOUNT_ID`
   - `VERIFY_TOKEN`
   - `ADMIN_WHATSAPP_NUMBER`
3. **Redeploy** karo (Settings mein Builder "Nixpacks" hi rehne dena, Dockerfile mat use karna).
4. Deploy successful hone ke baad Railway tumhe ek public URL dega, jaise:
   `https://saudi-service-bot-production.up.railway.app`

## Meta (WhatsApp Cloud API) webhook setup

1. Meta App Dashboard → WhatsApp → Configuration.
2. **Callback URL**: `https://YOUR_RAILWAY_URL/webhook`
3. **Verify Token**: wahi value jo tumne Railway me `VERIFY_TOKEN` set ki hai.
4. "Verify and Save" dabao - agar sab sahi hai to green tick milega.
5. Webhook Fields me `messages` subscribe karo.

## Test kaise karo

1. Meta test number se apne WhatsApp par "Hi" bhejo.
2. Bot service selection buttons bhejega.
3. Naam, location, date/time do.
4. Confirm karo - Booking ID milega aur admin number par notification jayegi.

## Local testing (optional)

```bash
npm install
cp .env.example .env
# .env me apni real values daalo
npm start
```

Local testing ke liye webhook expose karne ke liye `ngrok` ya Railway deploy hi use karo,
kyunki Meta ko public HTTPS URL chahiye hota hai.

## Booking records dekhna

Deploy hone ke baad `https://YOUR_RAILWAY_URL/bookings` par jaake recent bookings ka JSON
list dekh sakte ho (MVP ke liye, koi authentication nahi hai - production me add karna).
