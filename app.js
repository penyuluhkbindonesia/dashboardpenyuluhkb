// ==========================================================================
// 1. KONFIGURASI OPERASIONAL SERVER UTAMA
// ==========================================================================
const SUPABASE_URL = 'https://cdnqqrjbdhoglvlqbxoq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkbnFxcmpiZGhvZ2x2bHFieG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDQ1NDIsImV4cCI6MjA5NjU4MDU0Mn0.dHQbkEIJe5L4bfyJqZkJkXTPX0Abot4GBw7_4O3eNwk';
const mySupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let dataMaster = []; 
let filterProvinsiAktif = null;
let currentZoomLevel = 100; 

let chartProvInstance = null;
let chartUmurInstance = null;
let chartJabatanInstance = null;
let chartGenerasiInstance = null;
let chartPendidikanInstance = null;
let chartGolonganInstance = null;

function formatAngka(angka) { return Number(angka).toLocaleString('id-ID'); }
function formatTanggalIndo(tglStr) {
    if (!tglStr) return '-';
    const bagian = tglStr.split('-');
    if (bagian.length !== 3) return tglStr;
    return `${bagian[2]}-${bagian[1]}-${bagian[0]}`;
}

// ==========================================================================
// 2. ALUR SINKRONISASI BASIS DATA NASIONAL
// ==========================================================================
async function inisialisasiDasbor() {
    try {
        let allData = []; let step = 1000; let from = 0; let hasMore = true;
        while (hasMore) {
            const { data, error } = await mySupabase
                .from('data_aktif_pkb')
                .select('nip, nama_lengkap, kabupaten, provinsi, jenis_pegawai, jenis_kelamin, jabatan, golongan, pendidikan_akhir, tanggal_lahir, tanggal_pensiun')
                .range(from, from + step - 1);
            if (error) { console.error(error); break; }
            allData = allData.concat(data);
            if (data.length < step) { hasMore = false; } else { from += step; }
        }
        dataMaster = allData;
        renderDasbor();
    } catch (error) {
        console.error("Sinkronisasi gagal:", error);
        document.getElementById('loading-screen').style.display = 'none'; 
    }
}

