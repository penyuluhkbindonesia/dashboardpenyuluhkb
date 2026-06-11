// ==========================================================================
// 1. KONFIGURASI SERVER
// ==========================================================================
const SUPABASE_URL = 'https://cdnqqrjbdhoglvlqbxoq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkbnFxcmpiZGhvZ2x2bHFieG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDQ1NDIsImV4cCI6MjA5NjU4MDU0Mn0.dHQbkEIJe5L4bfyJqZkJkXTPX0Abot4GBw7_4O3eNwk';
const mySupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let filterProvinsiAktif = null;
let currentZoomLevel = 100; 

let chartProvInstance = null; let chartUmurInstance = null; let chartJabatanInstance = null;
let chartGenerasiInstance = null; let chartPendidikanInstance = null; let chartGolonganInstance = null;

function formatAngka(angka) { return Number(angka).toLocaleString('id-ID'); }
function formatTanggalIndo(tglStr) {
    if (!tglStr) return '-';
    const bagian = tglStr.split('-');
    if (bagian.length !== 3) return tglStr;
    return `${bagian[2]}-${bagian[1]}-${bagian[0]}`;
}

// ==========================================================================
// 2. MESIN BARU (RPC SERVER-SIDE)
// ==========================================================================
async function tarikDataDasbor() {
    document.getElementById('loading-screen').style.display = 'flex';
    try {
        // Kita tidak lagi menyedot puluhan ribu data! Kita hanya menanyakan hasil rekap ke Server.
        const { data, error } = await mySupabase.rpc('get_rekap_dasbor', { p_provinsi: filterProvinsiAktif });
        if (error) throw error;
        renderVisualDasbor(data);
    } catch (error) {
        console.error("Gagal menarik data dari server:", error);
    }
    document.getElementById('loading-screen').style.display = 'none';
}

function renderVisualDasbor(dataServer) {
    // 1. Update Label & Tombol Filter
    const labelCakupan = document.getElementById('label-cakupan');
    const btnReset = document.getElementById('btn-reset-filter');
    if (filterProvinsiAktif) {
        labelCakupan.innerHTML = `Data PKB/PLKB : <span style="color:#0056b3;">PROVINSI ${filterProvinsiAktif}</span>`;
        btnReset.style.display = 'block';
    } else {
        labelCakupan.innerText = "Data PKB/PLKB : NASIONAL";
        btnReset.style.display = 'none';
    }

    // 2. Tembak Angka KPI Langsung
    const kpi = dataServer.kpi;
    document.getElementById('kpi-total').innerText = formatAngka(kpi.total);
    document.getElementById('kpi-pns').innerText = formatAngka(kpi.pns);
    document.getElementById('kpi-pppk').innerText = formatAngka(kpi.pppk);
    document.getElementById('kpi-pria').innerText = formatAngka(kpi.pria);
    document.getElementById('kpi-wanita').innerText = formatAngka(kpi.wanita);
    document.getElementById('kpi-pensiun-bulan').innerText = formatAngka(kpi.pensiun_bln_ini);
    document.getElementById('kpi-pensiun-tahun').innerText = formatAngka(kpi.pensiun_thn_ini);

    // 3. Olah Data Tahun Lahir menjadi Umur & Generasi di Client
    let umurCount = { '< 30': 0, '30-39': 0, '40-49': 0, '50-59': 0, '60+': 0 };
    let generasiCount = { 'Gen Z': 0, 'Milenial': 0, 'Gen X': 0, 'Baby Boomer': 0 };
    
    if (dataServer.tahun_lahir) {
        Object.entries(dataServer.tahun_lahir).forEach(([thnStr, jml]) => {
            const thn = parseInt(thnStr);
            const usia = 2026 - thn;
            
            if (usia < 30) umurCount['< 30'] += jml;
            else if (usia <= 39) umurCount['30-39'] += jml;
            else if (usia <= 49) umurCount['40-49'] += jml;
            else if (usia <= 59) umurCount['50-59'] += jml;
            else umurCount['60+'] += jml;

            if (thn >= 1997) generasiCount['Gen Z'] += jml;
            else if (thn >= 1981) generasiCount['Milenial'] += jml;
            else if (thn >= 1965) generasiCount['Gen X'] += jml;
            else generasiCount['Baby Boomer'] += jml;
        });
    }

    // 4. Render Tabel Pensiun
    const tbodyPensiun = document.querySelector('#tabelPensiun tbody');
    tbodyPensiun.innerHTML = '';
    if (dataServer.tabel_pensiun) {
        dataServer.tabel_pensiun.forEach(p => {
            let tr = document.createElement('tr');
            tr.innerHTML = `<td>${p.nama_lengkap}</td><td>${p.provinsi}</td><td>${p.jabatan}</td><td style="font-weight:bold; color:#dc3545;">${formatTanggalIndo(p.tanggal_pensiun)}</td>`;
            tbodyPensiun.appendChild(tr);
        });
    }

    // 5. Gambar Ulang Grafik
    if(dataServer.sebaran_provinsi) gambarChartProvinsi(dataServer.sebaran_provinsi);
    if(dataServer.pendidikan) gambarChartPendidikan(dataServer.pendidikan);
    if(dataServer.golongan) gambarChartGolongan(dataServer.golongan);
    if(dataServer.jabatan) gambarChartJabatan(dataServer.jabatan);
    gambarChartUmur(umurCount);
    gambarChartGenerasi(generasiCount);
}

