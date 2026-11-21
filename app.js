'use strict';
// Facultatif : numéro WhatsApp au format international, chiffres uniquement.
// Laisser vide pour une simple démo sans transmission.
const whatsappNumber = '';
const openLink = document.querySelector('#open');
const replayLink = document.querySelector('#replay');
const cover = document.querySelector('#cover');
const invitation = document.querySelector('#invitation');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let revealTimer;
openLink.addEventListener('click', (event) => {
  event.preventDefault();
  cover.classList.add('is-open');
  clearTimeout(revealTimer);
  revealTimer = setTimeout(() => {
    invitation.focus({preventScroll: true});
    invitation.scrollIntoView();
  }, reducedMotion.matches ? 0 : 440);
});
replayLink.addEventListener('click', () => {
  clearTimeout(revealTimer);
  cover.classList.remove('is-open');
  openLink.focus({preventScroll: true});
});
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
button.disabled = false;
form.addEventListener('input', () => {
  nameField.setCustomValidity('');
  status.hidden = true;
});
attendance.addEventListener('change', () => {guests.disabled = attendance.value === 'no';});
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = nameField.value.trim();
  if (!name) {
    nameField.setCustomValidity('يرجى كتابة الاسم الكامل.');
    nameField.reportValidity();
    return;
  }
  const going = attendance.value === 'yes';
  const guestCount = Number(guests.value).toLocaleString('ar-MA-u-nu-arab');
  const response = going ? `سأحضر حفل الزفاف. عدد الحاضرين بمن فيهم أنا: ${guestCount}.` : 'أعتذر عن حضور حفل الزفاف.';
  if (canSend) {
    const message = `مرحبًا، معكم ${name}. ${response}`;
    const url = new URL(`https://wa.me/${whatsappNumber}`);
    url.searchParams.set('text', message);
    window.location.assign(url.toString());
  } else {
    status.textContent = `معاينة الردّ — ${name}: ${response} لم يُرسل شيء.`;
    status.hidden = false;
  }
});
