// En son aldığın güncel Google Apps Script Web Uygulaması URL'si
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxJuIrgGwLEWDGnGXra8cJ7gFCXilzTEoNxiPQLJKHQNKSsP_HhOODU1l0NZjq2bRJR/exec";

// Sabit saat listesi (12:00 - 18:30 arası yarım saatte bir)
const TUM_SAATLER = [
"12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
"15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
"18:00", "18:30"
];

let globalRandevular = [];
let secilenSaat = "";

document.addEventListener("DOMContentLoaded", () => {
tarihleriOlustur();
verileriYukle();

const form = document.getElementById("appointment-form");
if(form) {
form.addEventListener("submit", (e) => {
e.preventDefault();
olusturTalep();
});
}
});

function tarihleriOlustur() {
const selectTarih = document.getElementById("select-tarih");
if(!selectTarih) return;
selectTarih.innerHTML = "";

for (let i = 0; i < 3; i++) {
let d = new Date();
d.setDate(d.getDate() + i);
let gun = String(d.getDate()).padStart(2, '0');
let ay = String(d.getMonth() + 1).padStart(2, '0');
let yil = d.getFullYear();
let formatliTarih = `${gun}.${ay}.${yil}`;

let opt = document.createElement("option");
opt.value = formatliTarih;
opt.innerText = i === 0 ? `Bugün (${formatliTarih})` : i === 1 ? `Yarın (${formatliTarih})` : formatliTarih;
selectTarih.appendChild(opt);
}
}

function verileriYukle() {
fetch(SCRIPT_URL + "?islem=randevulari_oku")
.then(res => res.json())
.then(data => {
globalRandevular = data;
guncelleKullanilabilirSaatler();
adminPaneliListele();
}).catch(err => console.log("Veri çekme hatası:", err));
}

function guncelleKullanilabilirSaatler() {
const ustaSelect = document.getElementById("select-usta");
const tarihSelect = document.getElementById("select-tarih");
const grid = document.getElementById("slots-grid");

if(!ustaSelect || !tarihSelect || !grid) return;

const usta = ustaSelect.value;
const tarih = tarihSelect.value;

grid.innerHTML = "";
secilenSaat = "";

if (!usta) {
grid.innerHTML = "<p style='color:#a1a1aa; grid-column:span 4;'>Lütfen önce usta seçiniz.</p>";
return;
}

TUM_SAATLER.forEach(saat => {
const btn = document.createElement("button");
btn.type = "button";
btn.className = "slot-btn";
btn.innerText = saat;

const doluMu = globalRandevular.some(r => {
const temizTSayfa = temizTarihFormatla(r.tarih);
return temizTSayfa === tarih && r.saat === saat && r.usta === usta && r.durum !== "Reddedildi" && r.durum !== "Reddet";
});

if (doluMu) {
btn.classList.add("disabled");
btn.disabled = true;
} else {
btn.onclick = () => {
document.querySelectorAll(".slot-btn").forEach(b => b.classList.remove("selected"));
btn.classList.add("selected");
secilenSaat = saat;
};
}
grid.appendChild(btn);
});
}

function olusturTalep() {
if (!secilenSaat) {
alert("Lütfen bir randevu saati seçiniz!");
return;
}

const telefonInput = document.getElementById("client-phone");
let telDeger = telefonInput ? telefonInput.value.replace(/\s+/g, '') : "";

if (telDeger.startsWith("0")) {
telDeger = telDeger.substring(1);
}

const sadeceRakamMi = /^\d+$/.test(telDeger);
if (!sadeceRakamMi || telDeger.length !== 10) {
alert("Lütfen telefon numaranızı eksiksiz ve başında sıfır olmadan (Örn: 5517728222) 10 hane olarak düzeltiniz!");
if(telefonInput) telefonInput.focus();
return;
}

const musteriIsmi = document.getElementById("client-name").value.trim();
if (!musteriIsmi) {
alert("Lütfen adınızı ve soyadınızı giriniz!");
return;
}

const veri = {
islem: "talep_olustur",
usta: document.getElementById("select-usta").value,
tarih: document.getElementById("select-tarih").value,
saat: secilenSaat,
musteri: musteriIsmi,
telefon: "0" + telDeger
};

const submitBtn = document.querySelector("#appointment-form button[type='submit']");
if(submitBtn) {
submitBtn.disabled = true;
submitBtn.innerText = "Gönderiliyor...";
}

fetch(SCRIPT_URL, {
method: "POST",
body: JSON.stringify(veri)
})
.then(res => res.json())
.then(resData => {
if (resData.durum === "basarili") {
// Klasik alert yerine hazırladığımız modern pop-up ekranını açıyoruz
const modal = document.getElementById("success-modal");
if(modal) {
modal.style.display = "flex";
}

// Formu temizle ve seçimleri sıfırla
document.getElementById("appointment-form").reset();
secilenSaat = "";
verileriYukle();
} else {
alert("Hata: " + resData.mesaj);
}
})
.catch(err => {
console.error("Gönderim Hatası:", err);
alert("Bağlantı hatası oluştu, lütfen tekrar deneyin.");
})
.finally(() => {
if(submitBtn) {
submitBtn.disabled = false;
submitBtn.innerText = "Randevu Talebi Gönder";
}
});
}

