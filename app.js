// ==========================================
// KONFIGURASI SUPABASE
// ==========================================
const SUPABASE_URL = 'https://cdnqqrjbdhoglvlqbxoq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkbnFxcmpiZGhvZ2x2bHFieG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDQ1NDIsImV4cCI6MjA5NjU4MDU0Mn0.dHQbkEIJe5L4bfyJqZkJkXTPX0Abot4GBw7_4O3eNwk';
const mySupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let dataMaster = []; 
let filterProvinsiAktif = null;

let chartProvInstance = null;
let chartUmurInstance = null;
let chartJabatanInstance = null;
let chartGenerasiInstance = null;
let chartPendidikanInstance = null;
let chartGolonganInstance = null;

// Helper: Format Angka Ribuan
function formatAngka(angka) {
    return Number(angka).toLocaleString('id-ID');
}

// Helper REVISI: Mengubah format yyyy-mm-dd menjadi dd-mm-yyyy untuk tampilan layar
function formatTanggalIndo(tglStr) {
    if (!tglStr) return '-';
    const bagian = tglStr.split('-');
    if (bagian.length !== 3) return tglStr; // kembalikan apa adanya jika format salah
    return `${bagian[2]}-${bagian[1]}-${bagian[0]}`;
}

async function inisialisasiDasbor() {
    try {
        console.log("Menarik data master...");
        let allData = [];
        let step = 1000;
        let from = 0;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await mySupabase
                .from('data_aktif_pkb')
                .select('nip, nama_lengkap, provinsi, jenis_pegawai, jenis_kelamin, jabatan, golongan, pendidikan_akhir, tanggal_lahir, tanggal_pensiun')
                .range(from, from + step - 1);
                
            if (error) { console.error(error); break; }
            
            allData = allData.concat(data);
            
            if (data.length < step) {
                hasMore = false;
            } else {
                from += step;
            }
        }
        
        dataMaster = allData;
        renderDasbor();
    } catch (error) {
        console.error("Gagal menarik data:", error);
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

    const bulanIni = '2026-06';
    const tahunIni = '2026';

    let kpiPns = 0, kpiPppk = 0, kpiPensiunBln = 0, kpiPensiunThn = 0, kpiPria = 0, kpiWanita = 0;
    
    let provCount = {};
    let umurCount = { '< 30': 0, '30-39': 0, '40-49': 0, '50-59': 0, '60+': 0 };
    let generasiCount = { 'Gen Z': 0, 'Milenial': 0, 'Gen X': 0, 'Baby Boomer': 0 };
    let jabatanCount = {};
    let pendidikanCount = {};
    let golonganCount = {};
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
            if (row.tanggal_pensiun.startsWith(tahunIni)) {
                kpiPensiunThn++;
                dataPensiunTabel.push(row);
            }
        }

        if (row.provinsi) provCount[row.provinsi] = (provCount[row.provinsi] || 0) + 1;
        if (row.jabatan) jabatanCount[row.jabatan] = (jabatanCount[row.jabatan] || 0) + 1;
        if (row.pendidikan_akhir) pendidikanCount[row.pendidikan_akhir] = (pendidikanCount[row.pendidikan_akhir] || 0) + 1;
        if (row.golongan) golonganCount[row.golongan] = (golonganCount[row.golongan] || 0) + 1;

        if (row.tanggal_lahir) {
            const tahunLahir = parseInt(row.tanggal_lahir.split('-')[0]);
            const usia = 2026 - tahunLahir;
            
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
    const tbodyPensiun = document.querySelector('#tabelPensiun tbody');
    tbodyPensiun.innerHTML = '';
    
    dataPensiunTabel.slice(0, 50).forEach(p => {
        let tr = document.createElement('tr');
        // REVISI: Menggunakan fungsi formatTanggalIndo() untuk nilai dalam tabel
        const tanggalFormatted = formatTanggalIndo(p.tanggal_pensiun);
        tr.innerHTML = `<td>${p.nama_lengkap}</td><td>${p.provinsi}</td><td>${p.jabatan}</td><td style="font-weight:bold; color:#dc3545;">${tanggalFormatted}</td>`;
        tbodyPensiun.appendChild(tr);
    });

    gambarChartProvinsi(provCount);
    gambarChartUmur(umurCount);
    gambarChartJabatan(jabatanCount);
    gambarChartGenerasi(generasiCount);
    gambarChartPendidikan(pendidikanCount);
    gambarChartGolongan(golonganCount);

    document.getElementById('loading-screen').style.display = 'none';
}

function gambarChartProvinsi(provData) {
    const ctx = document.getElementById('chartProvinsi').getContext('2d');
    if (chartProvInstance) chartProvInstance.destroy();

    const sortedProv = Object.entries(provData).sort((a, b) => b[1] - a[1]);
    const labels = sortedProv.map(item => item[0]);
    const values = sortedProv.map(item => item[1]);

    chartProvInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Pegawai',
                data: values,
                backgroundColor: '#007bff',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            onClick: (e, activeElements) => {
                if (activeElements.length > 0) {
                    const dataIndex = activeElements[0].index;
                    filterProvinsiAktif = labels[dataIndex];
                    renderDasbor();
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function gambarChartUmur(umurData) {
    const ctx = document.getElementById('chartUmur').getContext('2d');
    if (chartUmurInstance) chartUmurInstance.destroy();

    const warnaBar = ['#007bff', '#28a745', '#ffc107', '#fd7e14', '#dc3545'];

    chartUmurInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(umurData),
            datasets: [{
                data: Object.values(umurData),
                backgroundColor: warnaBar,
                borderRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function gambarChartGenerasi(genData) {
    const ctx = document.getElementById('chartGenerasi').getContext('2d');
    if (chartGenerasiInstance) chartGenerasiInstance.destroy();

    chartGenerasiInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(genData),
            datasets: [{
                data: Object.values(genData),
                backgroundColor: ['#6f42c1', '#17a2b8', '#fd7e14', '#e83e8c']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

function gambarChartJabatan(jabatanData) {
    const ctx = document.getElementById('chartJabatan').getContext('2d');
    if (chartJabatanInstance) chartJabatanInstance.destroy();

    const sortedJabatan = Object.entries(jabatanData).sort((a, b) => b[1] - a[1]);

    chartJabatanInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sortedJabatan.map(item => item[0]),
            datasets: [{
                data: sortedJabatan.map(item => item[1]),
                backgroundColor: ['#007bff', '#17a2b8', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997', '#6c757d']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } }
    });
}

function gambarChartPendidikan(pendidikanData) {
    const ctx = document.getElementById('chartPendidikan').getContext('2d');
    if (chartPendidikanInstance) chartPendidikanInstance.destroy();

    const sortedData = Object.entries(pendidikanData).sort((a, b) => b[1] - a[1]);

    chartPendidikanInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(item => item[0]),
            datasets: [{
                data: sortedData.map(item => item[1]),
                backgroundColor: '#17a2b8',
                borderRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function gambarChartGolongan(golonganData) {
    const ctx = document.getElementById('chartGolongan').getContext('2d');
    if (chartGolonganInstance) chartGolonganInstance.destroy();

    const sortedData = Object.entries(golonganData).sort((a, b) => a[0].localeCompare(b[0]));

    chartGolonganInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(item => item[0]),
            datasets: [{
                data: sortedData.map(item => item[1]),
                backgroundColor: '#6c757d',
                borderRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

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
    } catch(err) {}
};

window.keluar = function() { document.getElementById('inputIdentitas').value = ''; kembaliKeDasbor(); };
window.addEventListener('DOMContentLoaded', inisialisasiDasbor);
