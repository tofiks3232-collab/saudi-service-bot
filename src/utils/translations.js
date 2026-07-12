const STRINGS = {
  en: {
    welcomeIntro: '*Khidmora* 🏠\n_Smart Home Services_\n\nAssalamu Alaikum! We are here to help you.\n\nPlease select a service from the list below 👇',
    listPrompt: 'Which service would you like to book?',
    listButton: 'View Services',
    svcCleaningTitle: '🧹 Home Cleaning',
    svcCleaningDesc: 'Deep cleaning, sofa, kitchen & bathroom',
    svcAcTitle: '❄️ AC Service',
    svcAcDesc: 'Repair, gas refill, installation',
    svcPlumberTitle: '🔧 Plumber',
    svcPlumberDesc: 'Leak fix, pipe & tap installation',

    serviceSelected: 'Great! You selected *{{service}}*. ✅\n\nWhat is your full name?',

    acPhotoChoicePrompt: 'Great! You selected *{{service}}*. ✅\n\nHow would you like to share the AC photo?',
    acPhotoSendBtn: '📷 Send Photo',
    acPhotoSkipBtn: '🧑‍🔧 Technician Will Take It',
    acPhotoSendPrompt: 'Please send a photo of the AC — take one now or choose from your gallery 📷 (tap the 📎 icon below).',
    acPhotoSkipConfirm: 'No problem, the technician will take a look and photo on site. 👍\n\nWhat is your full name?',
    acPhotoReceivedConfirm: 'Photo received! ✅\n\nWhat is your full name?',
    acPhotoInvalid: 'Please send a photo of the AC (camera or gallery) 📷.',
    chooseButtonPrompt: 'Please choose one of the buttons above.',

    nameInvalid: 'Please type your *full name* (e.g. Ahmed Khan).',

    locationRequestPrompt: 'Thank you, {{name}}! 🙏\n\nNow please tap the button below to share your live location, so our team can reach the right place.',
    locationInvalid: 'Please tap the *"Send Location"* button above to share your live location.\n\nThis is required so our team can reach the right place.',

    urgencyPrompt: 'Location received! ✅\n\nDo you need *urgent* (ASAP) service, or would you like to book normally?',
    urgencyUrgentBtn: '🚨 Urgent (+{{surcharge}} SAR)',
    urgencyNormalBtn: '🗓️ Normal Booking',

    dateListPrompt: 'Great! Now please choose your preferred date 📅:',
    dateListButton: 'Choose Date',

    timeListPrompt: 'Date selected! ✅ (*{{date}}*)\n\nNow please choose your preferred time 🕒:',
    timeListButton: 'Choose Time',
    timeMorningTitle: '🌅 Morning',
    timeMorningDesc: '9:00 AM - 12:00 PM',
    timeAfternoonTitle: '☀️ Afternoon',
    timeAfternoonDesc: '12:00 PM - 4:00 PM',
    timeEveningTitle: '🌇 Evening',
    timeEveningDesc: '4:00 PM - 7:00 PM',
    timeNightTitle: '🌙 Night',
    timeNightDesc: '7:00 PM - 9:00 PM',

    bookingSummaryTitle: '*Booking Summary* 📋',
    labelService: '🔧 *Service:*',
    labelName: '👤 *Name:*',
    labelLocation: '📍 *Location:*',
    labelUrgent: '🚨 *Urgent:*',
    labelTime: '🕒 *Time:*',
    urgentYesLabel: 'Yes (+{{surcharge}} SAR extra)',
    confirmQuestion: 'Confirm this booking?',
    confirmYesBtn: 'Confirm ✅',
    confirmNoBtn: 'Cancel ❌',

    bookingConfirmed: '*Booking Confirmed!* 🎉\n\nBooking ID: *{{bookingId}}*\n\nOur team will contact you shortly. Thank you for choosing *Khidmora*! 🙏',
    bookingCancelled: 'Booking cancelled. Send "Hi" to start a new booking.',
    confirmButtonPrompt: 'Please tap Confirm or Cancel.',

    ratingPrompt: 'After the service is complete, please rate your experience:',
    ratingListButton: 'Give Rating',
    rating1: '⭐ 1 - Poor',
    rating2: '⭐⭐ 2 - Fair',
    rating3: '⭐⭐⭐ 3 - Good',
    rating4: '⭐⭐⭐⭐ 4 - Very Good',
    rating5: '⭐⭐⭐⭐⭐ 5 - Excellent',
    ratingThanks: 'Thank you for your *{{stars}}/5* rating! ⭐\n\nWe will keep improving our service. 🙏',
  },

  hi: {
    welcomeIntro: '*खिदमोरा* 🏠\n_स्मार्ट होम सर्विसेज़_\n\nअस्सलामु अलैकुम! हम आपकी सेवा में हाज़िर हैं।\n\nकृपया नीचे दी गई सूची में से एक सेवा चुनें 👇',
    listPrompt: 'आप कौन सी सेवा बुक करना चाहते हैं?',
    listButton: 'सेवाएं देखें',
    svcCleaningTitle: '🧹 होम क्लीनिंग',
    svcCleaningDesc: 'डीप क्लीनिंग, सोफा, किचन और बाथरूम',
    svcAcTitle: '❄️ एसी सर्विस',
    svcAcDesc: 'रिपेयर, गैस रीफिल, इंस्टॉलेशन',
    svcPlumberTitle: '🔧 प्लंबर',
    svcPlumberDesc: 'लीक फिक्स, पाइप और टैप इंस्टॉलेशन',

    serviceSelected: 'बढ़िया! आपने *{{service}}* चुनी है। ✅\n\nआपका पूरा नाम क्या है?',

    acPhotoChoicePrompt: 'बढ़िया! आपने *{{service}}* चुनी है। ✅\n\nएसी की फोटो कैसे भेजना चाहेंगे?',
    acPhotoSendBtn: '📷 फोटो भेजें',
    acPhotoSkipBtn: '🧑‍🔧 टेक्नीशियन लेगा',
    acPhotoSendPrompt: 'कृपया एसी की फोटो भेजें — कैमरे से खींचकर या गैलरी से चुनकर 📷 (नीचे 📎 आइकन दबाएं)।',
    acPhotoSkipConfirm: 'ठीक है, टेक्नीशियन खुद एसी देखकर फोटो ले लेंगे। 👍\n\nआपका पूरा नाम क्या है?',
    acPhotoReceivedConfirm: 'फोटो मिल गई! ✅\n\nआपका पूरा नाम क्या है?',
    acPhotoInvalid: 'कृपया एसी की फोटो भेजें (कैमरा या गैलरी से) 📷।',
    chooseButtonPrompt: 'कृपया ऊपर दिए गए बटन में से एक चुनें।',

    nameInvalid: 'कृपया अपना *पूरा नाम* टाइप करें (जैसे: अहमद खान)।',

    locationRequestPrompt: 'शुक्रिया, {{name}}! 🙏\n\nअब कृपया नीचे बटन दबाकर अपनी लाइव लोकेशन शेयर करें, ताकि हमारी टीम सही जगह पहुंच सके।',
    locationInvalid: 'कृपया ऊपर दिए गए *"Send Location"* बटन को दबाकर अपनी लाइव लोकेशन शेयर करें।\n\nयह ज़रूरी है ताकि हमारी टीम सही जगह पहुंच सके।',

    urgencyPrompt: 'लोकेशन मिल गई! ✅\n\nक्या आपको *तुरंत* (ASAP) सर्विस चाहिए, या नॉर्मल बुकिंग करनी है?',
    urgencyUrgentBtn: '🚨 अर्जेंट (+{{surcharge}} रियाल)',
    urgencyNormalBtn: '🗓️ नॉर्मल बुकिंग',

    dateListPrompt: 'बढ़िया! अब अपनी पसंदीदा तारीख चुनें 📅:',
    dateListButton: 'तारीख चुनें',

    timeListPrompt: 'तारीख चुन ली गई! ✅ (*{{date}}*)\n\nअब अपना पसंदीदा समय चुनें 🕒:',
    timeListButton: 'समय चुनें',
    timeMorningTitle: '🌅 सुबह',
    timeMorningDesc: '9:00 - 12:00 बजे',
    timeAfternoonTitle: '☀️ दोपहर',
    timeAfternoonDesc: '12:00 - 4:00 बजे',
    timeEveningTitle: '🌇 शाम',
    timeEveningDesc: '4:00 - 7:00 बजे',
    timeNightTitle: '🌙 रात',
    timeNightDesc: '7:00 - 9:00 बजे',

    bookingSummaryTitle: '*बुकिंग सारांश* 📋',
    labelService: '🔧 *सर्विस:*',
    labelName: '👤 *नाम:*',
    labelLocation: '📍 *लोकेशन:*',
    labelUrgent: '🚨 *अर्जेंट:*',
    labelTime: '🕒 *समय:*',
    urgentYesLabel: 'हाँ (+{{surcharge}} रियाल अतिरिक्त)',
    confirmQuestion: 'क्या बुकिंग कन्फर्म करें?',
    confirmYesBtn: 'कन्फर्म ✅',
    confirmNoBtn: 'कैंसिल ❌',

    bookingConfirmed: '*बुकिंग कन्फर्म हो गई!* 🎉\n\nबुकिंग आईडी: *{{bookingId}}*\n\nहमारी टीम जल्द आपसे संपर्क करेगी। *खिदमोरा* चुनने के लिए शुक्रिया! 🙏',
    bookingCancelled: 'बुकिंग कैंसिल कर दी गई। नई बुकिंग शुरू करने के लिए "Hi" भेजें।',
    confirmButtonPrompt: 'कृपया Confirm या Cancel बटन दबाएं।',

    ratingPrompt: 'सर्विस पूरी होने के बाद, हमारे अनुभव को रेट करें:',
    ratingListButton: 'रेटिंग दें',
    rating1: '⭐ 1 - खराब',
    rating2: '⭐⭐ 2 - ठीक-ठाक',
    rating3: '⭐⭐⭐ 3 - अच्छा',
    rating4: '⭐⭐⭐⭐ 4 - बहुत अच्छा',
    rating5: '⭐⭐⭐⭐⭐ 5 - शानदार',
    ratingThanks: 'आपकी *{{stars}}/5* रेटिंग के लिए शुक्रिया! ⭐\n\nहम अपनी सर्विस और बेहतर बनाते रहेंगे। 🙏',
  },

  ar: {
    welcomeIntro: '*خدمورة* 🏠\n_خدمات منزلية ذكية_\n\nالسلام عليكم! نحن في خدمتكم.\n\nيرجى اختيار خدمة من القائمة أدناه 👇',
    listPrompt: 'ما هي الخدمة التي تريد حجزها؟',
    listButton: 'عرض الخدمات',
    svcCleaningTitle: '🧹 تنظيف المنزل',
    svcCleaningDesc: 'تنظيف عميق، أرائك، مطبخ وحمام',
    svcAcTitle: '❄️ خدمة تكييف',
    svcAcDesc: 'إصلاح، إعادة تعبئة الغاز، تركيب',
    svcPlumberTitle: '🔧 سباك',
    svcPlumberDesc: 'إصلاح تسريبات وتركيب أنابيب وحنفيات',

    serviceSelected: 'رائع! لقد اخترت *{{service}}*. ✅\n\nما اسمك الكامل؟',

    acPhotoChoicePrompt: 'رائع! لقد اخترت *{{service}}*. ✅\n\nكيف تود مشاركة صورة المكيف؟',
    acPhotoSendBtn: '📷 إرسال صورة',
    acPhotoSkipBtn: '🧑‍🔧 الفني سيأخذها',
    acPhotoSendPrompt: 'يرجى إرسال صورة للمكيف — التقطها الآن أو اخترها من المعرض 📷 (اضغط على أيقونة 📎 أدناه).',
    acPhotoSkipConfirm: 'لا مشكلة، سيقوم الفني بالمعاينة وتصويرها في الموقع. 👍\n\nما اسمك الكامل؟',
    acPhotoReceivedConfirm: 'تم استلام الصورة! ✅\n\nما اسمك الكامل؟',
    acPhotoInvalid: 'يرجى إرسال صورة للمكيف (كاميرا أو معرض) 📷.',
    chooseButtonPrompt: 'يرجى اختيار أحد الأزرار أعلاه.',

    nameInvalid: 'يرجى كتابة *اسمك الكامل* (مثال: أحمد خان).',

    locationRequestPrompt: 'شكراً لك، {{name}}! 🙏\n\nالآن يرجى الضغط على الزر أدناه لمشاركة موقعك الحالي، حتى يصل فريقنا إلى المكان الصحيح.',
    locationInvalid: 'يرجى الضغط على زر *"Send Location"* أعلاه لمشاركة موقعك الحالي.\n\nهذا ضروري حتى يصل فريقنا إلى المكان الصحيح.',

    urgencyPrompt: 'تم استلام الموقع! ✅\n\nهل تحتاج خدمة *عاجلة* (فورية)، أم تفضل الحجز العادي؟',
    urgencyUrgentBtn: '🚨 عاجل (+{{surcharge}} ريال)',
    urgencyNormalBtn: '🗓️ حجز عادي',

    dateListPrompt: 'رائع! الآن يرجى اختيار التاريخ المفضل 📅:',
    dateListButton: 'اختيار التاريخ',

    timeListPrompt: 'تم اختيار التاريخ! ✅ (*{{date}}*)\n\nالآن يرجى اختيار الوقت المفضل 🕒:',
    timeListButton: 'اختيار الوقت',
    timeMorningTitle: '🌅 صباحاً',
    timeMorningDesc: '9:00 - 12:00',
    timeAfternoonTitle: '☀️ ظهراً',
    timeAfternoonDesc: '12:00 - 4:00',
    timeEveningTitle: '🌇 مساءً',
    timeEveningDesc: '4:00 - 7:00',
    timeNightTitle: '🌙 ليلاً',
    timeNightDesc: '7:00 - 9:00',

    bookingSummaryTitle: '*ملخص الحجز* 📋',
    labelService: '🔧 *الخدمة:*',
    labelName: '👤 *الاسم:*',
    labelLocation: '📍 *الموقع:*',
    labelUrgent: '🚨 *عاجل:*',
    labelTime: '🕒 *الوقت:*',
    urgentYesLabel: 'نعم (+{{surcharge}} ريال إضافي)',
    confirmQuestion: 'هل تريد تأكيد هذا الحجز؟',
    confirmYesBtn: 'تأكيد ✅',
    confirmNoBtn: 'إلغاء ❌',

    bookingConfirmed: '*تم تأكيد الحجز!* 🎉\n\nرقم الحجز: *{{bookingId}}*\n\nسيتواصل فريقنا معك قريباً. شكراً لاختيارك *خدمورة*! 🙏',
    bookingCancelled: 'تم إلغاء الحجز. أرسل "Hi" لبدء حجز جديد.',
    confirmButtonPrompt: 'يرجى الضغط على تأكيد أو إلغاء.',

    ratingPrompt: 'بعد اكتمال الخدمة، يرجى تقييم تجربتك:',
    ratingListButton: 'إعطاء تقييم',
    rating1: '⭐ 1 - ضعيف',
    rating2: '⭐⭐ 2 - مقبول',
    rating3: '⭐⭐⭐ 3 - جيد',
    rating4: '⭐⭐⭐⭐ 4 - جيد جداً',
    rating5: '⭐⭐⭐⭐⭐ 5 - ممتاز',
    ratingThanks: 'شكراً على تقييمك *{{stars}}/5*! ⭐\n\nسنستمر في تحسين خدماتنا. 🙏',
  },
};

