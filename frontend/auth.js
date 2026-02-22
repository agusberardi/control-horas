const { createClient } = supabase;

const supabaseUrl = "https://kslcypddazdiqnvnubrx.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzbGN5cGRkYXpkaXFudm51YnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNzM3OTEsImV4cCI6MjA4Njg0OTc5MX0.gjtV9KLwtCps_HwN53vUYmbd4ipwVB7WMgmFhp2Fy4I";

const client = createClient(supabaseUrl, supabaseKey);

// INICIALIZAR
async function initUser() {
  const { data: { session } } = await client.auth.getSession();

  if (session) {
    document.getElementById("auth-container").style.display = "none";
    document.getElementById("app").style.display = "block";
  } else {
    document.getElementById("auth-container").style.display = "block";
    document.getElementById("app").style.display = "none";
  }
}

// LOGIN
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
  } else {
    location.reload();
  }
}

// REGISTER
async function register() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await client.auth.signUp({
    email,
    password
  });

  if (error) {
    alert(error.message);
  } else {
    alert("Cuenta creada");
  }
}

// LOGOUT
async function logout() {
  await client.auth.signOut();
  location.reload();
}