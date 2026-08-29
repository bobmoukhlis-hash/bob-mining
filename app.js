// =====================================================
// BOB MINING - app.js V1
// Supabase + Autenticazione + Mining Account
// =====================================================


// -----------------------------------------------------
// SUPABASE
// -----------------------------------------------------

const SUPABASE_URL =
    "https://fxyqeeznykdtmaoywpmm.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_n6-IZsqob6jeQzL8igv-EA_lSNtURMn";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

console.log("✅ Supabase collegato");
console.log("✅ BOB app.js caricato");


// -----------------------------------------------------
// ELEMENTI HTML
// -----------------------------------------------------

const $ = (id) =>
    document.getElementById(id);

const loginBox =
    $("authBox");

const miningBox =
    $("miningBox");

const emailInput =
    $("email");

const passwordInput =
    $("password");


// -----------------------------------------------------
// UTENTE AUTENTICATO
// -----------------------------------------------------

let currentUser = null;


// -----------------------------------------------------
// REGISTRAZIONE
// -----------------------------------------------------

async function register() {

    const email =
        emailInput?.value.trim();

    const password =
        passwordInput?.value;

    if (!email || !password) {

        alert(
            "Inserisci email e password."
        );

        return;
    }

    if (password.length < 6) {

        alert(
            "La password deve avere almeno 6 caratteri."
        );

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

        console.error(
            "Errore registrazione:",
            error
        );

        alert(
            "Errore registrazione: " +
            error.message
        );

        return;
    }


    console.log(
        "✅ Utente registrato:",
        data
    );


    alert(
        "✅ Registrazione completata!\n\n" +
        "Controlla la tua email e conferma l'account."
    );
}


// -----------------------------------------------------
// LOGIN
// -----------------------------------------------------

async function login() {

    const email =
        emailInput?.value.trim();

    const password =
        passwordInput?.value;


    if (!email || !password) {

        alert(
            "Inserisci email e password."
        );

        return;
    }


    const { data, error } =
        await supabaseClient.auth
            .signInWithPassword({

                email: email,

                password: password
            });


    if (error) {

        console.error(
            "Errore accesso:",
            error
        );

        alert(
            "Errore accesso: " +
            error.message
        );

        return;
    }


    currentUser =
        data.user;


    console.log(
        "✅ Login riuscito:",
        currentUser.id
    );


    alert(
        "✅ Accesso effettuato!"
    );


    showMining();
}


// -----------------------------------------------------
// MOSTRA MINING
// -----------------------------------------------------

function showMining() {

    if (loginBox) {

        loginBox.style.display =
            "none";
    }


    if (miningBox) {

        miningBox.style.display =
            "block";
    }
}


// -----------------------------------------------------
// MOSTRA LOGIN
// -----------------------------------------------------

function showLogin() {

    if (loginBox) {

        loginBox.style.display =
            "block";
    }


    if (miningBox) {

        miningBox.style.display =
            "none";
    }
}


// -----------------------------------------------------
// CONTROLLO SESSIONE
// -----------------------------------------------------

async function checkSession() {

    const { data, error } =
        await supabaseClient.auth
            .getSession();


    if (error) {

        console.error(
            "Errore sessione:",
            error
        );

        showLogin();

        return;
    }


    currentUser =
        data.session?.user || null;


    if (currentUser) {

        console.log(
            "✅ Sessione trovata:",
            currentUser.id
        );

        showMining();

    } else {

        console.log(
            "ℹ️ Nessun utente autenticato"
        );

        showLogin();
    }
}


// -----------------------------------------------------
// CAMBIO SESSIONE SUPABASE
// -----------------------------------------------------

supabaseClient.auth.onAuthStateChange(
    (event, session) => {

        currentUser =
            session?.user || null;


        console.log(
            "Auth event:",
            event
        );


        if (currentUser) {

            showMining();

        } else {

            showLogin();
        }
    }
);


// -----------------------------------------------------
// SALVA ACCOUNT MINING
// -----------------------------------------------------

async function saveMiningAccount() {

    if (!currentUser) {

        console.log(
            "ℹ️ Nessun utente autenticato"
        );

        return;
    }


    const balance =
        Number(
            window.balance || 0
        );


    const { error } =
        await supabaseClient
            .from("mining_accounts")
            .update({

                balance_points:
                    balance,

                last_mining_at:
                    new Date().toISOString()
            })
            .eq(
                "user_id",
                currentUser.id
            );


    if (error) {

        console.error(
            "❌ Errore salvataggio mining:",
            error
        );

        return;
    }


    console.log(
        "✅ Mining salvato:",
        balance
    );
}


// -----------------------------------------------------
// EVENTI PULSANTI
// -----------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const signupBtn =
            $("signupBtn");

        const loginBtn =
            $("loginBtn");


        if (signupBtn) {

            signupBtn.addEventListener(
                "click",
                register
            );

            console.log(
                "✅ Pulsante Registrati collegato"
            );
        }


        if (loginBtn) {

            loginBtn.addEventListener(
                "click",
                login
            );

            console.log(
                "✅ Pulsante Accedi collegato"
            );
        }


        await checkSession();
    }
);


// -----------------------------------------------------
// FUNZIONI GLOBALI
// -----------------------------------------------------

window.register =
    register;

window.login =
    login;

window.checkSession =
    checkSession;

window.saveMiningAccount =
    saveMiningAccount;