const DAY_NAMES = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  hi: ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
  ar: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
};

const MONTH_NAMES = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  hi: ['जन', 'फर', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुल', 'अग', 'सित', 'अक्टू', 'नव', 'दिस'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

const TODAY_LABEL = { en: 'Today', hi: 'आज', ar: 'اليوم' };
const TOMORROW_LABEL = { en: 'Tomorrow', hi: 'कल', ar: 'غداً' };

function t(lang, key, vars = {}) {
  const langStrings = STRINGS[lang] || STRINGS.en;
  let str = langStrings[key] || STRINGS.en[key] || key;
  Object.keys(vars).forEach((k) => {
    str = str.replace(new RegExp(`{{${k}}}`, 'g'), vars[k]);
  });
  return str;
}

function getDayNames(lang) {
  return DAY_NAMES[lang] || DAY_NAMES.en;
}

function getMonthNames(lang) {
  return MONTH_NAMES[lang] || MONTH_NAMES.en;
}

function getTodayLabel(lang) {
  return TODAY_LABEL[lang] || TODAY_LABEL.en;
}

function getTomorrowLabel(lang) {
  return TOMORROW_LABEL[lang] || TOMORROW_LABEL.en;
}

module.exports = { t, getDayNames, getMonthNames, getTodayLabel, getTomorrowLabel };
