const labels = {
 en: { back: 'Back to Brett PA', privacy: 'Items and photos stay in this browser/device. No Brett PA account sync, shared login or appointment integration.' },
 de: { back: 'Zurück zu Brett PA', privacy: 'Dinge und Fotos bleiben in diesem Browser auf diesem Gerät. Keine Brett-PA-Kontosynchronisierung, gemeinsame Anmeldung oder Terminverknüpfung.' },
 fr: { back: 'Retour à Brett PA', privacy: 'Les objets et photos restent dans ce navigateur sur cet appareil. Aucune synchronisation avec un compte Brett PA, connexion partagée ou intégration des rendez-vous.' }
};
const language = navigator.languages?.map(value=>value.split('-')[0].toLowerCase()).find(value=>['en','de','fr'].includes(value)) || 'en';
const selected = labels[language as keyof typeof labels];
const back=document.getElementById('brett-return'),notice=document.getElementById('companion-privacy');
if(back){back.textContent=selected.back;back.lang=language;}
if(notice){notice.textContent=selected.privacy;notice.lang=language;}
export {};
