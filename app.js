// 1. Inisialisasi Koneksi ke Supabase
const SUPABASE_URL = 'https://cdnqqrjbdhoglvlqbxoq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkbnFxcmpiZGhvZ2x2bHFieG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDQ1NDIsImV4cCI6MjA5NjU4MDU0Mn0.dHQbkEIJe5L4bfyJqZkJkXTPX0Abot4GBw7_4O3eNwk';

// Membuat "klien" supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Fungsi untuk Login menggunakan NIP
async function loginNIP() {
    const nipValue = document.getElementById('inputNIP').value;
    const pesanError = document.getElementById('pesan-error');
    
    if(!nipValue) {
        alert("NIP tidak boleh kosong!");
        return;
    }

    pesanError.style.display = 'none';

    // Mencari data NIP di tabel Supabase
    const { data, error } = await supabase
        .from('data_aktif_pkb')
        .select('*')
        .eq('nip', nipValue)
        .single(); // Ambil 1 baris saja

    if (error || !data) {
        console.log("Error:", error);
        pesanError.style.display = 'block';
        pesanError.innerText = "Data NIP tidak ditemukan di database.";
    } else {
        // Jika berhasil, tampilkan datanya ke layar
        document.getElementById('tampil-nama').innerText = data.nama_lengkap;
        document.getElementById('tampil-nip').innerText = data.nip;
        document.getElementById('tampil-jabatan').innerText = data.jabatan;
        document.getElementById('tampil-golongan').innerText = data.golongan;
        document.getElementById('tampil-wilayah').innerText = data.kabupaten + ", " + data.provinsi;

        // Sembunyikan bagian login, tampilkan dasbor
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'block';
    }
}

// 3. Fungsi untuk Keluar (Logout)
function keluar() {
    document.getElementById('inputNIP').value = '';
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('dashboard-section').style.display = 'none';
}