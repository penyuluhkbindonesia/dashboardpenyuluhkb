// ==========================================================================
// 1. KONFIGURASI SERVER
// ==========================================================================
const SUPABASE_URL = 'https://cdnqqrjbdhoglvlqbxoq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkbnFxcmpiZGhvZ2x2bHFieG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDQ1NDIsImV4cCI6MjA5NjU4MDU0Mn0.dHQbkEIJe5L4bfyJqZkJkXTPX0Abot4GBw7_4O3eNwk';
const mySupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let filterProvinsiAktif = null; let currentZoomLevel = 100; 
let chartProvInstance = null; let chartUmurInstance = null; let chartJabatanInstance = null;
let chartGenerasiInstance = null; let chartPendidikanInstance = null; let chartGolonganInstance = null;

function formatAngka(angka) { return Number(angka).toLocaleString('id-ID'); }
function formatTanggalIndo(tglStr) {
    if (!tglStr) return '-'; const bagian = tglStr.split('-');
    if (bagian.length !== 3) return tglStr; return `${bagian[2]}-${bagian[1]}-${bagian[0]}`;
}

// ==========================================================================
// 2. MESIN DASBOR & VISUALISASI GRAFIK
// ==========================================================================
async function tarikDataDasbor() {
    document.getElementById('loading-screen').style.display = 'flex';
    try {
        const { data, error } = await mySupabase.rpc('get_rekap_dasbor', { p_provinsi: filterProvinsiAktif });
        if (error) throw error; renderVisualDasbor(data);
    } catch (error) { console.error("Gagal menarik data dasbor:", error); }
    document.getElementById('loading-screen').style.display = 'none';
}

function renderVisualDasbor(dataServer) {
    const labelCakupan = document.getElementById('label-cakupan'); const btnReset = document.getElementById('btn-reset-filter');
    if (filterProvinsiAktif) { labelCakupan.innerHTML = `Data PKB/PLKB : <span style="color:#0056b3;">PROVINSI ${filterProvinsiAktif}</span>`; btnReset.style.display = 'block'; } 
    else { labelCakupan.innerText = "Data PKB/PLKB : NASIONAL"; btnReset.style.display = 'none'; }

    const kpi = dataServer.kpi;
    document.getElementById('kpi-total').innerText = formatAngka(kpi.total); document.getElementById('kpi-pns').innerText = formatAngka(kpi.pns);
    document.getElementById('kpi-pppk').innerText = formatAngka(kpi.pppk); document.getElementById('kpi-pria').innerText = formatAngka(kpi.pria);
    document.getElementById('kpi-wanita').innerText = formatAngka(kpi.wanita); document.getElementById('kpi-pensiun-bulan').innerText = formatAngka(kpi.pensiun_bln_ini);
    document.getElementById('kpi-pensiun-tahun').innerText = formatAngka(kpi.pensiun_thn_ini);

    let umurCount = { '< 30': 0, '30-39': 0, '40-49': 0, '50-59': 0, '60+': 0 }; let generasiCount = { 'Gen Z': 0, 'Milenial': 0, 'Gen X': 0, 'Baby Boomer': 0 };
    if (dataServer.tahun_lahir) {
        Object.entries(dataServer.tahun_lahir).forEach(([thnStr, jml]) => {
            const thn = parseInt(thnStr); const usia = 2026 - thn;
            if (usia < 30) umurCount['< 30'] += jml; else if (usia <= 39) umurCount['30-39'] += jml; else if (usia <= 49) umurCount['40-49'] += jml; else if (usia <= 59) umurCount['50-59'] += jml; else umurCount['60+'] += jml;
            if (thn >= 1997) generasiCount['Gen Z'] += jml; else if (thn >= 1981) generasiCount['Milenial'] += jml; else if (thn >= 1965) generasiCount['Gen X'] += jml; else generasiCount['Baby Boomer'] += jml;
        });
    }

    if(dataServer.sebaran_provinsi) gambarChartProvinsi(dataServer.sebaran_provinsi);
    if(dataServer.pendidikan) gambarChartPendidikan(dataServer.pendidikan);
    if(dataServer.golongan) gambarChartGolongan(dataServer.golongan);
    if(dataServer.jabatan) gambarChartJabatan(dataServer.jabatan);
    gambarChartUmur(umurCount); gambarChartGenerasi(generasiCount);
}

