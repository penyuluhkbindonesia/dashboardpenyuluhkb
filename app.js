// 1. Konfigurasi Supabase
const SUPABASE_URL = 'https://cdnqqrjbdhoglvlqbxoq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkbnFxcmpiZGhvZ2x2bHFieG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDQ1NDIsImV4cCI6MjA5NjU4MDU0Mn0.dHQbkEIJe5L4bfyJqZkJkXTPX0Abot4GBw7_4O3eNwk';

// Perbaikan Error "Redeclaration": Gunakan let atau hindari nama variabel global yang konflik
// Kita menggunakan nama mySupabase untuk klien lokal agar tidak bentrok dengan objek global window.supabase
const mySupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Deklarasi Elemen Halaman
const halDasbor = document.getElementById('halaman-dasbor');
const halLogin = document.getElementById('halaman-login');
const halProfil = document.getElementById('halaman-profil');
const tombolNavLogin = document.querySelector('.btn-login-nav');

// 3. Fungsi Memuat Visual Data (Dasbor Publik)
async function muatRingkasanData() {
    try {
        console.log("Memulai penarikan data dari Supabase...");
        
        // Hitung Total Semua Pegawai
        const { count: totalSemua, error: errSemua } = await mySupabase
            .from('data_aktif_pkb')
            .select('*', { count: 'exact', head: true });
            
        if (errSemua) throw errSemua;

        // Hitung Total PNS
        const { count: totalPNS, error: errPNS } = await mySupabase
            .from('data_aktif_pkb')
            .select('*', { count: 'exact', head: true })
            .eq('jenis_pegawai', 'PNS');
            
        if (errPNS) throw errPNS;

        // Hitung Total PPPK
        const { count: totalPPPK, error: errPPPK } = await mySupabase
            .from('data_aktif_pkb')
            .select('*', { count: 'exact', head: true })
            .eq('jenis_pegawai', 'PPPK');
            
        if (errPPPK) throw errPPPK;

        // Cetak ke Layar
        document.getElementById('total-pegawai').innerText = totalSemua || 0;
        document.getElementById('total-pns').innerText = totalPNS || 0;
        document.getElementById('total-pppk').innerText = totalPPPK || 0;
        
        console.log("Data berhasil dimuat.");
    } catch (error) {
        console.error("Gagal memuat data dari Supabase:", error);
    }
}

// 4. Fungsi Navigasi Antar Halaman
// Fungsi ini HARUS berada di "global scope" agar bisa dipanggil dari atribut onclick di HTML
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
        // Mencari NIP di Supabase
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

// Jalankan fungsi hitung data otomatis saat halaman selesai dimuat
window.addEventListener('DOMContentLoaded', muatRingkasanData);
