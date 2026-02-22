export type Lang = "nl" | "en" | "es" | "pt";

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
];

const translations: Record<Lang, Record<string, string>> = {
  nl: {
    hero_title: "Voetbalpoules, maar dan beter",
    hero_subtitle: "Voorspel WK 2026 wedstrijden, daag vrienden uit en bewijs dat jij de beste voetbalkenner bent.",
    cta_create: "Start jouw poule",
    cta_join: "Join met code",
    feature_live: "Live wedstrijden",
    feature_live_desc: "Volg alle WK 2026 wedstrijden live met real-time standen en events.",
    feature_predict: "Voorspellingen & Lock",
    feature_predict_desc: "Doe je voorspelling vóór de wedstrijd begint. Daarna wordt je score vergrendeld.",
    feature_ranking: "Ranglijst",
    feature_ranking_desc: "Bekijk wie de beste voorspeller is in jouw poule met live puntentelling.",
    feature_qr: "QR Code Invite",
    feature_qr_desc: "Deel je poule met een unieke QR code of invite link via WhatsApp.",
    feature_business: "Bedrijfspoules",
    feature_business_desc: "Organiseer een poule voor je bedrijf met eigen branding en privacyinstellingen.",
    faq_title: "Veelgestelde vragen",
    faq_1_q: "Is Goaltje gratis?",
    faq_1_a: "Ja! Het aanmaken van een account en deelnemen aan poules is volledig gratis.",
    faq_2_q: "Hoe doe ik mee aan een poule?",
    faq_2_a: "Vraag de invite code aan de maker van de poule, of scan de QR code.",
    faq_3_q: "Wanneer kan ik een voorspelling doen?",
    faq_3_a: "Je kunt voorspellingen insturen tot de aftrap van de wedstrijd. Daarna wordt je voorspelling vergrendeld.",
    faq_4_q: "Hoe werkt de puntentelling?",
    faq_4_a: "Exacte score = 5 punten, juiste uitslag = 3 punten, juist doelsaldo = 2 punten.",
    contact: "Contact",
    contact_text: "Heb je vragen of feedback? Neem contact op via",
    meta_title: "Goaltje – Voetbalpoules voor WK 2026",
    meta_description: "Maak poules, voorspel wedstrijden en daag je vrienden uit. Goaltje is dé app voor WK 2026 voetbalpoules.",
  },
  en: {
    hero_title: "Football pools, but better",
    hero_subtitle: "Predict World Cup 2026 matches, challenge friends and prove you're the ultimate football expert.",
    cta_create: "Start your pool",
    cta_join: "Join with code",
    feature_live: "Live matches",
    feature_live_desc: "Follow all World Cup 2026 matches live with real-time scores and events.",
    feature_predict: "Predictions & Lock",
    feature_predict_desc: "Make your prediction before kickoff. After that, your score is locked.",
    feature_ranking: "Leaderboard",
    feature_ranking_desc: "See who's the best predictor in your pool with live scoring.",
    feature_qr: "QR Code Invite",
    feature_qr_desc: "Share your pool with a unique QR code or invite link via WhatsApp.",
    feature_business: "Corporate pools",
    feature_business_desc: "Organize a pool for your company with custom branding and privacy settings.",
    faq_title: "Frequently Asked Questions",
    faq_1_q: "Is Goaltje free?",
    faq_1_a: "Yes! Creating an account and joining pools is completely free.",
    faq_2_q: "How do I join a pool?",
    faq_2_a: "Ask the pool creator for the invite code, or scan the QR code.",
    faq_3_q: "When can I make a prediction?",
    faq_3_a: "You can submit predictions until kickoff. After that, your prediction is locked.",
    faq_4_q: "How does scoring work?",
    faq_4_a: "Exact score = 5 points, correct result = 3 points, correct goal difference = 2 points.",
    contact: "Contact",
    contact_text: "Have questions or feedback? Reach out via",
    meta_title: "Goaltje – Football Pools for World Cup 2026",
    meta_description: "Create pools, predict matches and challenge your friends. Goaltje is the app for World Cup 2026 football pools.",
  },
  es: {
    hero_title: "Pollas de fútbol, pero mejor",
    hero_subtitle: "Predice partidos del Mundial 2026, desafía a tus amigos y demuestra que eres el mejor experto en fútbol.",
    cta_create: "Crea tu polla",
    cta_join: "Únete con código",
    feature_live: "Partidos en vivo",
    feature_live_desc: "Sigue todos los partidos del Mundial 2026 en vivo con marcadores en tiempo real.",
    feature_predict: "Predicciones y bloqueo",
    feature_predict_desc: "Haz tu predicción antes del partido. Después, tu puntuación se bloquea.",
    feature_ranking: "Clasificación",
    feature_ranking_desc: "Mira quién es el mejor predictor en tu polla con puntuación en vivo.",
    feature_qr: "Invitación QR",
    feature_qr_desc: "Comparte tu polla con un código QR único o enlace de invitación por WhatsApp.",
    feature_business: "Pollas corporativas",
    feature_business_desc: "Organiza una polla para tu empresa con marca personalizada y configuración de privacidad.",
    faq_title: "Preguntas frecuentes",
    faq_1_q: "¿Es Goaltje gratis?",
    faq_1_a: "¡Sí! Crear una cuenta y unirse a pollas es completamente gratis.",
    faq_2_q: "¿Cómo me uno a una polla?",
    faq_2_a: "Pide el código de invitación al creador de la polla, o escanea el código QR.",
    faq_3_q: "¿Cuándo puedo hacer una predicción?",
    faq_3_a: "Puedes enviar predicciones hasta el inicio del partido. Después, tu predicción se bloquea.",
    faq_4_q: "¿Cómo funciona la puntuación?",
    faq_4_a: "Resultado exacto = 5 puntos, resultado correcto = 3 puntos, diferencia de goles correcta = 2 puntos.",
    contact: "Contacto",
    contact_text: "¿Tienes preguntas o comentarios? Contáctanos en",
    meta_title: "Goaltje – Pollas de Fútbol para el Mundial 2026",
    meta_description: "Crea pollas, predice partidos y desafía a tus amigos. Goaltje es la app para pollas del Mundial 2026.",
  },
  pt: {
    hero_title: "Bolões de futebol, só que melhor",
    hero_subtitle: "Preveja jogos da Copa do Mundo 2026, desafie amigos e prove que você é o melhor especialista em futebol.",
    cta_create: "Crie seu bolão",
    cta_join: "Entre com código",
    feature_live: "Jogos ao vivo",
    feature_live_desc: "Acompanhe todos os jogos da Copa 2026 ao vivo com placares em tempo real.",
    feature_predict: "Previsões e bloqueio",
    feature_predict_desc: "Faça sua previsão antes do jogo começar. Depois, sua pontuação é bloqueada.",
    feature_ranking: "Classificação",
    feature_ranking_desc: "Veja quem é o melhor previsor no seu bolão com pontuação ao vivo.",
    feature_qr: "Convite QR",
    feature_qr_desc: "Compartilhe seu bolão com um código QR único ou link de convite pelo WhatsApp.",
    feature_business: "Bolões corporativos",
    feature_business_desc: "Organize um bolão para sua empresa com marca personalizada e configurações de privacidade.",
    faq_title: "Perguntas frequentes",
    faq_1_q: "O Goaltje é gratuito?",
    faq_1_a: "Sim! Criar uma conta e participar de bolões é completamente gratuito.",
    faq_2_q: "Como entro em um bolão?",
    faq_2_a: "Peça o código de convite ao criador do bolão, ou escaneie o código QR.",
    faq_3_q: "Quando posso fazer uma previsão?",
    faq_3_a: "Você pode enviar previsões até o início do jogo. Depois disso, sua previsão é bloqueada.",
    faq_4_q: "Como funciona a pontuação?",
    faq_4_a: "Resultado exato = 5 pontos, resultado correto = 3 pontos, saldo de gols correto = 2 pontos.",
    contact: "Contato",
    contact_text: "Tem perguntas ou feedback? Entre em contato via",
    meta_title: "Goaltje – Bolões de Futebol para a Copa 2026",
    meta_description: "Crie bolões, preveja jogos e desafie seus amigos. Goaltje é o app para bolões da Copa do Mundo 2026.",
  },
};

export function t(lang: Lang, key: string): string {
  return translations[lang]?.[key] || translations.nl[key] || key;
}

export function getSavedLang(): Lang {
  const saved = localStorage.getItem("goaltje-lang");
  if (saved && ["nl", "en", "es", "pt"].includes(saved)) return saved as Lang;
  
  // Detect from browser
  const browserLang = navigator.language?.substring(0, 2);
  if (browserLang && ["nl", "en", "es", "pt"].includes(browserLang)) return browserLang as Lang;
  
  return "nl";
}

export function saveLang(lang: Lang) {
  localStorage.setItem("goaltje-lang", lang);
}
