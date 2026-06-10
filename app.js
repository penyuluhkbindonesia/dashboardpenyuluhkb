// ==========================================
// KONFIGURASI SUPABASE
// ==========================================
const SUPABASE_URL = 'https://cdnqqrjbdhoglvlqbxoq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkbnFxcmpiZGhvZ2x2bHFieG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDQ1NDIsImV4cCI6MjA5NjU4MDU0Mn0.dHQbkEIJe5L4bfyJqZkJkXTPX0Abot4GBw7_4O3eNwk';
const mySupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// VARIABEL GLOBAL & OBJEK GRAFIK
// ==========================================
let dataMaster = []; 
let filterProvinsiAktif = null;

let chartProvInstance = null;
let chartUmurInstance = null;
let chartJabatanInstance = null;

// ==========================================
// FUNGSI UTAMA: PENARIKAN & PEMROSESAN DATA
// ==========================================
async function inisialisasiDasbor() {
    try {
        console.log("Menarik data master...");
        // Tarik data dengan limit besar untuk proses agregasi di klien
        const { data, error } = await mySupabase
            .from('data_aktif_pkb')
            .select('nip, nama_lengkap, provinsi, jenis_pegawai, jabatan, tanggal_lahir, tanggal_pensiun')
            .limit(20000); 

        if (error) throw error;
        dataMaster = data;
        
        renderDasbor();
    } catch (error) {
        console.error("Gagal menarik data:", error);
    }
}

function renderDasbor() {
    // 1. Terapkan Filter (Jika Ada)
    let dataAktif = dataMaster;
    if (filterProvinsiAktif) {
        dataAktif = dataMaster.filter(d => d.provinsi === filterProvinsiAktif);
        document.getElementById('filter-notif').style.display = 'flex';
        document.getElementById('nama-filter-prov').innerText = filterProvinsiAktif;
    } else {
        document.getElementById('filter-notif').style.display = 'none';
    }

    // 2. Kalkulasi Tanggal (Konteks Tahun 2026)
    const bulanIni = '2026-06';
    const tahunIni = '2026';

    // 3. Hitung KPI Atas
    let kpiPns = 0, kpiPppk = 0, kpiPensiunBln = 0, kpiPensiunThn = 0;
    
    // Objek untuk Agregasi Grafik
    let provCount = {};
    let umurCount = { '< 30': 0, '30-39': 0, '40-49': 0, '50-59': 0, '60+': 0 };
    let jabatanCount = {};
    let dataPensiunTabel = [];

    dataAktif.forEach(row => {
        // --- Agregasi KPI
        if (row.jenis_pegawai === 'PNS') kpiPns++;
        if (row.jenis_pegawai === 'PPPK') kpiPppk++;
        
        if (row.tanggal_pensiun) {
            if (row.tanggal_pensiun.startsWith(bulanIni)) kpiPensiunBln++;
            if (row.tanggal_pensiun.startsWith(tahunIni)) {
                kpiPensiunThn++;
                dataPensiunTabel.push(row);
            }
        }

        // --- Agregasi Provinsi
        if (row.provinsi) {
            provCount[row.provinsi] = (provCount[row.provinsi] || 0) + 1;
        }

        // --- Agregasi Jabatan
        if (row.jabatan) {
            jabatanCount[row.jabatan] = (jabatanCount[row.jabatan] || 0) + 1;
        }

        // --- Agregasi Umur
        if (row.tanggal_lahir) {
            const tahunLahir = parseInt(row.tanggal_lahir.split('-')[0]);
            const usia = 2026 - tahunLahir;
            if (usia < 30) umurCount['< 30']++;
            else if (usia >= 30 && usia <= 39) umurCount['30-39']++;
            else if (usia >= 40 && usia <= 49) umurCount['40-49']++;
            else if (usia >= 50 && usia <= 59) umurCount['50-59']++;
            else umurCount['60+']++;
        }
    });

    // 4. Perbarui Teks KPI
    document.getElementById('kpi-total').innerText = dataAktif.length;
    document.getElementById('kpi-pns').innerText = kpiPns;
    document.getElementById('kpi-pppk').innerText = kpiPppk;
    document.getElementById('kpi-pensiun-bulan').innerText = kpiPensiunBln;
    document.getElementById('kpi-pensiun-tahun').innerText = kpiPensiunThn;

    // 5. Urutkan dan Gambar Tabel Pensiun Terdekat
    dataPensiunTabel.sort((a, b) => new Date(a.tanggal_pensiun) - new Date(b.tanggal_pensiun));
    const tbodyPensiun = document.querySelector('#tabelPensiun tbody');
    tbodyPensiun.innerHTML = '';
    
    const batasTabel = dataPensiunTabel.slice(0, 50); // Tampilkan maks 50 data agar tidak berat
    batasTabel.forEach(p => {
        let tr = document.createElement('tr');
        tr.innerHTML = `<td>${p.nama_lengkap}</td><td>${p.provinsi}</td><td>${p.tanggal_pensiun}</td>`;
        tbodyPensiun.appendChild(tr);
    });

    // 6. Gambar Ulang Grafik-Grafik
    gambarChartProvinsi(provCount);
    gambarChartUmur(umurCount);
    gambarChartJabatan(jabatanCount);
}