// Onay ekranını kapatıp sayfayı eski haline döndüren fonksiyon
function kapatSuccessModal() {
const modal = document.getElementById("success-modal");
if(modal) {
modal.style.display = "none";
}
// Sayfayı hafifçe yukarı kaydırarak müşteriyi başa döndürür
window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleAdminPanel() {
const loginForm = document.getElementById("admin-login-form");
if(loginForm) loginForm.classList.toggle("hidden");
}

function loginAdmin() {
const pass = document.getElementById("admin-pass").value;
if (pass === "santana2026") {
document.getElementById("admin-login-form").classList.add("hidden");
document.getElementById("admin-dashboard").classList.remove("hidden");
} else {
alert("Hatalı Giriş Şifresi!");
}
}

function temizTarihFormatla(hamTarih) {
if(!hamTarih) return "";
let str = String(hamTarih);
if(str.includes("T")) {
str = str.split("T")[0];
}
if(str.includes("-")) {
const parcalar = str.split("-");
if(parcalar[0].length === 4) {
return `${parcalar[2]}.${parcalar[1]}.${parcalar[0]}`;
}
return `${parcalar[0]}.${parcalar[1]}.${parcalar[2]}`;
}
return str;
}

function adminPaneliListele() {
const tbody = document.getElementById("admin-table-body");
if(!tbody) return;
tbody.innerHTML = "";

globalRandevular.forEach(r => {
if(r.durum === "Reddedildi") return;

const tr = document.createElement("tr");
let aksiyonlar = "";

if (r.durum === "Beklemede") {
aksiyonlar = `
<button class="btn-approve" onclick="durumDegistir('${r.id}', 'Onaylandı')">Onayla</button>
<button class="btn-reject" onclick="durumDegistir('${r.id}', 'Reddedildi')">Reddet</button>
`;
} else {
aksiyonlar = `<span style='color:#a1a1aa; font-size:13px;'>İşlem Tamamlandı</span>`;
}

const netTarih = temizTarihFormatla(r.tarih);

tr.innerHTML = `
<td data-label="Tarih/Saat">${netTarih} - ${r.saat}</td>
<td data-label="Usta">${r.usta}</td>
<td data-label="Müşteri">${r.musteri}</td>
<td data-label="Telefon">${r.telefon}</td>
<td data-label="Durum" style="color:${r.durum === 'Onaylandı' ? '#22c55e' : '#d4af37'}; font-weight:bold;">${r.durum}</td>
<td data-label="Aksiyon">${aksiyonlar}</td>
`;
tbody.appendChild(tr);
});
}

function durumDegistir(id, yeniDurum) {
if(!id) return;

fetch(SCRIPT_URL, {
method: "POST",
body: JSON.stringify({ islem: "durum_guncelle", id: id, yeniDurum: yeniDurum })
})
.then(() => {
alert(`Randevu durumu güncellendi.`);
verileriYukle();
})
.catch(err => {
console.error("Hata:", err);
verileriYukle();
});
}

// Global bağlantılar
window.durumDegistir = durumDegistir;
window.loginAdmin = loginAdmin;
window.toggleAdminPanel = toggleAdminPanel;
window.guncelleKullanilabilirSaatler = guncelleKullanilabilirSaatler;
window.olusturTalep = olusturTalep;
window.kapatSuccessModal = kapatSuccessModal;