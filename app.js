// =====================================================
// BOB MINING - app.js V1
// Supabase + Mining
// =====================================================

// -----------------------------------------------------
// SUPABASE
// -----------------------------------------------------

const SUPABASE_URL = "https://fxyqeeznykdtmaoywpmm.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_n6-IZsqob6jeQzL8igv-EA_lSNtURMn";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("✅ Supabase collegato");
console.log("✅ BOB app.js caricato");


// -----------------------------------------------------
// ELEMENTI HTML
// -----------------------------------------------------

const $ = (id) => document.getElementById(id);

const loginBox = $("authBox");
const miningBox = $("miningBox");

const emailInput = $("email");
const passwordInput = $("password");


// -----------------------------------------------------
// REGISTRAZIONE
// -----------------------------------------------------

async function register() {

    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
        alert("Inserisci email e password.");
        return;
    }

    if (password.length < 6) {
        alert("La password deve avere almeno 6 caratteri.");
        return;
    }

    const { data, error } =
    await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            emailRedirectTo:
                "https://bobmoukhlis-hash.github.io/bob-mining/"
        }
    });
    if (error) {
        alert("Errore registrazione: " + error.message);
        return;
    }

    console.log("Utente registrato:", data);

    alert(
        "✅ Registrazione completata!\n\n" +
        "Controlla la tua email e conferma l'account."
    );
}


// -----------------------------------------------------
// LOGIN
// -----------------------------------------------------

async function login() {

    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
        alert("Inserisci email e password.");
        return;
    }

    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

    if (error) {
        alert("Errore accesso: " + error.message);
        return;
    }

    console.log("Login riuscito:", data);

    alert("✅ Accesso effettuato!");

    if (loginBox) {
        loginBox.style.display = "none";
    }

    if (miningBox) {
        miningBox.style.display = "block";
    }
}
// -----------------------------------------------------
// SALVA ACCOUNT MINING
// -----------------------------------------------------

async function saveMiningAccount() {

    if (!currentUser) {
        console.log("Nessun utente autenticato");
        return;
    }

    const balance = Number(window.balance || 0);

    const { error } = await supabaseClient
        .from("mining_accounts")
        .update({
            balance_points: balance,
            last_mining_at: new Date().toISOString()
        })
        .eq("user_id", currentUser.id);

    if (error) {
        console.error("Errore salvataggio mining:", error);
        return;
    }

    console.log("✅ Mining salvato:", balance);
}

// -----------------------------------------------------
// EVENTI PULSANTI
// -----------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {

    const signupBtn = $("signupBtn");
    const loginBtn = $("loginBtn");

    if (signupBtn) {
        signupBtn.addEventListener("click", register);
        console.log("✅ Pulsante Registrati collegato");
    }

    if (loginBtn) {
        loginBtn.addEventListener("click", login);
        console.log("✅ Pulsante Accedi collegato");
    }

});
