const supabase = window.supabase.createClient(
  "https://TU_PROYECTO.supabase.co",
  "TU_PUBLIC_ANON_KEY"
);

let USER_ID = null;

async function initUser() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    document.getElementById("auth-container").style.display = "block";
    document.getElementById("app").style.display = "none";
    return;
  }

  UUSER_ID = 1;

  document.getElementById("auth-container").style.display = "none";
  document.getElementById("app").style.display = "block";
}

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
  } else {
    location.reload();
  }
}

async function register() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    alert(error.message);
  } else {
    alert("Cuenta creada");
  }
}

async function logout() {
  await supabase.auth.signOut();
  location.reload();
}