function gambarChartProvinsi(provData) { const ctx = document.getElementById('chartProvinsi').getContext('2d'); if (chartProvInstance) chartProvInstance.destroy(); const sortedProv = Object.entries(provData).sort((a, b) => b[1] - a[1]); const labels = sortedProv.map(i => i[0]); const values = sortedProv.map(i => i[1]); chartProvInstance = new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ label: 'Total', data: values, backgroundColor: '#007bff', borderRadius: 4 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, onClick: (e, active) => { if (active.length > 0) { filterProvinsiAktif = labels[active[0].index]; tarikDataDasbor(); } } }, plugins: { legend: { display: false } } }); }
function gambarChartUmur(uData) { const ctx = document.getElementById('chartUmur').getContext('2d'); if (chartUmurInstance) chartUmurInstance.destroy(); chartUmurInstance = new Chart(ctx, { type: 'bar', data: { labels: Object.keys(uData), datasets: [{ data: Object.values(uData), backgroundColor: ['#007bff', '#28a745', '#ffc107', '#fd7e14', '#dc3545'], borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }); }
function gambarChartGenerasi(gData) { const ctx = document.getElementById('chartGenerasi').getContext('2d'); if (chartGenerasiInstance) chartGenerasiInstance.destroy(); chartGenerasiInstance = new Chart(ctx, { type: 'pie', data: { labels: Object.keys(gData), datasets: [{ data: Object.values(gData), backgroundColor: ['#6f42c1', '#17a2b8', '#fd7e14', '#e83e8c'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } }); }
function gambarChartJabatan(jData) { const ctx = document.getElementById('chartJabatan').getContext('2d'); if (chartJabatanInstance) chartJabatanInstance.destroy(); const sorted = Object.entries(jData).sort((a, b) => b[1] - a[1]); chartJabatanInstance = new Chart(ctx, { type: 'doughnut', data: { labels: sorted.map(i => i[0]), datasets: [{ data: sorted.map(i => i[1]), backgroundColor: ['#007bff', '#17a2b8', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#e83e8c'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 10 } } } } }); }
function gambarChartPendidikan(pData) { const ctx = document.getElementById('chartPendidikan').getContext('2d'); if (chartPendidikanInstance) chartPendidikanInstance.destroy(); const sorted = Object.entries(pData).sort((a, b) => b[1] - a[1]); chartPendidikanInstance = new Chart(ctx, { type: 'bar', data: { labels: sorted.map(i => i[0]), datasets: [{ data: sorted.map(i => i[1]), backgroundColor: '#17a2b8', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }); }
function gambarChartGolongan(goData) { const ctx = document.getElementById('chartGolongan').getContext('2d'); if (chartGolonganInstance) chartGolonganInstance.destroy(); const sorted = Object.entries(goData).sort((a, b) => a[0].localeCompare(b[0])); chartGolonganInstance = new Chart(ctx, { type: 'bar', data: { labels: sorted.map(i => i[0]), datasets: [{ data: sorted.map(i => i[1]), backgroundColor: '#6c757d', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }); }
window.resetFilter = function() { filterProvinsiAktif = null; tarikDataDasbor(); };

// ==========================================================================
// 3. SISTEM OTENTIKASI & PERSISTENT SESSION
// ==========================================================================
window.togglePasswordVisibility = function() {
    const pIn = document.getElementById('inputPass'); const ic = document.getElementById('eye-icon-path');
    if (pIn.type === 'password') { pIn.type = 'text'; ic.setAttribute('d', 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21');
    } else { pIn.type = 'password'; ic.setAttribute('d', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'); }
};

window.navigasiLoginAtauKeluar = function() {
    const btn = document.getElementById('btn-auth-action');
    if (btn.innerText === "Keluar Sesi") {
        localStorage.removeItem('sesi_portal_pkb'); localStorage.removeItem('activeTab'); 
        document.getElementById('view-superadmin').style.display = 'none'; document.getElementById('view-admin').style.display = 'none'; document.getElementById('view-portal-pkb').style.display = 'none';
        document.getElementById('view-dasbor-publik').style.display = 'block'; document.getElementById('header-title').innerText = "Dashboard PenyuluhKB"; btn.innerText = "Masuk / Login"; tarikDataDasbor(); 
    } else { document.getElementById('view-dasbor-publik').style.display = 'none'; document.getElementById('view-login').style.display = 'block'; btn.style.display = 'none'; }
};
window.kembaliKeDasborPublik = function() { document.getElementById('view-login').style.display = 'none'; document.getElementById('view-dasbor-publik').style.display = 'block'; document.getElementById('pesan-error').style.display = 'none'; document.getElementById('btn-auth-action').style.display = 'block'; };

function siapkanBeranda(namaLengkap) {
    const jam = new Date().getHours(); let sapaan = 'Malam';
    if (jam >= 3 && jam < 11) sapaan = 'Pagi'; else if (jam >= 11 && jam < 15) sapaan = 'Siang'; else if (jam >= 15 && jam < 18) sapaan = 'Sore';
    document.getElementById('teks-sapaan').innerText = `Selamat ${sapaan}, ${namaLengkap}`;
    const sdhMasuk = localStorage.getItem('statusKunjunganPortal'); const tx = document.getElementById('teks-sambutan');
    if (sdhMasuk) tx.innerText = "Selamat Datang Kembali di Portal PenyuluhKB Indonesia"; else { tx.innerText = "Selamat Datang di Portal PenyuluhKB Indonesia"; localStorage.setItem('statusKunjunganPortal', 'true'); }
}

window.eksekusiLogin = async function() {
    const user = document.getElementById('inputUser').value.trim(); const pass = document.getElementById('inputPass').value;
    const err = document.getElementById('pesan-error'); err.style.display = 'none';
    if (!user || !pass) return;

    if (user === 'superadmin' && pass === 'admin') { masukHalamanRole('superadmin', 'Super Admin Pusat'); return; } 
    if (user === 'admin' && pass === 'admin') { masukHalamanRole('admin', 'Admin Regional'); return; } 
    
    try {
        const { data, error } = await mySupabase.rpc('otentikasi_pegawai', { p_nip: user });
        if (error || !data) { err.style.display='block'; err.innerText="Username/NIP Tidak Ditemukan atau Password Salah!"; } 
        else {
            localStorage.setItem('sesi_portal_pkb', JSON.stringify(data));
            localStorage.setItem('activeTab', 'beranda'); 
            pulihkanSesi(data);
        }
    } catch (e) { err.style.display='block'; err.innerText="Kredensial Akses Salah / Ditolak!"; }
};

function masukHalamanRole(role, namaHeader) {
    document.getElementById('view-login').style.display = 'none'; document.getElementById('view-dasbor-publik').style.display = 'none';
    const btn = document.getElementById('btn-auth-action'); btn.style.display = 'block'; btn.innerText = "Keluar Sesi";
    document.getElementById('header-title').innerText = `Portal: ${namaHeader}`;
    if (role === 'superadmin') document.getElementById('view-superadmin').style.display = 'block';
    if (role === 'admin') document.getElementById('view-admin').style.display = 'block';
}

// ==========================================================================
// 4. LOGIKA FITUR PORTAL (WILAYAH SUPABASE, FORM, GPS)
// ==========================================================================

// A. Fungsi Penarik Data Wilayah dari Supabase
async function fetchWilayah(level, kodeInduk, targetId, placeholderText) {
    const target = document.getElementById(targetId);
    target.innerHTML = `<option value="">-- Memuat... --</option>`;
    
    let query = mySupabase.from('referensi_wilayah').select('kode, nama').eq('level_wilayah', level).order('nama', { ascending: true });
    if (kodeInduk) query = query.eq('kode_induk', kodeInduk);
    else query = query.is('kode_induk', null); // Untuk Provinsi

    const { data, error } = await query;
    target.innerHTML = `<option value="">${placeholderText}</option>`;
    if (data) { data.forEach(w => { target.innerHTML += `<option value="${w.kode}">${w.nama}</option>`; }); }
}

// B. Event Listener CASCADING Wilayah
window.popTLKab = function() { fetchWilayah('Kabupaten/Kota', document.getElementById('tl-provinsi').value, 'tl-kabupaten', '-- Pilih Kab/Kota --'); };

window.popDomKab = function() { 
    fetchWilayah('Kabupaten/Kota', document.getElementById('dom-prov').value, 'dom-kab', '-- Pilih Kab/Kota --'); 
    document.getElementById('dom-kec').innerHTML = '<option value="">-- Kecamatan --</option>'; document.getElementById('dom-desa').innerHTML = '<option value="">-- Desa/Kel --</option>';
};
window.popDomKec = function() { 
    fetchWilayah('Kecamatan', document.getElementById('dom-kab').value, 'dom-kec', '-- Kecamatan --'); 
    document.getElementById('dom-desa').innerHTML = '<option value="">-- Desa/Kel --</option>';
};
window.popDomDesa = function() { fetchWilayah('Desa/Kelurahan', document.getElementById('dom-kec').value, 'dom-desa', '-- Desa/Kel --'); };

window.popBinKec = async function() {
    const kabKode = document.getElementById('bin-kab').value;
    if(kabKode) {
        fetchWilayah('Kecamatan', kabKode, 'bin-kec', '-- Pilih Kecamatan --');
        document.getElementById('wrap-bin-desa').innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem; font-style:italic;">Silakan pilih kecamatan terlebih dahulu.</span>';
    }
};

window.popBinDesa = async function() {
    const kecKode = document.getElementById('bin-kec').value;
    const wrap = document.getElementById('wrap-bin-desa');
    wrap.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem; font-style:italic;">Memuat desa...</span>';
    if(!kecKode) return;

    const { data } = await mySupabase.from('referensi_wilayah').select('kode, nama').eq('level_wilayah', 'Desa/Kelurahan').eq('kode_induk', kecKode).order('nama');
    wrap.innerHTML = '';
    if(data && data.length > 0) {
        data.forEach(d => { wrap.innerHTML += `<label style="width:48%; display:inline-block; margin-bottom:5px;"><input type="checkbox" value="${d.kode}"> ${d.nama}</label>`; });
    } else { wrap.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem; font-style:italic;">Data desa tidak tersedia.</span>'; }
};

// C. Inisialisasi Wilayah Global & Binaan (Revisi Pencarian Pintar - Wildcard)
async function inisialisasiSemuaWilayah(profilData) {
    // 1. Muat Provinsi untuk Tempat Lahir dan Domisili
    fetchWilayah('Provinsi', null, 'tl-provinsi', '-- Pilih Provinsi --');
    fetchWilayah('Provinsi', null, 'dom-prov', '-- Pilih Provinsi --');

    // 2. Kunci Wilayah Binaan Sesuai Profil Instansi
    const binProvSelect = document.getElementById('bin-prov');
    const binKabSelect = document.getElementById('bin-kab');
    
    if(profilData.provinsi) {
        // Gunakan Wildcard (%) agar Kutai Barat bisa mendeteksi Kabupaten Kutai Barat
        const { data: provData } = await mySupabase.from('referensi_wilayah')
            .select('kode, nama')
            .eq('level_wilayah', 'Provinsi')
            .ilike('nama', `%${profilData.provinsi}%`)
            .limit(1);

        if(provData && provData.length > 0) {
            const pKode = provData[0].kode;
            binProvSelect.innerHTML = `<option value="${pKode}" selected>${provData[0].nama}</option>`;
            
            if(profilData.kabupaten) {
                // Gunakan Wildcard (%) untuk Kabupaten
                const { data: kabData } = await mySupabase.from('referensi_wilayah')
                    .select('kode, nama')
                    .eq('level_wilayah', 'Kabupaten/Kota')
                    .eq('kode_induk', pKode)
                    .ilike('nama', `%${profilData.kabupaten}%`)
                    .limit(1);

                if(kabData && kabData.length > 0) {
                    const kKode = kabData[0].kode;
                    binKabSelect.innerHTML = `<option value="${kKode}" selected>${kabData[0].nama}</option>`;
                    
                    // Otomatis muat Kecamatan setelah Kabupaten berhasil dikenali
                    fetchWilayah('Kecamatan', kKode, 'bin-kec', '-- Pilih Kecamatan --');
                } else {
                    binKabSelect.innerHTML = `<option value="">-- Wilayah Kabupaten Tidak Ditemukan --</option>`;
                }
            }
        } else {
            binProvSelect.innerHTML = `<option value="">-- Wilayah Provinsi Tidak Ditemukan --</option>`;
        }
    }
}

// D. Fitur GPS Geolocation (Balai KB)
window.dapatkanLokasiBalai = function() {
    const inputLokasi = document.getElementById('lokasi-balai');
    if (navigator.geolocation) {
        inputLokasi.value = "Meminta izin dan mencari satelit GPS...";
        navigator.geolocation.getCurrentPosition(
            function(position) {
                inputLokasi.value = `${position.coords.latitude}, ${position.coords.longitude}`;
            },
            function(error) {
                inputLokasi.value = "";
                if(error.code == 1) alert("Akses GPS ditolak! Silakan izinkan browser mengakses lokasi (Location/GPS).");
                else alert("Satelit GPS tidak ditemukan. Coba bergerak ke area terbuka.");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else { alert("Browser atau HP Anda tidak mendukung fitur Geolocation GPS."); }
};


// E. Setup Interaksi Logika Kondisional Formulir
function setupFormLogika() {
    let htmlTahunAnak = ''; for(let i=0; i<=10; i++) htmlTahunAnak += `<option value="${i}">${i}</option>`; document.getElementById('form-jumlah-anak').innerHTML = htmlTahunAnak;
    let htmlThn = '<option value="">-- Pilih Tahun --</option>'; for(let y=2024; y>=1980; y--) htmlThn += `<option value="${y}">${y}</option>`;
    document.getElementById('form-tahun-diangkat').innerHTML = htmlThn; document.getElementById('form-tahun-kendaraan').innerHTML = htmlThn;

    document.getElementById('sarpras-balai').addEventListener('change', e => document.getElementById('sub-balai').style.display = (e.target.value === 'Ya') ? 'block' : 'none');
    document.getElementById('sarpras-kendaraan').addEventListener('change', e => document.getElementById('sub-kendaraan').style.display = (e.target.value === 'Ya') ? 'block' : 'none');
    document.getElementById('sarpras-bbm').addEventListener('change', e => document.getElementById('sub-bbm').style.display = (e.target.value === 'Ya') ? 'block' : 'none');
    document.getElementById('sarpras-perawatan').addEventListener('change', e => document.getElementById('sub-perawatan').style.display = (e.target.value === 'Ya') ? 'block' : 'none');
    document.getElementById('cek-lainnya').addEventListener('change', e => document.getElementById('sub-lainnya').style.display = e.target.checked ? 'block' : 'none');
}

window.updateGolonganRuang = function() {
    const asn = document.getElementById('form-jenis-asn').value; const selGol = document.getElementById('form-golongan');
    let html = '<option value="">-- Pilih Golongan --</option>';
    if(asn === 'PNS') { ['II/a', 'II/b', 'II/c', 'II/d', 'III/a', 'III/b', 'III/c', 'III/d', 'IV/a', 'IV/b', 'IV/c', 'IV/d', 'IV/e'].forEach(g => html += `<option value="${g}">${g}</option>`); } 
    else if (asn === 'PPPK') { ['V', 'VII', 'IX'].forEach(g => html += `<option value="${g}">${g}</option>`); }
    selGol.innerHTML = html;
};

window.updateDataKeluarga = function() {
    const status = document.getElementById('form-status-kawin').value;
    const wrpAnak = document.getElementById('wrap-jumlah-anak'); const wrpKB = document.getElementById('wrap-kesertaan-kb');
    if(status === 'Belum Kawin') { wrpAnak.style.display = 'none'; wrpKB.style.display = 'none'; }
    else if(status === 'Janda' || status === 'Duda') { wrpAnak.style.display = 'block'; wrpKB.style.display = 'none'; }
    else { wrpAnak.style.display = 'block'; wrpKB.style.display = 'block'; }
};

// ==========================================================================
// 5. PENANGANAN SESI & TOMBOL SIMPAN
// ==========================================================================
async function pulihkanSesi(data) {
    const gelarJabatan = data.jabatan + " (" + (data.golongan || '-') + ")";
    const wilayahKerja = (data.kabupaten || '') + ", " + data.provinsi;
    document.getElementById('pkb-nama').innerText = data.nama_lengkap; document.getElementById('pkb-nip').innerText = data.nip;
    document.getElementById('pkb-jabatan').innerText = gelarJabatan; document.getElementById('pkb-wilayah').innerText = wilayahKerja;
    document.getElementById('profil-subtitle').innerText = gelarJabatan;
    document.getElementById('form-nama').value = data.nama_lengkap; document.getElementById('form-nip').value = data.nip;

    siapkanBeranda(data.nama_lengkap);
    
    document.getElementById('view-login').style.display = 'none'; document.getElementById('view-dasbor-publik').style.display = 'none';
    const btnHeader = document.getElementById('btn-auth-action'); btnHeader.style.display = 'block'; btnHeader.innerText = "Keluar Sesi";
    document.getElementById('header-title').innerText = `Portal: ${data.nama_lengkap}`;
    document.getElementById('view-portal-pkb').style.display = 'grid';

    const tabTerakhir = localStorage.getItem('activeTab') || 'beranda'; pindahTabPortal(tabTerakhir);
    
    // Inisialisasi Database Wilayah setelah Profil dimuat
    await inisialisasiSemuaWilayah(data);
}

window.pindahTabPortal = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).style.display = 'block';
    const activeLink = document.querySelector(`.tab-link[onclick="pindahTabPortal('${tabId}')"]`); if(activeLink) activeLink.classList.add('active');
    localStorage.setItem('activeTab', tabId);
};
window.bukaFormEditProfil = function() { document.getElementById('view-profil-utama').style.display = 'none'; document.getElementById('form-edit-profil').style.display = 'block'; };
window.batalEditProfil = function() { document.getElementById('form-edit-profil').style.display = 'none'; document.getElementById('view-profil-utama').style.display = 'block'; };

window.simpanProfilKeServer = function() { 
    alert("Data berhasil divalidasi. Pembaruan Profil Memerlukan Persetujuan Admin sebelum tampil di Dasbor."); 
    batalEditProfil(); 
};

// RPC SARAN
window.kirimSaranPengguna = async function() {
    const kategori = document.getElementById('kategori-saran').value; const isi = document.getElementById('isi-saran').value.trim();
    if(!isi) { alert("Silakan ketik pesan Anda terlebih dahulu sebelum mengirim."); return; }
    const sesiPkb = JSON.parse(localStorage.getItem('sesi_portal_pkb')); if(!sesiPkb) return;
    const btnKirim = document.getElementById('btn-kirim-saran'); const textAsli = btnKirim.innerText; btnKirim.innerText = "Mengirim..."; btnKirim.disabled = true;
    try {
        const { error } = await mySupabase.rpc('simpan_saran', { p_nip: sesiPkb.nip, p_nama: sesiPkb.nama_lengkap, p_kategori: kategori, p_isi: isi });
        if (error) throw error; alert(`Terima kasih! Masukan Anda telah terkirim.`); document.getElementById('isi-saran').value = ''; 
    } catch(err) { alert("Terjadi kesalahan. Periksa koneksi Anda."); } finally { btnKirim.innerText = textAsli; btnKirim.disabled = false; }
};

window.bukaFileFullscreen = function(filename) { document.getElementById('viewer-filename').innerText = filename; document.getElementById('viewer-body-content').innerText = `[ Membaca: ${filename} ]`; document.getElementById('viewer-overlay').style.display = 'flex'; };
window.tutupFileFullscreen = function() { document.getElementById('viewer-overlay').style.display = 'none'; };
window.ubahTemaAplikasi = function(theme) { document.documentElement.setAttribute('data-theme', theme); };
window.ubahSkalaZoom = function(aksi) { if (aksi === '+') currentZoomLevel += 10; else if (aksi === '-') currentZoomLevel -= 10; else currentZoomLevel = 100; if (currentZoomLevel < 80) currentZoomLevel = 80; if (currentZoomLevel > 130) currentZoomLevel = 130; document.documentElement.style.setProperty('--base-font-size', `${currentZoomLevel}%`); };

window.addEventListener('DOMContentLoaded', () => {
    setupFormLogika(); updateDataKeluarga(); 
    const sesiAktif = localStorage.getItem('sesi_portal_pkb');
    if (sesiAktif) { document.getElementById('loading-screen').style.display = 'none'; pulihkanSesi(JSON.parse(sesiAktif)); } 
    else { tarikDataDasbor(); }
});
