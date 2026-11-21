'use strict';

const cover = document.querySelector('#cover');
const openButton = document.querySelector('#open');
const replayLink = document.querySelector('#replay');
const invitation = document.querySelector('#invitation');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const music = new Audio('assets/musique-andalouse.mp3');
music.loop = true;
music.volume = 0.55;
music.preload = 'none';
const soundToggle = document.querySelector('#sound-toggle');
let soundDisabled = false;
function updateSoundToggle() {
  soundToggle.setAttribute('aria-pressed', String(!music.paused && !music.muted));
}
for (const event of ['playing', 'pause', 'volumechange', 'error']) music.addEventListener(event, updateSoundToggle);
soundToggle.hidden = false;
function playMusic() {
  music.muted = false;
  music.play().catch(updateSoundToggle);
}
soundToggle.addEventListener('click', () => {
  if (music.paused || music.muted) { soundDisabled = false; playMusic(); }
  else { soundDisabled = true; music.muted = true; music.pause(); }
  updateSoundToggle();
});
let revealTimer;

function openInvitation(event) {
  if (event) event.preventDefault();
  if (cover.classList.contains('is-open')) return;
  cover.classList.add('is-open');
  if (!soundDisabled) playMusic();
  clearTimeout(revealTimer);
  revealTimer = setTimeout(() => {
    invitation.focus({preventScroll: true});
    invitation.scrollIntoView();
  }, reducedMotion.matches ? 0 : 2900);
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

const form = document.querySelector('#rsvp');
const send = document.querySelector('#rsvp-button');
const message = document.querySelector('#status');
const presence = form.elements.attendance;
function updateGuests(){form.elements.guests.disabled = presence.value === 'no';}
presence.addEventListener('change',updateGuests);
updateGuests();
send.disabled = false;
form.addEventListener('submit', async event => {
  event.preventDefault();
  send.disabled = true;
  message.hidden = false;
  message.textContent = 'جارٍ إرسال الردّ…';
  try {
    const {name,phone,email,attendance,guests} = form.elements;
    const r = await fetch('/api/rsvp',{method:'POST',headers:{'Content-Type':'application/json','X-RSVP-Request':'1'},body:JSON.stringify({action:'submit',name:name.value,phone:phone.value,email:email.value,attendance:attendance.value,guests:Number(guests.value)}),signal:AbortSignal.timeout(12000)});
    const data = await r.json();
    if (r.status === 201 && data.ok) {form.reset();updateGuests();message.textContent='تم تسجيل ردّكم. شكرًا لكم!';}
    else if(r.status === 400) message.textContent='يرجى التحقّق من الاسم الكامل ورقم الهاتف والاختيار وصحّة البريد الإلكتروني إن أُدخل.';
    else if(r.status === 409) message.textContent='سبق تسجيل ردّ بهذا الاسم ورقم الهاتف، أو بهذا البريد الإلكتروني. لتعديله، يرجى التواصل مع منظّمي الحفل.';
    else if(r.status === 429) message.textContent='محاولات كثيرة. يرجى المحاولة لاحقًا.';
    else throw new Error();
  } catch {message.textContent='تعذّر تسجيل الردّ الآن. يرجى المحاولة لاحقًا.';}
  finally {send.disabled = false;}
});