function renderDasbor() {
    let dataAktif = dataMaster;
    const labelCakupan = document.getElementById('label-cakupan');
    const btnReset = document.getElementById('btn-reset-filter');

    if (filterProvinsiAktif) {
        dataAktif = dataMaster.filter(d => d.provinsi === filterProvinsiAktif);
        labelCakupan.innerHTML = `Data PKB/PLKB : <span style="color:#0056b3;">PROVINSI ${filterProvinsiAktif}</span>`;
        btnReset.style.display = 'block';
    } else {
        labelCakupan.innerText = "Data PKB/PLKB : NASIONAL";
        btnReset.style.display = 'none';
    }

    const bulanIni = '2026-06'; const tahunIni = '2026';
    let kpiPns = 0, kpiPppk = 0, kpiPensiunBln = 0, kpiPensiunThn = 0, kpiPria = 0, kpiWanita = 0;
    let provCount = {}, umurCount = { '< 30': 0, '30-39': 0, '40-49': 0, '50-59': 0, '60+': 0 };
    let generasiCount = { 'Gen Z': 0, 'Milenial': 0, 'Gen X': 0, 'Baby Boomer': 0 };
    let jabatanCount = {}, pendidikanCount = {}, golonganCount = {};
    let dataPensiunTabel = [];

    dataAktif.forEach(row => {
        if (row.jenis_pegawai === 'PNS') kpiPns++;
        if (row.jenis_pegawai === 'PPPK') kpiPppk++;
        if (row.jenis_kelamin) {
            const jk = row.jenis_kelamin.toLowerCase();
            if (jk.includes('laki')) kpiPria++;
            else if (jk.includes('perempuan') || jk.includes('wanita')) kpiWanita++;
        }
        if (row.tanggal_pensiun) {
            if (row.tanggal_pensiun.startsWith(bulanIni)) kpiPensiunBln++;
            if (row.tanggal_pensiun.startsWith(tahunIni)) { kpiPensiunThn++; dataPensiunTabel.push(row); }
        }
        if (row.provinsi) provCount[row.provinsi] = (provCount[row.provinsi] || 0) + 1;
        if (row.jabatan) jabatanCount[row.jabatan] = (jabatanCount[row.jabatan] || 0) + 1;
        if (row.pendidikan_akhir) pendidikanCount[row.pendidikan_akhir] = (pendidikanCount[row.pendidikan_akhir] || 0) + 1;
        if (row.golongan) golonganCount[row.golongan] = (golonganCount[row.golongan] || 0) + 1;

        if (row.tanggal_lahir) {
            const tahunLahir = parseInt(row.tanggal_lahir.split('-')[0]); const usia = 2026 - tahunLahir;
            if (usia < 30) umurCount['< 30']++;
            else if (usia <= 39) umurCount['30-39']++;
            else if (usia <= 49) umurCount['40-49']++;
            else if (usia <= 59) umurCount['50-59']++;
            else umurCount['60+']++;

            if (tahunLahir >= 1997) generasiCount['Gen Z']++;
            else if (tahunLahir >= 1981) generasiCount['Milenial']++;
            else if (tahunLahir >= 1965) generasiCount['Gen X']++;
            else generasiCount['Baby Boomer']++;
        }
    });

    document.getElementById('kpi-total').innerText = formatAngka(dataAktif.length);
    document.getElementById('kpi-pns').innerText = formatAngka(kpiPns);
    document.getElementById('kpi-pppk').innerText = formatAngka(kpiPppk);
    document.getElementById('kpi-pria').innerText = formatAngka(kpiPria);
    document.getElementById('kpi-wanita').innerText = formatAngka(kpiWanita);
    document.getElementById('kpi-pensiun-bulan').innerText = formatAngka(kpiPensiunBln);
    document.getElementById('kpi-pensiun-tahun').innerText = formatAngka(kpiPensiunThn);

    dataPensiunTabel.sort((a, b) => new Date(a.tanggal_pensiun) - new Date(b.tanggal_pensiun));
    const tbodyPensiun = document.querySelector('#tabelPensiun tbody'); tbodyPensiun.innerHTML = '';
    dataPensiunTabel.slice(0, 50).forEach(p => {
        let tr = document.createElement('tr');
        tr.innerHTML = `<td>${p.nama_lengkap}</td><td>${p.provinsi}</td><td>${p.jabatan}</td><td style="font-weight:bold; color:#dc3545;">${formatTanggalIndo(p.tanggal_pensiun)}</td>`;
        tbodyPensiun.appendChild(tr);
    });

    gambarChartProvinsi(provCount); gambarChartUmur(umurCount); gambarChartJabatan(jabatanCount);
    gambarChartGenerasi(generasiCount); gambarChartPendidikan(pendidikanCount); gambarChartGolongan(golonganCount);
    document.getElementById('loading-screen').style.display = 'none';
}

