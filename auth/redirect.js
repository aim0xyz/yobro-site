const route = document.body.dataset.route;
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