// ==========================================
// FUNGSI PEMBUATAN GRAFIK (CHART.JS)
// ==========================================
function gambarChartProvinsi(provData) {
    const ctx = document.getElementById('chartProvinsi').getContext('2d');
    if (chartProvInstance) chartProvInstance.destroy();

    // Sortir Provinsi dari terbesar ke terkecil
    const sortedProv = Object.entries(provData).sort((a, b) => b[1] - a[1]);
    const labels = sortedProv.map(item => item[0]);
    const values = sortedProv.map(item => item[1]);

    chartProvInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah Pegawai',
                data: values,
                backgroundColor: '#007bff',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (e, activeElements) => {
                if (activeElements.length > 0) {
                    const dataIndex = activeElements[0].index;
                    filterProvinsiAktif = labels[dataIndex];
                    renderDasbor(); // Redraw saat batang diklik
                }
            },
            plugins: { legend: { display: false } },
            scales: { x: { display: false } } // Sembunyikan label bawah jika terlalu banyak
        }
    });
}

function gambarChartUmur(umurData) {
    const ctx = document.getElementById('chartUmur').getContext('2d');
    if (chartUmurInstance) chartUmurInstance.destroy();

    chartUmurInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(umurData),
            datasets: [{
                label: 'Jumlah Pegawai',
                data: Object.values(umurData),
                backgroundColor: '#28a745',
                borderRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function gambarChartJabatan(jabatanData) {
    const ctx = document.getElementById('chartJabatan').getContext('2d');
    if (chartJabatanInstance) chartJabatanInstance.destroy();

    // Sortir Jabatan
    const sortedJabatan = Object.entries(jabatanData).sort((a, b) => b[1] - a[1]);

    chartJabatanInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sortedJabatan.map(item => item[0]),
            datasets: [{
                data: sortedJabatan.map(item => item[1]),
                backgroundColor: ['#007bff', '#17a2b8', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#e83e8c', '#fd7e14']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } }
    });
}

// ==========================================
// FUNGSI NAVIGASI & LOGIN
// ==========================================
window.resetFilter = function() {
    filterProvinsiAktif = null;
    renderDasbor();
};

window.tampilkanLogin = function() {
    document.getElementById('halaman-dasbor').style.display = 'none';
    document.getElementById('halaman-profil').style.display = 'none';
    document.getElementById('halaman-login').style.display = 'block';
    document.querySelector('.btn-login-nav').style.display = 'none';
};

window.kembaliKeDasbor = function() {
    document.getElementById('halaman-login').style.display = 'none';
    document.getElementById('halaman-profil').style.display = 'none';
    document.getElementById('halaman-dasbor').style.display = 'block';
    document.querySelector('.btn-login-nav').style.display = 'block';
};

window.prosesLogin = async function() {
    const inputId = document.getElementById('inputIdentitas').value;
    const pesanError = document.getElementById('pesan-error');
    
    if(!inputId) return;
    pesanError.style.display = 'none';

    try {
        const { data, error } = await mySupabase.from('data_aktif_pkb').select('*').eq('nip', inputId).single();
        if (error || !data) {
            pesanError.style.display = 'block';
            pesanError.innerText = "Data NIP tidak ditemukan!";
        } else {
            document.getElementById('profil-nama').innerText = data.nama_lengkap;
            document.getElementById('profil-nip').innerText = data.nip;
            document.getElementById('profil-jabatan').innerText = data.jabatan;
            document.getElementById('profil-wilayah').innerText = data.kabupaten + ", " + data.provinsi;
            
            document.getElementById('halaman-login').style.display = 'none';
            document.getElementById('halaman-profil').style.display = 'block';
        }
    } catch(err) {
        console.error(err);
    }
};

window.keluar = function() {
    document.getElementById('inputIdentitas').value = '';
    kembaliKeDasbor();
};

// Pemicu awal saat halaman dimuat
window.addEventListener('DOMContentLoaded', inisialisasiDasbor);
