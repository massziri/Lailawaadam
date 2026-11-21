'use strict';
// Facultatif : numéro WhatsApp au format international, chiffres uniquement.
// Laisser vide (''), le formulaire reste alors en mode aperçu sans envoi.
const whatsappNumber = '';

const cover = document.querySelector('#cover');
const openButton = document.querySelector('#open');
const replayLink = document.querySelector('#replay');
const invitation = document.querySelector('#invitation');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const creak = new Audio('assets/son-porte.mp3');
creak.preload = 'auto';
let revealTimer;

function openInvitation(event) {
  if (event) event.preventDefault();
  if (cover.classList.contains('is-open')) return;
  cover.classList.add('is-open');
  creak.currentTime = 0;
  creak.play().catch(() => {}); // le son est un bonus : l'ouverture ne dépend pas de lui
  clearTimeout(revealTimer);
  revealTimer = setTimeout(() => {
    invitation.focus({preventScroll: true});
    invitation.scrollIntoView();
  }, reducedMotion.matches ? 0 : 950);
}

openButton.addEventListener('click', openInvitation);
replayLink.addEventListener('click', () => {
  clearTimeout(revealTimer);
  cover.classList.remove('is-open');
  openButton.focus({preventScroll: true});
});

// Compte à rebours discret vers la cérémonie (19 juin 2027, 19h00).
const countdown = document.querySelector('#countdown');
const weddingDate = new Date('2027-06-19T19:00:00+01:00');
function updateCountdown() {
  const days = Math.ceil((weddingDate - Date.now()) / 86400000);
  const arabic = new Intl.NumberFormat('ar-MA-u-nu-arab');
  if (days > 1) countdown.textContent = `بقي ${arabic.format(days)} يومًا على لقائنا`;
  else if (days === 1) countdown.textContent = 'بقي يوم واحد على لقائنا';
  else if (days === 0) countdown.textContent = 'لقاؤنا اليوم، أهلاً بكم';
  else countdown.textContent = '';
}
updateCountdown();
setInterval(updateCountdown, 3600000);

// Fichier calendrier (.ics) généré dans le navigateur, sans serveur.
const calendarButton = document.querySelector('#calendar');
calendarButton.addEventListener('click', () => {
  const stamp = (iso) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dar Al Yasmine//Invitation//AR',
    'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', 'UID:laila-adam-2027@dar-al-yasmine',
    'DTSTAMP:' + stamp(new Date().toISOString()),
    'DTSTART:20270619T180000Z', 'DTEND:20270619T235900Z',
    'SUMMARY:حفل زفاف ليلى وآدم',
    'LOCATION:دار الياسمين، تطوان، المغرب',
    'DESCRIPTION:أمسية أندلسية بين الأقواس والياسمين. الاستقبال في السابعة مساءً.',
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], {type: 'text/calendar;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mariage-laila-adam.ics';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
});

// Formulaire de présence.
const form = document.querySelector('#rsvp');
const nameField = document.querySelector('#name');
const attendance = document.querySelector('#attendance');
const guests = document.querySelector('#guests');
const status = document.querySelector('#status');
const button = document.querySelector('#rsvp-button');
const canSend = /^[1-9]\d{7,14}$/.test(whatsappNumber);
if (canSend) {
  button.textContent = 'متابعة عبر واتساب';
  document.querySelector('#rsvp-mode').textContent = 'سيُفتح واتساب مع نص الردّ. لا يُرسل الردّ إلا بعد الضغط على زر الإرسال في واتساب.';
}
form.addEventListener('input', () => {
  nameField.setCustomValidity('');
  status.hidden = true;
});
attendance.addEventListener('change', () => { guests.disabled = attendance.value === 'no'; });
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = nameField.value.trim();
  if (!name) {
    nameField.setCustomValidity('يرجى كتابة الاسم الكامل.');
    nameField.reportValidity();
    return;
  }
  if (!attendance.value) {
    attendance.setCustomValidity('يرجى اختيار الإجابة.');
    attendance.reportValidity();
    return;
  }
  attendance.setCustomValidity('');
  const going = attendance.value === 'yes';
  const guestCount = Number(guests.value).toLocaleString('ar-MA-u-nu-arab');
  const response = going
    ? `سأحضر حفل الزفاف. عدد الحاضرين بمن فيهم أنا: ${guestCount}.`
    : 'أعتذر عن حضور حفل الزفاف.';
  if (canSend) {
    const url = new URL('https://wa.me/' + whatsappNumber);
    url.searchParams.set('text', `مرحبًا، معكم ${name}. ${response}`);
    window.location.assign(url.toString());
  } else {
    status.textContent = `معاينة الردّ — ${name}: ${response} لم يُرسل شيء.`;
    status.hidden = false;
  }
});
