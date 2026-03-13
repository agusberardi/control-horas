const { createClient } = supabase;

const supabaseUrl = "https://kslcypddazdiqnvnubrx.supabase.co";
const supabaseKey = "sb_publishable_BMTlXGKImkkM_MuhH1t83g_bhNDsctI";

const LAST_EMAIL_STORAGE_KEY = "controlHorasLastEmail";
const SUPABASE_AUTH_STORAGE_KEY = "control-horas-auth";

const browserStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.warn("No se pudo leer localStorage", error);
      return null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.warn("No se pudo escribir localStorage", error);
    }
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn("No se pudo limpiar localStorage", error);
    }
  }
};

const client = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
    storage: browserStorage
  }
});

function notify(message, type = "error") {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
    return;
  }
  alert(message);
}

function setAuthVisibility(isAuthenticated) {
  const authContainer = document.getElementById("auth-container");
  const appContainer = document.getElementById("app");

  if (authContainer) {
    authContainer.style.display = isAuthenticated ? "none" : "block";
  }

  if (appContainer) {
    appContainer.style.display = isAuthenticated ? "block" : "none";
  }
}

function getStoredEmail() {
  return browserStorage.getItem(LAST_EMAIL_STORAGE_KEY) || "";
}

function storeEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return;
  browserStorage.setItem(LAST_EMAIL_STORAGE_KEY, normalizedEmail);
}

document.addEventListener("DOMContentLoaded", () => {
  const authForm = document.getElementById("authForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (!emailInput || !passwordInput) return;

  const storedEmail = getStoredEmail();
  if (storedEmail && !emailInput.value) {
    emailInput.value = storedEmail;
  }

  const handleEnterLogin = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      login();
    }
  };

  if (authForm) {
    authForm.addEventListener("submit", (e) => {
      e.preventDefault();
      login();
    });
  }

  emailInput.addEventListener("change", () => storeEmail(emailInput.value));
  emailInput.addEventListener("blur", () => storeEmail(emailInput.value));
  emailInput.addEventListener("keydown", handleEnterLogin);
  passwordInput.addEventListener("keydown", handleEnterLogin);

  client.auth.onAuthStateChange((event, session) => {
    const isAuthenticated = Boolean(session);
    setAuthVisibility(isAuthenticated);

    if (event === "SIGNED_IN" && session?.user?.email) {
      storeEmail(session.user.email);
    }
  });
});

// INICIALIZAR
async function initUser() {
  const { data: { session } } = await client.auth.getSession();
  setAuthVisibility(Boolean(session));
  return session;
}

// LOGIN
async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    notify(error.message, "error");
  } else {
    storeEmail(data.user?.email || email);
    location.reload();
  }
}

// REGISTER
async function register() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { data, error } = await client.auth.signUp({
    email,
    password
  });

  if (error) {
    notify(error.message, "error");
  } else {
    storeEmail(data.user?.email || email);
    notify("Cuenta creada. Revisá tu email para confirmar la cuenta.", "success");
  }
}

// LOGOUT
async function logout() {
  await client.auth.signOut();
  location.reload();
}
