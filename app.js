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

// HELPER: Anti-Crash DOM Updater
function setTxt(id, txt) { const el = document.getElementById(id); if(el) el.innerText = txt; }
function setVal(id, val) { const el = document.getElementById(id); if(el) el.value = val; }

// ==========================================================================
// 2. MESIN DASBOR & VISUALISASI GRAFIK
// ==========================================================================
async function tarikDataDasbor() {
    const loader = document.getElementById('loading-screen'); if(loader) loader.style.display = 'flex';
    try { const { data, error } = await mySupabase.rpc('get_rekap_dasbor', { p_provinsi: filterProvinsiAktif }); if (!error && data) renderVisualDasbor(data); } catch (e) {}
    if(loader) loader.style.display = 'none';
}

function renderVisualDasbor(ds) {
    const lbl = document.getElementById('label-cakupan'); const btn = document.getElementById('btn-reset-filter');
    if(lbl && btn) {
        if (filterProvinsiAktif) { lbl.innerHTML = `Data : <span style="color:#0056b3;">PROVINSI ${filterProvinsiAktif}</span>`; btn.style.display = 'block'; } 
        else { lbl.innerText = "Data PKB/PLKB : NASIONAL"; btn.style.display = 'none'; }
    }

    if(ds && ds.kpi) {
        setTxt('kpi-total', formatAngka(ds.kpi.total)); setTxt('kpi-pns', formatAngka(ds.kpi.pns));
        setTxt('kpi-pppk', formatAngka(ds.kpi.pppk)); setTxt('kpi-pria', formatAngka(ds.kpi.pria));
        setTxt('kpi-wanita', formatAngka(ds.kpi.wanita)); setTxt('kpi-pensiun-bulan', formatAngka(ds.kpi.pensiun_bln_ini));
        setTxt('kpi-pensiun-tahun', formatAngka(ds.kpi.pensiun_thn_ini));
        setTxt('kpi-sudah-update', formatAngka(ds.kpi.sudah_update || 0));
    }

    let umurCount = { '< 30': 0, '30-39': 0, '40-49': 0, '50-59': 0, '60+': 0 }; let genCount = { 'Gen Z': 0, 'Milenial': 0, 'Gen X': 0, 'Baby Boomer': 0 };
    if (ds && ds.tahun_lahir) {
        Object.entries(ds.tahun_lahir).forEach(([thn, jml]) => { const u = 2026 - parseInt(thn); if (u<30) umurCount['< 30']+=jml; else if (u<=39) umurCount['30-39']+=jml; else if (u<=49) umurCount['40-49']+=jml; else if (u<=59) umurCount['50-59']+=jml; else umurCount['60+']+=jml; if (parseInt(thn)>=1997) genCount['Gen Z']+=jml; else if (parseInt(thn)>=1981) genCount['Milenial']+=jml; else if (parseInt(thn)>=1965) genCount['Gen X']+=jml; else genCount['Baby Boomer']+=jml; });
    }

    const tbody = document.querySelector('#tabelPensiun tbody');
    if (tbody) { 
        tbody.innerHTML = ''; 
        if (ds && ds.tabel_pensiun && ds.tabel_pensiun.length > 0) {
            ds.tabel_pensiun.forEach(p => { let tr = document.createElement('tr'); tr.innerHTML = `<td>${p.nama_lengkap}</td><td>${p.provinsi}</td><td>${p.jabatan}</td><td style="font-weight:bold; color:#dc3545;">${formatTanggalIndo(p.tanggal_pensiun)}</td>`; tbody.appendChild(tr); }); 
        } else { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Tidak ada data pensiun tahun 2026</td></tr>`; }
    }

    if(ds && ds.sebaran_provinsi) gambarChartProvinsi(ds.sebaran_provinsi); if(ds && ds.pendidikan) gambarChartPendidikan(ds.pendidikan); if(ds && ds.golongan) gambarChartGolongan(ds.golongan); if(ds && ds.jabatan) gambarChartJabatan(ds.jabatan); gambarChartUmur(umurCount); gambarChartGenerasi(genCount);
}

function gambarChartProvinsi(d) { const ctx = document.getElementById('chartProvinsi')?.getContext('2d'); if(!ctx) return; if(chartProvInstance) chartProvInstance.destroy(); const sorted = Object.entries(d).sort((a,b)=>b[1]-a[1]); chartProvInstance = new Chart(ctx, {type:'bar', data:{labels:sorted.map(i=>i[0]), datasets:[{label:'Total', data:sorted.map(i=>i[1]), backgroundColor:'#007bff', borderRadius: 4}]}, options:{indexAxis:'y', responsive:true, maintainAspectRatio:false, onClick:(e, act)=>{if(act.length>0){filterProvinsiAktif=sorted[act[0].index][0]; tarikDataDasbor();}}, plugins:{legend:{display:false}}}});}
function gambarChartUmur(d) { const ctx = document.getElementById('chartUmur')?.getContext('2d'); if(!ctx) return; if(chartUmurInstance) chartUmurInstance.destroy(); chartUmurInstance = new Chart(ctx, {type:'bar', data:{labels:Object.keys(d), datasets:[{data:Object.values(d), backgroundColor:['#007bff','#28a745','#ffc107','#fd7e14','#dc3545'], borderRadius: 4}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}});}
function gambarChartGenerasi(d) { const ctx = document.getElementById('chartGenerasi')?.getContext('2d'); if(!ctx) return; if(chartGenerasiInstance) chartGenerasiInstance.destroy(); chartGenerasiInstance = new Chart(ctx, {type:'pie', data:{labels:Object.keys(d), datasets:[{data:Object.values(d), backgroundColor:['#6f42c1','#17a2b8','#fd7e14','#e83e8c']}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}}}});}
function gambarChartJabatan(d) { const ctx = document.getElementById('chartJabatan')?.getContext('2d'); if(!ctx) return; if(chartJabatanInstance) chartJabatanInstance.destroy(); const sorted = Object.entries(d).sort((a,b)=>b[1]-a[1]); chartJabatanInstance = new Chart(ctx, {type:'doughnut', data:{labels:sorted.map(i=>i[0]), datasets:[{data:sorted.map(i=>i[1]), backgroundColor:['#007bff','#17a2b8','#28a745','#ffc107','#dc3545','#6f42c1','#e83e8c','#fd7e14','#20c997','#6c757d']}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'right', labels:{boxWidth:10}}}}});}
function gambarChartPendidikan(d) { const ctx = document.getElementById('chartPendidikan')?.getContext('2d'); if(!ctx) return; if(chartPendidikanInstance) chartPendidikanInstance.destroy(); const sorted = Object.entries(d).sort((a,b)=>b[1]-a[1]); chartPendidikanInstance = new Chart(ctx, {type:'bar', data:{labels:sorted.map(i=>i[0]), datasets:[{data:sorted.map(i=>i[1]), backgroundColor:'#17a2b8', borderRadius: 4}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}});}
function gambarChartGolongan(d) { const ctx = document.getElementById('chartGolongan')?.getContext('2d'); if(!ctx) return; if(chartGolonganInstance) chartGolonganInstance.destroy(); const sorted = Object.entries(d).sort((a,b)=>a[0].localeCompare(b[0])); chartGolonganInstance = new Chart(ctx, {type:'bar', data:{labels:sorted.map(i=>i[0]), datasets:[{data:sorted.map(i=>i[1]), backgroundColor:'#6c757d', borderRadius: 4}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}});}
window.resetFilter = function() { filterProvinsiAktif = null; tarikDataDasbor(); };

// ==========================================================================
// 3. MANAJEMEN SESI & LOGIN
// ==========================================================================
window.togglePasswordVisibility = function() {
    const pIn = document.getElementById('inputPass'); const ic = document.getElementById('eye-icon-path'); if(!pIn || !ic) return;
    if (pIn.type === 'password') { pIn.type = 'text'; ic.setAttribute('d', 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21');
    } else { pIn.type = 'password'; ic.setAttribute('d', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'); }
};
window.navigasiLoginAtauKeluar = function() {
    const btn = document.getElementById('btn-auth-action'); if(!btn) return;
    if (btn.innerText === "Keluar Sesi") {
        localStorage.removeItem('sesi_portal_pkb'); localStorage.removeItem('activeTab'); 
        if(document.getElementById('view-portal-pkb')) document.getElementById('view-portal-pkb').style.display = 'none'; 
        if(document.getElementById('view-dasbor-publik')) document.getElementById('view-dasbor-publik').style.display = 'block';
        setTxt('header-title', "Dashboard PenyuluhKB"); btn.innerText = "Masuk / Login"; tarikDataDasbor(); 
    } else { 
        if(document.getElementById('view-dasbor-publik')) document.getElementById('view-dasbor-publik').style.display = 'none'; 
        if(document.getElementById('view-login')) document.getElementById('view-login').style.display = 'block'; 
        btn.style.display = 'none'; 
    }
};
window.kembaliKeDasborPublik = function() { 
    if(document.getElementById('view-login')) document.getElementById('view-login').style.display = 'none'; 
    if(document.getElementById('view-dasbor-publik')) document.getElementById('view-dasbor-publik').style.display = 'block'; 
    if(document.getElementById('btn-auth-action')) document.getElementById('btn-auth-action').style.display = 'block'; 
};

function siapkanBeranda(namaLengkap) {
    const jam = new Date().getHours(); let sapaan = 'Malam'; if (jam >= 3 && jam < 11) sapaan = 'Pagi'; else if (jam >= 11 && jam < 15) sapaan = 'Siang'; else if (jam >= 15 && jam < 18) sapaan = 'Sore';
    setTxt('teks-sapaan', `Selamat ${sapaan}, ${namaLengkap}`);
    if (localStorage.getItem('statusKunjunganPortal')) setTxt('teks-sambutan', "Selamat Datang Kembali di Portal PenyuluhKB Indonesia"); 
    else { setTxt('teks-sambutan', "Selamat Datang di Portal PenyuluhKB Indonesia"); localStorage.setItem('statusKunjunganPortal', 'true'); }
}

window.eksekusiLogin = async function() {
    const uIn = document.getElementById('inputUser'); const pIn = document.getElementById('inputPass'); const err = document.getElementById('pesan-error');
    if(!uIn || !pIn || !err) return;
    const user = uIn.value.trim(); const pass = pIn.value;
    err.style.display = 'none'; if (!user || !pass) return;
    try {
        const { data, error } = await mySupabase.rpc('otentikasi_pegawai', { p_nip: user });
        if (error || !data) { err.style.display='block'; err.innerText="NIP Tidak Ditemukan atau Password Salah!"; } 
        else { localStorage.setItem('sesi_portal_pkb', JSON.stringify(data)); localStorage.setItem('activeTab', 'beranda'); pulihkanSesi(data); }
    } catch (e) { err.style.display='block'; err.innerText="Kredensial Akses Ditolak!"; }
};

// ==========================================================================
// 4. PENGELOLAAN REFERENSI WILAYAH (SUPABASE CASCADING)
// ==========================================================================
async function fetchWilayah(level, kodeInduk, targetId, placeholderText) {
    const target = document.getElementById(targetId); if(!target) return;
    target.innerHTML = `<option value="">-- Memuat... --</option>`;
    let query = mySupabase.from('referensi_wilayah').select('kode, nama').eq('level_wilayah', level).order('nama');
    if (kodeInduk) query = query.eq('kode_induk', kodeInduk); else query = query.is('kode_induk', null);
    const { data } = await query; target.innerHTML = `<option value="">${placeholderText}</option>`;
    if (data) { data.forEach(w => { target.innerHTML += `<option value="${w.kode}">${w.nama}</option>`; }); }
}

async function setSelectByText(selectId, textStr) {
    if(!textStr) return null; const sel = document.getElementById(selectId); if(!sel) return null;
    for(let i=0; i<sel.options.length; i++) { if(sel.options[i].text.toUpperCase() === textStr.toUpperCase()) { sel.selectedIndex = i; return sel.options[i].value; } }
    return null;
}

window.popTLKab = function() { const el = document.getElementById('tl-provinsi'); if(el) fetchWilayah('Kabupaten/Kota', el.value, 'tl-kabupaten', '-- Pilih Kab/Kota --'); };
window.popDomKab = function() { 
    const el = document.getElementById('dom-prov'); if(el) fetchWilayah('Kabupaten/Kota', el.value, 'dom-kab', '-- Pilih Kab/Kota --'); 
    const k = document.getElementById('dom-kec'); if(k) k.innerHTML = '<option value="">-- Kecamatan --</option>'; 
    const d = document.getElementById('dom-desa'); if(d) d.innerHTML = '<option value="">-- Desa/Kel --</option>';
};
window.popDomKec = function() { 
    const el = document.getElementById('dom-kab'); if(el) fetchWilayah('Kecamatan', el.value, 'dom-kec', '-- Kecamatan --'); 
    const d = document.getElementById('dom-desa'); if(d) d.innerHTML = '<option value="">-- Desa/Kel --</option>';
};
window.popDomDesa = function() { const el = document.getElementById('dom-kec'); if(el) fetchWilayah('Desa/Kelurahan', el.value, 'dom-desa', '-- Desa/Kel --'); };
window.popBinDesa = async function() {
    const el = document.getElementById('bin-kec'); const wrap = document.getElementById('wrap-bin-desa'); if(!el || !wrap) return;
    const kecKode = el.value; wrap.innerHTML = '<span style="color:var(--text-muted); font-style:italic;">Memuat desa...</span>'; if(!kecKode) return;
    const { data } = await mySupabase.from('referensi_wilayah').select('kode, nama').eq('level_wilayah', 'Desa/Kelurahan').eq('kode_induk', kecKode).order('nama'); wrap.innerHTML = '';
    if(data && data.length>0) { data.forEach(d => { wrap.innerHTML += `<label style="width:48%; display:inline-block; margin-bottom:5px;"><input type="checkbox" class="chk-binaan-desa" value="${d.nama}"> ${d.nama}</label>`; }); } 
    else { wrap.innerHTML = '<span style="color:var(--text-muted); font-style:italic;">Data desa tidak tersedia.</span>'; }
};

// ==========================================================================
// 5. INJEKSI DATA KE FORMULIR & TAMPILAN PROFIL (PEMULIHAN SESI)
// ==========================================================================
let base64FotoProfilAktif = "";

window.prosesFotoUpload = function(event) {
    const file = event.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image(); img.onload = function() {
            const canvas = document.createElement('canvas'); let width = img.width; let height = img.height;
            if (width > height) { if (width > 400) { height *= 400 / width; width = 400; } } else { if (height > 400) { width *= 400 / height; height = 400; } }
            canvas.width = width; canvas.height = height; canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            base64FotoProfilAktif = canvas.toDataURL('image/jpeg', 0.8); 
            const prev = document.getElementById('preview-foto-img'); if(prev) prev.src = base64FotoProfilAktif;
        }; img.src = e.target.result;
    }; reader.readAsDataURL(file);
};

function setCheckboxes(className, valueString) {
    document.querySelectorAll('.' + className).forEach(el => el.checked = false);
    if(valueString) { const values = valueString.split(',').map(v => v.trim()); document.querySelectorAll('.' + className).forEach(el => { if(values.includes(el.value)) el.checked = true; }); }
}

async function pulihkanSesi(data) {
    // 1. UPDATE KARTU IDENTITAS VISUAL MENGGUNAKAN HELPER ANTI-CRASH
    const gelarLengkap = (data.gelar_depan ? data.gelar_depan + " " : "") + data.nama_lengkap + (data.gelar_belakang ? ", " + data.gelar_belakang : "");
    const gelarJabatan = data.jabatan + " (" + (data.golongan || '-') + ")";
    
    setTxt('pkb-nama', gelarLengkap);
    setTxt('pkb-nip', data.nip);
    setTxt('pkb-jabatan', gelarJabatan);
    setTxt('pkb-wilayah', (data.kabupaten || '') + ", " + data.provinsi);
    setTxt('profil-subtitle', gelarJabatan);
    setTxt('pkb-pendidikan', (data.pendidikan_akhir || '-') + (data.jurusan_pendidikan ? ` (${data.jurusan_pendidikan})` : ''));
    setTxt('pkb-kawin', data.status_perkawinan || '-');
    setTxt('pkb-binaan', data.kecamatan_binaan || '-');
    setTxt('pkb-balai', data.memiliki_balai === 'Ya' ? (data.nama_balai || 'Ada') : 'Tidak Ada');
    setTxt('pkb-jarak', data.jarak_binaan ? data.jarak_binaan + ' KM' : '-');

    if(data.tanggal_lahir) setTxt('pkb-usia', (2026 - parseInt(data.tanggal_lahir.split('-')[0])));
    if(data.tahun_diangkat) setTxt('pkb-masa-kerja', (2026 - parseInt(data.tahun_diangkat)));
    if(data.tanggal_pensiun) setTxt('pkb-tgl-pensiun', formatTanggalIndo(data.tanggal_pensiun));

    const badge = document.getElementById('badge-status-update'); if (badge && data.status_perkawinan) badge.style.display = 'inline-block';
    
    if (data.updated_at) {
        const lastUpdate = document.getElementById('teks-last-update'); if(lastUpdate) lastUpdate.style.display = 'block';
        setTxt('label-tgl-update', formatWaktuIndo(data.updated_at));
        const divLog = document.getElementById('isi-log'); 
        if(divLog) {
            divLog.innerHTML = '';
            if(data.update_history && data.update_history.length > 0) {
                let riwayatDibalik = [...data.update_history].reverse();
                riwayatDibalik.forEach(log => { divLog.innerHTML += `<div class="log-item"><div class="log-date">${formatWaktuIndo(log.waktu)}</div><div class="log-changes">Perubahan data: <i>${log.perubahan}</i></div></div>`; });
            } else { divLog.innerHTML = '<p>Belum ada riwayat tercatat.</p>'; }
        }
    }
    
    if (data.foto_profil) {
        const dFoto = document.getElementById('display-foto-profil'); if(dFoto) dFoto.src = data.foto_profil;
        const pFoto = document.getElementById('preview-foto-img'); if(pFoto) pFoto.src = data.foto_profil;
        base64FotoProfilAktif = data.foto_profil;
    }

    // 2. INJEKSI FORMULIR MENGGUNAKAN HELPER ANTI-CRASH
    setVal('form-nama', data.nama_lengkap || '');
    setVal('form-nip', data.nip || '');
    setVal('form-gelar-depan', data.gelar_depan || '');
    setVal('form-gelar-belakang', data.gelar_belakang || '');
    setVal('form-tanggal-lahir', data.tanggal_lahir || '');
    if(data.jenis_kelamin) setVal('form-jenis-kelamin', data.jenis_kelamin);
    if(data.jenis_pegawai) { setVal('form-jenis-asn', data.jenis_pegawai); updateGolonganRuang(); }
    if(data.tahun_diangkat) setVal('form-tahun-diangkat', data.tahun_diangkat);
    if(data.jabatan) setVal('form-jabatan', data.jabatan);
    if(data.golongan) setVal('form-golongan', data.golongan);
    if(data.pendidikan_akhir) setVal('form-pendidikan', data.pendidikan_akhir);
    setVal('form-jurusan', data.jurusan_pendidikan || '');

    if(data.status_perkawinan) { setVal('form-status-kawin', data.status_perkawinan); updateDataKeluarga(); }
    if(data.jumlah_anak) setVal('form-jumlah-anak', data.jumlah_anak);
    if(data.kesertaan_kb) setVal('form-kesertaan-kb', data.kesertaan_kb);
    if(data.tinggal_bersama_keluarga) setVal('form-tinggal-keluarga', data.tinggal_bersama_keluarga);

    if(data.memiliki_balai) { setVal('sarpras-balai', data.memiliki_balai); const sb = document.getElementById('sarpras-balai'); if(sb) sb.dispatchEvent(new Event('change')); }
    setVal('form-nama-balai', data.nama_balai || '');
    setVal('lokasi-balai', data.lokasi_balai_gps || '');

    if(data.kendaraan_dinas) { setVal('sarpras-kendaraan', data.kendaraan_dinas); const sk = document.getElementById('sarpras-kendaraan'); if(sk) sk.dispatchEvent(new Event('change')); }
    if(data.tahun_kendaraan) setVal('form-tahun-kendaraan', data.tahun_kendaraan);
    if(data.transmisi_kendaraan) setVal('form-transmisi-kendaraan', data.transmisi_kendaraan);
    if(data.kondisi_kendaraan) setVal('form-kondisi-kendaraan', data.kondisi_kendaraan);

    if(data.biaya_bbm) { setVal('sarpras-bbm', data.biaya_bbm); const sm = document.getElementById('sarpras-bbm'); if(sm) sm.dispatchEvent(new Event('change')); }
    setCheckboxes('chk-bbm', data.sumber_dana_bbm);
    if(data.biaya_perawatan) { setVal('sarpras-perawatan', data.biaya_perawatan); const sp = document.getElementById('sarpras-perawatan'); if(sp) sp.dispatchEvent(new Event('change')); }
    setCheckboxes('chk-rawat', data.sumber_dana_perawatan);
    
    const stdSarpras = ['Laptop', 'HP', 'Tablet', 'Pakaian Seragam Dinas', 'PKB/PLKB Kit'];
    let customSarpras = []; document.querySelectorAll('.chk-lain').forEach(el => el.checked = false); 
    const cl = document.getElementById('cek-lainnya'); if(cl) cl.checked = false; 
    setVal('form-sarpras-lainnya-sebutkan', ''); 
    const sl = document.getElementById('sub-lainnya'); if(sl) sl.style.display = 'none';

    if(data.sarpras_lainnya) {
        data.sarpras_lainnya.split(',').forEach(item => { const trimItem = item.trim(); if(stdSarpras.includes(trimItem)) { const chk = document.querySelector(`.chk-lain[value="${trimItem}"]`); if(chk) chk.checked = true; } else if(trimItem) customSarpras.push(trimItem); });
        if(customSarpras.length > 0) { if(cl) cl.checked = true; if(sl) sl.style.display = 'block'; setVal('form-sarpras-lainnya-sebutkan', customSarpras.join(', ')); }
    }
    
    if(data.jarak_binaan) setVal('form-jarak', data.jarak_binaan);

    siapkanBeranda(data.nama_lengkap);
    const vl = document.getElementById('view-login'); if(vl) vl.style.display = 'none'; 
    const vdp = document.getElementById('view-dasbor-publik'); if(vdp) vdp.style.display = 'none';
    const ba = document.getElementById('btn-auth-action'); if(ba) { ba.style.display = 'block'; ba.innerText = "Keluar Sesi"; }
    setTxt('header-title', `Portal: ${data.nama_lengkap}`);
    const vpkb = document.getElementById('view-portal-pkb'); if(vpkb) vpkb.style.display = 'grid';

    // 3. PEMULIHAN DROPDOWN CASCADING WILAYAH
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
    if(data.provinsi && binProvSelect && binKabSelect) {
        const { data: pData } = await mySupabase.from('referensi_wilayah').select('kode, nama').eq('level_wilayah', 'Provinsi').ilike('nama', `%${data.provinsi}%`).limit(1);
        if(pData && pData.length>0) { binProvSelect.innerHTML = `<option value="${pData[0].kode}" selected>${pData[0].nama}</option>`;
            if(data.kabupaten) {
                const { data: kData } = await mySupabase.from('referensi_wilayah').select('kode, nama').eq('level_wilayah', 'Kabupaten/Kota').eq('kode_induk', pData[0].kode).ilike('nama', `%${data.kabupaten}%`).limit(1);
                if(kData && kData.length>0) { binKabSelect.innerHTML = `<option value="${kData[0].kode}" selected>${kData[0].nama}</option>`;
                    await fetchWilayah('Kecamatan', kData[0].kode, 'bin-kec', '-- Pilih Kecamatan --');
                    const kdBinKec = await setSelectByText('bin-kec', data.kecamatan_binaan);
                    if(kdBinKec) {
                        await popBinDesa();
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
window.pindahTabPortal = function(tabId) { document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none'); document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active')); const target = document.getElementById(`tab-${tabId}`); if(target) target.style.display = 'block'; const activeLink = document.querySelector(`.tab-link[onclick="pindahTabPortal('${tabId}')"]`); if(activeLink) activeLink.classList.add('active'); localStorage.setItem('activeTab', tabId); };
window.bukaFormEditProfil = function() { const vpu = document.getElementById('view-profil-utama'); if(vpu) vpu.style.display = 'none'; const fep = document.getElementById('form-edit-profil'); if(fep) fep.style.display = 'block'; };
window.batalEditProfil = function() { const fep = document.getElementById('form-edit-profil'); if(fep) fep.style.display = 'none'; const vpu = document.getElementById('view-profil-utama'); if(vpu) vpu.style.display = 'block'; };
window.bukaModalLog = function() { const ml = document.getElementById('modal-log'); if(ml) ml.style.display = 'flex'; };
window.tutupModalLog = function(e) { const ml = document.getElementById('modal-log'); if(ml && e.target === ml) ml.style.display = 'none'; };

function setupFormLogika() {
    let htmlTahunAnak = ''; for(let i=0; i<=10; i++) htmlTahunAnak += `<option value="${i}">${i}</option>`; const fja = document.getElementById('form-jumlah-anak'); if(fja) fja.innerHTML = htmlTahunAnak;
    let htmlThn = '<option value="">-- Pilih Tahun --</option>'; for(let y=2026; y>=1980; y--) htmlThn += `<option value="${y}">${y}</option>`;
    const ftd = document.getElementById('form-tahun-diangkat'); if(ftd) ftd.innerHTML = htmlThn; const ftk = document.getElementById('form-tahun-kendaraan'); if(ftk) ftk.innerHTML = htmlThn;

    const sb = document.getElementById('sarpras-balai'); if(sb) sb.addEventListener('change', e => { const t = document.getElementById('sub-balai'); if(t) t.style.display = (e.target.value === 'Ya') ? 'block' : 'none'; });
    const sk = document.getElementById('sarpras-kendaraan'); if(sk) sk.addEventListener('change', e => { const t = document.getElementById('sub-kendaraan'); if(t) t.style.display = (e.target.value === 'Ya') ? 'block' : 'none'; });
    const sbb = document.getElementById('sarpras-bbm'); if(sbb) sbb.addEventListener('change', e => { const t = document.getElementById('sub-bbm'); if(t) t.style.display = (e.target.value === 'Ya') ? 'block' : 'none'; });
    const sp = document.getElementById('sarpras-perawatan'); if(sp) sp.addEventListener('change', e => { const t = document.getElementById('sub-perawatan'); if(t) t.style.display = (e.target.value === 'Ya') ? 'block' : 'none'; });
    const cl = document.getElementById('cek-lainnya'); if(cl) cl.addEventListener('change', e => { const t = document.getElementById('sub-lainnya'); if(t) t.style.display = e.target.checked ? 'block' : 'none'; });
}

window.updateGolonganRuang = function() {
    const fja = document.getElementById('form-jenis-asn'); const selGol = document.getElementById('form-golongan'); if(!fja || !selGol) return;
    const asn = fja.value; let html = '<option value="">-- Pilih Golongan --</option>';
    if(asn === 'PNS') { ['II/a', 'II/b', 'II/c', 'II/d', 'III/a', 'III/b', 'III/c', 'III/d', 'IV/a', 'IV/b', 'IV/c', 'IV/d', 'IV/e'].forEach(g => html += `<option value="${g}">${g}</option>`); } 
    else if (asn === 'PPPK') { ['V', 'VII', 'IX'].forEach(g => html += `<option value="${g}">${g}</option>`); }
    selGol.innerHTML = html;
};

window.updateDataKeluarga = function() {
    const fsk = document.getElementById('form-status-kawin'); const wrpAnak = document.getElementById('wrap-jumlah-anak'); const wrpKB = document.getElementById('wrap-kesertaan-kb');
    if(!fsk || !wrpAnak || !wrpKB) return;
    const status = fsk.value;
    if(status === 'Belum Kawin') { wrpAnak.style.display = 'none'; wrpKB.style.display = 'none'; }
    else if(status === 'Janda' || status === 'Duda') { wrpAnak.style.display = 'block'; wrpKB.style.display = 'none'; }
    else { wrpAnak.style.display = 'block'; wrpKB.style.display = 'block'; }
};

function getCheckedValues(className) {
    let checked = []; document.querySelectorAll('.' + className + ':checked').forEach(el => checked.push(el.value)); return checked.join(', ');
}

window.simpanProfilKeServer = async function() {
    const fnip = document.getElementById('form-nip'); if(!fnip || !fnip.value) return; const nip = fnip.value;
    if(!confirm("Simpan perubahan data profil dan foto ini ke server pusat?")) return;
    const btnSimpan = document.getElementById('btn-simpan-profil'); if(btnSimpan) { btnSimpan.innerText = "Menyimpan Data..."; btnSimpan.disabled = true; }

    let listDesaBinaan = []; document.querySelectorAll('.chk-binaan-desa:checked').forEach(el => listDesaBinaan.push(el.value));
    
    let eTLProv = document.getElementById('tl-provinsi'); let tlProvText = eTLProv && eTLProv.selectedIndex >= 0 ? eTLProv.options[eTLProv.selectedIndex].text : '';
    let eTLKab = document.getElementById('tl-kabupaten'); let tlKabText = eTLKab && eTLKab.selectedIndex >= 0 ? eTLKab.options[eTLKab.selectedIndex].text : '';
    let eDomProv = document.getElementById('dom-prov'); let domProvText = eDomProv && eDomProv.selectedIndex >= 0 ? eDomProv.options[eDomProv.selectedIndex].text : '';
    let eDomKab = document.getElementById('dom-kab'); let domKabText = eDomKab && eDomKab.selectedIndex >= 0 ? eDomKab.options[eDomKab.selectedIndex].text : '';
    let eDomKec = document.getElementById('dom-kec'); let domKecText = eDomKec && eDomKec.selectedIndex >= 0 ? eDomKec.options[eDomKec.selectedIndex].text : '';
    let eDomDesa = document.getElementById('dom-desa'); let domDesaText = eDomDesa && eDomDesa.selectedIndex >= 0 ? eDomDesa.options[eDomDesa.selectedIndex].text : '';
    let eBinKec = document.getElementById('bin-kec'); let binKecText = eBinKec && eBinKec.selectedIndex >= 0 ? eBinKec.options[eBinKec.selectedIndex].text : '';

    const getName = (id) => document.getElementById(id) ? document.getElementById(id).value.trim() : '';
    const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : '';

    let infoPerubahan = "Memperbarui Data Profil Terkini";
    const oldSesiStr = localStorage.getItem('sesi_portal_pkb');
    
    const payload = {
        p_nip: nip, p_nama: getName('form-nama'), p_gelar_dp: getName('form-gelar-depan'), p_gelar_bk: getName('form-gelar-belakang'),
        p_tl_prov: tlProvText.replace('-- Pilih Provinsi --', ''), p_tl_kab: tlKabText.replace('-- Pilih Kab/Kota --', ''), p_tgl_lahir: getVal('form-tanggal-lahir'),
        p_jk: getVal('form-jenis-kelamin'), p_asn: getVal('form-jenis-asn'), p_thn_angkat: getVal('form-tahun-diangkat'),
        p_jabatan: getVal('form-jabatan'), p_golongan: getVal('form-golongan'), p_pendidikan: getVal('form-pendidikan'), p_jurusan: getName('form-jurusan'),
        p_status_kawin: getVal('form-status-kawin'), p_jml_anak: getVal('form-jumlah-anak'), p_kb: getVal('form-kesertaan-kb'), p_tinggal_kel: getVal('form-tinggal-keluarga'),
        p_dom_prov: domProvText.replace('-- Provinsi --', ''), p_dom_kab: domKabText.replace('-- Kab/Kota --', ''), p_dom_kec: domKecText.replace('-- Kecamatan --', ''), p_dom_desa: domDesaText.replace('-- Desa/Kel --', ''),
        p_bin_kec: binKecText.replace('-- Pilih Kecamatan --', ''), p_bin_desa: listDesaBinaan.join(', '),
        p_miliki_balai: getVal('sarpras-balai'), p_nama_balai: getName('form-nama-balai'), p_gps_balai: getVal('lokasi-balai'),
        p_kendaraan: getVal('sarpras-kendaraan'), p_thn_kendaraan: getVal('form-tahun-kendaraan'), p_transmisi: getVal('form-transmisi-kendaraan'), p_kondisi: getVal('form-kondisi-kendaraan'),
        p_bbm: getVal('sarpras-bbm'), p_dana_bbm: getCheckedValues('chk-bbm'), p_rawat: getVal('sarpras-perawatan'), p_dana_rawat: getCheckedValues('chk-rawat'),
        p_sarpras_lain: getCheckedValues('chk-lain') + (document.getElementById('cek-lainnya') && document.getElementById('cek-lainnya').checked ? `, ${getName('form-sarpras-lainnya-sebutkan')}` : ''),
        p_foto: base64FotoProfilAktif, p_jarak: getVal('form-jarak'), p_log_perubahan: infoPerubahan
    };

    if (oldSesiStr) {
        const old = JSON.parse(oldSesiStr); let changes = [];
        if (old.nama_lengkap !== payload.p_nama) changes.push("Nama Lengkap");
        if (old.pendidikan_akhir !== payload.p_pendidikan) changes.push("Pendidikan");
        if (old.status_perkawinan !== payload.p_status_kawin) changes.push("Status Kawin");
        if (old.jumlah_anak !== payload.p_jml_anak) changes.push("Jml Anak");
        if (old.domisili_desa !== payload.p_dom_desa) changes.push("Alamat Domisili");
        if (old.desa_binaan !== payload.p_bin_desa) changes.push("Desa Binaan");
        if (old.jarak_binaan !== payload.p_jarak) changes.push("Jarak Binaan");
        if (old.memiliki_balai !== payload.p_miliki_balai) changes.push("Status Balai");
        if (old.kendaraan_dinas !== payload.p_kendaraan) changes.push("Kendaraan");
        if (old.foto_profil !== payload.p_foto && payload.p_foto !== "") changes.push("Foto Profil Baru");
        if (changes.length > 0) { payload.p_log_perubahan = "Memperbarui: " + changes.join(', '); } 
        else { payload.p_log_perubahan = "Menyimpan ulang profil (Tanpa Perubahan Signifikan)"; }
    }

    try {
        const { data, error } = await mySupabase.rpc('simpan_update_profil', payload);
        if(error) throw error;
        localStorage.setItem('sesi_portal_pkb', JSON.stringify(data)); 
        await pulihkanSesi(data); batalEditProfil(); alert("Pembaruan profil Anda telah berhasil disimpan.");
    } catch(err) { alert("Gagal melakukan pembaruan profil. Periksa koneksi Anda."); } 
    finally { if(btnSimpan) { btnSimpan.innerText = "Simpan Perubahan Data"; btnSimpan.disabled = false; } }
};

window.kirimSaranPengguna = async function() {
    const isi = document.getElementById('isi-saran') ? document.getElementById('isi-saran').value.trim() : '';
    if(!isi) { alert("Silakan ketik pesan Anda terlebih dahulu sebelum mengirim."); return; }
    const sesiPkb = JSON.parse(localStorage.getItem('sesi_portal_pkb')); if(!sesiPkb) return;
    const btnKirim = document.getElementById('btn-kirim-saran'); const textAsli = btnKirim ? btnKirim.innerText : "Kirim"; if(btnKirim) { btnKirim.innerText = "Mengirim..."; btnKirim.disabled = true; }
    try { const kategori = document.getElementById('kategori-saran') ? document.getElementById('kategori-saran').value : 'Lainnya'; const { error } = await mySupabase.rpc('simpan_saran', { p_nip: sesiPkb.nip, p_nama: sesiPkb.nama_lengkap, p_kategori: kategori, p_isi: isi }); if (error) throw error; alert(`Terima kasih! Masukan Anda telah terkirim.`); if(document.getElementById('isi-saran')) document.getElementById('isi-saran').value = ''; } catch(err) { alert("Terjadi kesalahan. Periksa koneksi Anda."); } finally { if(btnKirim) { btnKirim.innerText = textAsli; btnKirim.disabled = false; } }
};

window.bukaFileFullscreen = function(filename) { const vn = document.getElementById('viewer-filename'); if(vn) vn.innerText = filename; const vb = document.getElementById('viewer-body-content'); if(vb) vb.innerText = `[ Membaca: ${filename} ]`; const vo = document.getElementById('viewer-overlay'); if(vo) vo.style.display = 'flex'; };
window.tutupFileFullscreen = function() { const vo = document.getElementById('viewer-overlay'); if(vo) vo.style.display = 'none'; };
window.ubahTemaAplikasi = function(theme) { document.documentElement.setAttribute('data-theme', theme); };
window.ubahSkalaZoom = function(aksi) { if (aksi === '+') currentZoomLevel += 10; else if (aksi === '-') currentZoomLevel -= 10; else currentZoomLevel = 100; if (currentZoomLevel < 80) currentZoomLevel = 80; if (currentZoomLevel > 130) currentZoomLevel = 130; document.documentElement.style.setProperty('--base-font-size', `${currentZoomLevel}%`); };

window.addEventListener('DOMContentLoaded', () => {
    setupFormLogika();
    const sesiAktif = localStorage.getItem('sesi_portal_pkb');
    if (sesiAktif) { const ls = document.getElementById('loading-screen'); if(ls) ls.style.display = 'none'; pulihkanSesi(JSON.parse(sesiAktif)); } 
    else { tarikDataDasbor(); }
});
