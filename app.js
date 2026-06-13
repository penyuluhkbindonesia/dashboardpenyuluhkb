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
    if (!tglStr) return '-'; const b = tglStr.split('-');
    if (b.length !== 3) return tglStr; return `${b[2]}-${b[1]}-${b[0]}`;
}
function formatWaktuIndo(isoString) {
    if(!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

// ==========================================================================
// MESIN DASBOR & GRAFIK (DISEMBUNYIKAN UNTUK KETERBACAAN - TETAP SAMA SEPERTI SEBELUMNYA)
// ==========================================================================
async function tarikDataDasbor() {
    document.getElementById('loading-screen').style.display = 'flex';
    try { const { data, error } = await mySupabase.rpc('get_rekap_dasbor', { p_provinsi: filterProvinsiAktif }); if (!error) renderVisualDasbor(data); } catch (e) {}
    document.getElementById('loading-screen').style.display = 'none';
}
function renderVisualDasbor(ds) {
    const lbl = document.getElementById('label-cakupan'); const btn = document.getElementById('btn-reset-filter');
    if (filterProvinsiAktif) { lbl.innerHTML = `Data : <span style="color:#0056b3;">PROVINSI ${filterProvinsiAktif}</span>`; btn.style.display = 'block'; } 
    else { lbl.innerText = "Data PKB/PLKB : NASIONAL"; btn.style.display = 'none'; }

    document.getElementById('kpi-total').innerText = formatAngka(ds.kpi.total); document.getElementById('kpi-pns').innerText = formatAngka(ds.kpi.pns);
    document.getElementById('kpi-pppk').innerText = formatAngka(ds.kpi.pppk); document.getElementById('kpi-pria').innerText = formatAngka(ds.kpi.pria);
    document.getElementById('kpi-wanita').innerText = formatAngka(ds.kpi.wanita); document.getElementById('kpi-pensiun-bulan').innerText = formatAngka(ds.kpi.pensiun_bln_ini);
    document.getElementById('kpi-pensiun-tahun').innerText = formatAngka(ds.kpi.pensiun_thn_ini);
    const elMutakhir = document.getElementById('kpi-sudah-update'); if(elMutakhir) elMutakhir.innerText = formatAngka(ds.kpi.sudah_update || 0);

    let umurCount = { '< 30': 0, '30-39': 0, '40-49': 0, '50-59': 0, '60+': 0 }; let genCount = { 'Gen Z': 0, 'Milenial': 0, 'Gen X': 0, 'Baby Boomer': 0 };
    if (ds.tahun_lahir) Object.entries(ds.tahun_lahir).forEach(([thn, jml]) => { const u = 2026 - parseInt(thn); if (u<30) umurCount['< 30']+=jml; else if (u<=39) umurCount['30-39']+=jml; else if (u<=49) umurCount['40-49']+=jml; else if (u<=59) umurCount['50-59']+=jml; else umurCount['60+']+=jml; if (parseInt(thn)>=1997) genCount['Gen Z']+=jml; else if (parseInt(thn)>=1981) genCount['Milenial']+=jml; else if (parseInt(thn)>=1965) genCount['Gen X']+=jml; else genCount['Baby Boomer']+=jml; });

    const tbody = document.querySelector('#tabelPensiun tbody');
    if (tbody) { tbody.innerHTML = ''; if (ds.tabel_pensiun && ds.tabel_pensiun.length > 0) ds.tabel_pensiun.forEach(p => { let tr = document.createElement('tr'); tr.innerHTML = `<td>${p.nama_lengkap}</td><td>${p.provinsi}</td><td>${p.jabatan}</td><td style="font-weight:bold; color:#dc3545;">${formatTanggalIndo(p.tanggal_pensiun)}</td>`; tbody.appendChild(tr); }); else tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Tidak ada data pensiun tahun 2026</td></tr>`; }

    if(ds.sebaran_provinsi) gambarChartProvinsi(ds.sebaran_provinsi); if(ds.pendidikan) gambarChartPendidikan(ds.pendidikan); if(ds.golongan) gambarChartGolongan(ds.golongan); if(ds.jabatan) gambarChartJabatan(ds.jabatan); gambarChartUmur(umurCount); gambarChartGenerasi(genCount);
}

function gambarChartProvinsi(d) { const ctx = document.getElementById('chartProvinsi').getContext('2d'); if(chartProvInstance) chartProvInstance.destroy(); const sorted = Object.entries(d).sort((a,b)=>b[1]-a[1]); chartProvInstance = new Chart(ctx, {type:'bar', data:{labels:sorted.map(i=>i[0]), datasets:[{data:sorted.map(i=>i[1]), backgroundColor:'#007bff'}]}, options:{indexAxis:'y', responsive:true, maintainAspectRatio:false, onClick:(e, act)=>{if(act.length>0){filterProvinsiAktif=sorted[act[0].index][0]; tarikDataDasbor();}}, plugins:{legend:{display:false}}}});}
function gambarChartUmur(d) { const ctx = document.getElementById('chartUmur').getContext('2d'); if(chartUmurInstance) chartUmurInstance.destroy(); chartUmurInstance = new Chart(ctx, {type:'bar', data:{labels:Object.keys(d), datasets:[{data:Object.values(d), backgroundColor:['#007bff','#28a745','#ffc107','#fd7e14','#dc3545']}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}});}
function gambarChartGenerasi(d) { const ctx = document.getElementById('chartGenerasi').getContext('2d'); if(chartGenerasiInstance) chartGenerasiInstance.destroy(); chartGenerasiInstance = new Chart(ctx, {type:'pie', data:{labels:Object.keys(d), datasets:[{data:Object.values(d), backgroundColor:['#6f42c1','#17a2b8','#fd7e14','#e83e8c']}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}}}});}
function gambarChartJabatan(d) { const ctx = document.getElementById('chartJabatan').getContext('2d'); if(chartJabatanInstance) chartJabatanInstance.destroy(); const sorted = Object.entries(d).sort((a,b)=>b[1]-a[1]); chartJabatanInstance = new Chart(ctx, {type:'doughnut', data:{labels:sorted.map(i=>i[0]), datasets:[{data:sorted.map(i=>i[1]), backgroundColor:['#007bff','#17a2b8','#28a745','#ffc107','#dc3545','#6f42c1','#e83e8c','#fd7e14','#20c997','#6c757d']}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'right', labels:{boxWidth:10}}}}});}
function gambarChartPendidikan(d) { const ctx = document.getElementById('chartPendidikan').getContext('2d'); if(chartPendidikanInstance) chartPendidikanInstance.destroy(); const sorted = Object.entries(d).sort((a,b)=>b[1]-a[1]); chartPendidikanInstance = new Chart(ctx, {type:'bar', data:{labels:sorted.map(i=>i[0]), datasets:[{data:sorted.map(i=>i[1]), backgroundColor:'#17a2b8'}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}});}
function gambarChartGolongan(d) { const ctx = document.getElementById('chartGolongan').getContext('2d'); if(chartGolonganInstance) chartGolonganInstance.destroy(); const sorted = Object.entries(d).sort((a,b)=>a[0].localeCompare(b[0])); chartGolonganInstance = new Chart(ctx, {type:'bar', data:{labels:sorted.map(i=>i[0]), datasets:[{data:sorted.map(i=>i[1]), backgroundColor:'#6c757d'}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}});}
window.resetFilter = function() { filterProvinsiAktif = null; tarikDataDasbor(); };

// ==========================================================================
// MANAJEMEN SESI & LOGIN
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
        document.getElementById('view-portal-pkb').style.display = 'none'; document.getElementById('view-dasbor-publik').style.display = 'block';
        document.getElementById('header-title').innerText = "Dashboard PenyuluhKB"; btn.innerText = "Masuk / Login"; tarikDataDasbor(); 
    } else { document.getElementById('view-dasbor-publik').style.display = 'none'; document.getElementById('view-login').style.display = 'block'; btn.style.display = 'none'; }
};
window.kembaliKeDasborPublik = function() { document.getElementById('view-login').style.display = 'none'; document.getElementById('view-dasbor-publik').style.display = 'block'; document.getElementById('btn-auth-action').style.display = 'block'; };

function siapkanBeranda(namaLengkap) {
    const jam = new Date().getHours(); let sapaan = 'Malam'; if (jam >= 3 && jam < 11) sapaan = 'Pagi'; else if (jam >= 11 && jam < 15) sapaan = 'Siang'; else if (jam >= 15 && jam < 18) sapaan = 'Sore';
    document.getElementById('teks-sapaan').innerText = `Selamat ${sapaan}, ${namaLengkap}`;
    if (localStorage.getItem('statusKunjunganPortal')) document.getElementById('teks-sambutan').innerText = "Selamat Datang Kembali di Portal PenyuluhKB Indonesia"; 
    else { document.getElementById('teks-sambutan').innerText = "Selamat Datang di Portal PenyuluhKB Indonesia"; localStorage.setItem('statusKunjunganPortal', 'true'); }
}

window.eksekusiLogin = async function() {
    const user = document.getElementById('inputUser').value.trim(); const pass = document.getElementById('inputPass').value;
    const err = document.getElementById('pesan-error'); err.style.display = 'none'; if (!user || !pass) return;
    try {
        const { data, error } = await mySupabase.rpc('otentikasi_pegawai', { p_nip: user });
        if (error || !data) { err.style.display='block'; err.innerText="NIP Tidak Ditemukan atau Password Salah!"; } 
        else { localStorage.setItem('sesi_portal_pkb', JSON.stringify(data)); localStorage.setItem('activeTab', 'beranda'); pulihkanSesi(data); }
    } catch (e) { err.style.display='block'; err.innerText="Kredensial Akses Ditolak!"; }
};

// ==========================================================================
// PENGELOLAAN REFERENSI WILAYAH (SOLUSI ASYNCHRONOUS TUNTAS)
// ==========================================================================
async function fetchWilayah(level, kodeInduk, targetId, placeholderText) {
    const target = document.getElementById(targetId); target.innerHTML = `<option value="">-- Memuat... --</option>`;
    let query = mySupabase.from('referensi_wilayah').select('kode, nama').eq('level_wilayah', level).order('nama');
    if (kodeInduk) query = query.eq('kode_induk', kodeInduk); else query = query.is('kode_induk', null);
    const { data } = await query; 
    target.innerHTML = `<option value="">${placeholderText}</option>`;
    if (data) { data.forEach(w => { target.innerHTML += `<option value="${w.kode}">${w.nama}</option>`; }); }
}

// Helper untuk mencocokkan Teks Database dengan Option di Dropdown HTML
async function setSelectByText(selectId, textStr) {
    if(!textStr) return null;
    const sel = document.getElementById(selectId);
    for(let i=0; i<sel.options.length; i++) {
        if(sel.options[i].text.toUpperCase() === textStr.toUpperCase()) {
            sel.selectedIndex = i; return sel.options[i].value;
        }
    }
    return null;
}

window.popTLKab = function() { fetchWilayah('Kabupaten/Kota', document.getElementById('tl-provinsi').value, 'tl-kabupaten', '-- Pilih Kab/Kota --'); };
window.popDomKab = function() { fetchWilayah('Kabupaten/Kota', document.getElementById('dom-prov').value, 'dom-kab', '-- Pilih Kab/Kota --'); document.getElementById('dom-kec').innerHTML = '<option value="">-- Kecamatan --</option>'; document.getElementById('dom-desa').innerHTML = '<option value="">-- Desa/Kel --</option>';};
window.popDomKec = function() { fetchWilayah('Kecamatan', document.getElementById('dom-kab').value, 'dom-kec', '-- Kecamatan --'); document.getElementById('dom-desa').innerHTML = '<option value="">-- Desa/Kel --</option>';};
window.popDomDesa = function() { fetchWilayah('Desa/Kelurahan', document.getElementById('dom-kec').value, 'dom-desa', '-- Desa/Kel --'); };
window.popBinDesa = async function() {
    const kecKode = document.getElementById('bin-kec').value; const wrap = document.getElementById('wrap-bin-desa');
    wrap.innerHTML = '<span style="color:var(--text-muted); font-style:italic;">Memuat desa...</span>'; if(!kecKode) return;
    const { data } = await mySupabase.from('referensi_wilayah').select('kode, nama').eq('level_wilayah', 'Desa/Kelurahan').eq('kode_induk', kecKode).order('nama'); wrap.innerHTML = '';
    if(data && data.length>0) { data.forEach(d => { wrap.innerHTML += `<label style="width:48%; display:inline-block; margin-bottom:5px;"><input type="checkbox" class="chk-binaan-desa" value="${d.nama}"> ${d.nama}</label>`; }); } 
    else { wrap.innerHTML = '<span style="color:var(--text-muted); font-style:italic;">Data desa tidak tersedia.</span>'; }
};

// ==========================================================================
// INJEKSI DATA KE FORMULIR (PEMULIHAN SESI)
// ==========================================================================
let base64FotoProfilAktif = "";

window.prosesFotoUpload = function(event) {
    const file = event.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image(); img.onload = function() {
            const canvas = document.createElement('canvas'); let width = img.width; let height = img.height;
            if (width > height) { if (width > 400) { height *= 400 / width; width = 400; } } else { if (height > 400) { width *= 400 / height; height = 400; } }
            canvas.width = width; canvas.height = height; canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            base64FotoProfilAktif = canvas.toDataURL('image/jpeg', 0.8); document.getElementById('preview-foto-img').src = base64FotoProfilAktif;
        }; img.src = e.target.result;
    }; reader.readAsDataURL(file);
};

function setCheckboxes(className, valueString) {
    document.querySelectorAll('.' + className).forEach(el => el.checked = false);
    if(valueString) { const values = valueString.split(',').map(v => v.trim()); document.querySelectorAll('.' + className).forEach(el => { if(values.includes(el.value)) el.checked = true; }); }
}

async function pulihkanSesi(data) {
    // 1. UPDATE KARTU IDENTITAS VISUAL
    const gelarLengkap = (data.gelar_depan ? data.gelar_depan + " " : "") + data.nama_lengkap + (data.gelar_belakang ? ", " + data.gelar_belakang : "");
    const gelarJabatan = data.jabatan + " (" + (data.golongan || '-') + ")";
    
    document.getElementById('pkb-nama').innerText = gelarLengkap;
    document.getElementById('pkb-nip').innerText = data.nip;
    document.getElementById('pkb-jabatan').innerText = gelarJabatan;
    document.getElementById('pkb-wilayah').innerText = (data.kabupaten || '') + ", " + data.provinsi;
    document.getElementById('profil-subtitle').innerText = gelarJabatan;
    document.getElementById('pkb-pendidikan').innerText = (data.pendidikan_akhir || '-') + (data.jurusan_pendidikan ? ` (${data.jurusan_pendidikan})` : '');
    document.getElementById('pkb-kawin').innerText = data.status_perkawinan || '-';
    document.getElementById('pkb-binaan').innerText = data.kecamatan_binaan || '-';
    document.getElementById('pkb-balai').innerText = data.memiliki_balai === 'Ya' ? (data.nama_balai || 'Ada') : 'Tidak Ada';
    document.getElementById('pkb-jarak').innerText = data.jarak_binaan ? data.jarak_binaan + ' KM' : '-';

    // Kalkulasi Usia, Masa Kerja, Pensiun
    if(data.tanggal_lahir) document.getElementById('pkb-usia').innerText = (2026 - parseInt(data.tanggal_lahir.split('-')[0]));
    if(data.tahun_diangkat) document.getElementById('pkb-masa-kerja').innerText = (2026 - parseInt(data.tahun_diangkat));
    if(data.tanggal_pensiun) document.getElementById('pkb-tgl-pensiun').innerText = formatTanggalIndo(data.tanggal_pensiun);

    if (data.status_perkawinan) document.getElementById('badge-status-update').style.display = 'inline-block';
    
    if (data.updated_at) {
        document.getElementById('teks-last-update').style.display = 'block';
        document.getElementById('label-tgl-update').innerText = formatWaktuIndo(data.updated_at);
        // Render History
        const divLog = document.getElementById('isi-log'); divLog.innerHTML = '';
        if(data.update_history && data.update_history.length > 0) {
            let riwayatDibalik = [...data.update_history].reverse(); // Terbaru di atas
            riwayatDibalik.forEach(log => {
                divLog.innerHTML += `<div class="log-item"><div class="log-date">${formatWaktuIndo(log.waktu)}</div><div class="log-changes">Perubahan data: <i>${log.perubahan}</i></div></div>`;
            });
        } else { divLog.innerHTML = '<p>Belum ada riwayat tercatat.</p>'; }
    }
    
    if (data.foto_profil) {
        document.getElementById('display-foto-profil').src = data.foto_profil;
        document.getElementById('preview-foto-img').src = data.foto_profil;
        base64FotoProfilAktif = data.foto_profil;
    }

    // 2. INJEKSI FORMULIR (SINKRONISASI ASYNC YANG SEMPURNA)
    document.getElementById('form-nama').value = data.nama_lengkap || '';
    document.getElementById('form-nip').value = data.nip || '';
    document.getElementById('form-gelar-depan').value = data.gelar_depan || '';
    document.getElementById('form-gelar-belakang').value = data.gelar_belakang || '';
    document.getElementById('form-tanggal-lahir').value = data.tanggal_lahir || '';
    if(data.jenis_kelamin) document.getElementById('form-jenis-kelamin').value = data.jenis_kelamin;
    if(data.jenis_pegawai) { document.getElementById('form-jenis-asn').value = data.jenis_pegawai; updateGolonganRuang(); }
    if(data.tahun_diangkat) document.getElementById('form-tahun-diangkat').value = data.tahun_diangkat;
    if(data.jabatan) document.getElementById('form-jabatan').value = data.jabatan;
    if(data.golongan) document.getElementById('form-golongan').value = data.golongan;
    if(data.pendidikan_akhir) document.getElementById('form-pendidikan').value = data.pendidikan_akhir;
    document.getElementById('form-jurusan').value = data.jurusan_pendidikan || '';
    if(data.status_perkawinan) { document.getElementById('form-status-kawin').value = data.status_perkawinan; updateDataKeluarga(); }
    if(data.jumlah_anak) document.getElementById('form-jumlah-anak').value = data.jumlah_anak;
    if(data.kesertaan_kb) document.getElementById('form-kesertaan-kb').value = data.kesertaan_kb;
    if(data.tinggal_bersama_keluarga) document.getElementById('form-tinggal-keluarga').value = data.tinggal_bersama_keluarga;

    if(data.memiliki_balai) { document.getElementById('sarpras-balai').value = data.memiliki_balai; document.getElementById('sarpras-balai').dispatchEvent(new Event('change')); }
    document.getElementById('form-nama-balai').value = data.nama_balai || '';
    document.getElementById('lokasi-balai').value = data.lokasi_balai_gps || '';
    if(data.kendaraan_dinas) { document.getElementById('sarpras-kendaraan').value = data.kendaraan_dinas; document.getElementById('sarpras-kendaraan').dispatchEvent(new Event('change')); }
    if(data.tahun_kendaraan) document.getElementById('form-tahun-kendaraan').value = data.tahun_kendaraan;
    if(data.transmisi_kendaraan) document.getElementById('form-transmisi-kendaraan').value = data.transmisi_kendaraan;
    if(data.kondisi_kendaraan) document.getElementById('form-kondisi-kendaraan').value = data.kondisi_kendaraan;

    if(data.biaya_bbm) { document.getElementById('sarpras-bbm').value = data.biaya_bbm; document.getElementById('sarpras-bbm').dispatchEvent(new Event('change')); }
    setCheckboxes('chk-bbm', data.sumber_dana_bbm);
    if(data.biaya_perawatan) { document.getElementById('sarpras-perawatan').value = data.biaya_perawatan; document.getElementById('sarpras-perawatan').dispatchEvent(new Event('change')); }
    setCheckboxes('chk-rawat', data.sumber_dana_perawatan);
    
    // Perbaikan Logika Checkbox Lainnya
    const stdSarpras = ['Laptop', 'HP', 'Tablet', 'Pakaian Seragam Dinas', 'PKB/PLKB Kit'];
    let customSarpras = []; document.querySelectorAll('.chk-lain').forEach(el => el.checked = false); document.getElementById('cek-lainnya').checked = false; document.getElementById('form-sarpras-lainnya-sebutkan').value = ''; document.getElementById('sub-lainnya').style.display = 'none';
    if(data.sarpras_lainnya) {
        data.sarpras_lainnya.split(',').forEach(item => { const trimItem = item.trim(); if(stdSarpras.includes(trimItem)) { const chk = document.querySelector(`.chk-lain[value="${trimItem}"]`); if(chk) chk.checked = true; } else if(trimItem) customSarpras.push(trimItem); });
        if(customSarpras.length > 0) { document.getElementById('cek-lainnya').checked = true; document.getElementById('sub-lainnya').style.display = 'block'; document.getElementById('form-sarpras-lainnya-sebutkan').value = customSarpras.join(', '); }
    }
    
    if(data.jarak_binaan) document.getElementById('form-jarak').value = data.jarak_binaan;

    siapkanBeranda(data.nama_lengkap);
    document.getElementById('view-login').style.display = 'none'; document.getElementById('view-dasbor-publik').style.display = 'none';
    document.getElementById('btn-auth-action').style.display = 'block'; document.getElementById('btn-auth-action').innerText = "Keluar Sesi";
    document.getElementById('header-title').innerText = `Portal: ${data.nama_lengkap}`;
    document.getElementById('view-portal-pkb').style.display = 'grid';

    // 3. PEMULIHAN DROPDOWN CASCADING WILAYAH YANG AMAN DARI BUG KOSONG
    await fetchWilayah('Provinsi', null, 'tl-provinsi', '-- Pilih Provinsi --');
    const kdTLProv = await setSelectByText('tl-provinsi', data.tempat_lahir_provinsi);
    if(kdTLProv) { await fetchWilayah('Kabupaten/Kota', kdTLProv, 'tl-kabupaten', '-- Pilih Kab/Kota --'); await setSelectByText('tl-kabupaten', data.tempat_lahir_kabupaten); }

    await fetchWilayah('Provinsi', null, 'dom-prov', '-- Pilih Provinsi --');
    const kdDomProv = await setSelectByText('dom-prov', data.domisili_provinsi);
    if(kdDomProv) { await fetchWilayah('Kabupaten/Kota', kdDomProv, 'dom-kab', '-- Pilih Kab/Kota --'); const kdDomKab = await setSelectByText('dom-kab', data.domisili_kabupaten); 
        if(kdDomKab) { await fetchWilayah('Kecamatan', kdDomKab, 'dom-kec', '-- Pilih Kecamatan --'); const kdDomKec = await setSelectByText('dom-kec', data.domisili_kecamatan);
            if(kdDomKec) { await fetchWilayah('Desa/Kelurahan', kdDomKec, 'dom-desa', '-- Pilih Desa --'); await setSelectByText('dom-desa', data.domisili_desa); }
        }
    }

    const binProvSelect = document.getElementById('bin-prov'); const binKabSelect = document.getElementById('bin-kab');
    if(data.provinsi) {
        const { data: pData } = await mySupabase.from('referensi_wilayah').select('kode, nama').eq('level_wilayah', 'Provinsi').ilike('nama', `%${data.provinsi}%`).limit(1);
        if(pData && pData.length>0) { binProvSelect.innerHTML = `<option value="${pData[0].kode}" selected>${pData[0].nama}</option>`;
            if(data.kabupaten) {
                const { data: kData } = await mySupabase.from('referensi_wilayah').select('kode, nama').eq('level_wilayah', 'Kabupaten/Kota').eq('kode_induk', pData[0].kode).ilike('nama', `%${data.kabupaten}%`).limit(1);
                if(kData && kData.length>0) { binKabSelect.innerHTML = `<option value="${kData[0].kode}" selected>${kData[0].nama}</option>`;
                    await fetchWilayah('Kecamatan', kData[0].kode, 'bin-kec', '-- Pilih Kecamatan --');
                    const kdBinKec = await setSelectByText('bin-kec', data.kecamatan_binaan);
                    if(kdBinKec) {
                        await popBinDesa(); // Load checkboxes
                        if(data.desa_binaan) { const desaTersimpan = data.desa_binaan.split(',').map(v=>v.trim()); document.querySelectorAll('.chk-binaan-desa').forEach(el => { if(desaTersimpan.includes(el.value)) el.checked = true; }); }
                    }
                }
            }
        }
    }
    const tabTerakhir = localStorage.getItem('activeTab') || 'beranda'; pindahTabPortal(tabTerakhir);
}

// ==========================================================================
// 6. ENGINE SIMPAN PROFIL & LOGIKA FORM
// ==========================================================================
window.pindahTabPortal = function(tabId) { document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none'); document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active')); document.getElementById(`tab-${tabId}`).style.display = 'block'; const activeLink = document.querySelector(`.tab-link[onclick="pindahTabPortal('${tabId}')"]`); if(activeLink) activeLink.classList.add('active'); localStorage.setItem('activeTab', tabId); };
window.bukaFormEditProfil = function() { document.getElementById('view-profil-utama').style.display = 'none'; document.getElementById('form-edit-profil').style.display = 'block'; };
window.batalEditProfil = function() { document.getElementById('form-edit-profil').style.display = 'none'; document.getElementById('view-profil-utama').style.display = 'block'; };
window.bukaModalLog = function() { document.getElementById('modal-log').style.display = 'flex'; };
window.tutupModalLog = function(e) { if(e.target === document.getElementById('modal-log')) document.getElementById('modal-log').style.display = 'none'; };

function setupFormLogika() {
    let htmlTahunAnak = ''; for(let i=0; i<=10; i++) htmlTahunAnak += `<option value="${i}">${i}</option>`; document.getElementById('form-jumlah-anak').innerHTML = htmlTahunAnak;
    let htmlThn = '<option value="">-- Pilih Tahun --</option>'; for(let y=2026; y>=1980; y--) htmlThn += `<option value="${y}">${y}</option>`;
    document.getElementById('form-tahun-diangkat').innerHTML = htmlThn; document.getElementById('form-tahun-kendaraan').innerHTML = htmlThn;

    document.getElementById('sarpras-balai').addEventListener('change', e => document.getElementById('sub-balai').style.display = (e.target.value === 'Ya') ? 'block' : 'none');
    document.getElementById('sarpras-kendaraan').addEventListener('change', e => document.getElementById('sub-kendaraan').style.display = (e.target.value === 'Ya') ? 'block' : 'none');
    document.getElementById('sarpras-bbm').addEventListener('change', e => document.getElementById('sub-bbm').style.display = (e.target.value === 'Ya') ? 'block' : 'none');
    document.getElementById('sarpras-perawatan').addEventListener('change', e => document.getElementById('sub-perawatan').style.display = (e.target.value === 'Ya') ? 'block' : 'none');
    document.getElementById('cek-lainnya').addEventListener('change', e => document.getElementById('sub-lainnya').style.display = e.target.checked ? 'block' : 'none');
}

window.simpanProfilKeServer = async function() {
    const nip = document.getElementById('form-nip').value; if(!nip) return;
    if(!confirm("Simpan perubahan data profil dan foto ini ke server pusat?")) return;
    const btnSimpan = document.getElementById('btn-simpan-profil'); btnSimpan.innerText = "Menyimpan Data..."; btnSimpan.disabled = true;

    let listDesaBinaan = []; document.querySelectorAll('.chk-binaan-desa:checked').forEach(el => listDesaBinaan.push(el.value));
    
    let eTLProv = document.getElementById('tl-provinsi'); let tlProvText = eTLProv.options[eTLProv.selectedIndex]?.text || '';
    let eTLKab = document.getElementById('tl-kabupaten'); let tlKabText = eTLKab.options[eTLKab.selectedIndex]?.text || '';
    let eDomProv = document.getElementById('dom-prov'); let domProvText = eDomProv.options[eDomProv.selectedIndex]?.text || '';
    let eDomKab = document.getElementById('dom-kab'); let domKabText = eDomKab.options[eDomKab.selectedIndex]?.text || '';
    let eDomKec = document.getElementById('dom-kec'); let domKecText = eDomKec.options[eDomKec.selectedIndex]?.text || '';
    let eDomDesa = document.getElementById('dom-desa'); let domDesaText = eDomDesa.options[eDomDesa.selectedIndex]?.text || '';
    let eBinKec = document.getElementById('bin-kec'); let binKecText = eBinKec.options[eBinKec.selectedIndex]?.text || '';

    // Deteksi sederhana apa saja yang diupdate untuk Log Riwayat
    let infoPerubahan = "Memperbarui Data Profil Terkini";

    const payload = {
        p_nip: nip, p_nama: document.getElementById('form-nama').value.trim(), p_gelar_dp: document.getElementById('form-gelar-depan').value.trim(), p_gelar_bk: document.getElementById('form-gelar-belakang').value.trim(),
        p_tl_prov: tlProvText.replace('-- Pilih Provinsi --', ''), p_tl_kab: tlKabText.replace('-- Pilih Kab/Kota --', ''), p_tgl_lahir: document.getElementById('form-tanggal-lahir').value,
        p_jk: document.getElementById('form-jenis-kelamin').value, p_asn: document.getElementById('form-jenis-asn').value, p_thn_angkat: document.getElementById('form-tahun-diangkat').value,
        p_jabatan: document.getElementById('form-jabatan').value, p_golongan: document.getElementById('form-golongan').value, p_pendidikan: document.getElementById('form-pendidikan').value, p_jurusan: document.getElementById('form-jurusan').value.trim(),
        p_status_kawin: document.getElementById('form-status-kawin').value, p_jml_anak: document.getElementById('form-jumlah-anak').value, p_kb: document.getElementById('form-kesertaan-kb').value, p_tinggal_kel: document.getElementById('form-tinggal-keluarga').value,
        p_dom_prov: domProvText.replace('-- Provinsi --', ''), p_dom_kab: domKabText.replace('-- Kab/Kota --', ''), p_dom_kec: domKecText.replace('-- Kecamatan --', ''), p_dom_desa: domDesaText.replace('-- Desa/Kel --', ''),
        p_bin_kec: binKecText.replace('-- Pilih Kecamatan --', ''), p_bin_desa: listDesaBinaan.join(', '),
        p_miliki_balai: document.getElementById('sarpras-balai').value, p_nama_balai: document.getElementById('form-nama-balai').value.trim(), p_gps_balai: document.getElementById('lokasi-balai').value,
        p_kendaraan: document.getElementById('sarpras-kendaraan').value, p_thn_kendaraan: document.getElementById('form-tahun-kendaraan').value, p_transmisi: document.getElementById('form-transmisi-kendaraan').value, p_kondisi: document.getElementById('form-kondisi-kendaraan').value,
        p_bbm: document.getElementById('sarpras-bbm').value, p_dana_bbm: getCheckedValues('chk-bbm'), p_rawat: document.getElementById('sarpras-perawatan').value, p_dana_rawat: getCheckedValues('chk-rawat'),
        p_sarpras_lain: getCheckedValues('chk-lain') + (document.getElementById('cek-lainnya').checked ? `, ${document.getElementById('form-sarpras-lainnya-sebutkan').value.trim()}` : ''),
        p_foto: base64FotoProfilAktif, p_jarak: document.getElementById('form-jarak').value, p_log_perubahan: infoPerubahan
    };

    try {
        const { data, error } = await mySupabase.rpc('simpan_update_profil', payload);
        if(error) throw error;
        localStorage.setItem('sesi_portal_pkb', JSON.stringify(data)); 
        await pulihkanSesi(data); batalEditProfil(); alert("Pembaruan profil Anda telah berhasil disimpan dan diteruskan ke database Nasional.");
    } catch(err) { alert("Gagal melakukan pembaruan profil. Periksa koneksi Anda."); } 
    finally { btnSimpan.innerText = "Simpan Perubahan Data"; btnSimpan.disabled = false; }
};

window.kirimSaranPengguna = async function() {
    const kategori = document.getElementById('kategori-saran').value; const isi = document.getElementById('isi-saran').value.trim();
    if(!isi) { alert("Silakan ketik pesan Anda terlebih dahulu sebelum mengirim."); return; }
    const sesiPkb = JSON.parse(localStorage.getItem('sesi_portal_pkb')); if(!sesiPkb) return;
    const btnKirim = document.getElementById('btn-kirim-saran'); const textAsli = btnKirim.innerText; btnKirim.innerText = "Mengirim..."; btnKirim.disabled = true;
    try { const { error } = await mySupabase.rpc('simpan_saran', { p_nip: sesiPkb.nip, p_nama: sesiPkb.nama_lengkap, p_kategori: kategori, p_isi: isi }); if (error) throw error; alert(`Terima kasih! Masukan Anda telah terkirim.`); document.getElementById('isi-saran').value = ''; } catch(err) { alert("Terjadi kesalahan. Periksa koneksi Anda."); } finally { btnKirim.innerText = textAsli; btnKirim.disabled = false; }
};

window.bukaFileFullscreen = function(filename) { document.getElementById('viewer-filename').innerText = filename; document.getElementById('viewer-body-content').innerText = `[ Membaca: ${filename} ]`; document.getElementById('viewer-overlay').style.display = 'flex'; };
window.tutupFileFullscreen = function() { document.getElementById('viewer-overlay').style.display = 'none'; };
window.ubahTemaAplikasi = function(theme) { document.documentElement.setAttribute('data-theme', theme); };
window.ubahSkalaZoom = function(aksi) { if (aksi === '+') currentZoomLevel += 10; else if (aksi === '-') currentZoomLevel -= 10; else currentZoomLevel = 100; if (currentZoomLevel < 80) currentZoomLevel = 80; if (currentZoomLevel > 130) currentZoomLevel = 130; document.documentElement.style.setProperty('--base-font-size', `${currentZoomLevel}%`); };

window.addEventListener('DOMContentLoaded', () => {
    setupFormLogika();
    const sesiAktif = localStorage.getItem('sesi_portal_pkb');
    if (sesiAktif) { document.getElementById('loading-screen').style.display = 'none'; pulihkanSesi(JSON.parse(sesiAktif)); } 
    else { tarikDataDasbor(); }
});
