const supabaseUrl = "Thttps://kslcypddazdiqnvnubrx.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzbGN5cGRkYXpkaXFudm51YnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNzM3OTEsImV4cCI6MjA4Njg0OTc5MX0.gjtV9KLwtCps_HwN53vUYmbd4ipwVB7WMgmFhp2Fy4I";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// INICIALIZAR
async function initUser() {
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    // Usuario logueado
    document.getElementById("auth-container").style.display = "none";
    document.getElementById("app").style.display = "block";
  } else {
    // No logueado
    document.getElementById("auth-container").style.display = "block";
    document.getElementById("app").style.display = "none";
  }
}

// LOGIN
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert("Error: " + error.message);
  } else {
    location.reload();
  }
}

// REGISTER
async function register() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    alert("Error: " + error.message);
  } else {
    alert("Cuenta creada. Ahora inicia sesión.");
  }
}

// LOGOUT
async function logout() {
  await supabase.auth.signOut();
  location.reload();
}