// ==========================================================================
// 3. RENDER GRAFIK
// ==========================================================================
function gambarChartProvinsi(provData) {
    const ctx = document.getElementById('chartProvinsi').getContext('2d'); if (chartProvInstance) chartProvInstance.destroy();
    const sortedProv = Object.entries(provData).sort((a, b) => b[1] - a[1]);
    const labels = sortedProv.map(i => i[0]); const values = sortedProv.map(i => i[1]);
    chartProvInstance = new Chart(ctx, {
        type: 'bar', data: { labels: labels, datasets: [{ label: 'Total', data: values, backgroundColor: '#007bff', borderRadius: 4 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, onClick: (e, active) => { if (active.length > 0) { filterProvinsiAktif = labels[active[0].index]; tarikDataDasbor(); } } }
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
    chartJabatanInstance = new Chart(ctx, { type: 'doughnut', data: { labels: sorted.map(i => i[0]), datasets: [{ data: sorted.map(i => i[1]), backgroundColor: ['#007bff', '#17a2b8', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#e83e8c'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 10 } } } } });
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

window.resetFilter = function() { filterProvinsiAktif = null; tarikDataDasbor(); };

// ==========================================================================
// 4. SISTEM OTENTIKASI SECURE (ANTI-SCRAPING)
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
        if (user === 'superadmin' && pass === 'admin') masukHalamanRole('superadmin', 'Super Admin Pusat');
        else memunculkanErrorLogin();
    } 
    else if (role === 'admin') {
        if (user === 'admin' && pass === 'admin') masukHalamanRole('admin', 'Admin Regional');
        else memunculkanErrorLogin();
    } 
    else if (role === 'pkb') {
        try {
            // LOGIN AMAN: Menggunakan RPC. Hacker tidak bisa lagi menyedot tabel utama!
            const { data, error } = await mySupabase.rpc('otentikasi_pegawai', { p_nip: user });
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
    if (role === 'admin') document.getElementById('view-admin').style.display = 'block';
    if (role === 'pkb') {
        document.getElementById('view-portal-pkb').style.display = 'grid';
        pindahTabPortal('profil');
    }
}

// ==========================================================================
// 5. NAVIGASI PORTAL & AKSESIBILITAS
// ==========================================================================
window.pindahTabPortal = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).style.display = 'block';
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
};
window.simpanPembaruanProfilDummy = function() { alert("Pembaharuan Profil Memerlukan Persetujuan Admin."); };
window.bukaFileFullscreen = function(filename) {
    document.getElementById('viewer-filename').innerText = filename;
    document.getElementById('viewer-body-content').innerText = `[ Sedang Membaca Berkas Fullscreen: ${filename} ]`;
    document.getElementById('viewer-overlay').style.display = 'flex';
};
window.tutupFileFullscreen = function() { document.getElementById('viewer-overlay').style.display = 'none'; };
window.ubahTemaAplikasi = function(theme) { document.documentElement.setAttribute('data-theme', theme); };
window.ubahSkalaZoom = function(aksi) {
    if (aksi === '+') currentZoomLevel += 10;
    else if (aksi === '-') currentZoomLevel -= 10;
    else currentZoomLevel = 100;
    if (currentZoomLevel < 80) currentZoomLevel = 80;
    if (currentZoomLevel > 130) currentZoomLevel = 130;
    document.documentElement.style.setProperty('--base-font-size', `${currentZoomLevel}%`);
};

// MULAI APLIKASI
window.addEventListener('DOMContentLoaded', tarikDataDasbor);
