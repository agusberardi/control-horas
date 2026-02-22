const { createClient } = supabase;

const supabaseUrl = "https://kslcypddazdiqnvnubrx.supabase.co";
const supabaseKey = "sb_publishable_BMTlXGKImkkM_MuhH1t83g_bhNDsctI";

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