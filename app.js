// 1. Konfigurasi Supabase (WAJIB DIISI)
const SUPABASE_URL = 'https://cdnqqrjbdhoglvlqbxoq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkbnFxcmpiZGhvZ2x2bHFieG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDQ1NDIsImV4cCI6MjA5NjU4MDU0Mn0.dHQbkEIJe5L4bfyJqZkJkXTPX0Abot4GBw7_4O3eNwk';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Deklarasi Elemen Halaman
const halDasbor = document.getElementById('halaman-dasbor');
const halLogin = document.getElementById('halaman-login');
const halProfil = document.getElementById('halaman-profil');
const tombolNavLogin = document.querySelector('.btn-login-nav');

// 3. Fungsi Memuat Visual Data (Dasbor Publik)
async function muatRingkasanData() {
    try {
        // Hitung Total Semua Pegawai
        const { count: totalSemua } = await supabase
            .from('data_aktif_pkb')
            .select('*', { count: 'exact', head: true });
            
        // Hitung Total PNS
        const { count: totalPNS } = await supabase
            .from('data_aktif_pkb')
            .select('*', { count: 'exact', head: true })
            .eq('jenis_pegawai', 'PNS');

        // Hitung Total PPPK
        const { count: totalPPPK } = await supabase
            .from('data_aktif_pkb')
            .select('*', { count: 'exact', head: true })
            .eq('jenis_pegawai', 'PPPK');

        // Cetak ke Layar
        document.getElementById('total-pegawai').innerText = totalSemua || 0;
        document.getElementById('total-pns').innerText = totalPNS || 0;
        document.getElementById('total-pppk').innerText = totalPPPK || 0;
    } catch (error) {
        console.error("Gagal memuat data:", error);
    }
}

// 4. Fungsi Navigasi Antar Halaman
function tampilkanLogin() {
    halDasbor.style.display = 'none';
    halProfil.style.display = 'none';
    halLogin.style.display = 'block';
    tombolNavLogin.style.display = 'none';
}

function kembaliKeDasbor() {
    halLogin.style.display = 'none';
    halProfil.style.display = 'none';
    halDasbor.style.display = 'grid'; // Pastikan kembali ke bentuk grid
    tombolNavLogin.style.display = 'block';
}

// 5. Fungsi Login Pegawai
async function prosesLogin() {
    const inputId = document.getElementById('inputIdentitas').value;
    const pesanError = document.getElementById('pesan-error');
    
    if(!inputId) return;
    pesanError.style.display = 'none';

    // Mencari NIP di Supabase
    const { data, error } = await supabase
        .from('data_aktif_pkb')
        .select('*')
        .eq('nip', inputId)
        .single();

    if (error || !data) {
        pesanError.style.display = 'block';
        pesanError.innerText = "Data NIP tidak ditemukan!";
    } else {
        // Tampilkan Data ke Profil
        document.getElementById('profil-nama').innerText = data.nama_lengkap;
        document.getElementById('profil-nip').innerText = data.nip;
        document.getElementById('profil-jabatan').innerText = data.jabatan;
        document.getElementById('profil-wilayah').innerText = data.kabupaten + ", " + data.provinsi;

        halLogin.style.display = 'none';
        halProfil.style.display = 'block';
    }
}

function keluar() {
    document.getElementById('inputIdentitas').value = '';
    kembaliKeDasbor();
}

// Jalankan fungsi hitung data otomatis saat halaman selesai dimuat
window.onload = muatRingkasanData;