// ==========================================================================
// 3. LOGIKA GRAPHICAL USER INTERFACE (CHART RENDERING)
// ==========================================================================
function gambarChartProvinsi(provData) {
    const ctx = document.getElementById('chartProvinsi').getContext('2d'); if (chartProvInstance) chartProvInstance.destroy();
    const sortedProv = Object.entries(provData).sort((a, b) => b[1] - a[1]);
    const labels = sortedProv.map(i => i[0]); const values = sortedProv.map(i => i[1]);
    chartProvInstance = new Chart(ctx, {
        type: 'bar', data: { labels: labels, datasets: [{ label: 'Total', data: values, backgroundColor: '#007bff', borderRadius: 4 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, onClick: (e, active) => { if (active.length > 0) { filterProvinsiAktif = labels[active[0].index]; renderDasbor(); } } }
    });
}
function gambarChartUmur(uData) {
    const ctx = document.getElementById('chartUmur').getContext('2d'); if (chartUmurInstance) chartUmurInstance.destroy();
    chartUmurInstance = new Chart(ctx, { type: 'bar', data: { labels: Object.keys(uData), datasets: [{ data: Object.values(uData), backgroundColor: ['#007bff', '#28a745', '#ffc107', '#fd7e14', '#dc3545'], borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
}
function gambarChartGenerasi(gData) {
    const ctx = document.getElementById('chartGenerasi').getContext('2d'); if (chartGenerasiInstance) chartGenerasiInstance.destroy();
    chartGenerasiInstance = new Chart(ctx, { type: 'pie', data: { labels: Object.keys(gData), datasets: [{ data: Object.values(gData), backgroundColor: ['#6f42c1', '#17a2b8', '#fd7e14', '#e83e8c'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });
}
function gambarChartJabatan(jData) {
    const ctx = document.getElementById('chartJabatan').getContext('2d'); if (chartJabatanInstance) chartJabatanInstance.destroy();
    const sorted = Object.entries(jData).sort((a, b) => b[1] - a[1]);
    chartJabatanInstance = new Chart(ctx, { type: 'doughnut', data: { labels: sorted.map(i => i[0]), datasets: [{ data: sorted.map(i => i[1]), backgroundColor: ['#007bff', '#17a2b8', '#28a745', '#ffc107', '#dc3545', '#6f42c1'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 10 } } } } });
}
function gambarChartPendidikan(pData) {
    const ctx = document.getElementById('chartPendidikan').getContext('2d'); if (chartPendidikanInstance) chartPendidikanInstance.destroy();
    const sorted = Object.entries(pData).sort((a, b) => b[1] - a[1]);
    chartPendidikanInstance = new Chart(ctx, { type: 'bar', data: { labels: sorted.map(i => i[0]), datasets: [{ data: sorted.map(i => i[1]), backgroundColor: '#17a2b8', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
}
function gambarChartGolongan(goData) {
    const ctx = document.getElementById('chartGolongan').getContext('2d'); if (chartGolonganInstance) chartGolonganInstance.destroy();
    const sorted = Object.entries(goData).sort((a, b) => a[0].localeCompare(b[0]));
    chartGolonganInstance = new Chart(ctx, { type: 'bar', data: { labels: sorted.map(i => i[0]), datasets: [{ data: sorted.map(i => i[1]), backgroundColor: '#6c757d', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
}

window.resetFilter = function() { filterProvinsiAktif = null; renderDasbor(); };

// ==========================================================================
// 4. SISTEM OTENTIKASI & MULTI-ROLE ROUTING SYSTEM
// ==========================================================================
window.penyesuaianPlaceholderLogin = function() {
    const role = document.getElementById('login-role').value;
    const inputUser = document.getElementById('inputUser');
    inputUser.placeholder = (role === 'pkb') ? "Masukkan 18 Digit NIP" : "Masukkan Nama Pengguna (Username)";
};

window.navigasiLoginAtauKeluar = function() {
    const btn = document.getElementById('btn-auth-action');
    if (btn.innerText === "Keluar Sesi") {
        document.getElementById('view-superadmin').style.display = 'none';
        document.getElementById('view-admin').style.display = 'none';
        document.getElementById('view-portal-pkb').style.display = 'none';
        document.getElementById('view-dasbor-publik').style.display = 'block';
        document.getElementById('header-title').innerText = "Dashboard PenyuluhKB";
        btn.innerText = "Masuk / Login";
    } else {
        document.getElementById('view-dasbor-publik').style.display = 'none';
        document.getElementById('view-login').style.display = 'block';
    }
};

window.kembaliKeDasborPublik = function() {
    document.getElementById('view-login').style.display = 'none';
    document.getElementById('view-dasbor-publik').style.display = 'block';
    document.getElementById('pesan-error').style.display = 'none';
};

window.eksekusiLogin = async function() {
    const role = document.getElementById('login-role').value;
    const user = document.getElementById('inputUser').value;
    const pass = document.getElementById('inputPass').value;
    const err = document.getElementById('pesan-error');
    err.style.display = 'none';

    if (!user || !pass) return;

    if (role === 'superadmin') {
        if (user === 'superadmin' && pass === 'admin') {
            masukHalamanRole('superadmin', 'Super Admin Pusat');
        } else { memunculkanErrorLogin(); }
    } 
    else if (role === 'admin') {
        if (user === 'admin' && pass === 'admin') {
            masukHalamanRole('admin', 'Admin Regional');
        } else { memunculkanErrorLogin(); }
    } 
    else if (role === 'pkb') {
        try {
            const { data, error } = await mySupabase.from('data_aktif_pkb').select('*').eq('nip', user).single();
            if (error || !data) { memunculkanErrorLogin("NIP Tidak Ditemukan!"); }
            else {
                document.getElementById('pkb-nama').innerText = data.nama_lengkap;
                document.getElementById('pkb-nip').innerText = data.nip;
                document.getElementById('pkb-jabatan').innerText = data.jabatan + " (" + (data.golongan || '-') + ")";
                document.getElementById('pkb-wilayah').innerText = (data.kabupaten || '') + ", " + data.provinsi;
                masukHalamanRole('pkb', data.nama_lengkap);
            }
        } catch (e) { memunculkanErrorLogin(); }
    }
};

function memunculkanErrorLogin(customMsg) {
    const err = document.getElementById('pesan-error');
    err.style.display = 'block';
    err.innerText = customMsg || "Kredensial Akses Salah / Ditolak!";
}

function masukHalamanRole(role, namaHeader) {
    document.getElementById('view-login').style.display = 'none';
    document.getElementById('inputUser').value = ''; document.getElementById('inputPass').value = '';
    
    document.getElementById('btn-auth-action').innerText = "Keluar Sesi";
    document.getElementById('header-title').innerText = `Portal: ${namaHeader}`;

    if (role === 'superadmin') document.getElementById('view-superadmin').style.display = 'block';
    if (role === 'admin') {
        document.getElementById('view-admin').style.display = 'block';
        document.getElementById('title-admin-regional').innerText = `Dashboard Admin PenyuluhKB : Regional`;
    }
    if (role === 'pkb') {
        document.getElementById('view-portal-pkb').style.display = 'grid';
        pindahTabPortal('profil');
    }
}

// ==========================================================================
// 5. INTERFASE INTERNAL PORTAL (TABS ROUTING & AKSESIBILITAS)
// ==========================================================================
window.pindahTabPortal = function(tabId) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(c => c.style.display = 'none');
    
    const links = document.querySelectorAll('.tab-link');
    links.forEach(l => l.classList.remove('active'));

    document.getElementById(`tab-${tabId}`).style.display = 'block';
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
};

window.simpanPembaruanProfilDummy = function() {
    alert("Pembaharuan Profil Memerlukan Persetujuan Admin.");
};

window.bukaFileFullscreen = function(filename) {
    document.getElementById('viewer-filename').innerText = filename;
    document.getElementById('viewer-body-content').innerText = `[ Sedang Membaca Berkas Fullscreen: ${filename} ]`;
    document.getElementById('viewer-overlay').style.display = 'flex';
};

window.tutupFileFullscreen = function() {
    document.getElementById('viewer-overlay').style.display = 'none';
};

window.ubahTemaAplikasi = function(theme) {
    document.documentElement.setAttribute('data-theme', theme);
};

window.ubahSkalaZoom = function(aksi) {
    if (aksi === '+') currentZoomLevel += 10;
    else if (aksi === '-') currentZoomLevel -= 10;
    else currentZoomLevel = 100;

    if (currentZoomLevel < 80) currentZoomLevel = 80;
    if (currentZoomLevel > 130) currentZoomLevel = 130;

    document.documentElement.style.setProperty('--base-font-size', `${currentZoomLevel}%`);
};

window.addEventListener('DOMContentLoaded', inisialisasiDasbor);
