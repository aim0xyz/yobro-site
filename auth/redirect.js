const route = document.body.dataset.route;
const selectedLanguage = localStorage.getItem('yobro-language');
const browserLanguage = (navigator.languages?.[0] || navigator.language || 'de').toLowerCase();
const language = selectedLanguage === 'de' || selectedLanguage === 'en'
  ? selectedLanguage
  : (browserLanguage.startsWith('de') ? 'de' : 'en');
document.documentElement.lang = language;
document.title = route === 'reset-password'
  ? (language === 'de' ? 'Passwort zurücksetzen — YOBRO' : 'Reset your password — YOBRO')
  : (language === 'de' ? 'E-Mail bestätigt — YOBRO' : 'Email confirmed — YOBRO');
document.querySelectorAll('[data-de][data-en]').forEach((element) => {
  const arrow = element.querySelector('span')?.outerHTML || '';
  element.innerHTML = element.dataset[language] + (arrow ? ` ${arrow}` : '');
});
const destination = new URL(`yobro://auth/${route}`);

for (const [key, value] of new URLSearchParams(window.location.search)) {
  destination.searchParams.append(key, value);
}

const hash = window.location.hash.replace(/^#/, '');
if (hash) destination.hash = hash;

const appURL = destination.toString();
const button = document.getElementById('open-app');
button.href = appURL;

window.setTimeout(() => {
  window.location.assign(appURL);
}, 350);
