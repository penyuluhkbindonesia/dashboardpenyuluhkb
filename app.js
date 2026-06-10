// 1. Konfigurasi Supabase (WAJIB DIISI)
const SUPABASE_URL = 'https://cdnqqrjbdhoglvlqbxoq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkbnFxcmpiZGhvZ2x2bHFieG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDQ1NDIsImV4cCI6MjA5NjU4MDU0Mn0.dHQbkEIJe5L4bfyJqZkJkXTPX0Abot4GBw7_4O3eNwk';

const mySupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Deklarasi Elemen Halaman
const halDasbor = document.getElementById('halaman-dasbor');
const halLogin = document.getElementById('halaman-login');
const halProfil = document.getElementById('halaman-profil');
const tombolNavLogin = document.querySelector('.btn-login-nav');

// 3. Fungsi Memuat Visual Data
async function muatRingkasanData() {
    try {
        console.log("Memulai penarikan data metrik dari Supabase...");
        
        // 1. Hitung Total Semua
        const { count: totalSemua } = await mySupabase.from('data_aktif_pkb').select('*', { count: 'exact', head: true });
        
        // 2. Hitung PNS & PPPK
        const { count: totalPNS } = await mySupabase.from('data_aktif_pkb').select('*', { count: 'exact', head: true }).eq('jenis_pegawai', 'PNS');
        const { count: totalPPPK } = await mySupabase.from('data_aktif_pkb').select('*', { count: 'exact', head: true }).eq('jenis_pegawai', 'PPPK');
        
        // 3. Hitung Jenis Kelamin
        const { count: totalPria } = await mySupabase.from('data_aktif_pkb').select('*', { count: 'exact', head: true }).ilike('jenis_kelamin', '%laki%');
        const { count: totalWanita } = await mySupabase.from('data_aktif_pkb').select('*', { count: 'exact', head: true }).ilike('jenis_kelamin', 'perempuan');

        // 4. Hitung Kelompok Jabatan
        const { count: totalPKB } = await mySupabase.from('data_aktif_pkb').select('*', { count: 'exact', head: true }).ilike('kelompok_jabatan', '%Penyuluh%');
        const { count: totalPLKB } = await mySupabase.from('data_aktif_pkb').select('*', { count: 'exact', head: true }).ilike('kelompok_jabatan', '%Petugas Lapangan%');

        // Cetak ke Layar (Kartu)
        document.getElementById('total-pegawai').innerText = totalSemua || 0;
        document.getElementById('total-pns').innerText = totalPNS || 0;
        document.getElementById('total-pppk').innerText = totalPPPK || 0;
        document.getElementById('total-pria').innerText = totalPria || 0;
        document.getElementById('total-wanita').innerText = totalWanita || 0;

        // Cetak ke Layar (Tabel)
        document.getElementById('tabel-pkb').innerText = totalPKB || 0;
        document.getElementById('tabel-plkb').innerText = totalPLKB || 0;
        
        console.log("Semua data berhasil dimuat.");
    } catch (error) {
        console.error("Gagal memuat data dari Supabase:", error);
    }
}

// 4. Fungsi Navigasi Antar Halaman
window.tampilkanLogin = function() {
    halDasbor.style.display = 'none';
    halProfil.style.display = 'none';
    halLogin.style.display = 'block';
    tombolNavLogin.style.display = 'none';
};

window.kembaliKeDasbor = function() {
    halLogin.style.display = 'none';
    halProfil.style.display = 'none';
    halDasbor.style.display = 'grid';
    tombolNavLogin.style.display = 'block';
};

// 5. Fungsi Login Pegawai
window.prosesLogin = async function() {
    const inputId = document.getElementById('inputIdentitas').value;
    const pesanError = document.getElementById('pesan-error');
    
    if(!inputId) {
        pesanError.style.display = 'block';
        pesanError.innerText = "Masukkan NIP terlebih dahulu!";
        return;
    }
    pesanError.style.display = 'none';

    try {
        const { data, error } = await mySupabase
            .from('data_aktif_pkb')
            .select('*')
            .eq('nip', inputId)
            .single();

        if (error || !data) {
            pesanError.style.display = 'block';
            pesanError.innerText = "Data NIP tidak ditemukan!";
            console.error("Login gagal:", error);
        } else {
            // Tampilkan Data ke Profil
            document.getElementById('profil-nama').innerText = data.nama_lengkap;
            document.getElementById('profil-nip').innerText = data.nip;
            document.getElementById('profil-jabatan').innerText = data.jabatan;
            document.getElementById('profil-wilayah').innerText = data.kabupaten + ", " + data.provinsi;

            halLogin.style.display = 'none';
            halProfil.style.display = 'block';
        }
    } catch(err) {
        console.error("Error pada proses login:", err);
    }
};

window.keluar = function() {
    document.getElementById('inputIdentitas').value = '';
    kembaliKeDasbor();
};

window.addEventListener('DOMContentLoaded', muatRingkasanData);
