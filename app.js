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
    document.getElementById('kpi-sudah-update').innerText = formatAngka(kpi.sudah_update);
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

    const tbodyPensiun = document.querySelector('#tabelPensiun tbody');
    if (tbodyPensiun) {
        tbodyPensiun.innerHTML = '';
        if (dataServer.tabel_pensiun && dataServer.tabel_pensiun.length > 0) {
            dataServer.tabel_pensiun.forEach(p => {
                let tr = document.createElement('tr');
                tr.innerHTML = `<td>${p.nama_lengkap}</td><td>${p.provinsi}</td><td>${p.jabatan}</td><td style="font-weight:bold; color:#dc3545;">${formatTanggalIndo(p.tanggal_pensiun)}</td>`;
                tbodyPensiun.appendChild(tr);
            });
        } else { tbodyPensiun.innerHTML = `<tr><td colspan="4" style="text-align:center;">Tidak ada data pensiun tahun 2026</td></tr>`; }
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
function gambarChartJabatan(jData) { const ctx = document.getElementById('chartJabatan').getContext('2d'); if (chartJabatanInstance) chartJabatanInstance.destroy(); const sorted = Object.entries(jData).sort((a, b) => b[1] - a[1]); chartJabatanInstance = new Chart(ctx, { type: 'doughnut', data: { labels: sorted.map(i => i[0]), datasets: [{ data: sorted.map(i => i[1]), backgroundColor: ['#007bff', '#17a2b8', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997', '#6c757d'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 10 } } } } }); }
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

async function pulihkanSesi(data) {
    const gelarJabatan = data.jabatan + " (" + (data.golongan || '-') + ")";
    const wilayahKerja = (data.kabupaten || '') + ", " + data.provinsi;
    document.getElementById('pkb-nama').innerText = data.nama_lengkap; document.getElementById('pkb-nip').innerText = data.nip;
    document.getElementById('pkb-jabatan').innerText = gelarJabatan; document.getElementById('pkb-wilayah').innerText = wilayahKerja;
    document.getElementById('profil-subtitle').innerText = gelarJabatan;

    // Isikan data awal ke dalam Form Input
    document.getElementById('form-nama').value = data.nama_lengkap;
    document.getElementById('form-nip').value = data.nip;

    siapkanBeranda(data.nama_lengkap);
    document.getElementById('view-login').style.display = 'none'; document.getElementById('view-dasbor-publik').style.display = 'none';
    const btnHeader = document.getElementById('btn-auth-action'); btnHeader.style.display = 'block'; btnHeader.innerText = "Keluar Sesi";
    document.getElementById('header-title').innerText = `Portal: ${data.nama_lengkap}`;
    document.getElementById('view-portal-pkb').style.display = 'grid';

    const tabTerakhir = localStorage.getItem('activeTab') || 'beranda'; pindahTabPortal(tabTerakhir);
    await inisialisasiSemuaWilayah(data);
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

// ==========================================================================
// 4. LOGIKA INTEGRASI DATABASE REFERENSI WILAYAH (SUPABASE)
// ==========================================================================
async function fetchWilayah(level, kodeInduk, targetId, placeholderText) {
    const target = document.getElementById(targetId); target.innerHTML = `<option value="">-- Memuat... --</option>`;
    let query = mySupabase.from('referensi_wilayah').select('kode, nama').eq('level_wilayah', level).order('nama', { ascending: true });
    if (kodeInduk) query = query.eq('kode_induk', kodeInduk); else query = query.is('kode_induk', null);
    const { data } = await query; target.innerHTML = `<option value="">${placeholderText}</option>`;
    if (data) { data.forEach(w => { target.innerHTML += `<option value="${w.kode}">${w.nama}</option>`; }); }
}

window.popTLKab = function() { fetchWilayah('Kabupaten/Kota', document.getElementById('tl-provinsi').value, 'tl-kabupaten', '-- Pilih Kab/Kota --'); };
window.popDomKab = function() { fetchWilayah('Kabupaten/Kota', document.getElementById('dom-prov').value, 'dom-kab', '-- Pilih Kab/Kota --'); document.getElementById('dom-kec').innerHTML = '<option value="">-- Kecamatan --</option>'; document.getElementById('dom-desa').innerHTML = '<option value="">-- Desa/Kel --</option>';};
window.popDomKec = function() { fetchWilayah('Kecamatan', document.getElementById('dom-kab').value, 'dom-kec', '-- Kecamatan --'); document.getElementById('dom-desa').innerHTML = '<option value="">-- Desa/Kel --</option>';};
window.popDomDesa = function() { fetchWilayah('Desa/Kelurahan', document.getElementById('dom-kec').value, 'dom-desa', '-- Desa/Kel --'); };
window.popBinDesa = async function() {
    const kecKode = document.getElementById('bin-kec').value; const wrap = document.getElementById('wrap-bin-desa');
    wrap.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem; font-style:italic;">Memuat desa...</span>'; if(!kecKode) return;
    const { data } = await mySupabase.from('referensi_wilayah').select('kode, nama').eq('level_wilayah', 'Desa/Kelurahan').eq('kode_induk', kecKode).order('nama'); wrap.innerHTML = '';
    if(data && data.length > 0) { data.forEach(d => { wrap.innerHTML += `<label style="width:48%; display:inline-block; margin-bottom:5px;"><input type="checkbox" class="chk-binaan-desa" value="${d.nama}"> ${d.nama}</label>`; }); } 
    else { wrap.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem; font-style:italic;">Data desa tidak tersedia.</span>'; }
};

async function inisialisasiSemuaWilayah(profilData) {
    fetchWilayah('Provinsi', null, 'tl-provinsi', '-- Pilih Provinsi --'); fetchWilayah('Provinsi', null, 'dom-prov', '-- Pilih Provinsi --');
    const binProvSelect = document.getElementById('bin-prov'); const binKabSelect = document.getElementById('bin-kab');
    if(profilData.provinsi) {
        const { data: provData } = await mySupabase.from('referensi_wilayah').select('kode, nama').eq('level_wilayah', 'Provinsi').ilike('nama', `%${profilData.provinsi}%`).limit(1);
        if(provData && provData.length > 0) {
            const pKode = provData[0].kode; binProvSelect.innerHTML = `<option value="${pKode}" selected>${provData[0].nama}</option>`;
            if(profilData.kabupaten) {
                const { data: kabData } = await mySupabase.from('referensi_wilayah').select('kode, nama').eq('level_wilayah', 'Kabupaten/Kota').eq('kode_induk', pKode).ilike('nama', `%${profilData.kabupaten}%`).limit(1);
                if(kabData && kabData.length > 0) {
                    const kKode = kabData[0].kode; binKabSelect.innerHTML = `<option value="${kKode}" selected>${kabData[0].nama}</option>`;
                    fetchWilayah('Kecamatan', kKode, 'bin-kec', '-- Pilih Kecamatan --');
                } else { binKabSelect.innerHTML = `<option value="">-- Wilayah Kabupaten Tidak Ditemukan --</option>`; }
            }
        } else { binProvSelect.innerHTML = `<option value="">-- Wilayah Provinsi Tidak Ditemukan --</option>`; }
    }
}

window.dapatkanLokasiBalai = function() {
    const inputLokasi = document.getElementById('lokasi-balai');
    if (navigator.geolocation) {
        inputLokasi.value = "Mencari Koordinat Sinyal Satelit GPS...";
        navigator.geolocation.getCurrentPosition(
            function(position) { inputLokasi.value = `${position.coords.latitude}, ${position.coords.longitude}`; },
            function(error) { alert("Gagal mengambil GPS. Pastikan izin lokasi browser aktif."); inputLokasi.value = ""; },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }
};

// ==========================================================================
// 5. NAVIGASI PORTAL & INTERAKSI FORM CONDITIONAL (4 BLOK)
// ==========================================================================
window.pindahTabPortal = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).style.display = 'block';
    const activeLink = document.querySelector(`.tab-link[onclick="pindahTabPortal('${tabId}')"]`); if(activeLink) activeLink.classList.add('active');
    localStorage.setItem('activeTab', tabId);
};

window.bukaFormEditProfil = function() { document.getElementById('view-profil-utama').style.display = 'none'; document.getElementById('form-edit-profil').style.display = 'block'; };
window.batalEditProfil = function() { document.getElementById('form-edit-profil').style.display = 'none'; document.getElementById('view-profil-utama').style.display = 'block'; };

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

// Helper untuk mengekstrak teks teks dari kumpulan elemen yang di-centang (Checkbox)
function getCheckedValues(className) {
    let checked = [];
    document.querySelectorAll('.' + className + ':checked').forEach(el => checked.push(el.value));
    return checked.join(', ');
}

// ==========================================================================
// 6. ENGINE UTAMA: ENGINE EDIT PROFIL SECARA LANGSUNG KILAT (DIRECT UPDATE)
// ==========================================================================
window.simpanProfilKeServer = async function() {
    const nip = document.getElementById('form-nip').value;
    if(!nip) return;

    // Konfirmasi Visual awal
    if(!confirm("Apakah Anda yakin ingin menyimpan perubahan data profil ini secara langsung ke server?")) return;

    // Ambil data teks terpilih dari desa binaan (bisa multi pilihan)
    let listDesaBinaan = [];
    document.querySelectorAll('.chk-binaan-desa:checked').forEach(el => listDesaBinaan.push(el.value));
    let stringDesaBinaan = listDesaBinaan.join(', ');

    // Ambil dropdown text provinsi/kabupaten lahir & domisili
    let eTLProv = document.getElementById('tl-provinsi'); let tlProvText = eTLProv.options[eTLProv.selectedIndex]?.text || '';
    let eTLKab = document.getElementById('tl-kabupaten'); let tlKabText = eTLKab.options[eTLKab.selectedIndex]?.text || '';
    let eDomProv = document.getElementById('dom-prov'); let domProvText = eDomProv.options[eDomProv.selectedIndex]?.text || '';
    let eDomKab = document.getElementById('dom-kab'); let domKabText = eDomKab.options[eDomKab.selectedIndex]?.text || '';
    let eDomKec = document.getElementById('dom-kec'); let domKecText = eDomKec.options[eDomKec.selectedIndex]?.text || '';
    let eDomDesa = document.getElementById('dom-desa'); let domDesaText = eDomDesa.options[eDomDesa.selectedIndex]?.text || '';
    let eBinKec = document.getElementById('bin-kec'); let binKecText = eBinKec.options[eBinKec.selectedIndex]?.text || '';

    // Siapkan bungkusan raksasa parameter untuk ditembakkan ke RPC Supabase
    const payload = {
        p_nip: nip,
        p_nama: document.getElementById('form-nama').value.trim(),
        p_gelar_dp: document.getElementById('form-gelar-depan').value.trim(),
        p_gelar_bk: document.getElementById('form-gelar-belakang').value.trim(),
        p_tl_prov: tlProvText.replace('-- Pilih Provinsi --', ''),
        p_tl_kab: tlKabText.replace('-- Pilih Kab/Kota --', ''),
        p_tgl_lahir: document.getElementById('form-tanggal-lahir').value,
        p_jk: document.getElementById('form-jenis-kelamin').value,
        p_asn: document.getElementById('form-jenis-asn').value,
        p_thn_angkat: document.getElementById('form-tahun-diangkat').value,
        p_jabatan: document.getElementById('form-jabatan').value,
        p_golongan: document.getElementById('form-golongan').value,
        p_pendidikan: document.getElementById('form-pendidikan').value,
        p_jurusan: document.getElementById('form-jurusan').value.trim(),
        p_status_kawin: document.getElementById('form-status-kawin').value,
        p_jml_anak: document.getElementById('form-jumlah-anak').value,
        p_kb: document.getElementById('form-kesertaan-kb').value,
        p_tinggal_kel: document.getElementById('form-tinggal-keluarga').value,
        p_dom_prov: domProvText.replace('-- Provinsi --', ''),
        p_dom_kab: domKabText.replace('-- Kab/Kota --', ''),
        p_dom_kec: domKecText.replace('-- Kecamatan --', ''),
        p_dom_desa: domDesaText.replace('-- Desa/Kel --', ''),
        p_bin_kec: binKecText.replace('-- Pilih Kecamatan --', ''),
        p_bin_desa: stringDesaBinaan,
        p_miliki_balai: document.getElementById('sarpras-balai').value,
        p_nama_balai: document.getElementById('form-nama-balai').value.trim(),
        p_gps_balai: document.getElementById('lokasi-balai').value,
        p_kendaraan: document.getElementById('sarpras-kendaraan').value,
        p_thn_kendaraan: document.getElementById('form-tahun-kendaraan').value,
        p_transmisi: document.getElementById('form-transmisi-kendaraan').value,
        p_kondisi: document.getElementById('form-kondisi-kendaraan').value,
        p_bbm: document.getElementById('sarpras-bbm').value,
        p_dana_bbm: getCheckedValues('chk-bbm'),
        p_rawat: document.getElementById('sarpras-perawatan').value,
        p_dana_rawat: getCheckedValues('chk-rawat'),
        p_sarpras_lain: getCheckedValues('chk-lain') + (document.getElementById('cek-lainnya').checked ? `, ${document.getElementById('form-sarpras-lainnya-sebutkan').value.trim()}` : '')
    };

    try {
        // Tembak langsung ke server utama
        const { data, error } = await mySupabase.rpc('simpan_update_profil', payload);
        if(error) throw error;

        alert("Selamat! Pembaruan profil Anda telah berhasil disimpan dan langsung diterapkan di pangkalan data nasional.");
        
        // Perbarui Memori Sesi Browser (LocalStorage) seketika
        localStorage.setItem('sesi_portal_pkb', JSON.stringify(data));
        
        // Render ulang tampilan layar detik ini juga
        pulihkanSesi(data);
        batalEditProfil();
    } catch(err) {
        console.error(err);
        alert("Gagal melakukan pembaruan profil langsung. Sila periksa kembali jaringan koneksi Anda.");
    }
};

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
